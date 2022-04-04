int i8toi32(int sampl) {
  return (int(bool(0x80000000 & sampl)) * 0xFFFFFF80)
    | ((0x7F000000 & sampl) >> 24);
}

int imix(int x, int y, bool a) {
  return x * int(!a) + y * int(a);
}

ivec4 isplitint(int comp, bool le) {
  int msb = i8toi32(comp);
  int ssb = i8toi32(comp << 8);
  int tsb = i8toi32(comp << 16);
  int lsb = i8toi32(comp << 24);
  return ivec4(
    imix(msb, lsb, le),
    imix(ssb, tsb, le),
    imix(tsb, ssb, le),
    imix(lsb, msb, le)
  );
}

#pragma glslify: export(isplitint)