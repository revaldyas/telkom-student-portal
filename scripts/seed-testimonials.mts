import { getPayload } from 'payload'
import { loadEnv } from 'payload/node'

const testimonials = [
  { seedKey: 'sample-student-pplg-01', quote: 'Mengerjakan proyek dari awal sampai dipublikasikan membuat saya lebih berani mencoba ide baru dan belajar menyelesaikan masalah satu per satu.', name: 'Alya Pratama', role: 'Siswa contoh', program: 'PPLG' },
  { seedKey: 'sample-student-dkv-01', quote: 'Saya jadi paham bahwa desain yang baik bukan cuma terlihat menarik, tetapi juga harus mudah dipahami dan nyaman digunakan.', name: 'Nadia Putri', role: 'Siswa contoh', program: 'DKV' },
  { seedKey: 'sample-student-tjkt-01', quote: 'Bekerja bersama teman mengajarkan saya membagi tugas, mendengarkan masukan, dan menjaga proyek tetap berjalan sampai selesai.', name: 'Rizky Maulana', role: 'Siswa contoh', program: 'TJKT' },
  { seedKey: 'sample-student-tja-01', quote: 'Portofolio ini membantu saya melihat perkembangan kemampuan sendiri dan menyimpan proses di balik setiap karya.', name: 'Salsa Maharani', role: 'Siswa contoh', program: 'TJA' },
  { seedKey: 'sample-student-tr-01', quote: 'Saat mendapat masukan, saya belajar merevisi karya dengan tujuan yang lebih jelas. Prosesnya membuat saya semakin teliti.', name: 'Dimas Saputra', role: 'Siswa contoh', program: 'TR' },
  { seedKey: 'sample-mentor-01', quote: 'Melihat siswa saling berbagi ide dan mengembangkan karya menjadi pengalaman belajar yang berharga bagi seluruh komunitas.', name: 'Bapak Arif Setiawan', role: 'Guru contoh', program: 'Pembimbing komunitas' },
]

async function main() {
  loadEnv()
  const config = (await import('../payload.config.ts')).default
  const payload = await getPayload({ config })

  try {
    let created = 0
    let updated = 0
    for (const [index, testimonial] of testimonials.entries()) {
      const existing = await payload.find({
        collection: 'testimonials',
        where: { seedKey: { equals: testimonial.seedKey } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      const data = { ...testimonial, isSample: true, sortOrder: index + 1, status: 'published' as const }
      if (existing.docs[0]) {
        await payload.update({ collection: 'testimonials', id: existing.docs[0].id, data, overrideAccess: true })
        updated += 1
      } else {
        await payload.create({ collection: 'testimonials', data, overrideAccess: true })
        created += 1
      }
    }
    console.info(`Seeding testimoni selesai: ${created} dibuat, ${updated} diperbarui, ${testimonials.length} contoh ditayangkan.`)
  } finally {
    await Promise.race([
      payload.destroy(),
      new Promise<void>((resolve) => { const timeout = setTimeout(resolve, 2500); timeout.unref() }),
    ])
  }
}

void main().then(() => process.exit(0), (error: unknown) => { console.error(error); process.exit(1) })
