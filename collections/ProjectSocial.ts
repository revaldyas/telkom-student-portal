import { isCMSAdmin } from '../lib/isCMSAdmin'
import type { CollectionConfig } from 'payload'

/** Suka dan komentar proyek. Akses dikunci untuk admin CMS; siswa berinteraksi lewat /api/community/projects/[id]/*. */
const adminOnly = {
  read: ({ req }: { req: { user?: unknown } }) => isCMSAdmin(req.user),
  create: ({ req }: { req: { user?: unknown } }) => isCMSAdmin(req.user),
  update: ({ req }: { req: { user?: unknown } }) => isCMSAdmin(req.user),
  delete: ({ req }: { req: { user?: unknown } }) => isCMSAdmin(req.user),
}

export const ProjectLikes: CollectionConfig = {
  slug: 'project-likes',
  labels: { singular: 'Suka Proyek', plural: 'Suka Proyek' },
  admin: { group: 'Proyek', useAsTitle: 'likeKey', defaultColumns: ['project', 'user', 'createdAt'] },
  access: adminOnly,
  fields: [
    { name: 'project', type: 'relationship', relationTo: 'projects', required: true, index: true },
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'likeKey', label: 'Kunci Suka', type: 'text', required: true, unique: true, admin: { readOnly: true, description: 'proyek:pengguna, mencegah suka ganda' } },
  ],
}

export const ProjectComments: CollectionConfig = {
  slug: 'project-comments',
  labels: { singular: 'Komentar Proyek', plural: 'Komentar Proyek' },
  admin: { group: 'Proyek', useAsTitle: 'body', defaultColumns: ['body', 'author', 'project', 'createdAt'] },
  access: adminOnly,
  fields: [
    { name: 'project', type: 'relationship', relationTo: 'projects', required: true, index: true },
    { name: 'author', type: 'relationship', relationTo: 'users', required: true },
    { name: 'body', label: 'Komentar', type: 'textarea', required: true, maxLength: 1200 },
  ],
}
