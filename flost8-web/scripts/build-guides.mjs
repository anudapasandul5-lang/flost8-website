// Turns docs/guides/*-GUIDE.md into one self-contained HTML file each (inline CSS, works offline).
// Screenshots stay as relative <img> links to docs/guides/screens/. Usage: node scripts/build-guides.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'guides')
const GUIDES = [
  { md: 'OWNER-GUIDE.md', html: 'OWNER-GUIDE.html', who: 'Owner guide' },
  { md: 'SALES-MANAGER-GUIDE.md', html: 'SALES-MANAGER-GUIDE.html', who: 'Sales manager guide' },
]

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const inline = (s) =>
  esc(s)
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy">')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')

function render(md) {
  const lines = md.split('\n')
  const out = []
  const toc = []
  let i = 0
  let inCard = false // the quick card runs from its heading to the next ---
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) { i++; continue }
    if (line.trim() === '---') {
      if (inCard) { out.push('</section>'); inCard = false }
      i++
      continue
    }
    const h = /^(#{1,3}) (.*)$/.exec(line)
    if (h) {
      const level = h[1].length
      const text = h[2]
      const id = slug(text)
      if (level === 2 && /^QUICK CARD/.test(text)) { out.push('<section class="card" aria-label="Quick card">'); inCard = true }
      else if (level === 2) toc.push({ id, text: text.replace(/\*\*/g, '') })
      out.push(`<h${level} id="${id}">${inline(text)}</h${level}>`)
      i++
      continue
    }
    if (/^\|/.test(line)) {
      const rows = []
      while (i < lines.length && /^\|/.test(lines[i])) rows.push(lines[i++])
      const cells = (r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
      const head = cells(rows[0])
      const body = rows.slice(2).map(cells)
      out.push(`<div class="table"><table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`)
      continue
    }
    const ul = /^- /.test(line)
    const ol = /^\d+\. /.test(line)
    if (ul || ol) {
      const items = []
      const re = ul ? /^- (.*)$/ : /^\d+\. (.*)$/
      while (i < lines.length && re.test(lines[i])) items.push(re.exec(lines[i++])[1])
      out.push(`<${ul ? 'ul' : 'ol'}>${items.map((t) => `<li>${inline(t)}</li>`).join('')}</${ul ? 'ul' : 'ol'}>`)
      continue
    }
    const para = []
    while (i < lines.length && lines[i].trim() && !/^(#{1,3} |---$|\||- |\d+\. )/.test(lines[i])) para.push(lines[i++])
    const text = para.join(' ')
    out.push(/^!\[/.test(text) ? `<figure>${inline(text)}</figure>` : `<p>${inline(text)}</p>`)
  }
  if (inCard) out.push('</section>')
  return { body: out.join('\n'), toc }
}

const CSS = `
:root{--bg:#120917;--raise:#1b0f24;--line:rgba(255,255,255,.12);--ink:#fff;--ink72:rgba(255,255,255,.82);--accent:#9d14ff;--accent-ink:#c88bff;--soft:rgba(157,20,255,.16)}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font:20px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
.wrap{max-width:760px;margin:0 auto;padding:20px 16px 80px}
header.top{padding:28px 0 8px}
.brand{font:700 30px/1 Impact,"Arial Narrow Bold",sans-serif;letter-spacing:.08em}
.brand span{color:var(--accent-ink)}
.who{margin:6px 0 0;color:var(--ink72);font-size:18px}
h1{font:700 40px/1.1 Impact,"Arial Narrow Bold",system-ui,sans-serif;letter-spacing:.02em;margin:18px 0 8px}
h2{font-size:30px;line-height:1.2;margin:48px 0 12px;padding-top:12px;border-top:1px solid var(--line);scroll-margin-top:12px}
h3{font-size:22px;margin:28px 0 8px}
p{margin:12px 0}
ul,ol{padding-left:1.4em;margin:12px 0}
li{margin:8px 0}
strong{color:#fff}
code{background:var(--soft);padding:1px 6px;border-radius:6px;font-size:.9em}
.card{background:var(--raise);border:1px solid rgba(157,20,255,.5);border-radius:20px;padding:8px 20px 20px;margin:16px 0 32px}
.card h2{border-top:0;margin-top:16px;color:var(--accent-ink)}
nav.toc{background:var(--raise);border:1px solid var(--line);border-radius:16px;padding:12px 20px;margin:0 0 24px}
nav.toc summary{cursor:pointer;font-weight:700;min-height:44px;display:flex;align-items:center}
nav.toc a{display:block;color:var(--accent-ink);padding:10px 0;text-decoration:none;min-height:44px}
figure{margin:20px 0;text-align:center}
img{max-width:100%;height:auto;border-radius:14px;border:1px solid var(--line)}
.table{overflow-x:auto;margin:16px 0}
table{border-collapse:collapse;width:100%;font-size:18px}
th,td{border:1px solid var(--line);padding:10px 12px;text-align:left;vertical-align:top}
th{background:var(--soft)}
a:focus-visible,summary:focus-visible{outline:3px solid var(--accent-ink);outline-offset:2px}
@media (max-width:480px){body{font-size:19px}h1{font-size:34px}h2{font-size:27px}}
@media print{body{background:#fff;color:#000}.card,nav.toc{background:#fff}strong,h1,h2{color:#000}}
`

for (const g of GUIDES) {
  const md = readFileSync(join(dir, g.md), 'utf8')
  const { body, toc } = render(md)
  const titleMatch = /^# (.*)$/m.exec(md)
  const title = titleMatch ? titleMatch[1] : g.who
  // The first <h1> comes from the markdown; drop it from the body and show it in the header instead.
  const bodyNoH1 = body.replace(/<h1[^>]*>.*?<\/h1>\n?/, '')
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(title)}</title>
<style>${CSS}</style>
</head>
<body>
<div class="wrap">
<header class="top"><div class="brand">FLO<span>ST8</span></div><p class="who">${esc(g.who)}</p><h1>${esc(title)}</h1></header>
<nav class="toc" aria-label="Contents"><details><summary>Jump to a section</summary>${toc.map((t) => `<a href="#${t.id}">${esc(t.text)}</a>`).join('')}</details></nav>
<main>
${bodyNoH1}
</main>
</div>
</body>
</html>
`
  writeFileSync(join(dir, g.html), html)
  console.log(`${g.html}: ${Math.round(html.length / 1024)} KB, ${toc.length} sections`)
}
