import { debug, getTransformMatrix, isLittleEndian, genTexture } from '../lib/util'

import vert_source from '../shaders/shader3.vert'
import frag_source from '../shaders/koppen/shader.frag'

const littleEndian = isLittleEndian();

async function main() {
  const radius = 256;
  const [temp, prec] = await Promise.all([
    genTexture("/data/wc2.1_10m_tavg/0/0/0.bin?bitout=int8"),
    genTexture("/data/wc2.1_10m_prec/0/0/0.bin?bitout=int8"),
  ]);

  const canvas: HTMLCanvasElement = document.getElementById('rendertarget') as HTMLCanvasElement
  let gl = canvas.getContext(
    'webgl2', 
    { preserveDrawingBuffer: true, premultipliedAlpha: false }
  )!;
  gl.getExtension('EXT_color_buffer_float');
  gl = debug(gl);
  
  const format = [gl.RGB32F, gl.RGB, gl.FLOAT];
  const [internalFormat, texel_format, texel_type] = format;
  
  const vert = gl.createShader(gl.VERTEX_SHADER)!;
  gl.shaderSource(vert, vert_source);
  gl.compileShader(vert);
  
  const frag = gl.createShader(gl.FRAGMENT_SHADER)!;
  gl.shaderSource(frag, frag_source);
  gl.compileShader(frag);

  const tex1 = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex1);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texStorage2D(gl.TEXTURE_2D, 1, internalFormat, radius, radius);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 3*radius, radius, texel_format, texel_type, new Float32Array(radius * radius * 3), 0);

  const tex2 = gl.createTexture();
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, tex2);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texStorage2D(gl.TEXTURE_2D, 1, internalFormat, radius, radius);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, radius, radius, texel_format, texel_type, new Float32Array(radius * radius * 3), 0);
  
  const program = gl.createProgram()!;
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);

  const uProjectionMatrix = gl.getUniformLocation(program, 'projectionMatrix')
  const uModelViewMatrix = gl.getUniformLocation(program, 'modelViewMatrix')
  const uLittleEndian = gl.getUniformLocation(program, 'littleEndian')
  const uTemp = gl.getUniformLocation(program, 'temp')
  const uPrec = gl.getUniformLocation(program, 'prec')

  const vpos = gl.getAttribLocation(program, 'position');

  gl.viewport(0, 0, radius, radius);
  gl.clearColor(0,0,0,0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.disable(gl.DEPTH_TEST);
  gl.useProgram(program);
  
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  
  const vbuff = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbuff);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0,]), gl.STATIC_DRAW);

  gl.enableVertexAttribArray(vpos);
  gl.vertexAttribPointer(vpos, 2, gl.FLOAT, false, 0, 0);
  
  gl.uniform1iv(
    uLittleEndian,
    new Int32Array([littleEndian as unknown as number])
  );
  gl.uniformMatrix4fv(
    uProjectionMatrix,
    false,
    new Float32Array(getTransformMatrix(2, 2, -1, -1))
  );
  gl.uniformMatrix4fv(
    uModelViewMatrix,
    false,
    new Float32Array(getTransformMatrix(1, 1, 0, 0))
  );
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex1);
  gl.uniform1iv(uTemp, new Int32Array([0]));
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, tex2);
  gl.uniform1iv(uPrec, new Int32Array([1]));

  gl.drawArrays(gl.TRIANGLES, 0, 6);

  gl.bindTexture(gl.TEXTURE_2D, tex1);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, radius, radius, texel_format, texel_type, temp, 0);

  gl.bindTexture(gl.TEXTURE_2D, tex2);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, radius, radius, texel_format, texel_type, prec, 0);

  gl.viewport(0, 0, radius, radius);
  gl.clearColor(0,0,0,0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.disable(gl.DEPTH_TEST);
  gl.useProgram(program);
  gl.bindVertexArray(vao);
  
  gl.uniform1iv(
    uLittleEndian,
    new Int32Array([littleEndian as unknown as number])
  );
  gl.uniformMatrix4fv(
    uProjectionMatrix,
    false,
    new Float32Array(getTransformMatrix(2, 2, -1, -1))
  );
  gl.uniformMatrix4fv(
    uModelViewMatrix,
    false,
    new Float32Array(getTransformMatrix(1, 1, 0, 0))
  );
  
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex1);
  gl.uniform1iv(uTemp, new Int32Array([0]));
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, tex2);
  gl.uniform1iv(uPrec, new Int32Array([1]));

  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

main()
