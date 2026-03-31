import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { SocketServer } from './network/SocketServer';
import { Database } from './data/Database';
import { AuthManager } from './lobby/AuthManager';
import { LobbyManager } from './lobby/LobbyManager';
import { GameManager } from './game/GameManager';

dotenv.config();

const app = express();
const httpServer = createServer(app);

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

const io = new Server(httpServer, {
  cors: {
    origin: true,
    credentials: true
  }
});

// Initialize database
const db = new Database();

// Initialize managers
const authManager = new AuthManager(db);
const lobbyManager = new LobbyManager();
const gameManager = new GameManager(db);

// Socket server
const socketServer = new SocketServer(io, authManager, lobbyManager, gameManager);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', players: gameManager.getPlayerCount() });
});

const PORT = process.env.SERVER_PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`🎮 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});
