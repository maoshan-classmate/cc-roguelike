// Socket消息类型定义

export interface Packet {
  type: string;
  roomId?: string;
  data: any;
  seq?: number;
  ts?: number;
}

// 认证消息
export const AuthMessages = {
  REGISTER: 'auth:register',
  LOGIN: 'auth:login',
  LOGOUT: 'auth:logout',
  RESULT: 'auth:result',
  TOKEN_REFRESH: 'auth:refresh'
} as const;

// 大厅消息
export const LobbyMessages = {
  LIST: 'lobby:list',
  LIST_RESULT: 'lobby:list:result',
  CHAT: 'lobby:chat',
  CHAT_PUSH: 'lobby:chat:push',
  FRIEND_INVITE: 'friend:invite',
  FRIEND_INVITE_PUSH: 'friend:invite:push',
  FRIEND_INVITE_RESPONSE: 'friend:invite:response',
  FRIEND_LIST: 'friend:list',
  FRIEND_LIST_RESULT: 'friend:list:result'
} as const;

// 房间消息
export const RoomMessages = {
  CREATE: 'room:create',
  CREATE_RESULT: 'room:create:result',
  JOIN: 'room:join',
  JOIN_PUSH: 'room:join:push',
  LEAVE: 'room:leave',
  LEAVE_PUSH: 'room:leave:push',
  KICK: 'room:kick',
  READY: 'room:ready',
  READY_PUSH: 'room:ready:push',
  START: 'room:start',
  START_PUSH: 'room:start:push',
  ERROR: 'room:error',
  SETTINGS: 'room:settings',
  SETTINGS_PUSH: 'room:settings:push'
} as const;

// 游戏消息
export const GameMessages = {
  INPUT: 'game:input',
  INPUT_ACK: 'game:input:ack',
  STATE: 'game:state',
  EVENT: 'game:event',
  PLAYER_STATE: 'game:player:state',
  FLOOR_START: 'game:floor:start',
  FLOOR_COMPLETE: 'game:floor:complete',
  BOSS_SPAWN: 'game:boss:spawn',
  BOSS_PHASE: 'game:boss:phase',
  END: 'game:end',
  CHAT: 'game:chat',
  CHAT_PUSH: 'game:chat:push',
  DEBUG: 'game:debug'
} as const;

// 聊天消息
export const ChatMessages = {
  MESSAGE: 'chat:message',
  MESSAGE_PUSH: 'chat:message:push'
} as const;

// 错误码
export const ErrorCodes = {
  ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',
  ROOM_FULL: 'ROOM_FULL',
  NOT_HOST: 'NOT_HOST',
  ALREADY_IN_ROOM: 'ALREADY_IN_ROOM',
  NOT_IN_ROOM: 'NOT_IN_ROOM',
  GAME_IN_PROGRESS: 'GAME_IN_PROGRESS',
  AUTH_FAILED: 'AUTH_FAILED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  USERNAME_EXISTS: 'USERNAME_EXISTS',
  INSUFFICIENT_PLAYERS: 'INSUFFICIENT_PLAYERS'
} as const;
