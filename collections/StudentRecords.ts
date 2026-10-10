import { isCMSAdmin } from '../lib/isCMSAdmin'
import type { CollectionConfig } from 'payload'

export const StudentRecords: CollectionConfig = {
  slug: 'student-records',
  labels: { singular: 'Riwayat Siswa', plural: 'Riwayat Siswa' },
  admin: {
    hidden: true,
    group: 'Komunitas',
    useAsTitle: 'title',
    defaultColumns: ['student', 'recordType', 'title', 'earnedAt'],
  },
  access: {
    read: ({ req }) => isCMSAdmin(req.user) ? true : false,
    create: ({ req }) => isCMSAdmin(req.user),
    update: ({ req }) => isCMSAdmin(req.user),
    delete: ({ req }) => isCMSAdmin(req.user),
  },
  fields: [
    { name: 'recordKey', label: 'Kunci Riwayat', type: 'text', required: true, unique: true, admin: { hidden: true } },
    { name: 'student', label: 'Siswa', type: 'relationship', relationTo: 'users', required: true },
    {
      name: 'recordType', label: 'Jenis Riwayat', type: 'select', required: true,
      options: [
        { label: 'Achievement', value: 'achievement' },
        { label: 'Penghargaan', value: 'award' },
      ],
    },
    { name: 'code', label: 'Kode', type: 'text', required: true },
    { name: 'title', label: 'Nama', type: 'text', required: true },
    { name: 'description', label: 'Keterangan', type: 'textarea' },
    { name: 'rank', label: 'Peringkat', type: 'number', min: 1 },
    { name: 'portfolio', label: 'Karya', type: 'relationship', relationTo: 'portfolios' },
    { name: 'award', label: 'Penghargaan', type: 'relationship', relationTo: 'awards' },
    { name: 'earnedAt', label: 'Tanggal Diraih', type: 'date', required: true },
  ],
}
