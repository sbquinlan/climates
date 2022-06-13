import { debug, typed_array_for_type, range, make_array } from '../lib/util';

export default function factory(gl: WebGL2RenderingContext) {
  // gl = debug(gl);
  const COMPONENTS = {
    [gl.FLOAT]: 1, [gl.FLOAT_VEC2]: 2, [gl.FLOAT_VEC3]: 3, [gl.FLOAT_VEC4]: 4,
  }
  const TEXTURE_CHANNELS = {
    [gl.LUMINANCE]: 1, [gl.LUMINANCE_ALPHA]: 2, [gl.ALPHA]: 1,
    [gl.RGB]: 3,   [gl.RGBA]: 4,
    [gl.R8]: 1,    [gl.RG8]: 2,    [gl.RGB8]: 3,    [gl.RGBA8]: 4,
    [gl.R8I]: 1,   [gl.RG8I]: 2,   [gl.RGB8I]: 3,   [gl.RGBA8I]: 4,
    [gl.R8UI]: 1,  [gl.RG8UI]: 2,  [gl.RGB8UI]: 3,  [gl.RGBA8UI]: 4,
    [gl.R16I]: 1,  [gl.RG16I]: 2,  [gl.RGB16I]: 3,  [gl.RGBA16I]: 4,
    [gl.R16UI]: 1, [gl.RG16UI]: 2, [gl.RGB16UI]: 3, [gl.RGBA16UI]: 4,
    [gl.R16F]: 1,  [gl.RG16F]: 2,  [gl.RGB16F]: 3,  [gl.RGBA16F]: 4,
    [gl.R32I]: 1,  [gl.RG32I]: 2,  [gl.RGB32I]: 3,  [gl.RGBA32I]: 4,
    [gl.R32UI]: 1, [gl.RG32UI]: 2, [gl.RGB32UI]: 3, [gl.RGBA32UI]: 4,
    [gl.R32F]: 1,  [gl.RG32F]: 2,  [gl.RGB32F]: 3,  [gl.RGBA32F]: 4,
    [gl.SRGB8]: 3, [gl.SRGB8_ALPHA8]: 4,
  }

  type NamedVariables = { [name: string]: any };
  interface RawglArgs {
    viewport: { 
      width: number;
      height: number;
    };
    vert: string;
    frag: string;
    attributes: VertexArrayObject;
    uniforms: NamedVariables;
    framebuffer?: Framebuffer;
  }

  interface RenderbufferArgs {
    width: number;
    height: number;
    format: number;
  }

  interface TextureArgs {
    width: number;
    height: number;
    format: [number, number, number];
    data?: ArrayBufferView | ArrayBuffer;
  }

  let shitty_hashing = 0;
  type Hash = number;
  abstract class Hashable {
    readonly hash: Hash;
    constructor() {
      this.hash = shitty_hashing++;
    }
  }

  abstract class Bindable<TCacheObj, TArgs extends unknown[]> extends Hashable {
    abstract bind(... args: TArgs): TCacheObj;
    abstract bindFrom(obj: TCacheObj, ... args: TArgs): void;
  }

  class BindableCache<TCacheObj, TArgs extends unknown[], TBindable extends Bindable<TCacheObj, TArgs>> {
    private cache: Map<Hash, TCacheObj> = new Map();
    bind(description: TBindable, ...args: TArgs): TCacheObj {
      let obj = this.cache.get(description.hash);
      if (!obj) {
        obj = description.bind(... args);
        this.cache.set(description.hash, obj);
      } else {
        description.bindFrom(obj, ... args);
      }
      return obj;
    }
  }

  interface VariableRecord<TLocation> {
    loc: TLocation;
    info: WebGLActiveInfo;
  }

  class Program {
    private program: WebGLProgram;

    private textures: Map<number, Texture | null> = new Map(
      [... range(gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS))].map(
        (slot) => [gl.TEXTURE0 + slot, null]
      )
    );

    private vaos: BindableCache<WebGLVertexArrayObject, [Program], VertexArrayObject> = new BindableCache();
    private buffers: BindableCache<WebGLBuffer, [], Buffer> = new BindableCache();

    private readonly uniformLookup: Map<string, VariableRecord<WebGLUniformLocation>> = new Map();
    private readonly attribLookup: Map<string, VariableRecord<number>> = new Map();

    constructor(vert: string, frag: string) {
      this.program = gl.createProgram()!;
      gl.attachShader(this.program, this.createShader(gl.VERTEX_SHADER, vert));
      gl.attachShader(this.program, this.createShader(gl.FRAGMENT_SHADER, frag));
      gl.linkProgram(this.program);

      if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
        const msg = gl.getProgramInfoLog(this.program)!;
        gl.deleteProgram(this.program);
        throw new Error(msg);
      }

      for (const info of this.activeUniforms()) {
        const loc = gl.getUniformLocation(this.program, info!.name)!;
        this.uniformLookup.set(info!.name, { info: info!, loc });
      }
      for (const info of this.activeAttributes()) {
        const loc = gl.getAttribLocation(this.program, info!.name)!;
        this.attribLookup.set(info!.name, { info: info!, loc });
      }
    }

    private createShader(type: number, source: string): WebGLShader {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
  
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const msg = gl.getShaderInfoLog(shader)!;
        gl.deleteShader(shader)
        throw new Error(msg);
      }
      return shader;
    }

    *activeUniforms() {
      const n = gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORMS);
      for (const i of range(n)) yield gl.getActiveUniform(this.program, i);
    }

    private findTexture(tex: Texture | null): number | undefined {
      for (const [slot, texture] of this.textures) {
        if (texture === tex) {
          return slot;
        }
      }
      return undefined;
    }

    public setUniforms(uniforms: NamedVariables) {
      Object.entries(uniforms).map(
        ([key, value]) => this.setUniform(key, value)
      );
    }

    private setUniform(key: string, value: any) {
      const record = this.uniformLookup.get(key);
      if (!record) {
        console.warn(`Uniform '${key}' used, but not defined in shaders.`);
        return;
      }
      const { info, loc } = record;
      if (value instanceof Texture) {
        const slot = this.findTexture(value) ?? this.findTexture(null);
        // This could be improved, if you make alot of textures and rotate them 
        // in and out of being used, there's no way to tell the program to clear
        // unused textures out of slots to make room for new ones
        if (!slot) throw new Error('No available texture spots');
        this.textures.set(slot, value);

        value.bind(slot);
        value = slot - gl.TEXTURE0;
        // fall through
      }
      switch (info.type) {
        case gl.UNSIGNED_INT:
          gl.uniform1uiv(loc, make_array(value, Uint32Array));
          break;
        case gl.UNSIGNED_INT_VEC2:
          gl.uniform2uiv(loc, make_array(value, Uint32Array));
          break;
        case gl.UNSIGNED_INT_VEC3:
          gl.uniform3uiv(loc, make_array(value, Uint32Array));
          break;
        case gl.UNSIGNED_INT_VEC4:
          gl.uniform4uiv(loc, make_array(value, Uint32Array));
          break;
        case gl.BOOL:
        case gl.INT:
        case gl.SAMPLER_2D:
        case gl.SAMPLER_3D:
        case gl.SAMPLER_CUBE:
          gl.uniform1iv(loc, make_array(value, Int32Array));
          break;
        case gl.BOOL_VEC2:
        case gl.INT_VEC2:
          gl.uniform2iv(loc, make_array(value, Int32Array));
          break;
        case gl.BOOL_VEC3:
        case gl.INT_VEC3:
          gl.uniform3iv(loc, make_array(value, Int32Array));
          break;
        case gl.BOOL_VEC4:
        case gl.INT_VEC4:
          gl.uniform4iv(loc, make_array(value, Int32Array));
          break;
        case gl.FLOAT:
          gl.uniform1fv(loc, make_array(value, Float32Array));
          break;
        case gl.FLOAT_VEC2:
          gl.uniform2fv(loc, make_array(value, Float32Array));
          break;
        case gl.FLOAT_VEC3:
          gl.uniform3fv(loc, make_array(value, Float32Array));
          break;
        case gl.FLOAT_VEC4:
          gl.uniform4fv(loc, make_array(value, Float32Array));
          break;
        case gl.FLOAT_MAT2:
          gl.uniformMatrix2fv(loc, false, make_array(value, Float32Array));
          break;
        case gl.FLOAT_MAT2x3:
          gl.uniformMatrix2x3fv(loc, false, make_array(value, Float32Array));
          break;
        case gl.FLOAT_MAT2x4:
          gl.uniformMatrix2x4fv(loc, false, make_array(value, Float32Array));
          break;
        case gl.FLOAT_MAT3:
          gl.uniformMatrix3fv(loc, false, make_array(value, Float32Array));
          break;
        case gl.FLOAT_MAT3x2:
          gl.uniformMatrix3x2fv(loc, false, make_array(value, Float32Array));
          break;
        case gl.FLOAT_MAT3x4:
          gl.uniformMatrix3x4fv(loc, false, make_array(value, Float32Array));
          break;
        case gl.FLOAT_MAT4:
          gl.uniformMatrix4fv(loc, false, make_array(value, Float32Array));
          break;
        case gl.FLOAT_MAT4x2:
          gl.uniformMatrix2x4fv(loc, false, make_array(value, Float32Array));
          break;
        case gl.FLOAT_MAT4x3:
          gl.uniformMatrix4x3fv(loc, false, make_array(value, Float32Array));
          break;
      }
    }

    *activeAttributes() {
      const n = gl.getProgramParameter(this.program, gl.ACTIVE_ATTRIBUTES);
      for (const i of range(n)) yield gl.getActiveAttrib(this.program, i);
    }

    public setAttributes(attributes: VertexArrayObject | NamedVariables) {
      if (attributes instanceof VertexArrayObject) {
        this.vaos.bind(attributes, this);
      } else {
        Object.entries(attributes).map(
          ([name, value]) => this.setAttribute(name, value)
        );
      }
    }

    private setAttribute(key: string, value: any) {
      const record = this.attribLookup.get(key);
      if (!record) {
        console.warn(`Attribute '${key}' used, but not defined in shaders.`);
        return;
      }
      const { info, loc } = record;
      if (value instanceof Buffer) {
        this.buffers.bind(value);
        gl.enableVertexAttribArray(loc);
        // I'm not really sure I get this or the best way to specify this. 
        // I also think it might be possible to specify other things beyond
        // floats and fvecs, but I don't want to support that just yet.
        gl.vertexAttribPointer(
          loc,
          // this seems like a straight up mapping between the info.type. total
          // mystery why this is needed. I guess you could over or under specify.
          COMPONENTS[info.type] * info.size,
          value.type(),
          value.normalize, // normalized
          0, // stride
          0, // offset
        );
        return;
      }
      switch (info.type) {
        case gl.FLOAT:
          gl.vertexAttrib1fv(loc, make_array(value, Float32Array));
          break;
        case gl.FLOAT_VEC2:
          gl.vertexAttrib2fv(loc, make_array(value, Float32Array));
          break;
        case gl.FLOAT_VEC3:
          gl.vertexAttrib3fv(loc, make_array(value, Float32Array));
          break;
        case gl.FLOAT_VEC4:
          gl.vertexAttrib4fv(loc, make_array(value, Float32Array)); 
          break;
        default: 
          console.error(`Attribute '${key}' using unsupported attribute type.`)
      }
    }

    public bind(): void {
      gl.useProgram(this.program);
    }
  }

  // TODO: Texture slots should be managed differently
  // TODO: support all the texture arguments
  class Texture {
    private tex: WebGLTexture;

    constructor(
      private readonly width: number, 
      private readonly height: number, 
      private readonly format: [number, number, number], 
      data?: ArrayBufferView | ArrayBuffer
    ) {
      const [internalFormat, _texel_format, texel_type] = format;
      const array_ctor = typed_array_for_type(gl, texel_type);
      if (!data) {
        data = new array_ctor(width * height * (TEXTURE_CHANNELS[internalFormat] ?? 1));
      } else if (data instanceof ArrayBuffer) {
        data = new array_ctor(data);
      }

      this.tex = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, this.tex);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4)

      // we don't need mipmaps unless we do fancy things like use zoomed in tiles
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      const [internal_format, _, __] = this.format;      
      gl.texStorage2D(gl.TEXTURE_2D, 1, internal_format, this.width, this.height);
      this.subimage(data);
    }

    bind(slot: number) {
      gl.activeTexture(slot);
      gl.bindTexture(gl.TEXTURE_2D, this.tex);
    }

    subimage(
      data: ArrayBufferView | ArrayBuffer,
      x: number = 0,
      y: number = 0,
      width: number = this.width,
      height: number = this.height,
    ): void {
      gl.bindTexture(gl.TEXTURE_2D, this.tex);
      const [_, texel_format, texel_type] = this.format;
      const array_ctor = typed_array_for_type(gl, texel_type);
      if (data instanceof ArrayBuffer) {
        data = new array_ctor(data);
      }
      gl.texSubImage2D(
        gl.TEXTURE_2D,
        0, // level 
        x, // offsetx
        y, // offsety
        width,
        height,
        texel_format,
        texel_type,
        data instanceof ArrayBuffer ? new array_ctor(data) : data,
        0 // src offset,
      );
    }
  }

  class Renderbuffer extends Hashable {
    private rbo: WebGLRenderbuffer;

    constructor(
      public readonly width: number, 
      public readonly height: number, 
      public readonly internalFormat: number, 
    ) {
      super();
      this.rbo = gl.createRenderbuffer()!;
      gl.bindRenderbuffer(gl.RENDERBUFFER, this.rbo)
      gl.renderbufferStorage(gl.RENDERBUFFER, internalFormat, width, height);
    }

    bind(attachment: number) {
      gl.bindRenderbuffer(gl.RENDERBUFFER, this.rbo);
      gl.framebufferRenderbuffer(
        gl.FRAMEBUFFER, attachment,
        gl.RENDERBUFFER, this.rbo
      );
    }
  }

  class Framebuffer {
    private fbo: WebGLFramebuffer;

    constructor(private readonly renderbuffers: Renderbuffer[]) {
      this.fbo = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
      this.renderbuffers.map(
        (attachment, idx) => {
          attachment.bind(gl.COLOR_ATTACHMENT0 + idx)
        }
      );
    }

    bind() {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
      gl.drawBuffers([... this.renderbuffers.keys()].map(x => gl.COLOR_ATTACHMENT0 + x));
    }

    read(
      attachment: number, 
      x: number = 0, y: number = 0, 
      width?: number | undefined, height?: number | undefined,
    ): ArrayBufferView {
      this.bind();
      const buffer = this.renderbuffers[attachment];
      width ??= buffer.width;
      height ??= buffer.height;
      const texel_type = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_TYPE);
      const array_ctor = typed_array_for_type(gl, texel_type)
      const pixels = new array_ctor(width * height * TEXTURE_CHANNELS[buffer.internalFormat])
      gl.readBuffer(gl.COLOR_ATTACHMENT0 + attachment)
      gl.readPixels(
        x, y, 
        width, height,
        gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_FORMAT), 
        texel_type, 
        pixels,
      );
      return pixels;
    }
  }

  class Buffer extends Bindable<WebGLBuffer, []> {
    constructor(
      private value: ArrayBufferView,
      // only applies when converting ints into float attributes
      public readonly normalize: boolean = false,
      private readonly customType?: number,
    ) { super(); }

    bind(): WebGLBuffer {
      const buff = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, buff);
      gl.bufferData(gl.ARRAY_BUFFER, this.value, gl.STATIC_DRAW);
      return buff;
    }

    bindFrom(buff: WebGLBuffer) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buff);
      gl.bufferData(gl.ARRAY_BUFFER, this.value, gl.STATIC_DRAW);
    }

    type() {
      if (this.customType) {
        return this.customType;
      }
      if (this.value instanceof Float32Array) {
        return gl.FLOAT;
      } else if (this.value instanceof Int32Array) {
        return gl.INT;
      } else if (this.value instanceof Int16Array) {
        return gl.SHORT;
      } else if (this.value instanceof Int8Array) {
        return gl.BYTE;
      } else if (this.value instanceof Uint32Array) {
        return gl.UNSIGNED_INT;
      } else if (this.value instanceof Uint16Array) {
        return gl.UNSIGNED_SHORT;
      } else if (this.value instanceof Uint8Array) {
        return gl.UNSIGNED_BYTE;
      } else {
        throw new Error('Buffer is in unsupported format');
      }
    }
  }

  class VertexArrayObject extends Bindable<WebGLVertexArrayObject, [Program]> {
    constructor(
      public attributes: NamedVariables
    ) { super(); }
    
    bind(program: Program): WebGLVertexArrayObject {
      const vao = gl.createVertexArray()!;
      gl.bindVertexArray(vao);
      program.setAttributes(this.attributes);
      return vao;
    }

    bindFrom(vao: WebGLVertexArrayObject): void {
      gl.bindVertexArray(vao);
    }
  }

  const rawgl = ({ viewport, vert, frag, attributes, uniforms, framebuffer }: RawglArgs) => {
    const { width, height } = viewport
    const program = new Program(vert, frag);
    
    return () => {
      gl.viewport(0, 0, width, height);
      gl.clearColor(0,0,0,0)
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.disable(gl.DEPTH_TEST);

      program.bind();
      program.setAttributes(attributes);
      program.setUniforms(uniforms);
      
      framebuffer?.bind()
      
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
  }

  return { 
    rawgl, 
    rbo: ({ width, height, format }: RenderbufferArgs) => new Renderbuffer(width, height, format), 
    fbo: (renderbuffers: Renderbuffer[]) => new Framebuffer(renderbuffers), 
    texture: ({ width, height, format, data }: TextureArgs) => new Texture(width, height, format, data),
    vao: (attributes: NamedVariables) => new VertexArrayObject(attributes),
    buffer: (value: Float32Array) => new Buffer(value)
  }
}