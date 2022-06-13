import StreamNumberFormatter from "./formatter";
import { ReadableStream, ReadableStreamDefaultController } from "stream/web";

class ByteSource {
  // it's possible for streams to use other ArrayBufferView's to 
  // deliver chunks, but this is the default byte stream format.
  // and it's what we get from the fetch API .body() stream.
  private readonly source: Uint8Array;
  private position: number = 0;
  
  constructor(
    source: ArrayBufferView,
    private readonly chunk: number, 
  ) {
    this.source = new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
  }

  public start(_controller: ReadableStreamDefaultController) {
    this.position = 0;
  }

  public pull(controller: ReadableStreamDefaultController) {
    if (this.position < this.source.length) {
      const end = Math.min(this.source.length, this.position + this.chunk);
      controller.enqueue(this.source.slice(this.position, end))
      this.position = end;
    } else {
      controller.close();
    }
  }
}

async function sink(
  source: AsyncIterable<Uint8Array>,
): Promise<ArrayBufferView> {
  let result: Uint8Array = new Uint8Array();
  for await(const chunk of source) {
    const temp = new Uint8Array(result.byteLength + chunk.byteLength)
    temp.set(result)
    temp.set(chunk, result.byteLength);
    result = temp;
  }
  return result;
}

async function transform(
  source: ArrayBufferView,
  to_ctor: new (buff: ArrayBuffer) => ArrayBufferView,
  convert: (x: number) => number = x => x,
  chunk: number = 4,
): Promise<ArrayBufferView> {
  const formatter = StreamNumberFormatter(
    // @ts-ignore there's no way to do this
    source.constructor,
    to_ctor,
    convert,
    new ReadableStream(new ByteSource(source, chunk)), 
  );
  const bytesink = await sink(formatter);
  // @ts-ignore fuck you tsc, you suck at node types
  return [... (new to_ctor(bytesink.buffer))];
}

describe('formatter', () => {
  describe('unsigned ints', () => {
    it('should translate uint32 to uint8', async () => {
      expect(
        await transform(
          new Uint32Array([1, 129, 127, 2]),
          Uint8Array,
        )
      ).toEqual([1, 129, 127, 2])
    });
  
    it('should translate uint16 to uint8', async () => {
      expect(
        await transform(
          new Uint16Array([1, 129, 127, 2]),
          Uint8Array,
        )
      ).toEqual([1, 129, 127, 2])
    });

    it('should translate uint8 to uint8', async () => {
      expect(
        await transform(
          new Uint8Array([1, 129, 127, 2]),
          Uint8Array,
        )
      ).toEqual([1, 129, 127, 2])
    });

    it('should translate uint32 to uint16', async () => {
      expect(
        await transform(
          new Uint32Array([1, 129, 127, 2]),
          Uint16Array,
        )
      ).toEqual([1, 129, 127, 2])
    });
  });

  describe('signed ints', () => {
    it('should translate int32 to int8', async () => {
      expect(
        await transform(
          new Int32Array([-1, 1, -127, 127]),
          Int8Array,
        )
      ).toEqual([-1, 1, -127, 127])
    });
  
    it('should translate int16 to int8', async () => {
      expect(
        await transform(
          new Int16Array([-1, 1, -127, 127]),
          Int8Array,
        )
      ).toEqual([-1, 1, -127, 127])
    });

    it('should translate int8 to int8', async () => {
      expect(
        await transform(
          new Int8Array([-1, 1, -127, 127]),
          Int8Array,
        )
      ).toEqual([-1, 1, -127, 127])
    });

    it('should translate int32 to int16', async () => {
      expect(
        await transform(
          new Int32Array([-1, 1, -127, 127]),
          Int16Array,
        )
      ).toEqual([-1, 1, -127, 127])
    });
  });

  describe('float', () => {
    it('should translate float32 to int8', async () => {
      expect(
        await transform(
          new Float32Array([-1, 1, -127, 127]),
          Int8Array,
        )
      ).toEqual([-1, 1, -127, 127])
    });
  });

  describe('data loss', () => {
    it('float32 to int', async () => {
      expect(
        await transform(
          new Float32Array([-1000.32, 3245, -10, 20]),
          Int8Array,
        )
        // it converts this to int32 first, then takes the first byte
      ).toEqual([24, -83, -10, 20])
    });

    it('int32 to int8', async () => {
      expect(
        await transform(
          new Int32Array([-1000, 3245, -10, 20]),
          Int8Array,
        )
        // the first byte in int32 form
      ).toEqual([24, -83, -10, 20])
    });

    it('int16 to uint16', async () => {
      expect(
        await transform(
          new Int16Array([30000, -30000, -10, 20]),
          Uint16Array,
        )
      ).toEqual([30000, 35536, 65526, 20])
    });
  });

  describe('clamping', () => {
    it('float32 to int', async () => {
      expect(
        await transform(
          new Float32Array([-1000.32, 3245, -10, 20]),
          Int8Array,
          x => Math.min(Math.max(x, -127), 127)
        )
      ).toEqual([-127, 127, -10, 20])
    });

    it('int32 to int8', async () => {
      expect(
        await transform(
          new Int32Array([-1000, 3245, -10, 20]),
          Int8Array,
          x => Math.min(Math.max(x, -127), 127)
        )
      ).toEqual([-127, 127, -10, 20])
    });

    it('int16 to uint16', async () => {
      expect(
        await transform(
          new Int16Array([30000, -30000, -10, 20]),
          Uint16Array,
          x => Math.min(Math.max(x, 0), 2 ** 16)
        )
      ).toEqual([30000, 0, 0, 20])
    });
  });

  describe('chunks', () => {
    it('off word boundary size with no buffer', async () => {
      expect(
        await transform(
          new Float32Array([-1000.32, 3245, -10, 20]),
          Int8Array,
          x => Math.min(Math.max(x, -127), 127),
          3
        )
      ).toEqual([-127, 127, -10, 20])
    });

    it('off word boundary size with buffer', async () => {
      expect(
        await transform(
          new Float32Array([-1000.32, 3245, -10, 20]),
          Int16Array,
          x => Math.min(Math.max(x, -127), 127),
          5
        )
      ).toEqual([-127, 127, -10, 20])
    });
  });
});