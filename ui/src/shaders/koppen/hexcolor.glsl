// these macros aren't compliant with glsl1 the issue is that 
// glsl1 doesn't have uint so you end up with signed bit problems
// when moving the bits over. You could maybe just do everything as
// floats and then switch to int at the end but it's confusing
#define leftshift(A, B)  ( uint(A) * uint( pow(2., float(B) )) )
#define rightshift(A, B) ( uint(A) / uint( pow(2., float(B) )) )
// 32 ... C ... B ...  0 
#define slicebits(A, B, C)  ( rightshift( leftshift((A), 32 - (C)), 32 - ((C) - (B)) ) )
#define hexcolor(A) (vec3( \
    float(slicebits((A), 16, 24)), \
    float(slicebits((A), 8, 16)), \
    float(slicebits((A), 0, 8)) \
  ) / 255.) 