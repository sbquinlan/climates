import NumberFormatterSource from '../../worker/src/NumberFormatterSource'

function clamp(min, f, max) {
  return Math.min(Math.max(Math.round(f), min), max);
}

function consoleStream() {
  const write = (chunk) => console.log('out', chunk)
  return new WritableStream({ write });
}

function ftbStream(stream) {
  return new ReadableStream(
    new NumberFormatterSource(
      stream,
      Float32Array,
      Int8Array,
      (x) => clamp(-128, x, 127),
    )
  );
}

fetch('/tiles/wc2.1_10m_tavg/0/0/0.bin')
  .then(resp => ftbStream(resp.body).pipeTo(consoleStream()))
  .then(buff => console.log('fin'))
  .catch(err => console.error(err));
