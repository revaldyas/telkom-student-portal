import { isCMSAdmin } from '../lib/isCMSAdmin'
import type { CollectionConfig } from 'payload'

/**
 * Project tracker. Semua akses dikunci untuk admin CMS; anggota tim dan guru pembimbing
 * berinteraksi lewat /api/tracker/* yang memeriksa keanggotaan proyek.
 */
const adminOnly = {
  read: ({ req }: { req: { user?: unknown } }) => isCMSAdmin(req.user),
  create: ({ req }: { req: { user?: unknown } }) => isCMSAdmin(req.user),
  update: ({ req }: { req: { user?: unknown } }) => isCMSAdmin(req.user),
  delete: ({ req }: { req: { user?: unknown } }) => isCMSAdmin(req.user),
}

export const ProjectTasks: CollectionConfig = {
  slug: 'project-tasks',
  labels: { singular: 'Tugas Proyek', plural: 'Tugas Proyek' },
  admin: { group: 'Tracker', useAsTitle: 'title', defaultColumns: ['title', 'project', 'status', 'priority', 'dueDate'] },
  access: adminOnly,
  fields: [
    { name: 'project', type: 'relationship', relationTo: 'projects', required: true, index: true },
    { name: 'title', label: 'Judul', type: 'text', required: true, maxLength: 160 },
    { name: 'description', label: 'Deskripsi', type: 'textarea', maxLength: 4000 },
    { name: 'status', label: 'Status', type: 'text', defaultValue: 'todo', index: true, admin: { description: 'todo, doing, review, atau done' } },
    { name: 'priority', label: 'Prioritas', type: 'text', defaultValue: 'medium', admin: { description: 'low, medium, high, atau urgent' } },
    { name: 'assignees', label: 'Penanggung jawab', type: 'json', admin: { description: 'Daftar ID pengguna' } },
    { name: 'dueDate', label: 'Tenggat', type: 'date' },
    { name: 'position', label: 'Urutan', type: 'number', defaultValue: 0 },
    { name: 'labels', label: 'Label', type: 'json' },
    { name: 'checklist', label: 'Daftar periksa', type: 'json', admin: { description: 'Daftar {id, text, done}' } },
    { name: 'createdBy', label: 'Dibuat oleh', type: 'relationship', relationTo: 'users' },
    { name: 'completedAt', label: 'Selesai pada', type: 'date' },
  ],
}

export const ProjectTaskComments: CollectionConfig = {
  slug: 'project-task-comments',
  labels: { singular: 'Komentar Tugas', plural: 'Komentar Tugas' },
  admin: { group: 'Tracker', useAsTitle: 'body', defaultColumns: ['body', 'author', 'task', 'createdAt'] },
  access: adminOnly,
  fields: [
    { name: 'task', type: 'relationship', relationTo: 'project-tasks', required: true, index: true },
    { name: 'author', type: 'relationship', relationTo: 'users', required: true },
    { name: 'body', label: 'Isi', type: 'textarea', required: true, maxLength: 2000 },
  ],
}

export const ProjectActivity: CollectionConfig = {
  slug: 'project-activity',
  labels: { singular: 'Aktivitas Proyek', plural: 'Aktivitas Proyek' },
  admin: { group: 'Tracker', useAsTitle: 'summary', defaultColumns: ['summary', 'actor', 'project', 'createdAt'] },
  access: adminOnly,
  fields: [
    { name: 'project', type: 'relationship', relationTo: 'projects', required: true, index: true },
    { name: 'task', label: 'ID Tugas', type: 'number', index: true },
    { name: 'actor', type: 'relationship', relationTo: 'users' },
    { name: 'action', label: 'Aksi', type: 'text', required: true, maxLength: 40 },
    { name: 'summary', label: 'Ringkasan', type: 'text', required: true, maxLength: 400 },
    { name: 'meta', label: 'Data tambahan', type: 'json' },
  ],
}
