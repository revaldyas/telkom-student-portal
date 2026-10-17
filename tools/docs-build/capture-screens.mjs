// Mengambil tangkapan layar produk untuk proposal dan pitch deck (Chrome headless, hanya membaca halaman).
// Pemakaian: BASE_URL=http://localhost:3000 DEMO_STUDENT_EMAIL=... DEMO_STUDENT_PASSWORD=... \
//            DEMO_TEACHER_EMAIL=... DEMO_TEACHER_PASSWORD=... node capture-screens.mjs
import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const out = path.join(here, 'assets', 'screens')
fs.mkdirSync(out, { recursive: true })
const base = process.env.BASE_URL || 'http://localhost:3000'
const need = (name) => { const value = process.env[name]; if (!value) throw new Error(`Isi variabel lingkungan ${name}`); return value }
const accounts = {
  student: { email: need('DEMO_STUDENT_EMAIL'), password: need('DEMO_STUDENT_PASSWORD') },
  teacher: { email: need('DEMO_TEACHER_EMAIL'), password: need('DEMO_TEACHER_PASSWORD') },
}
const viewport = { width: 1440, height: 900 }

const shots = {
  public: [
    ['01-beranda', '/', { full: false, wait: 3500 }],
    ['02-katalog-karya', '/karya', { wait: 3000 }],
    ['03-detail-karya', '/karya/brand-logo-naura-khairunnisa', { wait: 3500 }],
    ['04-proyek', '/proyek', { wait: 3000 }],
    ['05-detail-proyek', '/proyek/ruangkarya-digital', { wait: 3500 }],
    ['06-profil-siswa', '/siswa/15', { wait: 9000 }],
    ['07-leaderboard', '/leaderboard', { wait: 3500 }],
    ['08-penghargaan', '/awards', { wait: 3000 }],
    ['09-peluang', '/peluang', { wait: 3000 }],
    ['10-login', '/login', { wait: 1500 }],
  ],
  student: [
    ['11-dashboard-siswa', '/portal/siswa', { wait: 3500 }],
    ['12-karya-saya', '/portal/siswa/karya', { wait: 3000 }],
    ['13-form-karya', '/portal/siswa/karya/baru', { wait: 2500 }],
    ['14-tracker-daftar', '/portal/siswa/tracker', { wait: 3500 }],
    ['15-tracker-papan', '/portal/siswa/tracker/4', { wait: 4000 }],
    ['16-pesan', '/portal/siswa/pesan', { wait: 4000 }],
    ['17-profil-tampilan', '/portal/siswa/tampilan', { wait: 3000 }],
  ],
  teacher: [
    ['18-dashboard-guru', '/portal/guru', { wait: 3500 }],
    ['19-verifikasi-guru', '/portal/guru/verifikasi', { wait: 3500 }],
    ['20-peluang-guru', '/portal/guru/peluang', { wait: 3000 }],
  ],
}

async function settle(page, wait) {
  await page.waitForLoadState('load').catch(() => {})
  await page.waitForTimeout(wait)
  // Tunggu semua gambar yang tampak selesai dimuat.
  await page.evaluate(async () => {
    const images = [...document.images].filter((img) => !img.complete)
    await Promise.race([Promise.all(images.map((img) => new Promise((resolve) => { img.onload = img.onerror = resolve }))), new Promise((resolve) => setTimeout(resolve, 6000))])
  })
  // Sembunyikan indikator mode pengembangan Next.js agar tidak tampil di gambar.
  await page.addStyleTag({ content: 'nextjs-portal, [data-nextjs-dev-tools-button], [data-nextjs-toast] { display: none !important }' })
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(400)
}

async function login(context, who) {
  const page = await context.newPage()
  await page.goto(`${base}/login`, { waitUntil: 'load' })
  await page.fill('input[type="email"], input[name="email"], #email', accounts[who].email)
  await page.fill('input[type="password"]', accounts[who].password)
  await page.click('button.au-submit')
  await page.waitForURL(/\/portal\//, { timeout: 30000 })
  await page.close()
}

const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--hide-scrollbars'] })
const only = process.env.GROUPS ? process.env.GROUPS.split(',') : null
for (const [group, list] of Object.entries(shots)) {
  if (only && !only.includes(group)) continue
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1.5, locale: 'id-ID' })
  if (group !== 'public') await login(context, group)
  for (const [name, route, opts] of list) {
    if (process.env.ONLY && !process.env.ONLY.split(',').includes(name)) continue
    const page = await context.newPage()
    try {
      await page.goto(`${base}${route}`, { waitUntil: 'load', timeout: 60000 })
      await settle(page, opts.wait ?? 3000)
      await page.screenshot({ path: path.join(out, `${name}.jpg`), type: 'jpeg', quality: 88, fullPage: false })
      console.log('ok', name, page.url().replace(base, ''))
    } catch (error) {
      console.log('GAGAL', name, route, String(error).slice(0, 120))
    }
    await page.close()
  }
  await context.close()
}
await browser.close()
