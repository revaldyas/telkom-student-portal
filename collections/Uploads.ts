import { isCMSAdmin } from '../lib/isCMSAdmin'
import { readFile, unlink } from 'node:fs/promises'
import sharp from 'sharp'
import type { CollectionConfig } from 'payload'

export const Uploads: CollectionConfig = {
  slug: 'uploads',
  labels: { singular: 'Berkas', plural: 'Berkas' },
  upload: {
    staticDir: 'public/media',
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  admin: { group: 'Media', useAsTitle: 'filename', defaultColumns: ['filename', 'mimeType', 'filesize', 'createdAt'] },
  hooks: {
    beforeOperation: [async ({ operation, req }) => {
      if (operation !== 'create' && operation !== 'update') return
      const file = req.file
      if (!file) return

      const source = file.tempFilePath ? await readFile(file.tempFilePath) : file.data
      const compressed = await sharp(source, { failOn: 'none' })
        .rotate()
        .resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82, effort: 5 })
        .toBuffer()

      if (file.tempFilePath) await unlink(file.tempFilePath).catch(() => {})
      req.file = {
        ...file,
        data: compressed,
        name: `${file.name.replace(/\.[^.]+$/, '')}.webp`,
        mimetype: 'image/webp',
        size: compressed.length,
        tempFilePath: undefined,
      }
    }],
  },
  access: {
    read: () => true,
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => isCMSAdmin(req.user),
    delete: ({ req }) => isCMSAdmin(req.user),
  },
  fields: [
    { name: 'alt', label: 'Teks Alternatif', type: 'text', required: true },
  ],
}
