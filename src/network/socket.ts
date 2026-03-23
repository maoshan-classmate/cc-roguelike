import { io, Socket }from 'socket.io-client'

class NetworkClient {
  private socket: Socket | null = null
  private listeners: Map<string, Set<(data: any) => void>> = new Map()

  connect(token?: string) {
    if (this.socket?.connected) return

    this.socket = io({
      auth: { token },
      transports: ['websocket']
    })

    this.socket.on('connect', () => {
      console.log('Connected to server')
    })

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server')
    })

    this.socket.on('error', (error: any) => {
      console.error('Socket error:', error)
    })
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  emit(event: string, data?: any) {
    if (this.socket) {
      this.socket.emit(event, data)
    }
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)

    if (this.socket) {
      this.socket.on(event, callback)
    }
  }

  off(event: string, callback?: (data: any) => void) {
    if (callback) {
      this.listeners.get(event)?.delete(callback)
      this.socket?.off(event, callback)
    } else {
      this.listeners.get(event)?.forEach(cb => {
        this.socket?.off(event, cb)
      })
      this.listeners.delete(event)
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
