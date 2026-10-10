import { getPayload } from 'payload'
import { loadEnv } from 'payload/node'

async function main() {
  loadEnv()
  const email = process.env.CMS_ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.CMS_ADMIN_PASSWORD
  const name = process.env.CMS_ADMIN_NAME?.trim() || 'Administrator CMS'
  if (!email || !password) {
    throw new Error('Atur CMS_ADMIN_EMAIL dan CMS_ADMIN_PASSWORD di .env sebelum menjalankan seed:cms-admin.')
  }
  if (password.length < 12) throw new Error('CMS_ADMIN_PASSWORD harus memiliki minimal 12 karakter.')

  const config = (await import('../payload.config.ts')).default
  const payload = await getPayload({ config })
  try {
    const existing = await payload.find({
      collection: 'admins',
      where: { email: { equals: email } },
      limit: 1,
      overrideAccess: true,
    })
    if (existing.docs.length) {
      console.info(`Akun CMS ${email} sudah tersedia; tidak ada perubahan.`)
    } else {
      await payload.create({
        collection: 'admins',
        data: { name, email, password },
        overrideAccess: true,
      })
      console.info(`Akun CMS ${email} berhasil dibuat.`)
    }
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
