import { getTransformMatrix, isLittleEndian, genTexture } from '../lib/util'

import vert_source from '../shaders/shader3.vert'
import frag_source from '../shaders/koppen/compare.frag'

const littleEndian = isLittleEndian();

async function main() {
  const radius = 256;
  const [itemp, iprec, ftemp, fprec] = await Promise.all([
    genTexture("/data/wc2.1_10m_tavg/1/0/0.bin?bitout=int8"),
    genTexture("/data/wc2.1_10m_prec/1/0/0.bin?bitout=int8"),
    genTexture("/data/wc2.1_10m_tavg/1/0/0.bin"),
    genTexture("/data/wc2.1_10m_prec/1/0/0.bin")
  ]);

  const canvas: HTMLCanvasElement = document.getElementById('rendertarget') as HTMLCanvasElement
  const gl = canvas.getContext(
    'webgl2', 
    { preserveDrawingBuffer: true, premultipliedAlpha: false }
  )!;
  gl.getExtension('EXT_color_buffer_float');

  let [internalFormat, texel_format, texel_type] = [gl.RGB32F, gl.RGB, gl.FLOAT];
  const itemp_tex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, itemp_tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texStorage2D(gl.TEXTURE_2D, 1, internalFormat, radius, radius);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, radius, radius, texel_format, texel_type, itemp, 0);

  const iprec_tex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, iprec_tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texStorage2D(gl.TEXTURE_2D, 1, internalFormat, radius, radius);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, radius, radius, texel_format, texel_type, iprec, 0);

  [internalFormat, texel_format, texel_type] = [gl.RGBA32F, gl.RGBA, gl.FLOAT];
  const ftemp_tex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, ftemp_tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texStorage2D(gl.TEXTURE_2D, 1, internalFormat, 3 * radius, radius);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 3 * radius, radius, texel_format, texel_type, ftemp, 0);

  const fprec_tex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE3);
  gl.bindTexture(gl.TEXTURE_2D, fprec_tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texStorage2D(gl.TEXTURE_2D, 1, internalFormat, 3 * radius, radius);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 3 * radius, radius, texel_format, texel_type, fprec, 0);

  const vert = gl.createShader(gl.VERTEX_SHADER)!;
  gl.shaderSource(vert, vert_source);
  gl.compileShader(vert);

  const frag = gl.createShader(gl.FRAGMENT_SHADER)!;
  gl.shaderSource(frag, frag_source);
  gl.compileShader(frag);

  const program = gl.createProgram()!;
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  const vbuff = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbuff);
  gl.bufferData(
    gl.ARRAY_BUFFER, 
    new Float32Array([
      0, 0, 0, 1, 1, 0,
      1, 1, 1, 0, 0, 1,
    ]),
    gl.STATIC_DRAW,
  );
  
  const vpos = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(vpos);
  gl.vertexAttribPointer(vpos, 2, gl.FLOAT, false, 0, 0);

  gl.viewport(0, 0, radius, radius);
  
  gl.clearColor(0,0,0,0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.disable(gl.DEPTH_TEST);
  
  gl.useProgram(program);
  gl.bindVertexArray(vao);
  
  gl.uniformMatrix4fv(
    gl.getUniformLocation(program, 'projectionMatrix'),
    false,
    getTransformMatrix(2, 2, -1, -1)
  );
  gl.uniformMatrix4fv(
    gl.getUniformLocation(program, 'modelViewMatrix'),
    false,
    getTransformMatrix(1, 1, 0, 0)
  );
  gl.uniform1i(
    gl.getUniformLocation(program, 'littleEndian'),
    Number(littleEndian),
  )
  gl.uniform1i(
    gl.getUniformLocation(program, 'itemp'),
    0,
  )
  gl.uniform1i(
    gl.getUniformLocation(program, 'iprec'),
    1,
  );
  gl.uniform1i(
    gl.getUniformLocation(program, 'ftemp'),
    2,
  )
  gl.uniform1i(
    gl.getUniformLocation(program, 'fprec'),
    3,
  );
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  const pixels = new Float32Array(radius ** 2 * 4)
  return;
}

main()
