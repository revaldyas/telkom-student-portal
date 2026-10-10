import { getPayload } from 'payload'
import { loadEnv } from 'payload/node'

const sampleCount = 25
const sampleNames = [
  'Alya Putri Maharani',
  'Arka Pradipta',
  'Nara Azzahra Putri',
  'Keanu Adyatama',
  'Zayyan Alfarizi',
  'Kirana Ayu Lestari',
  'Rafael Danendra',
  'Naura Khairunnisa',
  'Elvano Dwi Saputra',
  'Freya Anindita',
  'Raka Mahendra',
  'Zahra Safitri',
  'Alvaro Rizky Pratama',
  'Kayla Putri Ramadhani',
  'Daffa Fathir',
  'Adreena Salsabila',
  'Gavin Aryasatya',
  'Cinta Kirani',
  'Rayyan Fadhlan',
  'Luna Maharani',
  'Farrel Adiwangsa',
  'Aurelia Nasywa',
  'Naufal Dzaky',
  'Mikayla Anjani',
  'Rafi Althaf',
]

async function main() {
  loadEnv()
  const config = (await import('../payload.config.ts')).default
  const payload = await getPayload({ config })

  try {
    const classes = await payload.find({
      collection: 'classes',
      limit: 100,
      overrideAccess: true,
    })

    if (classes.docs.length === 0) {
      throw new Error('Koleksi kelas masih kosong. Jalankan npm run seed:school terlebih dahulu.')
    }

    for (let index = 1; index <= sampleCount; index += 1) {
      const nis = `SAMPLE-${String(index).padStart(4, '0')}`
      const existing = await payload.find({
        collection: 'students',
        where: { nis: { equals: nis } },
        limit: 1,
        overrideAccess: true,
      })

      const classRecord = classes.docs[(index - 1) % classes.docs.length]
      const name = sampleNames[index - 1]

      if (existing.docs.length > 0) {
        if (nis.startsWith('SAMPLE-') && existing.docs[0].name !== name) {
          await payload.update({
            collection: 'students',
            id: existing.docs[0].id,
            data: { name, class: classRecord.id },
            overrideAccess: true,
          })
        }
        continue
      }

      await payload.create({
        collection: 'students',
        data: {
          nis,
          name,
          class: classRecord.id,
        },
        overrideAccess: true,
      })
    }

    console.info(`Seeding selesai: ${sampleCount} data siswa contoh.`)
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
