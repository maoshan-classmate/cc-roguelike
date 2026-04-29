import { Howl } from 'howler'

/**
 * 音效引擎 - Howler.js 封装单例
 * 管理所有音效的加载、播放、音量控制
 */
class SoundEngine {
  private static instance: SoundEngine
  private sounds: Map<string, Howl> = new Map()
  private masterVolume: number = 1.0
  private sfxVolume: number = 0.7
  private musicVolume: number = 0.5
  private muted: boolean = false

  private constructor() {}

  static getInstance(): SoundEngine {
    if (!SoundEngine.instance) {
      SoundEngine.instance = new SoundEngine()
    }
    return SoundEngine.instance
  }

  /**
   * 注册音效
   */
  register(id: string, src: string | string[], options: any = {}): void {
    if (this.sounds.has(id)) {
      console.warn(`[SoundEngine] 音效 ${id} 已注册，跳过`)
      return
    }

    const { volume, ...restOptions } = options
    const howl = new Howl({
      src: Array.isArray(src) ? src : [src],
      ...restOptions,
    })
    howl.volume(this.sfxVolume * this.masterVolume)

    this.sounds.set(id, howl)
  }

  /**
   * 批量注册音效
   */
  registerAll(definitions: Array<{ id: string; src: string | string[]; options?: Partial<Howl> }>): void {
    for (const def of definitions) {
      this.register(def.id, def.src, def.options)
    }
  }

  /**
   * 播放音效
   */
  play(id: string): void {
    if (this.muted) return

    const sound = this.sounds.get(id)
    if (!sound) {
      console.warn(`[SoundEngine] 音效 ${id} 未注册`)
      return
    }

    sound.play()
  }

  /**
   * 停止音效
   */
  stop(id: string): void {
    const sound = this.sounds.get(id)
    if (sound) {
      sound.stop()
    }
  }

  /**
   * 停止所有音效
   */
  stopAll(): void {
    for (const sound of this.sounds.values()) {
      sound.stop()
    }
  }

  /**
   * 设置主音量
   */
  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume))
    this.updateAllVolumes()
  }

  /**
   * 设置音效音量
   */
  setSfxVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume))
    this.updateAllVolumes()
  }

  /**
   * 设置音乐音量
   */
  setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume))
    this.updateAllVolumes()
  }

  /**
   * 静音/取消静音
   */
  toggleMute(): boolean {
    this.muted = !this.muted
    if (this.muted) {
      this.stopAll()
    }
    return this.muted
  }

  /**
   * 设置静音状态
   */
  setMuted(muted: boolean): void {
    this.muted = muted
    if (this.muted) {
      this.stopAll()
    }
  }

  /**
   * 获取静音状态
   */
  isMuted(): boolean {
    return this.muted
  }

  /**
   * 更新所有音效的音量
   */
  private updateAllVolumes(): void {
    for (const sound of this.sounds.values()) {
      sound.volume(this.sfxVolume * this.masterVolume)
    }
  }

  /**
   * 预加载音效
   */
  preload(ids: string[]): Promise<void[]> {
    const promises = ids.map(id => {
      const sound = this.sounds.get(id)
      if (!sound) {
        return Promise.resolve()
      }

      return new Promise<void>((resolve) => {
        if (sound.state() === 'loaded') {
          resolve()
        } else {
          sound.once('load', resolve)
          sound.once('loaderror', () => {
            console.error(`[SoundEngine] 音效 ${id} 加载失败`)
            resolve()
          })
        }
      })
    })

    return Promise.all(promises)
  }

  /**
   * 获取已注册的音效列表
   */
  getRegisteredSounds(): string[] {
    return Array.from(this.sounds.keys())
  }

  /**
   * 检查音效是否已注册
   */
  has(id: string): boolean {
    return this.sounds.has(id)
  }

  /**
   * 销毁引擎
   */
  destroy(): void {
    this.stopAll()
    for (const sound of this.sounds.values()) {
      sound.unload()
    }
    this.sounds.clear()
  }
}

export const soundEngine = SoundEngine.getInstance()
