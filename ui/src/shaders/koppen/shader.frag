#version 300 es
precision highp float;
precision highp int;
precision highp isampler2D;
precision highp usampler2D;

uniform sampler2D temp;
uniform sampler2D prec;

uniform bool littleEndian;

in vec2 vUv;
out vec4 color;

#pragma glslify: fmtexture = require(../mtexture/fmtexture)
#pragma glslify: koppengieger = require(./koppen)

void main() {
  mat4 temps = fmtexture(temp, vUv, littleEndian);
  mat4 precs = fmtexture(prec, vUv, littleEndian);
  color = koppengieger(
    temps[0],
    temps[1],
    temps[2],
    precs[0],
    precs[1],
    precs[2]
  );
}