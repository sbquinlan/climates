const { normalize_path, send } = require('./send');
const basicheaders = require('./basicheaders');
const byterange = require('./byterange');
const conditionals = require('./conditionals');
const compression = require('./compression.js');

async function stream_static(root, req, res) {
  let { path, stat, stream } = await send(root, req.url);
  basicheaders(res, path, stat)
  try {
    conditionals(req, res)
  } catch(err) {
    stream.destroy();
    throw err;
  }
  return stream
}

module.exports = {
  basicheaders,
  byterange,
  compression,
  conditionals,
  normalize_path,
  send,
  stream_static,
}