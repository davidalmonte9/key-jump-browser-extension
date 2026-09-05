const fs = require('fs')
const http = require('http')
const path = require('path')

const PORT = process.env.PORT || 1337

const contentTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
}

const routes = {
  '/': 'test/test.html',
  '/harness': 'test/harness.html',
}

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0]
  const filePath =
    routes[urlPath] || (urlPath.startsWith('/src/') && urlPath.slice(1))

  if (req.method !== 'GET' || !filePath) {
    res.writeHead(404)
    res.end()
    return
  }

  try {
    const file = fs.readFileSync(path.join(__dirname, '..', filePath))
    res.writeHead(200, {
      'Content-Type': contentTypes[path.extname(filePath)] || 'text/plain',
    })
    res.end(file)
  } catch {
    res.writeHead(404)
    res.end()
  }
})

server.listen(PORT)

console.log(`Test page: http://localhost:${PORT}`)
console.log(`Harness (no extension needed): http://localhost:${PORT}/harness`)
