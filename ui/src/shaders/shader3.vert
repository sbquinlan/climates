#version 300 es
uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;

in vec2 position;
out vec2 vUv;

void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 0.0, 1.0);
  vUv = vec2(position.x, 1.0 - position.y);
}
