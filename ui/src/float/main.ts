import { getTransformMatrix, isLittleEndian, genTexture } from '../lib/util'

import vert_source from '../shaders/shader3.vert'
import frag_source from '../shaders/koppen/float3.frag'

const littleEndian = isLittleEndian();

async function main() {
  const radius = 256;
  const [temp, prec] = await Promise.all([
    genTexture("/tiles/wc2.1_10m_tavg/1/0/0.bin"),
    genTexture("/tiles/wc2.1_10m_prec/1/0/0.bin")
  ]);

  const canvas: HTMLCanvasElement = document.getElementById('rendertarget') as HTMLCanvasElement
  const gl = canvas.getContext(
    'webgl2', 
    { preserveDrawingBuffer: true, premultipliedAlpha: false }
  );
  gl.getExtension('EXT_color_buffer_float');
  gl.getExtension('OES_standard_derivatives');

  const format = [gl.RGBA32F, gl.RGBA, gl.FLOAT];
  const [internalFormat, texel_format, texel_type] = format;
  
  const tex1 = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex1);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texStorage2D(gl.TEXTURE_2D, 1, internalFormat, 3 * radius, radius);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 3 * radius, radius, texel_format, texel_type, temp, 0);

  const tex2 = gl.createTexture();
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, tex2);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texStorage2D(gl.TEXTURE_2D, 1, internalFormat, 3 * radius, radius);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 3 * radius, radius, texel_format, texel_type, prec, 0);

  const vert = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vert, vert_source);
  gl.compileShader(vert);

  const frag = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(frag, frag_source);
  gl.compileShader(frag);

  const program = gl.createProgram();
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
    littleEndian as number,
  )
  gl.uniform1i(
    gl.getUniformLocation(program, 'temp'),
    0,
  )
  gl.uniform1i(
    gl.getUniformLocation(program, 'prec'),
    1,
  );

  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

main()
