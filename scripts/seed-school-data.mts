import { getPayload } from 'payload'
import { loadEnv } from 'payload/node'

const programs = [
  { name: 'Teknik Transmisi', code: 'TR', description: 'Teknologi jaringan transmisi digital', legacyCodes: ['TT', 'ANIMASI'] },
  { name: 'Teknik Komputer dan Jaringan', code: 'TJKT', description: 'Jaringan komputer dan server', legacyCodes: ['TKJ'] },
  { name: 'Teknik Jaringan Akses', code: 'TJA', description: 'Sistem akses dan telekomunikasi', legacyCodes: ['BROADCASTING'] },
  { name: 'Pengembangan Perangkat Lunak dan Gim', code: 'PPLG', description: 'Coding aplikasi dan gim', legacyCodes: [] },
  { name: 'Desain Komunikasi Visual', code: 'DKV', description: 'Desain visual dan kreatif', legacyCodes: [] },
]

const grades = ['X', 'XI', 'XII']

const relationID = (value: unknown): string | number | undefined => {
  if (typeof value === 'string' || typeof value === 'number') return value
  if (value && typeof value === 'object' && 'id' in value) return relationID((value as { id: unknown }).id)
  return undefined
}

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
      const canonicalID = record?.id

      for (const duplicate of existing.docs.filter((item) => String(item.id) !== String(canonicalID))) {
        if (canonicalID === undefined) {
          throw new Error(`Tidak dapat menggabungkan ${String(duplicate.code)} tanpa record program tujuan ${program.code}.`)
        }
        // Free any unique program name before applying the canonical name.
        await payload.update({
          collection: 'programs',
          id: duplicate.id,
          data: { name: `Duplikat ${String(duplicate.code)} ${String(duplicate.id)}` },
          overrideAccess: true,
        })
        const duplicateClasses = await payload.find({
          collection: 'classes',
          where: { program: { equals: duplicate.id } },
          limit: 1000,
          overrideAccess: true,
        })
        for (const classRecord of duplicateClasses.docs) {
          const suffix = ` ${String(duplicate.code)}`
          const name = classRecord.name.endsWith(suffix)
            ? `${classRecord.name.slice(0, -suffix.length)} ${program.code}`
            : classRecord.name
          await payload.update({
            collection: 'classes',
            id: classRecord.id,
            data: { name, program: canonicalID },
            overrideAccess: true,
          })
        }

        const duplicateUsers = await payload.find({
          collection: 'users',
          where: { program: { equals: duplicate.id } },
          limit: 1000,
          overrideAccess: true,
        })
        for (const user of duplicateUsers.docs) {
          await payload.update({ collection: 'users', id: user.id, data: { program: canonicalID }, overrideAccess: true })
        }

        const targetedOpportunities = await payload.find({
          collection: 'opportunities',
          where: { targetPrograms: { equals: duplicate.id } },
          limit: 1000,
          depth: 0,
          overrideAccess: true,
        })
        for (const opportunity of targetedOpportunities.docs) {
          const targets = Array.isArray(opportunity.targetPrograms) ? opportunity.targetPrograms : []
          const targetPrograms = [...new Set(targets.map((target) => {
            const id = String(relationID(target) ?? target)
            return id === String(duplicate.id) ? String(canonicalID) : id
          }))]
          await payload.update({ collection: 'opportunities', id: opportunity.id, data: { targetPrograms }, overrideAccess: true })
        }

        await payload.delete({ collection: 'programs', id: duplicate.id, overrideAccess: true })
        console.info(`Duplikat ${String(duplicate.code)} dipindahkan ke ${program.code} dan dihapus.`)
      }

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
