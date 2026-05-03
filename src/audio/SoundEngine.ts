import { Howl } from 'howler'

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

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

  register(id: string, src: string | string[], options: Record<string, unknown> = {}): void {
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

  registerAll(definitions: Array<{ id: string; src: string | string[]; options?: Record<string, unknown> }>): void {
    for (const def of definitions) {
      this.register(def.id, def.src, def.options)
    }
  }

  play(id: string): void {
    if (this.muted) return

    const sound = this.sounds.get(id)
    if (!sound) {
      console.warn(`[SoundEngine] 音效 ${id} 未注册`)
      return
    }

    sound.play()
  }

  stop(id: string): void {
    const sound = this.sounds.get(id)
    if (sound) {
      sound.stop()
    }
  }

  stopAll(): void {
    for (const sound of this.sounds.values()) {
      sound.stop()
    }
  }

  setMasterVolume(volume: number): void {
    this.masterVolume = clamp01(volume)
    this.updateAllVolumes()
  }

  setSfxVolume(volume: number): void {
    this.sfxVolume = clamp01(volume)
    this.updateAllVolumes()
  }

  setMusicVolume(volume: number): void {
    this.musicVolume = clamp01(volume)
    this.updateAllVolumes()
  }

  toggleMute(): boolean {
    this.muted = !this.muted
    if (this.muted) {
      this.stopAll()
    }
    return this.muted
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    if (this.muted) {
      this.stopAll()
    }
  }

  isMuted(): boolean {
    return this.muted
  }

  private updateAllVolumes(): void {
    for (const sound of this.sounds.values()) {
      sound.volume(this.sfxVolume * this.masterVolume)
    }
  }

}

export const soundEngine = SoundEngine.getInstance()
