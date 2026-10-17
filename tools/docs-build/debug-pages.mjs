import { chromium } from 'playwright-core'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
const name = process.argv[2] || 'proposal'
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--allow-file-access-from-files'] })
const page = await browser.newPage()
await page.goto(pathToFileURL(path.resolve('.build', name + '.html')).href)
await page.addScriptTag({ path: 'node_modules/mermaid/dist/mermaid.min.js' })
await page.evaluate(async () => { await document.fonts.ready; window.mermaid.initialize({ startOnLoad: false }); await window.mermaid.run({ querySelector: '.mermaid' }) })
await page.addScriptTag({ path: 'node_modules/pagedjs/dist/paged.js' })
await page.evaluate(async () => { await new window.Paged.Previewer().preview() })
const info = await page.evaluate(() => [...document.querySelectorAll('.pagedjs_page')].map((p, i) => { const c = p.querySelector('.pagedjs_page_content'); return `${i + 1}: h=${Math.round(c.scrollHeight)} children=${c.firstElementChild ? c.firstElementChild.children.length : 0} :: ${(c.innerText || '').trim().slice(0, 50).replace(/\n/g, ' ')}` }))
const orphans = await page.evaluate(() => [...document.querySelectorAll('.pagedjs_page')].flatMap((p, i) => { const c = p.querySelector('.pagedjs_page_content > div > main') || p.querySelector('.pagedjs_page_content'); const blocks = [...c.querySelectorAll('h1,h2,h3,h4,p,table,ul,ol,figure,pre,blockquote')].filter((el) => !el.closest('table') || el.tagName === 'TABLE'); const last = blocks[blocks.length - 1]; return last && /^H[1-4]$/.test(last.tagName) ? [`hal ${i + 1}: ${last.textContent.trim().slice(0, 50)}`] : [] }))
console.log('JUDUL YATIM:', orphans.length ? orphans.join(' | ') : 'tidak ada')
console.log(info.join("\n")); if (process.argv[3]) console.log(await page.evaluate((n) => document.querySelectorAll(".pagedjs_page")[n - 1].querySelector(".pagedjs_page_content").innerHTML.slice(0, 1200), Number(process.argv[3])))
await browser.close()
