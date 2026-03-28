import { Server, Socket } from 'socket.io';
import { AuthManager } from '../lobby/AuthManager';
import { LobbyManager, RoomInfo } from '../lobby/LobbyManager';
import { GameManager } from '../game/GameManager';
import { AuthMessages, LobbyMessages, RoomMessages, GameMessages, ChatMessages, ErrorCodes } from '../proto/MessageTypes';

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
  private stateUpdateInterval: NodeJS.Timeout | null = null;

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
          // Restore session from token
          this.authManager.getCharacter(sessionData.accountId).then(character => {
            const session: Session = {
              accountId: sessionData.accountId,
              username: sessionData.username,
              characterId: character?.id || ''
            };
            this.sessions.set(socket.id, session);
            console.log(`🔌 Session restored for ${sessionData.username}`);
          });
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
      socket.on(GameMessages.INPUT, (data: any) => this.handleGameInput(socket, data));
      socket.on(GameMessages.CHAT, (data: { message: string }) => this.handleGameChat(socket, data));

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

      // Notify others
      socket.to(`room:${room.id}`).emit(RoomMessages.JOIN_PUSH, {
        player: { id: session.accountId, name: session.username, ready: false }
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

      if (room) {
        socket.to(`room:${room.id}`).emit(RoomMessages.LEAVE_PUSH, {
          playerId: session.accountId,
          newHostId: room.hostId
        });
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
      const validTypes = ['warrior', 'ranger', 'mage', 'healer'];
      if (!validTypes.includes(data.characterType)) return;
      await this.authManager.updateCharacterType(session.accountId, data.characterType);
    });
  }

  private handleGameInput(socket: Socket, data: any): void {
    this.requireAuth(socket, (session) => {
      if (!session.currentRoom) return;

      const gameRoom = this.gameManager.getRoom(session.currentRoom);
      if (!gameRoom || !gameRoom.isRunning()) return;

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

  private handleDisconnect(socket: Socket): void {
    const session = this.sessions.get(socket.id);
    if (session && session.currentRoom) {
      this.lobbyManager.leaveRoom(session.currentRoom, session.accountId);
    }
    this.sessions.delete(socket.id);
    console.log(`🔌 Client disconnected: ${socket.id}`);
  }

  private startStateBroadcast(): void {
    // Broadcast game state at 10Hz
    this.stateUpdateInterval = setInterval(() => {
      for (const [roomId, gameRoom] of this.gameManager['rooms']) {
        if (gameRoom.isRunning()) {
          const state = gameRoom.getState();
          this.io.to(`room:${roomId}`).emit(GameMessages.STATE, state);

          // Check for floor change
          if ((gameRoom as any)._floorChanged) {
            (gameRoom as any)._floorChanged = false;
            this.io.to(`room:${roomId}`).emit('game:floor:start', { floor: state.floor });
          }
        } else if ((gameRoom as any)._gameOver) {
          // Game ended
          const victory = (gameRoom as any)._victory;
          (gameRoom as any)._gameOver = false;
          this.io.to(`room:${roomId}`).emit('game:end', { win: victory });
        }
      }
    }, 100); // 10 times per second
  }
}
