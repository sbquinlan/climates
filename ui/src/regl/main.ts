import REGL from 'regl'
import { debug, getTransformMatrix, genTexture } from '../lib/util'

import vert_source from '../shaders/shader.vert'
import frag_source from '../shaders/koppen/float.frag'

Promise.all([
  genTexture("/tiles/wc2.1_10m_tavg/1/0/0.bin"),
  genTexture("/tiles/wc2.1_10m_prec/1/0/0.bin")
]).then((buffers) => {
  let gl = (document.getElementById('rendertarget') as HTMLCanvasElement).getContext(
    'webgl', 
    { preserveDrawingBuffer: true, premultipliedAlpha: false }
  );
  gl = debug(gl)
  const regl = REGL({ gl, extensions: ['WEBGL_color_buffer_float', 'OES_texture_float'] });
  const [temp, prec] = buffers.map(
    data => regl.texture({
      data,
      width: 3 * 256,
      height: 256,
      type: 'float'
    })
  );
  const drawtile = regl({
    frag: frag_source,
    vert: vert_source,
    vao: regl.vao({ 
      attributes: [
        [ [0, 0], [0, 1], [1, 0],
          [1, 1], [0, 1], [1, 0] ], 
      ],
      count: 6,
    }),
    attributes: { position: 0 },
    uniforms: {
      projectionMatrix: getTransformMatrix(2, 2, -1, -1),
      modelViewMatrix: getTransformMatrix(1, 1, 0, 0),
      temp,
      prec
    }
  });
  
  regl.clear({color: [0.0, 0.0, 0.0, 0.0]});
  drawtile();
});