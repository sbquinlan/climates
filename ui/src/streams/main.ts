
function clamp(min, f, max) {
  return Math.min(Math.max(Math.round(f), min), max);
}

function ftbStream(stream, from_ctor) {
  const reader = stream.getReader();

  let extra_bytes = 0;
  const from_bpe = from_ctor.BYTES_PER_ELEMENT;
  const overflow = new Uint8Array(from_bpe);

  function idiv(total, divisor) {
    return Math.floor(total / divisor);
  }

  return new ReadableStream({
    async pull(controller) {
      const { value, done } = await reader.read();

      if (done) {
        if (extra_bytes > 0) {
          // something wrong bb
          controller.error(new Error('Extra bytes left in stream buffer'));
        }
        controller.close();
        return;
      }

      let chunk = new Int8Array(
        idiv(value.byteLength + extra_bytes, from_bpe)
      );

      // existing extra data
      if (extra_bytes > 0) {
        overflow.set(
          value.subarray(0, from_bpe - extra_bytes),
          extra_bytes,
        );
        chunk[0] = clamp(-128, new from_ctor(overflow.buffer)[0], 127)

        // unfortunate extra copy to put the remaining data
        // on a word boundary. There's no way to really
        // fix this once a chunk is off the word boundary
        value.copyWithin(0, extra_bytes)

        // keep the indexing the same for the copy loop
        chunk = new Int8Array(chunk.buffer, 1)
      }

      // copy values over
      const from = new from_ctor(
        value.buffer,
        0,
        idiv(value.byteLength, from_bpe),
      );
      for (let i = 0; i < chunk.length; i++) {
        chunk[i] = clamp(-128, from[i], 127)
      }

      // save new extra data, this isn't impacted by the copywithin
      extra_bytes = (value.byteLength + extra_bytes) % from_bpe;
      if (extra_bytes > 0) {
        overflow.set(value.subarray(-extra_bytes))
      }

      // may need to reset the indexing
      controller.enqueue(new Int8Array(chunk.buffer));
    }
  });
};

function consoleStream() {
  const write = (chunk) => console.log('out', chunk)
  return new WritableStream({ write });
}

fetch('/tiles/wc2.1_10m_tavg/0/0/0.bin')
  .then(resp => ftbStream(resp.body, Float32Array).pipeTo(consoleStream()))
  .then(buff => console.log('fin'))
  .catch(err => console.error(err));
