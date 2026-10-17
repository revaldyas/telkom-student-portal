import { isCMSAdmin } from '../lib/isCMSAdmin'
import type { CollectionConfig } from 'payload'

/**
 * Koleksi pesan. Semua akses dikunci untuk admin CMS; siswa dan guru hanya berinteraksi
 * lewat endpoint /api/chat/* yang memeriksa keanggotaan, blokir, dan kepemilikan sendiri.
 */
const adminOnly = {
  read: ({ req }: { req: { user?: unknown } }) => isCMSAdmin(req.user),
  create: ({ req }: { req: { user?: unknown } }) => isCMSAdmin(req.user),
  update: ({ req }: { req: { user?: unknown } }) => isCMSAdmin(req.user),
  delete: ({ req }: { req: { user?: unknown } }) => isCMSAdmin(req.user),
}

export const ChatConversations: CollectionConfig = {
  slug: 'chat-conversations',
  labels: { singular: 'Percakapan', plural: 'Percakapan' },
  admin: { group: 'Pesan', useAsTitle: 'title', defaultColumns: ['title', 'kind', 'lastMessageAt'] },
  access: adminOnly,
  fields: [
    { name: 'kind', label: 'Jenis', type: 'text', required: true, index: true, admin: { description: 'dm, group, class, atau project' } },
    { name: 'refKey', label: 'Kunci Unik', type: 'text', required: true, unique: true, admin: { description: 'dm:1:2, class:ID, project:ID, atau group:UUID' } },
    { name: 'title', label: 'Judul', type: 'text', maxLength: 120 },
    { name: 'createdBy', label: 'Dibuat oleh', type: 'relationship', relationTo: 'users' },
    { name: 'photo', label: 'Foto grup', type: 'upload', relationTo: 'uploads' },
    { name: 'lastMessageAt', label: 'Pesan terakhir', type: 'date', index: true },
    { name: 'lastMessagePreview', label: 'Pratinjau pesan terakhir', type: 'text', maxLength: 160 },
    { name: 'lastMessageSender', label: 'Pengirim pesan terakhir', type: 'text', maxLength: 120 },
  ],
}

export const ChatMembers: CollectionConfig = {
  slug: 'chat-members',
  labels: { singular: 'Anggota Percakapan', plural: 'Anggota Percakapan' },
  admin: { group: 'Pesan', defaultColumns: ['conversation', 'user', 'role', 'status'] },
  access: adminOnly,
  fields: [
    { name: 'conversation', type: 'relationship', relationTo: 'chat-conversations', required: true, index: true },
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'role', label: 'Peran', type: 'text', defaultValue: 'member', admin: { description: 'owner, admin, atau member' } },
    { name: 'status', label: 'Status', type: 'text', defaultValue: 'active', admin: { description: 'invited, active, atau left' } },
    { name: 'invitedBy', label: 'Diundang oleh', type: 'relationship', relationTo: 'users' },
    { name: 'lastReadId', label: 'ID pesan terakhir dibaca', type: 'number', defaultValue: 0 },
  ],
}

export const ChatMessages: CollectionConfig = {
  slug: 'chat-messages',
  labels: { singular: 'Pesan', plural: 'Pesan' },
  admin: { group: 'Pesan', useAsTitle: 'body', defaultColumns: ['body', 'sender', 'conversation', 'createdAt'] },
  access: adminOnly,
  fields: [
    { name: 'conversation', type: 'relationship', relationTo: 'chat-conversations', required: true, index: true },
    { name: 'sender', type: 'relationship', relationTo: 'users', required: true },
    { name: 'body', label: 'Isi pesan', type: 'textarea', required: true, maxLength: 2000 },
    { name: 'deleted', label: 'Dihapus', type: 'checkbox', defaultValue: false },
  ],
}

export const ChatBlocks: CollectionConfig = {
  slug: 'chat-blocks',
  labels: { singular: 'Blokir', plural: 'Blokir' },
  admin: { group: 'Pesan', defaultColumns: ['blocker', 'blocked'] },
  access: adminOnly,
  fields: [
    { name: 'blocker', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'blocked', type: 'relationship', relationTo: 'users', required: true, index: true },
  ],
}

export const ChatReports: CollectionConfig = {
  slug: 'chat-reports',
  labels: { singular: 'Laporan Pesan', plural: 'Laporan Pesan' },
  admin: { group: 'Pesan', defaultColumns: ['reason', 'status', 'reporter', 'createdAt'] },
  access: adminOnly,
  fields: [
    { name: 'message', type: 'relationship', relationTo: 'chat-messages', required: true },
    { name: 'reporter', type: 'relationship', relationTo: 'users', required: true },
    { name: 'reason', label: 'Alasan', type: 'text', required: true, maxLength: 60 },
    { name: 'note', label: 'Catatan', type: 'textarea', maxLength: 500 },
    { name: 'status', label: 'Status', type: 'text', defaultValue: 'open', index: true, admin: { description: 'open, reviewed, atau dismissed' } },
  ],
}
