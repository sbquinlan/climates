import { debug, getTransformMatrix, isLittleEndian, genTexture } from '../lib/util'

import { luma, TypedArray } from '@luma.gl/api';
import '@luma.gl/webgl';

import vs from '../shaders/shader3.vert'
import fs from '../shaders/koppen/shader.frag'

const littleEndian = isLittleEndian();

async function main() {
  const radius = 256;
  const [temp_data, prec_data] = await Promise.all([
    genTexture("/asint8/wc2.1_10m_tavg/0/0/0.bin"),
    genTexture("/asint8/wc2.1_10m_prec/0/0/0.bin")
  ]);

  const canvas = document.getElementById('rendertarget') as HTMLCanvasElement;
  const device = await luma.createDevice({ type: 'best-available', canvas });

  const position = device.createBuffer({
    data: new Float32Array([
      0, 0, 0, 1, 1, 0, 
      1, 1, 1, 0, 0, 1
    ]),
  })
  const prec = device.createTexture({
    width: radius,
    height: radius,
    data: prec_data as TypedArray,
  });
  const temp = device.createTexture({
    width: radius,
    height: radius,
    data: temp_data as TypedArray,
  })
  const pipeline = device.createRenderPipeline({
    id: 'my-pipeline',
    vs, fs, 
    attributes: { position },
    vertexCount: 6,
    uniforms: {
      isLittleEndian: isLittleEndian(),
      projectionMatrix: new Float32Array(getTransformMatrix(2, 2, -1, -1)),
      modelViewMatrix: new Float32Array(getTransformMatrix(1, 1, 0, 0)),
      temp,
      prec,
    },
  });
  pipeline.draw({});
}

main()
