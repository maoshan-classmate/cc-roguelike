import { io, Socket } from 'socket.io-client'

class NetworkClient {
  private socket: Socket | null = null

  connect() {
    if (this.socket?.connected) return

    // Connect directly to backend server on port 3001
    this.socket = io('http://localhost:3001', {
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
