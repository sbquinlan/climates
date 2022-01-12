import vert_source from '../shaders/shader.vert'
import frag_source from '../shaders/basic.frag'
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
  "http://localhost:8000/10m_tavg/January/0/0/0.png",
  "http://localhost:8000/10m_tavg/February/0/0/0.png",
  "http://localhost:8000/10m_tavg/March/0/0/0.png",
  "http://localhost:8000/10m_tavg/April/0/0/0.png",
];

async function load_image_from_elem(uri: string) {
  const img = new Image()
  img.crossOrigin = ''
  img.src = uri
  await img.decode();
  return img;
}

async function load_image_from_fetch(uri: string) {
  const resp = await fetch(uri);
  const blob = await resp.blob();
  return await createImageBitmap(blob, { premultiplyAlpha: 'none' });
}

type rProps = {
  textures: REGL.Texture[]
};

function main() {
  const canvas = document.getElementById('rendertarget') as HTMLCanvasElement;
  const extensions = ['OES_texture_float']
  const regl = REGL({ canvas, extensions });
  const drawtile: REGL.DrawCommand<REGL.DefaultContext, rProps> = regl({
    frag: frag_source,
    vert: vert_source,
    depth: { enable: false },
    
    attributes: {
      a_position: [
        0, 0, 0, 1, 1, 0,
        1, 1, 0, 1, 1, 0,
      ],
    },
    count: 6,

    uniforms: {
      u_clipTransform: getTransformMatrix(2, 2, -1, -1),

      texture1: (_, {textures}) => textures[0],
      texture2: (_, {textures}) => textures[1],
      texture3: (_, {textures}) => textures[2],
      texture4: (_, {textures}) => textures[3],
    }
  });

  Promise.all(images.map(load_image_from_elem))
    .then(idks => {
      const textures = idks.map(
        data => regl.texture({ 
          data, 
          format: 'luminance alpha',
          type: 'float',
        })
      );
      regl.clear({color: [0.0, 0.0, 0.0, 0.0]});
      drawtile({textures});
      const pixels = regl.read();
      console.log(pixels)
    })
}

main()