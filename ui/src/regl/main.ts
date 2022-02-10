import vert_source from '../shaders/shader.vert'
import koppen_frag from '../shaders/koppen.frag'
import normal_frag from '../shaders/basic.frag'
import REGL from 'regl'

function getTransformMatrix(
  sx: number, sy: number,
  tx: number, ty: number,
): number[] {
  // Matrix must be in column-major order for WebGL.
  return [
    sx,  0, 0, 0,
     0, sy, 0, 0,
     0,  0, 1, 0,
    tx, ty, 0, 1,
  ];
}

const images = [
  "/tiles/wc2.1_10m_tavg/0/0/0.bin",
  "/tiles/wc2.1_10m_prec/0/0/0.bin",
];

async function load_image_from_data(uri: string) {
  const resp = await fetch(uri);
  const buff = await resp.arrayBuffer();
  return new Float32Array(buff);
}

type rProps = {
  textures: REGL.Texture[]
};

function main() {
  const canvas = document.getElementById('rendertarget') as HTMLCanvasElement;
  const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
  const extensions = ['OES_texture_float']
  const regl = REGL({ gl, extensions });
  const drawtile: REGL.DrawCommand<REGL.DefaultContext, rProps> = regl({
    frag: koppen_frag,
    vert: vert_source,

    attributes: {
      a_position: [
        0, 0, 0, 1, 1, 0,
        1, 1, 0, 1, 1, 0,
      ],
    },
    count: 6,

    uniforms: {
      clipTransform: getTransformMatrix(2, 2, -1, -1),
      noData: -3.39999995214436e+38,

      temp: (_, {temp}) => temp,
      prec: (_, {prec}) => prec,
    }
  });

  Promise.all(images.map(load_image_from_data))
    .then((buffers) => {
      const [temp, prec] = buffers.map(
        data => regl.texture({
          data,
          format: 'rgba',
          type: 'float',
          mipmap: false,
          width: 3 * 256,
          height: 256,
          channels: 4,
        })
      );
      regl.clear({color: [0.0, 0.0, 0.0, 0.0]});
      drawtile({temp, prec});
      // const pixels = regl.read({framebuffer: fbo});
      const pixels = regl.read();
      console.log(pixels);
    })
}

main()
