import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '../store/useAuthStore'

class NetworkClient {
  private socket: Socket | null = null

  connect() {
    const token = useAuthStore.getState().token

    // If already connected but no token, reconnect with token
    if (this.socket?.connected && !token) {
      this.socket.disconnect()
      this.socket = null
    }

    if (this.socket?.connected) return

    // Socket.io 走 Vite proxy（开发模式）
    // 客户端访问 http://<服务端IP>:3000，proxy 转发到 localhost:3001
    this.socket = io('/', {
      auth: { token },
      transports: ['websocket', 'polling']
    })

    this.socket.on('connect', () => {
      console.log('[Socket] Connected to 3001')
    })

    this.socket.on('disconnect', () => {
      console.log('[Socket] Disconnected')
    })

    this.socket.on('connect_error', (err) => {
      console.log('[Socket] Connection error:', err.message)
    })
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  emit(event: string, data?: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data)
    }
  }

  on(event: string, callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on(event, callback)
    }
  }

  off(event: string, callback?: (data: any) => void) {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback)
      } else {
        this.socket.off(event)
      }
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false
  }

  getSocket(): Socket | null {
    return this.socket
  }
}

export const networkClient = new NetworkClient()
