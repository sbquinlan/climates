#version 300 es
precision highp float;
precision highp int;
precision highp isampler2D;

uniform isampler2D temp;
uniform isampler2D prec;
uniform bool littleEndian;

in vec2 vUv;
out vec4 color;

void main() {
  color = vec4(1., 0., 0., 1.);
}