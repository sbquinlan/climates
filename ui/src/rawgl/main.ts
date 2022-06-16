import factory from './rawgl';
import { getTransformMatrix, isLittleEndian, genTexture, debug } from '../lib/util'

import vert from '../shaders/shader3.vert'
import frag from '../shaders/koppen/shader.frag'

Promise.all([
  genTexture("/data/wc2.1_10m_tavg/0/0/0.bin?bitout=int8"),
  genTexture("/data/wc2.1_10m_prec/0/0/0.bin?bitout=int8")
]).then(([temp_buff, prec_buff]) => {
  let gl = (document.getElementById('rendertarget') as HTMLCanvasElement).getContext(
    'webgl2', 
    { preserveDrawingBuffer: true, premultipliedAlpha: false }
  )!;
  gl.getExtension('EXT_color_buffer_float')
  gl = debug(gl)
  const { rawgl, buffer, texture, vao } = factory(gl)
  
  const tilesize = 256
  const format: [number, number, number] = [gl.RGB32F, gl.RGB, gl.FLOAT];

  const temp = texture({ width: tilesize, height: tilesize, format })
  const prec = texture({ width: tilesize, height: tilesize, format })
  const render = rawgl({
    viewport: { width: tilesize, height: tilesize },
    vert, frag,
    attributes: vao({
      position: buffer(new Float32Array([
        0, 0, 0, 1, 1, 0,
        1, 1, 1, 0, 0, 1
      ])),
    }),
    uniforms: {
      temp,
      prec,
      littleEndian: isLittleEndian(),
      projectionMatrix: getTransformMatrix(2, 2, -1, -1),
      modelViewMatrix: getTransformMatrix(1, 1, 0, 0),
    },
  });

  render();
  temp.subimage(temp_buff)
  prec.subimage(prec_buff)
  render();
});