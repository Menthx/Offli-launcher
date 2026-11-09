import { nativeImage } from 'electron'
import { type ImageStats, SAMPLE_WIDTH, pixelStats } from './titles'

/** Measures an image on a small copy decoded by Electron (PNG, JPEG) */
export async function imageStats(path: string): Promise<ImageStats | null> {
  const img = nativeImage.createFromPath(path)
  if (img.isEmpty()) return null
  const { width, height } = img.getSize()
  const small = width > SAMPLE_WIDTH ? img.resize({ width: SAMPLE_WIDTH, quality: 'good' }) : img
  return { width, height, ...pixelStats(small.toBitmap()) }
}
