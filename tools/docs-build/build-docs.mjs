// Membuat PDF siap bagikan dari Markdown di docs/: Proposal.pdf dan Dokumentasi-Teknis.pdf (folder dist/).
// Alur: Markdown -> HTML (markdown-it) -> diagram Mermaid (SVG) -> paged.js (daftar isi, header/footer, pemotongan halaman) -> Chrome headless.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import MarkdownIt from 'markdown-it'
import { chromium } from 'playwright-core'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..', '..')
const docsDir = path.join(root, 'docs')
const outDir = path.join(root, 'dist')
const buildDir = path.join(here, '.build')
fs.mkdirSync(outDir, { recursive: true })
fs.mkdirSync(buildDir, { recursive: true })

const only = process.argv.slice(2)
const screen = (name) => pathToFileURL(path.join(here, 'assets', 'screens', `${name}.jpg`)).href
const fontsDir = path.join(here, 'node_modules', '@fontsource')

const fontFaces = [
  ['Inter', 400, 'normal', 'inter/files/inter-latin-400-normal.woff2'],
  ['Inter', 500, 'normal', 'inter/files/inter-latin-500-normal.woff2'],
  ['Inter', 600, 'normal', 'inter/files/inter-latin-600-normal.woff2'],
  ['Inter', 700, 'normal', 'inter/files/inter-latin-700-normal.woff2'],
  ['Source Serif 4', 400, 'normal', 'source-serif-4/files/source-serif-4-latin-400-normal.woff2'],
  ['Source Serif 4', 400, 'italic', 'source-serif-4/files/source-serif-4-latin-400-italic.woff2'],
  ['Source Serif 4', 600, 'normal', 'source-serif-4/files/source-serif-4-latin-600-normal.woff2'],
  ['Source Serif 4', 700, 'normal', 'source-serif-4/files/source-serif-4-latin-700-normal.woff2'],
  ['JetBrains Mono', 400, 'normal', 'jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2'],
  ['JetBrains Mono', 600, 'normal', 'jetbrains-mono/files/jetbrains-mono-latin-600-normal.woff2'],
].map(([family, weight, style, file]) => `@font-face{font-family:'${family}';font-weight:${weight};font-style:${style};font-display:block;src:url('${pathToFileURL(path.join(fontsDir, file)).href}') format('woff2')}`).join('\n')

const friendly = {
  'FEATURES.md': 'Daftar Fitur', 'ARCHITECTURE.md': 'Arsitektur', 'API.md': 'Referensi API', 'TESTING.md': 'Pengujian',
  'SIMULASI.md': 'Simulasi Adopsi', 'BIAYA-PENGEMBANGAN.md': 'Rincian Biaya Pengembangan', 'REKOMENDASI.md': 'Rekomendasi Pengembangan',
  'REKOMENDASI-IDENTITAS.md': 'Rekomendasi Identitas', 'REKOMENDASI-MIGRASI.md': 'Rekomendasi Migrasi', 'REKOMENDASI-REALTIME.md': 'Rekomendasi Realtime',
  'REKOMENDASI-KEAMANAN.md': 'Rekomendasi Keamanan', 'REKOMENDASI-FITUR.md': 'Rekomendasi Fitur', 'PROPOSAL.md': 'Proposal', 'PITCH-DECK.md': 'Pitch Deck',
}
const esc = (value) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const slug = (text) => text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'x'

/** Mengubah satu atau beberapa file Markdown menjadi HTML dengan heading terstruktur dan daftar isi. */
function renderDocs(files, mode, options = {}) {
  const used = new Set()
  const toc = []
  const includedIds = new Set(files.map((file) => file.replace(/\.md$/, '')))
  let chapterCount = 0
  const bodyParts = []

  for (const file of files) {
    const id = file.replace(/\.md$/, '')
    let source = fs.readFileSync(path.join(docsDir, file), 'utf8')
    // Dokumen Marp / manual daftar isi tidak dipakai di PDF.
    source = source.replace(/^---\n[\s\S]*?\n---\n/, '')
    source = source.replace(/\n## Daftar isi\n[\s\S]*?(?=\n## )/, '\n')
    if (mode === 'proposal') {
      source = source.slice(source.search(/^## /m))
      // Daftar berkas pendukung tidak berguna di PDF mandiri.
      source = source.replace(/### C\. Dokumen pendukung[\s\S]*$/, '### C. Dokumen pendukung\n\nDokumentasi teknis lengkap (fitur, arsitektur, referensi API, pengujian, simulasi, rincian biaya, dan rekomendasi pengembangan) tersedia sebagai dokumen terpisah: **Dokumentasi Teknis dan Rencana Pengembangan**.\n')
    }
    // Nama berkas pada teks tautan diganti nama dokumen yang mudah dibaca.
    source = source.replace(/\[([A-Z][A-Za-z-]*\.md)\]\(/g, (match, name) => `[${friendly[name] || name}](`)

    const md = new MarkdownIt({ html: false, linkify: false, typographer: false })
    const env = { first: true }

    md.core.ruler.push('heading-meta', (state) => {
      const tokens = state.tokens
      for (let index = 0; index < tokens.length; index += 1) {
        const token = tokens[index]
        if (token.type === 'heading_open') {
          const level = Number(token.tag.slice(1))
          const inline = tokens[index + 1]
          let title = inline.content
          let cls = ''
          let label = ''
          let tocLevel = 0
          const chapterLevel = mode === 'proposal' ? 2 : 1
          let hid = ''
          if (level === chapterLevel) {
            chapterCount += 1
            const numbered = title.match(/^(\d+)\.\s+(.*)$/)
            if (mode === 'proposal') {
              label = numbered ? `Bagian ${numbered[1].padStart(2, '0')}` : 'Lampiran'
              if (numbered) title = numbered[2]
            } else {
              label = `Bab ${String(chapterCount).padStart(2, '0')}`
            }
            cls = 'chap'
            const forceNew = mode === 'bundle' || (options.newPage || []).some((pattern) => pattern.test(`${numbered ? numbered[1] : ''}|${title}`)) || (!numbered && chapterCount > 1)
            if (forceNew) cls += ' new-page'
            tocLevel = 1
            hid = mode === 'bundle' ? `doc-${id}` : `${id}-${slug(title)}`
            inline.children = [Object.assign(new state.Token('text', '', 0), { content: title })]
          } else if (level === chapterLevel + 1) {
            cls = mode === 'bundle' ? 'sec' : ''
            if (mode === 'bundle') tocLevel = 2
            else if (!/^(Bagi|Bagi siswa)/.test(title)) tocLevel = 2
            hid = `${id}-${slug(title)}`
          } else {
            hid = `${id}-${slug(title)}`
          }
          if (mode === 'proposal' && level === 3) { cls = 'sec3' }
          let unique = hid
          let n = 2
          while (used.has(unique)) unique = `${hid}-${n++}`
          used.add(unique)
          token.attrSet('id', unique)
          if (cls) token.attrSet('class', cls.trim())
          if (label) token.attrSet('data-label', label)
          if (tocLevel) toc.push({ level: tocLevel, id: unique, title: title.replace(/[`*]/g, '') })
        }
      }
    })

    // Garis pemisah bagian ('---') tidak dipakai di PDF: struktur halaman diatur oleh judul.
    md.renderer.rules.hr = () => ''
    // Diagram Mermaid dirender di browser; blok kode lain tetap.
    const fence = md.renderer.rules.fence
    md.renderer.rules.fence = (tokens, i, opts, e, self) => {
      const token = tokens[i]
      if (token.info.trim() === 'mermaid') {
        let code = token.content
        // Diagram alir yang lebar dibuat vertikal agar teksnya terbaca di halaman A4.
        if (/^\s*flowchart LR/.test(code) && (code.match(/-->|-\.->|==>/g) || []).length > 5) code = code.replace('flowchart LR', 'flowchart TB')
        return `<figure class="diagram"><pre class="mermaid">${esc(code)}</pre></figure>\n`
      }
      return fence ? fence(tokens, i, opts, e, self) : `<pre><code>${esc(token.content)}</code></pre>\n`
    }
    // Tautan antardokumen menjadi rujukan di dalam PDF; tautan relatif lain menjadi teks.
    md.renderer.rules.link_open = (tokens, i) => {
      const href = tokens[i].attrGet('href') || ''
      if (/^https?:\/\//.test(href)) return `<a href="${esc(href)}">`
      const target = href.split('#')[0]
      const match = target.match(/^(?:\.\/)?([A-Za-z0-9_-]+)\.md$/)
      if (match && mode === 'bundle' && includedIds.has(match[1])) return `<a class="ref" href="#doc-${match[1]}">`
      if (href.startsWith('#')) return '<span class="ref">'
      return '<span class="ref">'
    }
    md.renderer.rules.link_close = (tokens, i) => {
      // Cari link_open pasangannya untuk menutup dengan tag yang sama.
      let depth = 0
      for (let j = i - 1; j >= 0; j -= 1) {
        if (tokens[j].type === 'link_close') depth += 1
        if (tokens[j].type === 'link_open') {
          if (depth === 0) {
            const href = tokens[j].attrGet('href') || ''
            const target = href.split('#')[0]
            const match = target.match(/^(?:\.\/)?([A-Za-z0-9_-]+)\.md$/)
            return /^https?:\/\//.test(href) || (match && mode === 'bundle' && includedIds.has(match[1])) ? '</a>' : '</span>'
          }
          depth -= 1
        }
      }
      return '</a>'
    }
    // Judul dijaga satu halaman dengan blok pertama di bawahnya (dan judul turunan yang langsung mengikutinya).
    md.core.ruler.push('heading-keep', (state) => {
      const tokens = state.tokens
      const blockEnd = (start) => {
        // Indeks token terakhir dari blok yang dimulai di `start`.
        if (tokens[start].nesting !== 1) return start
        let depth = 0
        for (let j = start; j < tokens.length; j += 1) {
          depth += tokens[j].nesting
          if (depth === 0) return j
        }
        return start
      }
      const wrapped = []
      let index = 0
      while (index < tokens.length) {
        if (tokens[index].type === 'heading_open') {
          const headingClass = tokens[index].attrGet('class') || ''
          const forceNew = /\bnew-page\b/.test(headingClass)
          if (forceNew) tokens[index].attrSet('class', headingClass.replace(/\s*new-page\b/, ''))
          const open = new state.Token('html_block', '', 0); open.content = `<div class="hk${forceNew ? ' new-page' : ''}">\n`
          const close = new state.Token('html_block', '', 0); close.content = '</div>\n'
          wrapped.push(open)
          let cursor = index
          let level = Number(tokens[index].tag.slice(1))
          for (;;) {
            const end = blockEnd(cursor)
            for (let j = cursor; j <= end; j += 1) wrapped.push(tokens[j])
            cursor = end + 1
            if (cursor >= tokens.length) break
            if (tokens[cursor].type === 'heading_open' && Number(tokens[cursor].tag.slice(1)) > level) { level = Number(tokens[cursor].tag.slice(1)); continue }
            // blok pertama setelah judul; tabel besar boleh terpecah (tidak ikut dibungkus)
            if (tokens[cursor].type === 'table_open') {
              let rows = 0
              for (let j = cursor + 1; j < tokens.length && tokens[j].type !== 'table_close'; j += 1) if (tokens[j].type === 'tr_open') rows += 1
              if (rows > 6) break
            }
            const first = blockEnd(cursor)
            for (let j = cursor; j <= first; j += 1) wrapped.push(tokens[j])
            cursor = first + 1
            break
          }
          wrapped.push(close)
          index = cursor
        } else {
          wrapped.push(tokens[index]); index += 1
        }
      }
      state.tokens = wrapped
    })
    // Tabel kecil dijaga utuh dalam satu halaman.
    md.core.ruler.push('table-keep', (state) => {
      const tokens = state.tokens
      for (let index = 0; index < tokens.length; index += 1) {
        if (tokens[index].type === 'table_open') {
          let rows = 0
          for (let j = index + 1; j < tokens.length && tokens[j].type !== 'table_close'; j += 1) { if (tokens[j].type === 'tr_open') rows += 1; if (tokens[j].type === 'inline' && /^Disetujui oleh$/.test(tokens[j].content)) tokens[index].attrSet('class', 'sign') }
          tokens[index].meta = { rows }; if (rows <= 6) tokens[index].attrSet('class', ((tokens[index].attrGet('class') || '') + ' keep').trim())
        }
      }
    })

    let html = md.render(source, env)
    html = html.replace(/☐/g, '<span class="box"></span>')
    bodyParts.push(html)
  }
  return { html: bodyParts.join('\n'), toc }
}

function coverHtml({ eyebrow, title, subtitle, shot, meta }) {
  return `<section class="cover"><div class="inner">
    <div class="brand"><img src="${pathToFileURL(path.join(here, 'assets', 'logo-white.png')).href}" alt=""><span>SMK Telkom</span></div>
    <div class="eyebrow">${esc(eyebrow)}</div>
    <h1>${esc(title)}</h1>
    <p class="subtitle">${esc(subtitle)}</p>
    <div class="shot"><div class="bar"><i></i><i></i><i></i></div><img src="${screen(shot)}" alt=""></div>
    <div class="meta">${meta.map(([k, v]) => `<div><b>${esc(k)}</b><span>${esc(v)}</span></div>`).join('')}</div>
  </div></section>`
}

function tocHtml(toc) {
  return `<section class="toc"><h2 class="toc-title">Daftar isi</h2><ol>${toc.map((item) => `<li class="l${item.level}"><a href="#${item.id}"><span class="t">${esc(item.title)}</span></a></li>`).join('')}</ol></section>`
}

function galleryHtml(items, { title, lead }) {
  const pairs = []
  for (let index = 0; index < items.length; index += 2) pairs.push(items.slice(index, index + 2))
  return `<section class="gallery">${pairs.map((pair, pairIndex) => `<div class="pair">${pairIndex === 0 ? `<h2 class="chap new-page" data-label="Lampiran" id="gallery">${esc(title)}</h2><p class="lead">${esc(lead)}</p>` : ''}${pair.map(([name, caption]) => `<figure class="shot-fig"><img src="${screen(name)}" alt=""><figcaption>${caption}</figcaption></figure>`).join('')}</div>`).join('')}</section>`
}

const shots = [
  ['01-beranda', '<b>Beranda</b> — karya terbaru, proyek, peluang, dan leaderboard dalam satu halaman'],
  ['02-katalog-karya', '<b>Katalog karya</b> — filter jurusan dan kategori, pencarian, dan jumlah suka serta komentar'],
  ['03-detail-karya', '<b>Detail karya</b> — galeri, lencana terverifikasi guru pembimbing, suka dan komentar'],
  ['05-detail-proyek', '<b>Detail proyek</b> — tim, mentor, riwayat tinjauan, suka dan komentar'],
  ['06-profil-siswa', '<b>Profil publik siswa</b> — cover, keahlian, karya semat, pencapaian, dan kartu bagikan'],
  ['07-leaderboard', '<b>Leaderboard</b> — Most Valuable Student, peringkat karya dan proyek'],
  ['08-penghargaan', '<b>Penghargaan</b> — nominasi, voting siswa, dan hasil yang diumumkan'],
  ['11-dashboard-siswa', '<b>Dashboard siswa</b> — status karya, dampak, dan hal yang perlu ditindaklanjuti'],
  ['17-profil-tampilan', '<b>Tampilan profil</b> — cover, tema, dan pratinjau profil publik'],
  ['18-dashboard-guru', '<b>Dashboard guru</b> — antrean verifikasi dan ringkasan dampak'],
].filter(([name]) => fs.existsSync(path.join(here, 'assets', 'screens', `${name}.jpg`)))

const targets = {
  proposal: () => {
    const { html, toc } = renderDocs(['PROPOSAL.md'], 'proposal', { newPage: [/^1\|/, /^7\|/, /^12\|/] })
    toc.push({ level: 1, id: 'gallery', title: 'Tampilan produk' })
    return {
      file: 'Proposal-Telkom-Student-Creation.pdf',
      docTitle: 'Proposal',
      cover: coverHtml({
        eyebrow: 'Proposal',
        title: 'Telkom Student Creation',
        subtitle: 'Platform portofolio, kolaborasi proyek, dan jembatan menuju dunia kerja bagi siswa SMK Telkom',
        shot: '01-beranda',
        meta: [['Diajukan kepada', 'Pimpinan Sekolah / Yayasan'], ['Diajukan oleh', 'Tim Pengembang'], ['Periode', 'Oktober 2026']],
      }),
      toc, html,
      extra: galleryHtml(shots, { title: 'Tampilan produk', lead: 'Tangkapan layar platform yang sudah berjalan, diambil dari lingkungan demo.' }),
    }
  },
  dokumentasi: () => {
    const files = ['FEATURES.md', 'ARCHITECTURE.md', 'API.md', 'TESTING.md', 'SIMULASI.md', 'BIAYA-PENGEMBANGAN.md', 'REKOMENDASI.md', 'REKOMENDASI-IDENTITAS.md', 'REKOMENDASI-MIGRASI.md', 'REKOMENDASI-REALTIME.md', 'REKOMENDASI-KEAMANAN.md', 'REKOMENDASI-FITUR.md']
    const { html, toc } = renderDocs(files, 'bundle')
    toc.push({ level: 1, id: 'gallery', title: 'Tampilan produk' })
    return {
      file: 'Dokumentasi-Teknis-Telkom-Student-Creation.pdf',
      docTitle: 'Dokumentasi Teknis',
      cover: coverHtml({
        eyebrow: 'Dokumentasi',
        title: 'Dokumentasi Teknis dan Rencana Pengembangan',
        subtitle: 'Fitur, arsitektur, API, pengujian, simulasi, biaya, dan rekomendasi pengembangan Telkom Student Creation',
        shot: '15-tracker-papan',
        meta: [['Untuk', 'Pimpinan Sekolah / Yayasan'], ['Disusun oleh', 'Tim Pengembang'], ['Periode', 'Oktober 2026']],
      }),
      toc, html,
      extra: galleryHtml(shots, { title: 'Tampilan produk', lead: 'Tangkapan layar platform yang sudah berjalan, diambil dari lingkungan demo.' }),
    }
  },
}

const css = fs.readFileSync(path.join(here, 'theme', 'print.css'), 'utf8')
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--allow-file-access-from-files'] })

for (const [name, make] of Object.entries(targets)) {
  if (only.length && !only.includes(name)) continue
  const doc = make()
  const html = `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>${esc(doc.docTitle)}</title><style>${fontFaces}</style><style>${css}</style><style>@page{@top-left{content:"${esc(doc.docTitle).replace(/"/g, "")}"}}</style></head><body>${doc.cover}${tocHtml(doc.toc)}<main>${doc.html}${doc.extra}</main></body></html>`
  const htmlPath = path.join(buildDir, `${name}.html`)
  fs.writeFileSync(htmlPath, html)
  const page = await browser.newPage()
  page.on('pageerror', (error) => console.log('pageerror', String(error).slice(0, 200)))
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' })
  await page.addScriptTag({ path: path.join(here, 'node_modules', 'mermaid', 'dist', 'mermaid.min.js') })
  await page.evaluate(async () => {
    await document.fonts.ready
    window.mermaid.initialize({
      startOnLoad: false, theme: 'base', securityLevel: 'loose',
      themeVariables: { fontFamily: 'Inter, sans-serif', fontSize: '18px', primaryColor: '#eef1f7', primaryBorderColor: '#14213d', primaryTextColor: '#0a1226', lineColor: '#5b6472', secondaryColor: '#fdecee', tertiaryColor: '#f4f6fa', noteBkgColor: '#fdecee', noteTextColor: '#0a1226' },
      flowchart: { htmlLabels: true, curve: 'basis' }, er: { useMaxWidth: true, fontSize: 18 }, sequence: { useMaxWidth: true, actorFontSize: 17, messageFontSize: 16, noteFontSize: 16 }, state: { useMaxWidth: true }, xyChart: { width: 640, height: 320 },
    })
    const failed = []
    for (const node of document.querySelectorAll('.mermaid')) {
      const source = node.textContent
      try { await window.mermaid.run({ nodes: [node] }) } catch (error) {
        failed.push(`${(source.trim().split('\n')[0] || '').slice(0, 60)} :: ${String(error && (error.message || error.str || JSON.stringify(error))).slice(0, 160)}`)
        node.parentElement.innerHTML = '<pre><code>' + source.replace(/</g, '&lt;') + '</code></pre>'
      }
    }
    window.__mermaidFailed = failed
    // Kolom berisi teks pendek (angka, harga, status) tidak dipecah antarbaris.
    for (const table of document.querySelectorAll('table')) {
      const rows = [...table.rows]
      const columns = Math.max(...rows.map((row) => row.cells.length))
      for (let column = 0; column < columns; column += 1) {
        const cells = rows.map((row) => row.cells[column]).filter(Boolean)
        const longest = Math.max(...cells.map((cell) => cell.textContent.trim().length))
        if (longest <= 16) cells.forEach((cell) => { cell.style.whiteSpace = 'nowrap' })
      }
    }
  })
  const failedDiagrams = await page.evaluate(() => window.__mermaidFailed || [])
  if (failedDiagrams.length) console.log('DIAGRAM GAGAL:\n  ' + failedDiagrams.join('\n  '))
  await page.addScriptTag({ path: path.join(here, 'node_modules', 'pagedjs', 'dist', 'paged.js') })
  await page.evaluate(async () => { const previewer = new window.Paged.Previewer(); await previewer.preview() })
  const pages = await page.evaluate(() => document.querySelectorAll('.pagedjs_page').length)
  const outFile = path.join(outDir, doc.file)
  await page.pdf({ path: outFile, preferCSSPageSize: true, printBackground: true, displayHeaderFooter: false })
  console.log('ok', doc.file, pages, 'halaman')
  await page.close()
}
await browser.close()
