#version 300 es
precision highp float;
precision highp int;

uniform sampler2D itemp;
uniform sampler2D iprec;
uniform sampler2D ftemp;
uniform sampler2D fprec;
uniform bool littleEndian;

in vec2 vUv;
out vec4 color;

// #pragma glslify: fmtexture = require(../mtexture/fmtexture)
#pragma glslify: koppengieger = require(./koppen)

void main() {
  float subpixel = dFdx(vUv).x / 3.;
  color = koppengieger(
    texture(ftemp, vec2(vUv.x - subpixel, vUv.y)),
    texture(ftemp, vec2(vUv.x, vUv.y)),
    texture(ftemp, vec2(vUv.x + subpixel + subpixel, vUv.y)),
    texture(fprec, vec2(vUv.x - subpixel, vUv.y)),
    texture(fprec, vec2(vUv.x, vUv.y)),
    texture(fprec, vec2(vUv.x + subpixel + subpixel, vUv.y))
  );
}