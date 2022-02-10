function maybeBYOB(stream) {
  try {
    return stream.getReader({ mode: 'byob' });
  } catch (e) {
    return stream.getReader();
  }
}

async function someKindOfRead(controller, reader) {
  if (reader instanceof ReadableStreamBYOBReader) {
    return await reader.read(controller.byobRequest.view);
  }
  return await reader.read();
}

function clamp(min, f, max) {
  return Math.min(Math.max(Math.round(f), min), max);
}

export default function(ReadableStream) {
  function wordBoundary(stream, word_length) {
    const reader = maybeBYOB(stream);
    let overflow = null;

    return new ReadableStream({
      type: 'bytes',
      autoAllocateChunkSize: 2**20,

      async pull(controller) {
        const { value, done } = await someKindOfRead(reader);

        if (done) {
          controller.close();
          controller.byobRequest.respond(0);
          return;
        }

        // all the data we have
        const total_bytes = value.byteLength + (overflow?.length ?? 0);
        // can't expand the buffer view
        const total_sendable_bytes = value.byteLength;
        // max words we can send
        const total_sendable_wordbytes = Math.floor(
          total_sendable_bytes / word_length
        ) * word_length

        // extra bytes we'd have
        const extra_bytes = total_bytes - total_sendable_wordbytes;
        // hold the old overflow
        const temp = overflow;
        // cut out the new overflow from the end of the original
        overflow = extra_bytes ? value.slice(-extra_bytes) : null;

        // change the view if before potentially adding data / removing data
        const view = new Uint8Array(value.buffer, 0, total_sendable_wordbytes)
        if (temp) {
          // move everything down for the overflow
          view.copyWithin(extra_bytes, temp.byteLength);
          // and copy old overflow in
          view.set(temp, 0);
        }

        controller.byobRequest.respondWithNewView(view);
      }
    });
  }

  function ftbStream(stream) {
    const stride = Float32Array.BYTES_PER_ELEMENT;
    const reader = wordBoundary(stream, stride).getReader({ mode: 'byob' });

    return new ReadableStream({
      type: 'bytes',
      autoAllocateChunkSize: 2**20,

      async pull(controller) {
        const { value, done } = await reader.read(
          controller.byobRequest.view
        );

        if (done) {
          controller.close();
          controller.byobRequest.respond(0);
          return;
        }

        const view = new DataView(value.buffer);
        for (let i = 0; i < value.byteLength; i += stride) {
          view.setInt8(
            i / stride,
            clamp(-128, view.getFloat32(i), 127)
          );
        }

        controller.byobRequest.respondWithNewView(
          new DataView(value.buffer, 0, value.byteLength / stride)
        );
      }
    });
  }

  return ftbStream;
}
