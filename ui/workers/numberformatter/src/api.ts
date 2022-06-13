import StreamNumberFormatter from "./formatter";
import type { TypedArray, TypedArrayConstructor } from "./formatter";

function toReadableStream<TChunk>(
  iter: AsyncGenerator<TChunk>
): ReadableStream<TChunk> {
  return new ReadableStream({
    async pull(controller) {
      const { value, done } = await iter.next();
      if (done) {
        controller.close();
      } else {
        controller.enqueue(value);
      }
    },
  });
}

const BIT_FORMAT = {
  uint8: Uint8Array,
  int8: Int8Array,
  uint16: Uint16Array,
  int16: Int16Array,
  uint32: Uint32Array,
  int32: Int32Array,
  float32: Float32Array,
  float64: Float64Array,
};
type BitFormatName = keyof typeof BIT_FORMAT;

export default function api(original: URL): {
  uri: URL;
  transform: (body: ReadableStream<Uint8Array>) => ReadableStream<Uint8Array>;
} {
  const output_ctor: TypedArrayConstructor<TypedArray> | undefined =
    original.searchParams.has("bitout")
      ? BIT_FORMAT[<BitFormatName>original.searchParams.get("bitout")]
      : undefined;

  const uri = new URL(original);
  uri.pathname = `file/raster${uri.pathname}`;
  uri.search = "";
  return {
    uri,
    transform(body) {
      return output_ctor
        ? toReadableStream(
            StreamNumberFormatter(
              Float32Array,
              output_ctor,
              (x) => Math.max(-128, Math.min(x, 127)),
              body
            )
          )
        : body;
    },
  };
}
