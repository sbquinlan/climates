attribute vec2 a_position;
uniform mat4 u_clipTransform;

varying vec2 uv;

void main() {
  gl_Position = u_clipTransform * vec4(a_position, 0.0, 1.0);
  uv = vec2(a_position.x, 1.0 - a_position.y);
}