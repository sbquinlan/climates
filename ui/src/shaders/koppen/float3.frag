#version 300 es
precision highp float;
precision highp int;

uniform sampler2D temp;
uniform sampler2D prec;

in vec2 vUv;
out vec4 color;

#pragma glslify: koppengieger = require(./koppen)

void main() {
  ivec2 texelCoord = ivec2(floor(gl_FragCoord.x) * 3., 255. - floor(gl_FragCoord.y));
  color = koppengieger(
    texelFetch(temp, texelCoord, 0),
    texelFetch(temp, ivec2(texelCoord.x + 1, texelCoord.y), 0),
    texelFetch(temp, ivec2(texelCoord.x + 2, texelCoord.y), 0),
    texelFetch(prec, texelCoord, 0),
    texelFetch(prec, ivec2(texelCoord.x + 1, texelCoord.y), 0),
    texelFetch(prec, ivec2(texelCoord.x + 2, texelCoord.y), 0)
  );
}