// Membuat pitch deck PDF dari docs/PITCH-DECK.md (Marp). Hasil: dist/Pitch-Deck-Telkom-Student-Creation.pdf
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright-core'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..', '..')
const buildDir = path.join(here, '.build')
const outDir = path.join(root, 'dist')
fs.mkdirSync(buildDir, { recursive: true }); fs.mkdirSync(outDir, { recursive: true })
const url = (file) => pathToFileURL(file).href
// Jalur relatif terhadap .build/deck.md (markdown-it memblokir skema file:).
const screen = (name) => `../assets/screens/${name}.jpg`
const fonts = path.join(here, 'node_modules', '@fontsource')
const face = (family, weight, style, file) => `@font-face{font-family:'${family}';font-weight:${weight};font-style:${style};src:url('${url(path.join(fonts, file))}') format('woff2')}`
const fontCss = [
  face('Inter', 400, 'normal', 'inter/files/inter-latin-400-normal.woff2'), face('Inter', 500, 'normal', 'inter/files/inter-latin-500-normal.woff2'),
  face('Inter', 600, 'normal', 'inter/files/inter-latin-600-normal.woff2'), face('Inter', 700, 'normal', 'inter/files/inter-latin-700-normal.woff2'),
  face('Source Serif 4', 700, 'normal', 'source-serif-4/files/source-serif-4-latin-700-normal.woff2'), face('Source Serif 4', 400, 'normal', 'source-serif-4/files/source-serif-4-latin-400-normal.woff2'),
  face('JetBrains Mono', 400, 'normal', 'jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2'),
].join('\n')

// Tema dengan font dan logo bertanda absolut.
const theme = fs.readFileSync(path.join(here, 'theme', 'deck.css'), 'utf8').replace('LOGO_URL', url(path.join(here, 'assets', 'logo-white.png')))
const themeFile = path.join(buildDir, 'deck-theme.css')
fs.writeFileSync(themeFile, `${fontCss}\n${theme}`)

// Naskah: ganti front matter, buang petunjuk penyusun ("> Visual:", "> Sumber:"), sisipkan gambar pada slide tertentu.
let md = fs.readFileSync(path.join(root, 'docs', 'PITCH-DECK.md'), 'utf8')
md = md.replace(/^---\n[\s\S]*?\n---\n/, `---\nmarp: true\ntheme: telkom\nsize: 16:9\npaginate: true\nfooter: Telkom Student Creation\ntitle: Telkom Student Creation – Pitch Deck\n---\n`)
md = md.replace(/^> (Visual|Sumber):.*\n?/gm, '')
const layout = JSON.parse(fs.readFileSync(path.join(here, 'deck-layout.json'), 'utf8'))
const esc = (value) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const statsHtml = (stats) => `<div class="stats">${stats.map(([value, label]) => `<div class="stat"><b>${esc(value)}</b><span>${esc(label)}</span></div>`).join('')}</div>`
const slides = md.split(/\n---\n/)
const rebuilt = slides.map((slide, index) => {
  const isCover = /^# /m.test(slide)
  const heading = isCover ? '__cover__' : ((slide.match(/^## (.*)$/m) || [])[1] || '').trim()
  const spec = layout[heading]
  if (!spec) return slide
  let out = slide
  if (spec.removeTable) out = out.replace(/\n\|[^\n]*\|\n\|[ :|-]+\|\n(?:\|[^\n]*\|\n?)+/, '\n')
  if (spec.removeList) out = out.replace(/\n(?:- [^\n]*\n(?:  [^\n]*\n)*)+/, '\n')
  const lines = []
  if (spec.class) lines.push(`<!-- _class: ${spec.class} -->`)
  const headingRe = isCover ? /^# .*$/m : /^## .*$/m
  const extras = []
  if (spec.images) extras.push(...spec.images.map((item) => `![${item.spec}](${screen(item.file)})`))
  if (spec.stats) extras.push(statsHtml(spec.stats))
  out = out.replace(headingRe, (line) => `${lines.length ? lines.join('\n') + '\n' : ''}${line}${extras.length ? '\n\n' + extras.join('\n') : ''}`)
  return out
})
md = rebuilt.join('\n---\n')
const mdFile = path.join(buildDir, 'deck.md')
fs.writeFileSync(mdFile, md)

const marp = path.join(here, 'node_modules', '.bin', 'marp')
const pdfOut = path.join(outDir, 'Pitch-Deck-Telkom-Student-Creation.pdf')
const htmlOut = path.join(buildDir, 'deck.html')
const common = [mdFile, '--theme', themeFile, '--allow-local-files', '--no-stdin']
execFileSync(marp, [...common, '--html', '-o', htmlOut], { stdio: 'inherit', timeout: 90000 })

// Deteksi isi yang melebihi slide.
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--allow-file-access-from-files'] })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
await page.goto(url(htmlOut))
await page.waitForTimeout(1500)
const overflow = await page.evaluate(() => [...document.querySelectorAll('section')].map((section, index) => {
  const box = section.getBoundingClientRect()
  let worst = 0
  for (const el of section.querySelectorAll('*')) {
    if (el.closest('footer') || el.tagName === 'FOOTER') continue
    const r = el.getBoundingClientRect()
    if (r.height === 0) continue
    worst = Math.max(worst, r.bottom - box.top - (box.height - 62))
  }
  return worst > 2 ? { slide: index + 1, over: Math.round(worst), title: (section.querySelector('h1,h2') || {}).textContent } : null
}).filter(Boolean))
// PDF dicetak langsung dari HTML Marp lewat Chrome (lebih andal daripada konversi bawaan CLI di lingkungan ini).
await page.emulateMedia({ media: 'print' })
await page.pdf({ path: pdfOut, preferCSSPageSize: true, printBackground: true })
console.log('ok', path.basename(pdfOut))
await browser.close()
console.log(overflow.length ? 'MELEBIHI SLIDE:\n' + overflow.map((o) => `  slide ${o.slide} (${o.title}): +${o.over}px`).join('\n') : 'Tidak ada slide yang melebihi area.')
