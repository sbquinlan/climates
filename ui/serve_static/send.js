const { open } = require('fs/promises')
const { join, normalize, resolve, sep } = require('path')

const error = require('http-errors');

const BAD_PATH_REGEX = /^[\.]{1,2}$/gm
function normalize_path(root, path) {
  path = decodeURIComponent(path)
  if (~path.indexOf('\0')) 
    throw error(400)

  path = join(root, path ? '.' + sep + path : path)
  if (!normalize(path).split(sep).every(p => !BAD_PATH_REGEX.exec(p))) 
    throw error(404)
  return resolve(path)
}

async function send(root, path) {
  path = normalize_path(root, path)
  const handle = await open(path).catch(() => { throw error(404) })
  const stat = await handle.stat().catch(() => { throw error(500) })
  return { path, stat, stream: handle.createReadStream() }
}

module.exports = { send, normalize_path }