import { getPayload } from 'payload'
import { loadEnv } from 'payload/node'

const programs = [
  { name: 'Pengembangan Perangkat Lunak dan Gim', code: 'PPLG' },
  { name: 'Teknik Jaringan Komputer dan Telekomunikasi', code: 'TJKT' },
  { name: 'Desain Komunikasi Visual', code: 'DKV' },
  { name: 'Animasi', code: 'ANIMASI' },
  { name: 'Broadcasting', code: 'BROADCASTING' },
]

const grades = ['X', 'XI', 'XII']

async function main() {
  loadEnv()
  const config = (await import('../payload.config.ts')).default
  const payload = await getPayload({ config })

  try {
    const programIDs = new Map<string, string | number>()

    for (const program of programs) {
      const existing = await payload.find({
        collection: 'programs',
        where: { code: { equals: program.code } },
        limit: 1,
        overrideAccess: true,
      })
      const record = existing.docs[0] ?? await payload.create({
        collection: 'programs',
        data: program,
        overrideAccess: true,
      })
      programIDs.set(program.code, record.id)
    }

    for (const program of programs) {
      for (const grade of grades) {
        const name = `${grade} ${program.code}`
        const existing = await payload.find({
          collection: 'classes',
          where: { name: { equals: name } },
          limit: 1,
          overrideAccess: true,
        })

        if (existing.docs.length === 0) {
          await payload.create({
            collection: 'classes',
            data: {
              name,
              program: programIDs.get(program.code)!,
            },
            overrideAccess: true,
          })
        }
      }
    }

    console.info(`Seeding selesai: ${programs.length} program keahlian dan ${programs.length * grades.length} kelas.`)
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
