const fs = require('fs')
const path = require('path')

class JsonStore {
  constructor(file) {
    this.file = file
  }

  load(fallback) {
    try {
      const parsed = JSON.parse(fs.readFileSync(this.file, 'utf8'))
      return Array.isArray(parsed) ? parsed : fallback
    } catch {
      return fallback
    }
  }

  save(data) {
    fs.mkdirSync(path.dirname(this.file), { recursive: true })
    const tmp = `${this.file}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8')
    fs.renameSync(tmp, this.file)
  }
}

module.exports = JsonStore
