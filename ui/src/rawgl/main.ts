import factory from './rawgl';
import { getTransformMatrix, isLittleEndian, genTexture } from '../lib/util'

import vert from '../shaders/shader3.vert'
import frag from '../shaders/koppen/shader.frag'

Promise.all([
  genTexture("/asint8/wc2.1_10m_tavg/0/0/0.bin"),
  genTexture("/asint8/wc2.1_10m_prec/0/0/0.bin")
]).then(([temp_buff, prec_buff]) => {
  const gl = (document.getElementById('rendertarget') as HTMLCanvasElement).getContext(
    'webgl2', 
    { preserveDrawingBuffer: true, premultipliedAlpha: false }
  );
  gl.getExtension('EXT_color_buffer_float')
  const { rawgl, buffer, texture, vao } = factory(gl)
  
  const tilesize = 256
  const format = [gl.RGB32F, gl.RGB, gl.FLOAT];

  const temp = texture({ width: tilesize, height: tilesize, format })
  const prec = texture({ width: tilesize, height: tilesize, format })
  const render = rawgl({
    viewport: { width: tilesize, height: tilesize },
    vert, frag,
    attributes: vao({
      position: buffer(new Float32Array([
        0, 0, 0, 1, 1, 0,
        1, 1, 0, 1, 1, 0,
      ])),
    }),
    uniforms: {
      littleEndian: isLittleEndian(),
      projectionMatrix: getTransformMatrix(2, 2, -1, -1),
      modelViewMatrix: getTransformMatrix(1, 1, 0, 0),
      temp,
      prec
    },
  });

  render();
  temp.subimage(temp_buff)
  prec.subimage(prec_buff)
  render();
});