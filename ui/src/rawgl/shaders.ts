import vert_source from '../shaders/shader.vert'
import frag_source from '../shaders/basic.frag'

const canvas: HTMLCanvasElement = document.getElementById('rendertarget') as HTMLCanvasElement
const gl = canvas.getContext('webgl2', { premultipliedAlpha: false })

const tilesize = 256

const images = [
  "http://localhost:8000/10m_tavg/January/0/0/0.png",
  // "http://localhost:8000/10m_tavg/February/0/0/0.png",
  // "http://localhost:8000/10m_tavg/March/0/0/0.png",
  // "http://localhost:8000/10m_tavg/April/0/0/0.png",
];

async function load_image_from_elem(uri) {
  const img = new Image()
  img.crossOrigin = ''
  img.src = uri
  await img.decode();
  return img;
}

function getTransformMatrix(
  sx: number, sy: number,
  tx: number, ty: number,
): number[] {
  return [
    sx, 0,  0, 0,
    0,  sy, 0, 0,
    0,  0,  1, 0,
    tx, ty, 0, 1,
  ];
}

const createShader = (type, source) => {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    return shader;
  }

  console.log(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader)
  return null;
}

const createProgram = (vert, frag) => {
  const program = gl.createProgram();
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
    return program;
  }
 
  console.log(gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
  return null;
}

const fill_buffer = (data: BufferSource) => {
  // REVIEW: should own this buffer object and clean it up
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
}

const attach_vertex_buffer = (attrib_loc: number, stride: number) =>  {
  gl.enableVertexAttribArray(attrib_loc);
  gl.vertexAttribPointer(
    attrib_loc,
    stride,
    gl.FLOAT,
    false,
    0,
    0,
  );
}

type TypedArray = Uint8ArrayConstructor 
  | Int8ArrayConstructor 
  | Int16ArrayConstructor 
  | Uint16ArrayConstructor 
  | Int32ArrayConstructor 
  | Uint32ArrayConstructor 
  | Float32ArrayConstructor;
// https://www.khronos.org/registry/webgl/specs/latest/2.0/#TEXTURE_TYPES_FORMATS_FROM_DOM_ELEMENTS_TABLE
const typed_array_for_type = (type: number): TypedArray => {
  switch(type) {
    case gl.BYTE:
      return Int8Array;
    case gl.UNSIGNED_BYTE:
      return Uint8Array; // also clamped array
    case gl.SHORT:
      return Int16Array;
    case gl.UNSIGNED_SHORT:
    case gl.UNSIGNED_SHORT_4_4_4_4:
    case gl.UNSIGNED_SHORT_5_5_5_1:
    case gl.UNSIGNED_SHORT_5_6_5:
      return Uint16Array;
    case gl.INT:
      return Int32Array;
    case gl.UNSIGNED_INT:
    case gl.UNSIGNED_INT_5_9_9_9_REV:
    case gl.UNSIGNED_INT_2_10_10_10_REV:
    case gl.UNSIGNED_INT_10F_11F_11F_REV:
    case gl.UNSIGNED_INT_24_8:
      return Uint32Array;
    case gl.HALF_FLOAT:
      return Uint16Array;
    case gl.FLOAT:
      return Float32Array;
    default:
      throw new Error(`Unsupported type: ${type}`);
  }
}

const SUPPORTED_COMBOS = [
  [gl.RGB, gl.RGB, gl.UNSIGNED_BYTE],
  [gl.RGB, gl.RGB, gl.UNSIGNED_SHORT_5_6_5],

  [gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE],
  [gl.RGBA, gl.RGBA, gl.UNSIGNED_SHORT_4_4_4_4],
  [gl.RGBA, gl.RGBA, gl.UNSIGNED_SHORT_5_5_5_1],

  // Firefox allows these to be float, but it's not to spec
  [gl.LUMINANCE_ALPHA, gl.LUMINANCE_ALPHA, gl.UNSIGNED_BYTE],
  [gl.LUMINANCE, gl.LUMINANCE, gl.UNSIGNED_BYTE],
  [gl.ALPHA, gl.ALPHA, gl.UNSIGNED_BYTE],
  
  [gl.R8, gl.RED, gl.UNSIGNED_BYTE],
  [gl.R16F, gl.RED, gl.HALF_FLOAT],
  [gl.R16F, gl.RED, gl.FLOAT],
  [gl.R32F, gl.RED, gl.FLOAT],
  [gl.R8UI, gl.RED_INTEGER, gl.UNSIGNED_BYTE],
  
  [gl.RG8, gl.RG, gl.UNSIGNED_BYTE],
  [gl.RG16F, gl.RG, gl.HALF_FLOAT],
  [gl.RG16F, gl.RG, gl.FLOAT],
  [gl.RG32F, gl.RG, gl.FLOAT],
  [gl.RG8UI, gl.RG_INTEGER, gl.UNSIGNED_BYTE],

  [gl.RGB8, gl.RGB, gl.UNSIGNED_BYTE],
  [gl.SRGB8, gl.RGB, gl.UNSIGNED_BYTE],
  [gl.RGB565, gl.RGB, gl.UNSIGNED_BYTE],
  [gl.RGB565, gl.RGB, gl.UNSIGNED_SHORT_5_6_5],
  [gl.R11F_G11F_B10F, gl.RGB, gl.UNSIGNED_INT_10F_11F_11F_REV],
  [gl.R11F_G11F_B10F, gl.RGB, gl.HALF_FLOAT],
  [gl.R11F_G11F_B10F, gl.RGB, gl.FLOAT],
  [gl.RGB9_E5, gl.RGB, gl.UNSIGNED_BYTE],
  [gl.RGB9_E5, gl.RGB, gl.UNSIGNED_SHORT_5_6_5],
  [gl.RGB16F, gl.RGB, gl.HALF_FLOAT],
  [gl.RGB16F, gl.RGB, gl.FLOAT],
  [gl.RGB32F, gl.RGB, gl.FLOAT],
  [gl.RGB8UI, gl.RGB_INTEGER, gl.UNSIGNED_BYTE],

  [gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE],
  [gl.SRGB8_ALPHA8, gl.RGBA, gl.UNSIGNED_BYTE],
  [gl.RGB5_A1, gl.RGBA, gl.UNSIGNED_BYTE],
  [gl.RGB5_A1, gl.RGBA, gl.UNSIGNED_SHORT_5_5_5_1],
  [gl.RGB10_A2, gl.RGBA, gl.UNSIGNED_INT_2_10_10_10_REV],
  [gl.RGBA4, gl.RGBA, gl.UNSIGNED_BYTE],
  [gl.RGBA4, gl.RGBA, gl.UNSIGNED_SHORT_4_4_4_4],
  [gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT],
  [gl.RGBA16F, gl.RGBA, gl.FLOAT],
  [gl.RGBA32F, gl.RGBA, gl.FLOAT],
  [gl.RGBA8UI, gl.RGBA_INTEGER, gl.UNSIGNED_BYTE],
];

// https://hg.mozilla.org/mozilla-central/file/tip/dom/canvas/TexUnpackBlob.cpp#l86
// conflicts with notes in https://github.com/KhronosGroup/WebGL/issues/2789 but 
// https://github.com/KhronosGroup/WebGL/pull/3312 reverts the spec change

const createTexture = (uri, idx) => {
  const [internalFormat, texel_format, texel_type] =  [
    gl.R32F, gl.RED, gl.FLOAT
  ]

  const tex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + idx);
  gl.bindTexture(gl.TEXTURE_2D, tex);

  // unpack is from "packed" (in memory) to the gpu memory
  // https://www.khronos.org/registry/webgl/specs/latest/2.0/#DOM_UPLOAD_UNPACK_PARAMS
  // UNPACK_ALIGNMENT and UNPACK_ROW_LENGTH are ignored. UNPACK_ALIGNMENT is specified in bytes, and is implicit and implementation-dependent for TexImageSource objects
  // gl.pixelStorei(gl.UNPACK_ALIGNMENT, 2)

  // we don't need mipmaps unless we do fancy things like use zoomed in tiles
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  
  // review: i think this is webgl2 only and not many people actually use it
  gl.texStorage2D(gl.TEXTURE_2D, 1, internalFormat, tilesize, tilesize);
  const array_constructor = typed_array_for_type(texel_type);
  const tmp = new array_constructor(tilesize ** 2);
  tmp.fill(0);
  gl.texSubImage2D(
    gl.TEXTURE_2D,
    0, // level 
    0, // offsetx
    0, // offsety
    tilesize,
    tilesize,
    texel_format,
    texel_type,
    tmp,
    0,
  )

  load_image_from_elem(uri).then(
    (img) => {
      gl.activeTexture(gl.TEXTURE0 + idx);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texSubImage2D(
        gl.TEXTURE_2D,
        0, // level 
        0, // offsetx
        0, // offsety
        texel_format,
        texel_type,
        img as HTMLImageElement,
      );
    }
  )
  return tex;
}

const init = () => {
  const program = createProgram(
    createShader(gl.VERTEX_SHADER, vert_source), 
    createShader(gl.FRAGMENT_SHADER, frag_source),
  );

  fill_buffer(
    new Float32Array([
      0, 0, 0, 1, 1, 0,
      1, 1, 0, 1, 1, 0,
    ])
  );
  const geometry = gl.createVertexArray();
  gl.bindVertexArray(geometry);
  attach_vertex_buffer(gl.getAttribLocation(program, 'a_position'), 2);

  return { 
    program, 
    geometry, 
    transforms: {
      u_clipTransform: getTransformMatrix(2, 2, -1, -1),
    },
    textures: images.map(
      (uri, idx) => createTexture(uri, idx)
    ),
  };
}

const render = ({ program, geometry, transforms, textures }) => {
  gl.viewport(0, 0, tilesize, tilesize);

  gl.clearColor(0.0, 0.0, 0.0, 0.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.disable(gl.DEPTH_TEST);

  gl.useProgram(program)
  gl.bindVertexArray(geometry)
  Object.entries(transforms).map(
    ([key, value]) => gl.uniformMatrix4fv(
      gl.getUniformLocation(program, key), 
      false, 
      value as Iterable<number>,
    )
  );
  textures.map(
    (tex_id, idx) => gl.uniform1i(gl.getUniformLocation(program, `texture${idx + 1}`), idx)
  );
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

const main = () => {
  const context = init();
  render(context)
  requestAnimationFrame(() => render(context))
}

main()