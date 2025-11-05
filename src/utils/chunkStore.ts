import { openDB } from 'idb'
import type { DBSchema, IDBPDatabase } from 'idb'
import type { TranscriptChunk } from '~types/transcript'

interface ChunkDB extends DBSchema {
  'transcript-chunks': {
    key: string
    value: TranscriptChunk
  }
}

let dbInstance: IDBPDatabase<ChunkDB> | null = null

async function initDB(): Promise<IDBPDatabase<ChunkDB>> {
  if (!dbInstance) {
    dbInstance = await openDB<ChunkDB>('youtube-learn-chunks', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('transcript-chunks')) {
          db.createObjectStore('transcript-chunks', { keyPath: 'id' })
        }
      }
    })
  }
  return dbInstance
}

export async function saveChunks(chunks: TranscriptChunk[], _videoId: string): Promise<void> {
  const db = await initDB()
  const tx = db.transaction('transcript-chunks', 'readwrite')
  for (const chunk of chunks) {
    await tx.store.put(chunk)
  }
  await tx.done
}

export async function getChunks(chunkIds: string[]): Promise<TranscriptChunk[]> {
  const db = await initDB()
  const out: TranscriptChunk[] = []
  for (const id of chunkIds) {
    const c = await db.get('transcript-chunks', id)
    if (c) out.push(c)
  }
  return out
}

export async function clearVideoChunks(videoId: string): Promise<void> {
  const db = await initDB()
  const keys = await db.getAllKeys('transcript-chunks')
  const tx = db.transaction('transcript-chunks', 'readwrite')
  for (const key of keys) {
    if (typeof key === 'string' && key.startsWith(`${videoId}-chunk-`)) {
      await tx.store.delete(key)
    }
  }
  await tx.done
}

