precision highp float;
precision highp int;
precision highp sampler2D;

uniform sampler2D texture1;
uniform sampler2D texture2;
uniform sampler2D texture3;
uniform sampler2D texture4;

varying vec2 uv;

void main() {
  vec4 sampleA = texture2D(texture1, uv);
  vec4 sampleB = texture2D(texture2, uv);
  vec4 sampleC = texture2D(texture3, uv);
  vec4 sampleD = texture2D(texture4, uv);

  gl_FragColor = vec4(sampleA.ggg / 200., sampleA.a);
}