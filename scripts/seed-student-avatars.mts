import { getPayload } from 'payload'
import { loadEnv } from 'payload/node'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const avatarDirectory = fileURLToPath(new URL('../public/demo-avatars/', import.meta.url))
const avatarCount = 20

async function main() {
  loadEnv()
  const config = (await import('../payload.config.ts')).default
  const payload = await getPayload({ config })

  try {
    const response = await payload.find({ collection: 'users', limit: 1000, pagination: false, overrideAccess: true })
    const students = response.docs
      .filter((user) => user.role === 'student' && user.nis?.startsWith('SAMPLE-'))
      .sort((a, b) => (a.nis || '').localeCompare(b.nis || ''))
    if (students.length !== 25) throw new Error(`Dibutuhkan 25 akun siswa demo; ditemukan ${students.length}. Jalankan seed:portfolios terlebih dahulu.`)

    let uploadsCreated = 0
    let usersUpdated = 0
    for (const [index, student] of students.entries()) {
      const avatarIndex = (index % avatarCount) + 1
      const fileName = `${String(avatarIndex).padStart(2, '0')}.webp`
      const filePath = `${avatarDirectory}${fileName}`
      if (!existsSync(filePath)) throw new Error(`Foto avatar tidak ditemukan: ${filePath}`)

      const alt = `Foto profil demo ${student.nis}`
      const existingUpload = await payload.find({
        collection: 'uploads',
        where: { alt: { equals: alt } },
        limit: 1,
        overrideAccess: true,
      })
      const upload = existingUpload.docs[0] ?? await payload.create({
        collection: 'uploads',
        data: { alt },
        filePath,
        overrideAccess: true,
      })
      if (!existingUpload.docs[0]) uploadsCreated += 1

      const currentPhotoID = typeof student.profilePhoto === 'object' && student.profilePhoto
        ? student.profilePhoto.id
        : student.profilePhoto
      if (String(currentPhotoID || '') !== String(upload.id)) {
        await payload.update({
          collection: 'users',
          id: student.id,
          data: { profilePhoto: upload.id },
          overrideAccess: true,
        })
        usersUpdated += 1
      }
    }

    console.info(`Avatar seeding selesai: ${usersUpdated} akun siswa diperbarui, ${uploadsCreated} berkas avatar baru dari ${avatarCount} foto Pinterest.`)
  } finally {
    await Promise.race([
      payload.destroy(),
      new Promise<void>((resolve) => {
        const timeout = setTimeout(resolve, 2500)
        timeout.unref()
      }),
    ])
  }
}

void main().then(
  () => process.exit(0),
  (error: unknown) => {
    console.error(error)
    process.exit(1)
  },
)
