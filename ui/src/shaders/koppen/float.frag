precision highp float;
precision highp int;

uniform sampler2D temp;
uniform sampler2D prec;

varying vec2 vUv;

#pragma glslify: koppengieger = require(./koppen)

void main() {
  float subpixel = (1. / 256.) / 3.;
  gl_FragColor = koppengieger(
    texture2D(temp, vec2(vUv.x - subpixel, vUv.y)),
    texture2D(temp, vec2(vUv.x, vUv.y)),
    texture2D(temp, vec2(vUv.x + subpixel + subpixel, vUv.y)),
    texture2D(prec, vec2(vUv.x - subpixel, vUv.y)),
    texture2D(prec, vec2(vUv.x, vUv.y)),
    texture2D(prec, vec2(vUv.x + subpixel + subpixel, vUv.y))
  );
}