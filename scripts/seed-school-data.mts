import { getPayload } from 'payload'
import { loadEnv } from 'payload/node'

const programs = [
  { name: 'Teknik Transmisi', code: 'TT', description: 'Teknologi jaringan transmisi digital', legacyCodes: ['ANIMASI'] },
  { name: 'Teknik Komputer dan Jaringan', code: 'TKJ', description: 'Jaringan komputer dan server', legacyCodes: ['TJKT'] },
  { name: 'Teknik Jaringan Akses', code: 'TJA', description: 'Sistem akses dan telekomunikasi', legacyCodes: ['BROADCASTING'] },
  { name: 'Pengembangan Perangkat Lunak dan Gim', code: 'PPLG', description: 'Coding aplikasi dan gim', legacyCodes: [] },
  { name: 'Desain Komunikasi Visual', code: 'DKV', description: 'Desain visual dan kreatif', legacyCodes: [] },
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
        where: { code: { in: [program.code, ...program.legacyCodes] } },
        limit: 10,
        overrideAccess: true,
      })
      const record = existing.docs.find((item) => item.code === program.code)
        ?? existing.docs[0]
      const data = { name: program.name, code: program.code, description: program.description }
      const saved = record
        ? await payload.update({ collection: 'programs', id: record.id, data, overrideAccess: true })
        : await payload.create({ collection: 'programs', data, overrideAccess: true })
      programIDs.set(program.code, saved.id)
    }

    for (const program of programs) {
      for (const grade of grades) {
        const name = `${grade} ${program.code}`
        const legacyNames = program.legacyCodes.map((code) => `${grade} ${code}`)
        const existing = await payload.find({
          collection: 'classes',
          where: { name: { in: [name, ...legacyNames] } },
          limit: 10,
          overrideAccess: true,
        })
        const classRecord = existing.docs.find((item) => item.name === name) ?? existing.docs[0]

        if (classRecord) {
          if (classRecord.name !== name || String(classRecord.program) !== String(programIDs.get(program.code))) {
            await payload.update({
              collection: 'classes',
              id: classRecord.id,
              data: { name, program: programIDs.get(program.code)! },
              overrideAccess: true,
            })
          }
        } else {
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

    console.info(`Seeding selesai: ${programs.length} program keahlian dan ${programs.length * grades.length} kelas diperbarui.`)
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
