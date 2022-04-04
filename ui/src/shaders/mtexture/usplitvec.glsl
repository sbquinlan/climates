uint umix(uint x, uint y, bool a) {
  return x * uint(!a) + y * uint(a);
}

uvec4 usplitint(uint comp, bool le) {
  uint msb = (comp & uint(0xFF000000)) >> 24;
  uint ssb = (comp & uint(0x00FF0000)) >> 16;
  uint tsb = (comp & uint(0x0000FF00)) >> 8;
  uint lsb = (comp & uint(0x000000FF));
  return uvec4(
    umix(msb, lsb, le),
    umix(ssb, tsb, le),
    umix(tsb, ssb, le),
    umix(lsb, msb, le)
  );
}

mat4 usplitvec(uvec4 sampl, bool le) {
  return mat4(
    usplitint(sampl.x, le), 
    usplitint(sampl.y, le), 
    usplitint(sampl.z, le), 
    usplitint(sampl.w, le)
  );
}

#pragma glslify: export(usplitvec)