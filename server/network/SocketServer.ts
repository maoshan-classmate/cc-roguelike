import { Server, Socket } from 'socket.io';
import { AuthManager } from '../lobby/AuthManager';
import { LobbyManager, RoomInfo } from '../lobby/LobbyManager';
import { GameManager } from '../game/GameManager';
import { AuthMessages, LobbyMessages, RoomMessages, GameMessages, ChatMessages, ErrorCodes } from '../../shared/protocol';

interface Session {
  accountId: string;
  username: string;
  characterId: string;
  currentRoom?: string;
}

export class SocketServer {
  private io: Server;
  private authManager: AuthManager;
  private lobbyManager: LobbyManager;
  private gameManager: GameManager;
  private sessions: Map<string, Session> = new Map();
  private accountSessions: Map<string, { session: Session; socketId: string; disconnectTimer?: NodeJS.Timeout }> = new Map();
  private stateUpdateInterval: NodeJS.Timeout | null = null;
  private static readonly RECONNECT_GRACE_MS = 30000; // 30s 宽限期

  constructor(io: Server, authManager: AuthManager, lobbyManager: LobbyManager, gameManager: GameManager) {
    this.io = io;
    this.authManager = authManager;
    this.lobbyManager = lobbyManager;
    this.gameManager = gameManager;

    this.setupSocketHandlers();
    this.startStateBroadcast();
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log(`🔌 Client connected: ${socket.id}`);

      // Check if already authenticated via token
      const token = socket.handshake.auth.token;
      if (token) {
        const sessionData = this.authManager.verifyToken(token);
        if (sessionData) {
          // RECONNECT 优先：检查是否有等待断线的 session（同步恢复，不等 DB）
          const existing = this.accountSessions.get(sessionData.accountId);
          if (existing && existing.disconnectTimer) {
            // 断线重连：同步恢复 session，取消宽限期
            clearTimeout(existing.disconnectTimer);
            this.sessions.delete(existing.socketId);
            this.sessions.set(socket.id, existing.session);
            this.accountSessions.set(sessionData.accountId, {
              session: existing.session,
              socketId: socket.id
            });
            // 重新加入 socket.io room
            if (existing.session.currentRoom) {
              socket.join(`room:${existing.session.currentRoom}`);
            }
            console.log(`🔌 Reconnect: ${sessionData.username}, session restored SYNCHRONOUSLY`);
            // 后台刷新 characterId（不阻塞）
            this.authManager.getCharacter(sessionData.accountId).then(ch => {
              if (ch) existing.session.characterId = ch.id;
            });
          } else {
            // 新连接：需要 DB 查询获取 characterId（异步）
            this.authManager.getCharacter(sessionData.accountId).then(character => {
              const session: Session = {
                accountId: sessionData.accountId,
                username: sessionData.username,
                characterId: character?.id || ''
              };
              this.sessions.set(socket.id, session);
              this.accountSessions.set(sessionData.accountId, {
                session,
                socketId: socket.id
              });
              console.log(`🔌 Session restored for ${sessionData.username}`);
            });
          }
        } else {
          // Token invalid or expired — notify client
          socket.emit('auth:error', { code: 'TOKEN_INVALID', message: '登录已失效，请重新登录' });
        }
      }

      // Auth handlers
      socket.on(AuthMessages.REGISTER, (data: { username: string; password: string }) => this.handleRegister(socket, data));
      socket.on(AuthMessages.LOGIN, (data: { username: string; password: string }) => this.handleLogin(socket, data));
      socket.on(AuthMessages.LOGOUT, () => this.handleLogout(socket));

      // Lobby handlers
      socket.on(LobbyMessages.LIST, () => this.handleLobbyList(socket));
      socket.on(LobbyMessages.CHAT, (data: { message: string }) => this.handleLobbyChat(socket, data));

      // Room handlers
      socket.on(RoomMessages.CREATE, (data: { name: string; maxPlayers?: number }) => this.handleRoomCreate(socket, data));
      socket.on(RoomMessages.JOIN, (data: { roomId: string }) => this.handleRoomJoin(socket, data));
      socket.on(RoomMessages.LEAVE, () => this.handleRoomLeave(socket));
      socket.on(RoomMessages.READY, (data: { ready: boolean }) => this.handleRoomReady(socket, data));
      socket.on(RoomMessages.START, () => this.handleRoomStart(socket));
      socket.on('room:selectClass', (data: { characterType: string }) => this.handleSelectClass(socket, data));

      // Game handlers
      socket.on(GameMessages.INPUT, (data: { dx: number; dy: number; angle: number; attack?: boolean; skill?: number; mouseX?: number; mouseY?: number }) => this.handleGameInput(socket, data));
      socket.on(GameMessages.CHAT, (data: { message: string }) => this.handleGameChat(socket, data));
      socket.on(GameMessages.DEBUG, (data: { action: string; floor?: number; invincible?: boolean }) => this.handleGameDebug(socket, data));

      // Disconnect
      socket.on('disconnect', () => this.handleDisconnect(socket));
    });
  }

  private getSession(socketId: string): Session | undefined {
    return this.sessions.get(socketId);
  }

  private requireAuth(socket: Socket, callback: (session: Session) => void): void {
    const session = this.getSession(socket.id);
    if (!session) {
      socket.emit('room:error', { code: ErrorCodes.AUTH_FAILED, message: 'Not authenticated' });
      return;
    }
    callback(session);
  }

  private async handleRegister(socket: Socket, data: { username: string; password: string }): Promise<void> {
    const result = await this.authManager.register(data.username, data.password);
    if (result.success) {
      const session: Session = {
        accountId: result.user!.id,
        username: result.user!.username,
        characterId: result.user!.character!.id
      };
      this.sessions.set(socket.id, session);
      this.accountSessions.set(session.accountId, { session, socketId: socket.id });
      socket.emit(AuthMessages.RESULT, { success: true, user: result.user, token: result.token });
    } else {
      socket.emit(AuthMessages.RESULT, { success: false, error: result.error });
    }
  }

  private async handleLogin(socket: Socket, data: { username: string; password: string }): Promise<void> {
    const result = await this.authManager.login(data.username, data.password);
    if (result.success) {
      const session: Session = {
        accountId: result.user!.id,
        username: result.user!.username,
        characterId: result.user!.character?.id || ''
      };
      this.sessions.set(socket.id, session);
      this.accountSessions.set(result.user!.id, { session, socketId: socket.id });
      socket.emit(AuthMessages.RESULT, { success: true, user: result.user, token: result.token });
    } else {
      socket.emit(AuthMessages.RESULT, { success: false, error: result.error });
    }
  }

  private handleLogout(socket: Socket): void {
    this.sessions.delete(socket.id);
  }

  private handleLobbyList(socket: Socket): void {
    const rooms = this.lobbyManager.getAllRooms();
    socket.emit(LobbyMessages.LIST_RESULT, { rooms });
  }

  private handleLobbyChat(socket: Socket, data: { message: string }): void {
    const session = this.getSession(socket.id);
    if (!session) return;

    this.io.emit(LobbyMessages.CHAT_PUSH, {
      from: session.username,
      message: data.message,
      ts: Date.now()
    });
  }

  private handleRoomCreate(socket: Socket, data: { name: string; maxPlayers?: number }): void {
    const session = this.getSession(socket.id);
    this.requireAuth(socket, (session) => {
      // Leave current room if any
      if (session.currentRoom) {
        this.lobbyManager.leaveRoom(session.currentRoom, session.accountId);
      }

      const room = this.lobbyManager.createRoom(
        session.accountId,
        session.username,
        data.name || `${session.username}'s Room`,
        data.maxPlayers || 4
      );

      session.currentRoom = room.id;
      socket.join(`room:${room.id}`);
      socket.emit(RoomMessages.CREATE_RESULT, { success: true, room });
      // Broadcast updated lobby list so other players see the new room
      this.io.emit(LobbyMessages.LIST_RESULT, { rooms: this.lobbyManager.getAllRooms() });
    });
  }

  private handleRoomJoin(socket: Socket, data: { roomId: string }): void {
    this.requireAuth(socket, async (session) => {

      // Check if already in this room
      if (session.currentRoom === data.roomId) {
        // User already in this room - just return success with current room data
        const room = this.lobbyManager.getRoom(data.roomId);
        const character = await this.authManager.getCharacter(session.accountId);
        socket.emit(RoomMessages.JOIN_PUSH, { room, character });
        return;
      }

      // Leave current room first
      if (session.currentRoom) {
        this.lobbyManager.leaveRoom(session.currentRoom, session.accountId);
        socket.leave(`room:${session.currentRoom}`);
      }

      const room = this.lobbyManager.joinRoom(data.roomId, session.accountId, session.username);
      if (!room) {
        socket.emit(RoomMessages.ERROR, { code: ErrorCodes.ROOM_NOT_FOUND, message: 'Room not found or full' });
        return;
      }

      session.currentRoom = room.id;
      socket.join(`room:${room.id}`);

      // Get character data
      const character = await this.authManager.getCharacter(session.accountId);

      // Notify others — 发送完整 room 对象（客户端统一读 data.room）
      socket.to(`room:${room.id}`).emit(RoomMessages.JOIN_PUSH, {
        room
      });

      // Send room data to joiner
      socket.emit(RoomMessages.JOIN_PUSH, {
        room,
        character
      });
    });
  }

  private handleRoomLeave(socket: Socket): void {
    this.requireAuth(socket, (session) => {
      if (!session.currentRoom) return;

      const room = this.lobbyManager.leaveRoom(session.currentRoom, session.accountId);
      socket.leave(`room:${session.currentRoom}`);

      // Cancel any pending disconnect grace period (user intentionally left)
      const acEntry = this.accountSessions.get(session.accountId);
      if (acEntry?.disconnectTimer) {
        clearTimeout(acEntry.disconnectTimer);
        acEntry.disconnectTimer = undefined;
      }

      if (room) {
        socket.to(`room:${room.id}`).emit(RoomMessages.LEAVE_PUSH, {
          playerId: session.accountId,
          newHostId: room.hostId
        });
        // 如果房间正在游戏中，从 GameRoom 移除玩家并清理
        if (room.status === 'playing') {
          const gameRoom = this.gameManager.getRoom(session.currentRoom);
          if (gameRoom) {
            gameRoom.removePlayer(session.accountId);
            // 如果 GameRoom 没有玩家了，彻底销毁它
            if (gameRoom.getPlayerCount() === 0) {
              this.gameManager.removeRoom(session.currentRoom);
            }
          }
        }
      }

      session.currentRoom = undefined;
    });
  }

  private handleRoomReady(socket: Socket, data: { ready: boolean }): void {
    this.requireAuth(socket, (session) => {
      if (!session.currentRoom) return;

      const room = this.lobbyManager.setPlayerReady(session.currentRoom, session.accountId, data.ready);
      if (room) {
        // Emit to ALL players in the room including sender
        this.io.to(`room:${room.id}`).emit(RoomMessages.READY_PUSH, {
          playerId: session.accountId,
          ready: data.ready
        });
      }
    });
  }

  private handleRoomStart(socket: Socket): void {
    this.requireAuth(socket, async (session) => {
      if (!session.currentRoom) return;

      const room = this.lobbyManager.getRoom(session.currentRoom);
      if (!room || room.hostId !== session.accountId) {
        socket.emit(RoomMessages.ERROR, { code: ErrorCodes.NOT_HOST, message: 'Only host can start' });
        return;
      }

      // Start the game
      const gameRoom = this.gameManager.createRoom(room.id);

      // Add all players to game room
      for (const player of room.players) {
        const character = await this.authManager.getCharacter(player.id);
        if (character) {
          // 优先用内存中的 characterType（lobby）覆盖 DB 值，解决 selectClass 异步竞态
          if (player.characterType) {
            character.character_type = player.characterType;
            // 同时更新 weapon 为该职业的默认武器
            const config = AuthManager.CLASS_CONFIG[player.characterType];
            if (config) {
              character.weapon = config.weapon;
              character.skills = JSON.stringify(config.skills);
            }
          }
          gameRoom.addPlayer(player.id, player.name, character);
        }
      }

      // Mark room as playing
      this.lobbyManager.startGame(session.currentRoom);

      // Notify all players to switch to game
      this.io.to(`room:${room.id}`).emit(RoomMessages.START_PUSH, {
        roomId: room.id,
        floor: 1
      });

      // Start game loop
      gameRoom.start();

      // Move all sockets to game namespace
      for (const player of room.players) {
        // Find socket for this player (in real app, track this better)
      }
    });
  }

  private handleSelectClass(socket: Socket, data: { characterType: string }): void {
    this.requireAuth(socket, async (session) => {
      // 客户端用 'healer'，服务端 CLASS_CONFIG 用 'cleric'，统一映射
      const validTypes: Record<string, string> = {
        warrior: 'warrior',
        ranger: 'ranger',
        mage: 'mage',
        healer: 'cleric',
        cleric: 'cleric'
      };
      const serverType = validTypes[data.characterType];
      if (!serverType) return;
      // 同时更新内存（lobby）和数据库，handleRoomStart 优先读内存避免竞态
      if (session.currentRoom) {
        this.lobbyManager.setPlayerCharacterType(session.currentRoom, session.accountId, serverType);
        // 广播职业变更给房间内其他玩家
        socket.to(`room:${session.currentRoom}`).emit('room:player:update', {
          playerId: session.accountId,
          characterType: serverType
        });
      }
      await this.authManager.updateCharacterType(session.accountId, serverType);
    });
  }

  private handleGameInput(socket: Socket, data: { dx: number; dy: number; angle: number; attack?: boolean; skill?: number; mouseX?: number; mouseY?: number }): void {
    this.requireAuth(socket, (session) => {
      if (!session.currentRoom) return;

      const gameRoom = this.gameManager.getRoom(session.currentRoom);
      if (!gameRoom) return;
      if (!gameRoom.isRunning()) return;

      gameRoom.handlePlayerInput(session.accountId, data);
    });
  }

  private handleGameChat(socket: Socket, data: { message: string }): void {
    this.requireAuth(socket, (session) => {
      if (!session.currentRoom) return;

      this.io.to(`room:${session.currentRoom}`).emit(GameMessages.CHAT_PUSH, {
        from: session.username,
        message: data.message,
        ts: Date.now()
      });
    });
  }

  private handleGameDebug(socket: Socket, data: { action: string; floor?: number; invincible?: boolean }): void {
    // 只在 DEV 模式处理调试命令
    if (process.env.NODE_ENV === 'production') return;

    this.requireAuth(socket, (session) => {
      if (!session.currentRoom) return;

      const gameRoom = this.gameManager.getRoom(session.currentRoom);
      if (!gameRoom) return;

      gameRoom.handleDebugCommand(session.accountId, data.action, data);
    });
  }

  private handleDisconnect(socket: Socket): void {
    const session = this.sessions.get(socket.id);
    if (!session) {
      console.log(`🔌 Client disconnected: ${socket.id} (no session)`);
      return;
    }

    const accountId = session.accountId;
    // Remove socket.id mapping immediately (socket is dead)
    this.sessions.delete(socket.id);

    // Start grace period — don't remove player immediately (handles page refresh)
    const disconnectTimer = setTimeout(() => {
      // Grace period expired: actually remove player from room/game
      if (session.currentRoom) {
        const room = this.lobbyManager.leaveRoom(session.currentRoom, accountId);
        if (room && room.status === 'playing') {
          const gameRoom = this.gameManager.getRoom(session.currentRoom);
          if (gameRoom) {
            gameRoom.removePlayer(accountId);
            if (gameRoom.getPlayerCount() === 0) {
              this.gameManager.removeRoom(session.currentRoom);
            }
          }
        }
      }
      this.accountSessions.delete(accountId);
      console.log(`🔌 Grace period expired for ${session.username}, removed from room`);
    }, SocketServer.RECONNECT_GRACE_MS);

    // Update accountSessions with timer
    const existing = this.accountSessions.get(accountId);
    if (existing) {
      existing.disconnectTimer = disconnectTimer;
    }

    console.log(`🔌 Client disconnected: ${socket.id} (${session.username}), ${SocketServer.RECONNECT_GRACE_MS / 1000}s grace period started`);
  }

  private startStateBroadcast(): void {
    // Broadcast game state at 10Hz
    this.stateUpdateInterval = setInterval(() => {
      for (const [roomId, gameRoom] of this.gameManager['rooms']) {
        if (gameRoom.isRunning()) {
          const state = gameRoom.getState();
          this.io.to(`room:${roomId}`).emit(GameMessages.STATE, state);

          // Check for floor change
          if (gameRoom.consumeFloorChanged()) {
            this.io.to(`room:${roomId}`).emit('game:floor:start', {
              floor: state.floor,
              gameSession: gameRoom.getGameSession()
            });
          }
        } else if (gameRoom.consumeGameOver()) {
          // Game ended — reset room to waiting so others can find it
          const victory = gameRoom.consumeVictory();
          this.lobbyManager.resetRoom(roomId);
          this.io.to(`room:${roomId}`).emit('game:end', { win: victory });
          // Broadcast updated room list to all in lobby
          this.io.emit(LobbyMessages.LIST_RESULT, { rooms: this.lobbyManager.getAllRooms() });
        }
      }
    }, 100); // 10 times per second
  }
}
