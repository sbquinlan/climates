import * as THREE from 'three'
import { isLittleEndian } from '../lib/util'
import RasterDataLoader from './RasterDataLoader'

import vertexShader from '../shaders/shader3.vert'
import fragmentShader from '../shaders/koppen/float3.frag'

const tilesize = 256
const loader = new RasterDataLoader({
  width: tilesize * 3,
  height: tilesize,
  format: THREE.RGBAFormat,
  type: THREE.FloatType,
});
const scene = (new THREE.Scene()).add(
  new THREE.Mesh( 
    new THREE.PlaneGeometry( tilesize, tilesize ), 
    new THREE.RawShaderMaterial({ 
      uniforms: {
        littleEndian: { value: isLittleEndian() },
        temp: { value: loader.load('/data/wc2.1_10m_tavg/1/0/0.bin', (t) => { renderer.render( scene, ortho ); }) },
        prec: { value: loader.load('/data/wc2.1_10m_prec/1/0/0.bin', (t) => { renderer.render( scene, ortho ); }) },
      },
      vertexShader,
      fragmentShader,
    }),
  )
);

const ortho = new THREE.OrthographicCamera(
	-tilesize / 2, tilesize / 2, 
  tilesize / 2, -tilesize / 2,
  0.1, 1000,
);
ortho.position.set(0, 0, 10);
ortho.lookAt(scene.position);

const renderer = new THREE.WebGLRenderer({ canvas: <HTMLCanvasElement> document.getElementById('rendertarget') });
renderer.setSize(tilesize, tilesize)
renderer.setViewport(0, 0, tilesize, tilesize);
renderer.render( scene, ortho );