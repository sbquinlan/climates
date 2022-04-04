#pragma glslify: isplitint = require(./isplitint)

mat4 fsplitvec(vec4 sampl, bool le) {
  return mat4(
    isplitint(floatBitsToInt(sampl.x), le), 
    isplitint(floatBitsToInt(sampl.y), le), 
    isplitint(floatBitsToInt(sampl.z), le), 
    isplitint(floatBitsToInt(sampl.w), le)
  );
}

mat4 fmtexture(sampler2D tex, vec2 coords, bool le) {
  return fsplitvec(texture(tex, coords), le);
}

#pragma glslify: export(fmtexture)