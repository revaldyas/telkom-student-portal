import { isCMSAdmin } from '../lib/isCMSAdmin'
import { randomUUID } from 'node:crypto'
import { readFile, unlink } from 'node:fs/promises'
import sharp from 'sharp'
import type { CollectionConfig } from 'payload'

export const Uploads: CollectionConfig = {
  slug: 'uploads',
  labels: { singular: 'Berkas', plural: 'Berkas' },
  upload: {
    staticDir: 'public/media',
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'application/pdf'],
  },
  admin: { group: 'Media', useAsTitle: 'alt', defaultColumns: ['mimeType', 'filesize', 'createdAt'], listSearchableFields: ['alt', 'filename'] },
  hooks: {
    beforeOperation: [({ req }) => {
      // Cloud storage persists the generated filename with a nested update. Do not
      // re-run the outer image crop as part of that metadata-only update.
      if (req.context?.skipCloudStorage && req.query && typeof req.query === 'object') {
        delete (req.query as Record<string, unknown>).uploadEdits
      }
    }, async ({ operation, req }) => {
      if (operation !== 'create' && operation !== 'update') return
      const file = req.file
      if (!file) return
      if (!file.mimetype.startsWith('image/')) return

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
    {
      name: 'alt',
      label: 'Teks Alternatif',
      type: 'text',
      required: true,
      defaultValue: () => `telkom-student-${randomUUID().slice(0, 8)}`,
      admin: { description: 'Dibuat otomatis (telkom-student-xxxxxxxx). Boleh diubah.' },
      hooks: {
        beforeValidate: [({ value }) => (typeof value === 'string' && value.trim() ? value : `telkom-student-${randomUUID().slice(0, 8)}`)],
      },
    },
  ],
}
