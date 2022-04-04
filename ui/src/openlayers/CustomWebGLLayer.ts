import BaseTileLayer, { Options } from 'ol/layer/BaseTile';
import LayerProperty from 'ol/layer/Property';
import WebGLTileLayerRenderer, {
  Attributes,
  Uniforms,
} from 'ol/renderer/webgl/TileLayer';
import TileSource from 'ol/source/Tile';

const CACHE_SIZE = 1024;
const VERTEX_SHADER = `
  attribute vec2 ${Attributes.TEXTURE_COORD};
  uniform mat4 ${Uniforms.TILE_TRANSFORM};
  uniform float ${Uniforms.DEPTH};

  varying vec2 v_textureCoord;

  void main() {
    v_textureCoord = ${Attributes.TEXTURE_COORD};
    gl_Position = ${Uniforms.TILE_TRANSFORM} * vec4(${Attributes.TEXTURE_COORD}, ${Uniforms.DEPTH}, 1.0);
  }
`;
 
class CustomWebGLLayer<TS extends TileSource> 
  extends BaseTileLayer<TS, WebGLTileLayerRenderer> {

  constructor(
    options: Options<TS>, 
    private uniforms: any, 
    private fragmentShader: string, 
  ) {
    super(options);
    this.addChangeListener(
      LayerProperty.SOURCE, 
      () => { this.resetRenderer(); }
    );
  }

  createRenderer() {
    return new WebGLTileLayerRenderer(this, {
      vertexShader: VERTEX_SHADER,
      fragmentShader: this.fragmentShader,
      uniforms: this.uniforms,
      cacheSize: CACHE_SIZE,
    });
  }
 
  private resetRenderer() {
    this.getRenderer().reset({
      vertexShader: VERTEX_SHADER,
      fragmentShader: this.fragmentShader,
      uniforms: this.uniforms,
    });
    this.changed();
  }
}

CustomWebGLLayer.prototype.dispose;

export default CustomWebGLLayer;
 