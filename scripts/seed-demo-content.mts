import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { getPayload } from 'payload'
import { loadEnv } from 'payload/node'

const imageDirectory = fileURLToPath(new URL('../public/demo-covers/pinterest-2026/', import.meta.url))
const schoolPrograms = [
  { code: 'TR', name: 'Teknik Transmisi', description: 'Teknologi jaringan transmisi digital', categories: [
    { code: 'TR-TRANSMISI', name: 'Perancangan Jaringan Transmisi', description: 'Desain jalur transmisi digital, backbone, dan link komunikasi.', image: 'telekom-5g.jpg', tools: ['QGIS', 'draw.io', 'Cisco Packet Tracer'], titles: ['Jalur Data Nusantara', 'Backbone Kota Terhubung', 'Rencana Link Digital'] },
    { code: 'TR-OPTIK', name: 'Instalasi Fiber Optik', description: 'Dokumentasi dan rancangan instalasi kabel serat optik.', image: 'server-rack.jpg', tools: ['OTDR', 'AutoCAD', 'Google Earth'], titles: ['Koneksi Cahaya Sekolah', 'Rute Fiber Cendekia', 'Instalasi Optik Mandiri'] },
    { code: 'TR-SINYAL', name: 'Visualisasi Sinyal & Spektrum', description: 'Visualisasi sinyal, spektrum frekuensi, dan propagasi gelombang.', image: 'telekom-5g.jpg', tools: ['GNU Radio', 'Python', 'Figma'], titles: ['Spektrum untuk Semua', 'Peta Sinyal Kota', 'Gelombang dalam Warna'] },
    { code: 'TR-TELEKOM', name: 'Infografik Teknologi Telekomunikasi', description: 'Materi visual edukasi tentang teknologi komunikasi dan transmisi.', image: 'brand-identity.jpg', tools: ['Figma', 'Illustrator', 'Photoshop'], titles: ['Dari BTS ke Gawai', 'Evolusi Jaringan Bergerak', 'Sinyal Sampai Tujuan'] },
  ] },
  { code: 'TJKT', name: 'Teknik Komputer dan Jaringan', description: 'Jaringan komputer dan server', categories: [
    { code: 'TJKT-TOPOLOGI', name: 'Topologi & Infrastruktur Jaringan', description: 'Perancangan LAN, WAN, topologi, dan infrastruktur jaringan komputer.', image: 'server-rack.jpg', tools: ['Cisco Packet Tracer', 'draw.io', 'MikroTik'], titles: ['Jaringan Lab Terpadu', 'Topologi Aman Sekolah', 'LAN untuk Ruang Kreatif'] },
    { code: 'TJKT-SERVER', name: 'Server & Virtualisasi', description: 'Konfigurasi server, layanan jaringan, dan virtualisasi.', image: 'server-rack.jpg', tools: ['Proxmox', 'Linux', 'Docker'], titles: ['Lab Server Hemat Energi', 'Virtualisasi untuk Belajar', 'Server Komunitas Karya'] },
    { code: 'TJKT-KEAMANAN', name: 'Keamanan & Monitoring Jaringan', description: 'Monitoring trafik, keamanan jaringan, dan pemantauan layanan.', image: 'telekom-5g.jpg', tools: ['Zabbix', 'Wireshark', 'MikroTik'], titles: ['Pantau Jaringan Kita', 'Jaga Akses Digital', 'Dashboard Kesehatan Server'] },
    { code: 'TJKT-HARDWARE', name: 'Perakitan & Pemeliharaan Komputer', description: 'Dokumentasi perakitan, perawatan, dan optimasi perangkat komputer.', image: 'server-rack.jpg', tools: ['Linux', 'Ventoy', 'CrystalDiskInfo'], titles: ['PC Siap Berkarya', 'Rakit Komputer Sekolah', 'Perawatan Komputer Terjadwal'] },
  ] },
  { code: 'TJA', name: 'Teknik Jaringan Akses', description: 'Sistem akses dan telekomunikasi', categories: [
    { code: 'TJA-FTTH', name: 'Jaringan FTTH & Akses Pelanggan', description: 'Rancangan jaringan fiber sampai ke rumah dan titik layanan pelanggan.', image: 'telekom-5g.jpg', tools: ['AutoCAD', 'QGIS', 'Google Earth'], titles: ['Fiber Sampai Rumah', 'Peta Akses Cibiru', 'Jalur Optik Warga'] },
    { code: 'TJA-ODP', name: 'Perangkat ODP, ODC & Instalasi', description: 'Dokumentasi perangkat distribusi optik dan praktik instalasi akses.', image: 'server-rack.jpg', tools: ['OTDR', 'Fusion Splicer', 'AutoCAD'], titles: ['Distribusi Optik Rapi', 'ODP Siap Layanan', 'Koneksi dari ODC'] },
    { code: 'TJA-WIRELESS', name: 'Jaringan Akses Nirkabel', description: 'Desain jaringan akses radio, Wi-Fi, dan konektivitas area.', image: 'telekom-5g.jpg', tools: ['MikroTik', 'Ekahau', 'draw.io'], titles: ['Wi-Fi untuk Ruang Belajar', 'Sinyal Merata di Balai', 'Akses Nirkabel Bersama'] },
    { code: 'TJA-LAYANAN', name: 'Layanan & Pengukuran Jaringan Akses', description: 'Pengukuran kualitas layanan dan pemecahan masalah koneksi akses.', image: 'brand-makeup.jpg', tools: ['OTDR', 'Speedtest', 'Google Sheets'], titles: ['Audit Koneksi Lingkungan', 'Kualitas Akses Terukur', 'Peta Gangguan Jaringan'] },
  ] },
  { code: 'PPLG', name: 'Pengembangan Perangkat Lunak dan Gim', description: 'Coding aplikasi dan gim', categories: [
    { code: 'PPLG-WEB', name: 'Aplikasi Web', description: 'Aplikasi web interaktif untuk kebutuhan sekolah dan komunitas.', image: 'ui-wireframes.jpg', tools: ['Next.js', 'TypeScript', 'PostgreSQL'], titles: ['Ruang Karya Digital', 'Kantin Terhubung', 'Portal Baca Bersama'] },
    { code: 'PPLG-MOBILE', name: 'Aplikasi Mobile', description: 'Rancangan dan implementasi aplikasi mobile.', image: 'product-photography.jpg', tools: ['Flutter', 'Dart', 'Figma'], titles: ['Saku Sehat', 'Jelajah Bandung', 'Teman Atur Waktu'] },
    { code: 'PPLG-GAME', name: 'Gim & Interaksi Digital', description: 'Gim edukasi, prototipe interaktif, dan pengalaman digital.', image: 'brand-makeup.jpg', tools: ['Godot', 'GDScript', 'Aseprite'], titles: ['Misi Bumi Bersih', 'Petualangan di Kota', 'Labirin Kata Nusantara'] },
    { code: 'PPLG-UIUX', name: 'UI/UX & Prototipe Produk Digital', description: 'Riset pengguna, alur, antarmuka, dan prototipe produk digital.', image: 'ui-wireframes.jpg', tools: ['Figma', 'FigJam', 'Maze'], titles: ['Alur Belajar Ringkas', 'Akses Layanan Sekolah', 'Desain Ulang Perpustakaan'] },
  ] },
  { code: 'DKV', name: 'Desain Komunikasi Visual', description: 'Desain visual dan kreatif', categories: [
    { code: 'DKV-BRAND', name: 'Brand Identity', description: 'Sistem identitas visual untuk brand, komunitas, dan produk lokal.', image: 'brand-identity.jpg', tools: ['Illustrator', 'Photoshop', 'Figma'], titles: ['Rona Rempah', 'Kebun Pagi', 'Kopi Sudut Kota'] },
    { code: 'DKV-GRAFIS', name: 'Graphic Design & Ilustrasi', description: 'Poster, infografik, ilustrasi, editorial, dan materi kampanye.', image: 'brand-makeup.jpg', tools: ['Illustrator', 'Photoshop', 'Procreate'], titles: ['Poster Baca Bareng', 'Cerita Sampah Kita', 'Warna Festival Lokal'] },
    { code: 'DKV-FOTO', name: 'Fotografi & Art Direction', description: 'Fotografi produk, editorial, potret, dan pengarah gaya visual.', image: 'product-photography.jpg', tools: ['Kamera digital', 'Lightroom', 'Photoshop'], titles: ['Produk Lokal dalam Cahaya', 'Cerita Pagi di Pasar', 'Potret Ruang Kreatif'] },
    { code: 'DKV-MOTION', name: 'Motion Graphic & Video', description: 'Motion poster, animasi grafis, dan video pendek untuk komunikasi visual.', image: 'telekom-5g.jpg', tools: ['After Effects', 'Premiere Pro', 'Illustrator'], titles: ['Gerak untuk Bumi', 'Identitas Bergerak', 'Satu Menit Berkarya'] },
  ] },
]

const legacyCategoryMap: Record<string, string> = {
  'UI/UX': 'PPLG-UIUX',
  'Web Development': 'PPLG-WEB',
  Branding: 'DKV-BRAND',
  'Graphic Design': 'DKV-GRAFIS',
  Photography: 'DKV-FOTO',
  Motion: 'DKV-MOTION',
}

const slugify = (value: string) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const idOf = (value: unknown): string | number | undefined => {
  if (typeof value === 'string' || typeof value === 'number') return value
  if (value && typeof value === 'object' && 'id' in value) return idOf((value as { id: unknown }).id)
  return undefined
}

async function main() {
  loadEnv()
  const config = (await import('../payload.config.ts')).default
  const payload = await getPayload({ config })

  try {
    // This seed reads student/user records to associate demo work, but never creates,
    // updates, or deletes either collection.
    const [programResponse, classResponse, studentResponse, userResponse, oldCategoryResponse, portfolioResponse, projectResponse] = await Promise.all([
      payload.find({ collection: 'programs', limit: 1000, pagination: false, depth: 0, overrideAccess: true }),
      payload.find({ collection: 'classes', limit: 1000, pagination: false, depth: 0, overrideAccess: true }),
      payload.find({ collection: 'students', limit: 1000, pagination: false, depth: 0, overrideAccess: true }),
      payload.find({ collection: 'users', limit: 1000, pagination: false, depth: 0, overrideAccess: true }),
      payload.find({ collection: 'portfolio-categories', limit: 1000, pagination: false, depth: 0, overrideAccess: true }),
      payload.find({ collection: 'portfolios', limit: 1000, pagination: false, depth: 0, overrideAccess: true }),
      payload.find({ collection: 'projects', limit: 1000, pagination: false, depth: 0, overrideAccess: true }),
    ])

    const programByID = new Map(programResponse.docs.map((item) => [String(item.id), String(item.code)]))
    const classProgramByID = new Map(classResponse.docs.map((item) => [String(item.id), programByID.get(String(idOf(item.program)))]))
    const usersByNis = new Map(userResponse.docs.map((item) => [String(item.nis ?? ''), item]))
    const studentSamples = studentResponse.docs
      .filter((student) => String(student.nis ?? '').startsWith('SAMPLE-'))
      .sort((a, b) => String(a.nis).localeCompare(String(b.nis)))
    if (studentSamples.length === 0) throw new Error('Tidak ditemukan data siswa contoh. Tambahkan data demo terlebih dahulu; seed ini tidak membuat atau mengubah siswa.')

    const samplesByProgram = new Map<string, Array<{ nis: string; name: string; userID: string | number }>>(schoolPrograms.map((program) => [program.code, []]))
    for (const student of studentSamples) {
      const user = usersByNis.get(String(student.nis))
      if (!user || user.role !== 'student') throw new Error(`Akun siswa contoh untuk NIS ${String(student.nis)} harus sudah tersedia. Seed tidak akan membuat atau mengubah akun.`)
      const programCode = String(user.program ? programByID.get(String(idOf(user.program))) ?? '' : classProgramByID.get(String(idOf(student.class))) ?? '')
      if (!samplesByProgram.has(programCode)) throw new Error(`Program siswa ${String(student.nis)} tidak dikenali (${programCode || 'kosong'}).`)
      samplesByProgram.get(programCode)!.push({ nis: String(student.nis), name: String(student.name), userID: user.id })
    }
    const activePrograms = schoolPrograms.filter((program) => samplesByProgram.get(program.code)!.length > 0)
    const allSampleUsers = schoolPrograms.flatMap((program) => samplesByProgram.get(program.code)!)

    const categoryByCode = new Map<string, string | number>()
    const allCategories = schoolPrograms.flatMap((program) => program.categories)
    for (const category of allCategories) {
      const existing = oldCategoryResponse.docs.find((item) => item.code === category.code || item.name === category.name)
      const record = existing
        ? await payload.update({ collection: 'portfolio-categories', id: existing.id, data: { name: category.name, code: category.code, description: category.description }, overrideAccess: true })
        : await payload.create({ collection: 'portfolio-categories', data: { name: category.name, code: category.code, description: category.description }, overrideAccess: true })
      categoryByCode.set(category.code, record.id)
    }

    const oldCategoryByID = new Map(oldCategoryResponse.docs.map((item) => [String(item.id), String(item.code)]))
    const sampleUserIDs = new Set(studentSamples.map((student) => String(usersByNis.get(String(student.nis))!.id)))
    const samplePortfolios = portfolioResponse.docs.filter((portfolio) => sampleUserIDs.has(String(idOf(portfolio.student))))
    const nonDemoPortfolios = portfolioResponse.docs.filter((portfolio) => !sampleUserIDs.has(String(idOf(portfolio.student))))
    let remappedPortfolioCount = 0
    for (const portfolio of nonDemoPortfolios) {
      const oldCode = oldCategoryByID.get(String(idOf(portfolio.categoryRef))) ?? String(portfolio.category ?? '')
      const replacementCode = legacyCategoryMap[oldCode]
      if (replacementCode) {
        await payload.update({ collection: 'portfolios', id: portfolio.id, data: { categoryRef: categoryByCode.get(replacementCode) }, overrideAccess: true })
        remappedPortfolioCount += 1
      }
    }

    const imageUploads = new Map<string, string | number>()
    const getUpload = async (filename: string, alt: string) => {
      const known = imageUploads.get(filename)
      if (known !== undefined) return known
      const path = `${imageDirectory}${filename}`
      if (!existsSync(path)) throw new Error(`Gambar Pinterest baru tidak ditemukan: ${path}`)
      const existing = await payload.find({ collection: 'uploads', where: { alt: { equals: alt } }, limit: 1, overrideAccess: true })
      const upload = existing.docs[0] ?? await payload.create({ collection: 'uploads', data: { alt }, filePath: path, overrideAccess: true })
      imageUploads.set(filename, upload.id)
      return upload.id
    }

    let createdPortfolios = 0
    let updatedPortfolios = 0
    let portfolioIndex = 0
    for (const program of activePrograms) {
      const students = samplesByProgram.get(program.code)!
      for (const category of program.categories) {
        for (let sampleIndex = 0; sampleIndex < 5; sampleIndex += 1) {
          const student = students[(program.categories.indexOf(category) * 5 + sampleIndex) % students.length]
          const titleVariant = sampleIndex >= category.titles.length ? ` — ${sampleIndex === 3 ? 'Eksplorasi' : 'Implementasi'}` : ''
          const title = `${category.name} · ${category.titles[sampleIndex % category.titles.length]}${titleVariant} — ${student.name}`
          const slug = slugify(title)
          const coverImage = await getUpload(category.image, `Pinterest 2026 — ${category.name}`)
          const data = {
            title,
            slug,
            student: student.userID,
            categoryRef: categoryByCode.get(category.code)!,
            category: category.code,
            summary: `${category.description} Karya ini dibuat oleh siswa ${program.name} sebagai latihan penerapan kompetensi, dokumentasi proses, dan solusi yang relevan dengan kebutuhan sekitar.`,
            coverImage,
            year: 2026,
            tools: category.tools,
            status: 'published' as const,
            verificationStatus: 'verified' as const,
            featured: sampleIndex === 0,
          }
          const existing = samplePortfolios[portfolioIndex]
          if (existing) {
            await payload.update({ collection: 'portfolios', id: existing.id, data, overrideAccess: true })
            updatedPortfolios += 1
          } else {
            await payload.create({ collection: 'portfolios', data, overrideAccess: true })
            createdPortfolios += 1
          }
          portfolioIndex += 1
        }
      }
    }
    for (const stale of samplePortfolios.slice(portfolioIndex)) {
      await payload.delete({ collection: 'portfolios', id: stale.id, overrideAccess: true })
    }

    const teacherUsers = userResponse.docs.filter((item) => item.role === 'teacher')
    const projects = [
      { title: 'Jaringan Cerdas Sekolah', category: 'TJKT-TOPOLOGI', program: 'TJKT', members: ['Konfigurasi jaringan', 'Dashboard monitoring', 'Dokumentasi teknis'] },
      { title: 'Peta Konektivitas Warga', category: 'TJA-FTTH', program: 'TJA', members: ['Pemetaan titik akses', 'Rancangan distribusi', 'Infografik layanan'] },
      { title: 'RuangKarya Digital', category: 'PPLG-WEB', program: 'PPLG', members: ['Pengembangan aplikasi', 'Riset dan UI/UX', 'Pengujian produk'] },
      { title: 'Kampanye Hemat Energi Digital', category: 'DKV-GRAFIS', program: 'DKV', members: ['Identitas kampanye', 'Produksi konten visual', 'Motion poster'] },
      { title: 'Peta Jalur Transmisi Interaktif', category: 'TR-TRANSMISI', program: 'TR', members: ['Pemetaan jaringan', 'Visualisasi data', 'Dokumentasi teknis'] },
    ]
    let createdProjects = 0
    for (let projectIndex = 0; projectIndex < projects.length; projectIndex += 1) {
      const project = projects[projectIndex]
      const programStudents = samplesByProgram.get(project.program)!
      const projectStudents = [...programStudents]
      for (const student of allSampleUsers) {
        if (projectStudents.length >= 3) break
        if (!projectStudents.some((item) => String(item.userID) === String(student.userID))) projectStudents.push(student)
      }
      const selectedStudents = projectStudents.length >= 2 ? projectStudents.slice(0, 3) : allSampleUsers.slice(projectIndex % allSampleUsers.length, projectIndex % allSampleUsers.length + 3)
      const members = selectedStudents.map((student, index) => ({ member: student.userID, contribution: project.members[index] ?? 'Kontributor proyek' }))
      const title = project.title
      const coverImage = await getUpload('ui-wireframes.jpg', `Pinterest 2026 — Sampul proyek kolaborasi`)
      const existing = projectResponse.docs.find((item) => item.title === title)
      const data = {
        title,
        slug: slugify(title),
        summary: `Proyek lintas kompetensi siswa ${schoolPrograms.find((item) => item.code === project.program)!.name}, berfokus pada solusi terapan yang dapat diuji dan dikembangkan bersama.`,
        categoryRef: categoryByCode.get(project.category)!,
        members,
        mentorAssignments: teacherUsers.slice(0, 2).map((teacher, index) => ({ mentor: teacher.id, assignmentRole: index === 0 ? 'primary' : 'supporting', response: 'accepted' })),
        createdBy: selectedStudents[0].userID,
        coverImage,
        year: 2026,
        tools: ['Figma', 'GitHub', 'Dokumentasi teknis'],
        verificationStatus: 'verified' as const,
        status: 'published' as const,
      }
      if (existing) await payload.update({ collection: 'projects', id: existing.id, data, overrideAccess: true })
      else { await payload.create({ collection: 'projects', data, overrideAccess: true }); createdProjects += 1 }
    }

    const programIDs = new Map(programResponse.docs.map((item) => [String(item.code), item.id]))
    const opportunities = [
      { title: 'Tel-Creation Digital Challenge', type: 'challenge', organizer: 'Telkom Student Creation', summary: 'Tantangan membuat solusi digital sederhana untuk kebutuhan sekolah dan lingkungan sekitar.', targets: ['PPLG', 'TJKT', 'TJA'], cover: 'ui-wireframes.jpg' },
      { title: 'Pameran Karya Muda Nusantara', type: 'exhibition', organizer: 'Ruang Kreatif Pelajar', summary: 'Pamerkan karya teknologi, desain, dan komunikasi visual kepada komunitas kreatif.', targets: ['TR', 'TJKT', 'TJA', 'PPLG', 'DKV'], cover: 'brand-identity.jpg' },
      { title: 'Kompetisi Infrastruktur Digital', type: 'competition', organizer: 'Forum Teknologi Sekolah', summary: 'Rancang infrastruktur jaringan yang aman, terukur, dan mudah dikelola.', targets: ['TR', 'TJKT', 'TJA'], cover: 'server-rack.jpg' },
      { title: 'Studio Kolaborasi Brand Lokal', type: 'collaboration', organizer: 'Kreasi Lokal Bandung', summary: 'Kolaborasi dengan usaha lokal untuk mengembangkan identitas dan materi promosi.', targets: ['DKV', 'PPLG'], cover: 'product-photography.jpg' },
      { title: 'Mentoring Produk Digital', type: 'mentoring', organizer: 'Komunitas Produk Bandung', summary: 'Sesi pendampingan riset, desain, dan pengembangan prototipe produk digital.', targets: ['PPLG', 'DKV'], cover: 'brand-makeup.jpg' },
    ]
    let createdOpportunities = 0
    for (const opportunity of opportunities) {
      const coverImage = await getUpload(opportunity.cover, `Pinterest 2026 — Peluang ${opportunity.title}`)
      const existing = await payload.find({ collection: 'opportunities', where: { title: { equals: opportunity.title } }, limit: 1, overrideAccess: true })
      const now = Date.now()
      const data = {
        title: opportunity.title,
        type: opportunity.type,
        organizer: opportunity.organizer,
        summary: opportunity.summary,
        requirements: 'Terbuka bagi siswa aktif. Sertakan ringkasan ide, anggota tim bila ada, dan contoh karya yang relevan.',
        coverImage,
        targetPrograms: opportunity.targets.map((code) => programIDs.get(code)).filter((value) => value !== undefined),
        opensAt: new Date(now - 7 * 86400000).toISOString(),
        deadline: new Date(now + 45 * 86400000).toISOString(),
        url: 'https://example.com/peluang',
        contact: 'Tim Tel-Creation',
        status: 'open' as const,
      }
      if (existing.docs[0]) await payload.update({ collection: 'opportunities', id: existing.docs[0].id, data, overrideAccess: true })
      else { await payload.create({ collection: 'opportunities', data, overrideAccess: true }); createdOpportunities += 1 }
    }

    // Remap projects still attached to old category records before removing the six legacy categories.
    for (const project of projectResponse.docs) {
      const oldCode = oldCategoryByID.get(String(idOf(project.categoryRef)))
      const replacementCode = oldCode ? legacyCategoryMap[oldCode] : undefined
      if (replacementCode) await payload.update({ collection: 'projects', id: project.id, data: { categoryRef: categoryByCode.get(replacementCode) }, overrideAccess: true })
    }
    for (const category of oldCategoryResponse.docs) {
      const reusedAsNewCategory = [...categoryByCode.values()].some((id) => String(id) === String(category.id))
      if (legacyCategoryMap[String(category.code)] && !reusedAsNewCategory) await payload.delete({ collection: 'portfolio-categories', id: category.id, overrideAccess: true })
    }

    console.info(`Seed demo selesai: ${allCategories.length} kategori, ${activePrograms.length} program dengan siswa contoh, ${updatedPortfolios + createdPortfolios} karya (${updatedPortfolios} diperbarui, ${createdPortfolios} dibuat), ${remappedPortfolioCount} karya non-demo direlasikan ulang, ${createdProjects} proyek baru dari ${projects.length} contoh, ${createdOpportunities} peluang baru dari ${opportunities.length} contoh.`)
    console.info('Data siswa dan pengguna hanya dibaca untuk relasi; tidak ada record siswa atau pengguna yang dibuat, diubah, atau dihapus.')
  } finally {
    await Promise.race([payload.destroy(), new Promise<void>((resolve) => { const timeout = setTimeout(resolve, 2500); timeout.unref() })])
  }
}

void main().then(() => process.exit(0), (error: unknown) => { console.error(error); process.exit(1) })
