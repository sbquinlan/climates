#pragma glslify: isplitint = require(./isplitint)

mat4 isplitvec(ivec4 sampl, bool le) {
  return mat4(
    isplitint(sampl.x, le),
    isplitint(sampl.y, le),
    isplitint(sampl.z, le),
    isplitint(sampl.w, le)
  );
}

#pragma glslify: export(isplitvec)