precision highp float;
precision highp int;
precision highp sampler2D;

uniform sampler2D temp;
uniform sampler2D prec;

varying vec2 vUv;

void main() {
  gl_FragColor = vec4(1., 0., 0., 1.);
}