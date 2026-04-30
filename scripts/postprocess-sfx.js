/**
 * 音效后处理脚本 - Tone.js 构建时工具
 * 为所有音效添加微妙混响，统一 Dark Ambient 暗色氛围。
 *
 * 运行：node scripts/postprocess-sfx.js
 *
 * 注意：此脚本依赖 Tone.js 的 OfflineAudioContext。
 * 如果 Node.js 环境不支持，脚本会优雅地跳过。
 */

const fs = require('fs')
const path = require('path')

const SFX_DIR = path.join(__dirname, '../src/assets/sfx')
const REVERB_DECAY = 0.5   // 混响衰减（秒）
const REVERB_WET = 0.12    // 混响湿度（0-1，0.12 = 微妙）

async function main() {
  console.log('=== 音效后处理（Tone.js Dark Ambient 层） ===')
  console.log(`输入/输出: ${SFX_DIR}`)
  console.log(`混响: decay=${REVERB_DECAY}s, wet=${REVERB_WET}\n`)

  let Tone
  try {
    Tone = await import('tone')
  } catch (err) {
    console.error('✗ Tone.js 加载失败:', err.message)
    console.error('  跳过后处理步骤。')
    process.exit(1)
  }

  const files = fs.readdirSync(SFX_DIR).filter(f => f.endsWith('.ogg'))
  if (files.length === 0) {
    console.log('没有 .ogg 文件需要处理，跳过。')
    process.exit(0)
  }

  let ok = 0, fail = 0, skip = 0

  for (const file of files) {
    const filePath = path.join(SFX_DIR, file)
    try {
      // 读取音频文件
      const arrayBuffer = fs.readFileSync(filePath).buffer

      // 使用 Tone.Offline 渲染带混响的音频
      const duration = 2 // 默认处理时长
      const buffer = await Tone.Offline(async ({ transport }) => {
        const player = new Tone.Player(arrayBuffer)
        const reverb = new Tone.Reverb({
          decay: REVERB_DECAY,
          wet: REVERB_WET,
        })
        player.chain(reverb, Tone.getDestination())
        player.start()
        await Tone.loaded()
      }, duration)

      // 导出为 WAV
      const wavData = bufferToWav(buffer)
      fs.writeFileSync(filePath, wavData)

      const sizeKb = (wavData.byteLength / 1024).toFixed(1)
      console.log(`✓ ${file} (${sizeKb} KB)`)
      ok++
    } catch (err) {
      console.warn(`⚠ ${file} - 跳过: ${err.message}`)
      skip++
    }
  }

  console.log(`\n=== 完成: ${ok} 处理, ${skip} 跳过, ${fail} 失败 ===`)
}

/**
 * AudioBuffer 转 WAV ArrayBuffer
 */
function bufferToWav(buffer) {
  const numChannels = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const format = 1 // PCM
  const bitsPerSample = 16

  const samples = []
  for (let ch = 0; ch < numChannels; ch++) {
    samples.push(buffer.getChannelData(ch))
  }

  const numFrames = samples[0].length
  const bytesPerSample = bitsPerSample / 8
  const blockAlign = numChannels * bytesPerSample
  const dataSize = numFrames * blockAlign
  const headerSize = 44
  const totalSize = headerSize + dataSize

  const arrayBuffer = new ArrayBuffer(totalSize)
  const view = new DataView(arrayBuffer)

  // WAV header
  writeString(view, 0, 'RIFF')
  view.setUint32(4, totalSize - 8, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true) // chunk size
  view.setUint16(20, format, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitsPerSample, true)
  writeString(view, 36, 'data')
  view.setUint32(40, dataSize, true)

  // Interleaved PCM data
  let offset = 44
  for (let i = 0; i < numFrames; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, samples[ch][i]))
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF
      view.setInt16(offset, intSample, true)
      offset += 2
    }
  }

  return arrayBuffer
}

function writeString(view, offset, str) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i))
  }
}

main().catch(err => {
  console.error('后处理脚本失败:', err)
  process.exit(1)
})
