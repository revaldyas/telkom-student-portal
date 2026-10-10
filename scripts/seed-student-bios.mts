import { getPayload } from 'payload'
import { loadEnv } from 'payload/node'

type Relation = number | string | { id: number | string; name?: string; program?: Relation } | null | undefined

const biosByCode: Record<string, string[]> = {
  PPLG: [
    'Aku {name}, siswa PPLG yang suka mengubah ide menjadi aplikasi yang mudah dipakai. Aku sedang mendalami desain antarmuka dan pengembangan web.',
    'Aku {name}, tertarik membangun produk digital dari awal—mulai dari mencari masalah, merancang alur, sampai mencoba kodenya.',
    'Aku {name}, siswa PPLG yang senang belajar pemrograman lewat proyek kecil dan kolaborasi. Saat ini aku banyak bereksperimen dengan web.',
    'Aku {name}, suka merancang pengalaman digital yang rapi lalu mewujudkannya menjadi aplikasi. Teknologi web jadi ruang belajarku sekarang.',
    'Aku {name}, siswa PPLG yang menikmati proses memecahkan masalah dengan kode dan membuat solusi digital yang bermanfaat.',
  ],
  TJKT: [
    'Aku {name}, siswa TJKT yang tertarik pada jaringan komputer dan cara perangkat saling terhubung. Aku senang belajar lewat praktik langsung.',
    'Aku {name}, suka memahami infrastruktur jaringan, konfigurasi perangkat, dan cara menjaga koneksi tetap andal.',
    'Aku {name}, siswa TJKT yang gemar bereksperimen dengan jaringan dan mencari solusi saat konektivitas bermasalah.',
    'Aku {name}, sedang memperdalam jaringan komputer dan keamanan dasar. Bagiku, praktik dan rasa ingin tahu berjalan beriringan.',
    'Aku {name}, tertarik membangun jaringan yang stabil dan membantu orang terhubung dengan teknologi secara lebih baik.',
  ],
  DKV: [
    'Aku {name}, siswa DKV yang suka menyampaikan ide lewat ilustrasi, tipografi, dan identitas visual yang kuat.',
    'Aku {name}, senang mengolah warna dan bentuk menjadi desain yang menarik sekaligus mudah dipahami.',
    'Aku {name}, siswa DKV yang tertarik pada branding dan desain grafis. Aku selalu mulai dengan mencari cerita di balik sebuah ide.',
    'Aku {name}, suka membuat visual yang punya tujuan—dari poster dan ilustrasi sampai identitas sebuah brand.',
    'Aku {name}, sedang mengeksplorasi desain komunikasi visual dan cara menyampaikan pesan dengan lebih kreatif.',
  ],
  ANIMASI: [
    'Aku {name}, siswa Animasi yang suka menghidupkan cerita melalui karakter, gerak, dan detail visual.',
    'Aku {name}, tertarik membuat animasi yang punya karakter. Aku senang belajar menggambar, menyusun adegan, dan mengatur timing.',
    'Aku {name}, siswa Animasi yang menikmati proses mengubah sketsa sederhana menjadi cerita bergerak.',
    'Aku {name}, suka mengeksplorasi gerak dan ekspresi untuk membuat karakter terasa hidup di layar.',
    'Aku {name}, sedang mengembangkan kemampuan animasi dan bercerita lewat visual, satu frame demi satu frame.',
  ],
  BROADCASTING: [
    'Aku {name}, siswa Broadcasting yang senang merangkai cerita menjadi konten audio visual. Aku tertarik pada kamera dan penyuntingan.',
    'Aku {name}, suka bekerja di balik proses produksi video—dari merancang konsep sampai menyunting hasil akhirnya.',
    'Aku {name}, siswa Broadcasting yang tertarik pada storytelling, produksi konten, dan cara gambar serta suara menyampaikan pesan.',
    'Aku {name}, senang membuat konten yang terasa dekat dengan penonton lewat perencanaan, pengambilan gambar, dan editing.',
    'Aku {name}, sedang belajar produksi media dan ingin terus bercerita melalui video, audio, dan format digital.',
  ],
}

async function main() {
  loadEnv()
  const config = (await import('../payload.config.ts')).default
  const payload = await getPayload({ config })

  try {
    const response = await payload.find({ collection: 'users', limit: 1000, pagination: false, depth: 2, overrideAccess: true })
    const students = response.docs
      .filter((user) => user.role === 'student' && user.nis?.startsWith('SAMPLE-'))
      .sort((a, b) => (a.nis || '').localeCompare(b.nis || ''))
    if (students.length !== 25) throw new Error(`Dibutuhkan 25 akun siswa demo; ditemukan ${students.length}.`)

    const studentDataResponse = await payload.find({ collection: 'students', limit: 1000, pagination: false, depth: 2, overrideAccess: true })
    const studentData = new Map(studentDataResponse.docs
      .filter((student) => student.nis.startsWith('SAMPLE-'))
      .map((student) => [student.nis, student]))
    if (studentData.size !== 25) throw new Error(`Dibutuhkan 25 data siswa contoh untuk mencocokkan jurusan; ditemukan ${studentData.size}.`)

    const resolveProgram = async (value: Relation): Promise<{ name: string; code?: string } | null> => {
      if (!value) return null
      const relation = typeof value === 'object' ? value : null
      if (relation?.name) return { name: relation.name, code: 'code' in relation && typeof relation.code === 'string' ? relation.code : undefined }
      const id = relation?.id ?? value
      if (typeof id !== 'number' && typeof id !== 'string') return null
      try {
        const program = await payload.findByID({ collection: 'programs', id, depth: 0, overrideAccess: true })
        return { name: program.name, code: program.code }
      } catch {
        return null
      }
    }

    const resolveClassProgram = async (value: Relation) => {
      if (!value) return null
      let classRecord: { program?: Relation }
      if (typeof value === 'object') classRecord = value
      else {
        try {
          classRecord = await payload.findByID({ collection: 'classes', id: value, depth: 1, overrideAccess: true })
        } catch {
          return null
        }
      }
      return resolveProgram(classRecord.program)
    }

    const updates: { id: number | string; bio: string }[] = []
    for (const [index, user] of students.entries()) {
      const classRelation = user.class as Relation
      const program = await resolveProgram(user.program as Relation)
        || await resolveClassProgram(classRelation)
        || await resolveClassProgram(studentData.get(user.nis || '')?.class as Relation)
      if (!program) throw new Error(`Program keahlian untuk ${user.name} (${user.nis}) tidak ditemukan.`)

      const code = program.code || Object.keys(biosByCode).find((key) => program.name.toLowerCase().includes(key.toLowerCase()))
      const templates = code ? biosByCode[code] : undefined
      if (!templates) throw new Error(`Belum ada template bio untuk program ${program.name} (${user.nis}).`)
      const template = templates[index % templates.length]
      updates.push({ id: user.id, bio: template.replace('{name}', user.name.split(' ')[0]) })
    }

    for (const update of updates) {
      await payload.update({ collection: 'users', id: update.id, data: { bio: update.bio }, overrideAccess: true })
    }
    console.info(`Seeding selesai: ${updates.length} bio siswa disesuaikan dengan program keahlian.`)
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
