const fs = require('fs')
const sharp = require('sharp')

const S = 1024
const cx = S / 2

function roundedRect(x, y, w, h, r) {
  return `M${x + r},${y} h${w - 2 * r} a${r},${r} 0 0 1 ${r},${r} v${h - 2 * r} a${r},${r} 0 0 1 ${-r},${r} h${-(w - 2 * r)} a${r},${r} 0 0 1 ${-r},${-r} v${-(h - 2 * r)} a${r},${r} 0 0 1 ${r},${-r} z`
}

const tile = roundedRect(100, 100, 824, 824, 190)
const bell = `M${cx - 207},650 C${cx - 207},505 ${cx - 167},392 ${cx - 80},352 C${cx - 60},343 ${cx - 52},330 ${cx - 52},312 A52,52 0 0 1 ${cx + 52},312 C${cx + 52},330 ${cx + 60},343 ${cx + 80},352 C${cx + 167},392 ${cx + 207},505 ${cx + 207},650 Z`
const rim = roundedRect(cx - 232, 638, 464, 62, 30)
const clapper = `M${cx + 54},742 a54,54 0 1 1 -108,0 a54,54 0 1 1 108,0 z`

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0" stop-color="#4C82FF"/>
      <stop offset="0.55" stop-color="#2F6BFF"/>
      <stop offset="1" stop-color="#1B3A94"/>
    </linearGradient>
    <linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.30"/>
      <stop offset="0.45" stop-color="#ffffff" stop-opacity="0.05"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="metal" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#DCE6FF"/>
    </linearGradient>
    <clipPath id="tileClip"><path d="${tile}"/></clipPath>
    <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="#0B1F4F" flood-opacity="0.35"/>
    </filter>
  </defs>
  <path d="${tile}" fill="url(#bg)"/>
  <g clip-path="url(#tileClip)">
    <rect x="100" y="100" width="824" height="500" fill="url(#gloss)"/>
    <ellipse cx="${cx}" cy="836" rx="250" ry="52" fill="#0B1F4F" opacity="0.10"/>
  </g>
  <g filter="url(#soft)">
    <path d="${bell}" fill="url(#metal)"/>
    <path d="${rim}" fill="url(#metal)"/>
    <path d="${clapper}" fill="#F2F6FF"/>
  </g>
  <circle cx="${cx + 176}" cy="382" r="72" fill="#FF4D4F" stroke="#ffffff" stroke-width="20"/>
  <path d="${tile}" fill="none" stroke="#ffffff" stroke-opacity="0.22" stroke-width="4"/>
</svg>`

fs.writeFileSync('/tmp/icon.svg', svg)
sharp(Buffer.from(svg))
  .resize(S, S)
  .png()
  .toFile(process.argv[2] || '/tmp/icon-1024.png')
  .then((r) => console.log('wrote', r))
  .catch((e) => {
    console.error(e.message)
    process.exit(1)
  })
