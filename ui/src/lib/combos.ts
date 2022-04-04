function factory(gl) {
  // On loading from ImageElement:
  // https://hg.mozilla.org/mozilla-central/file/tip/dom/canvas/TexUnpackBlob.cpp#l86
  // conflicts with notes in https://github.com/KhronosGroup/WebGL/issues/2789 but 
  // https://github.com/KhronosGroup/WebGL/pull/3312 reverts the spec change

  /**
   * I think the first param is the format on the gpu and the last two is 
   * what the format is in memory (ram). 
   * 
   * This is taken from MDN, but I'm not sure it's even right. A more 
   * complete set is provided in the OpenGL ES 3.0 documentation:
   * https://www.khronos.org/registry/OpenGL/specs/es/3.0/es_spec_3.0.pdf#nameddest=subsubsection.4.4.2.1
   */
    const SUPPORTED_COMBO_MAP = {
    // I think these are basically what was supported before in webgl1
    [gl.RGB]:  {            [gl.RGB]: [gl.UNSIGNED_BYTE, gl.UNSIGNED_SHORT_5_6_5] },
    [gl.RGBA]: {            [gl.RGBA]: [gl.UNSIGNED_BYTE, gl.UNSIGNED_SHORT_4_4_4_4, gl.UNSIGNED_SHORT_5_5_5_1] },
    [gl.LUMINANCE_ALPHA]: { [gl.LUMINANCE_ALPHA]: [gl.UNSIGNED_BYTE] },
    [gl.LUMINANCE]: {       [gl.LUMINANCE]: [gl.UNSIGNED_BYTE] },
    [gl.ALPHA]: {           [gl.ALPHA]: [gl.UNSIGNED_BYTE] },

    // unsigned specifically I think?
    [gl.R8UI]: {            [gl.RED_INTEGER]: [gl.UNSIGNED_BYTE] },
    [gl.RG8UI]: {           [gl.RG_INTEGER]: [gl.UNSIGNED_BYTE] },
    [gl.RGB8UI]: {          [gl.RGB_INTEGER]: [gl.UNSIGNED_BYTE] },
    [gl.RGBA8UI]: {         [gl.RGBA_INTEGER]: [gl.UNSIGNED_BYTE] },

    // i don't know what the difference is here b/t the above
    [gl.R8]: {              [gl.RED]: [gl.UNSIGNED_BYTE] },
    [gl.RG8]: {             [gl.RG]: [gl.UNSIGNED_BYTE] },
    [gl.RGB8]: {            [gl.RGB]: [gl.UNSIGNED_BYTE] },
    [gl.RGBA8]: {           [gl.RGBA]: [gl.UNSIGNED_BYTE] },
    
    [gl.R16F]: {            [gl.RED]: [gl.HALF_FLOAT, gl.FLOAT] },
    [gl.RG16F]: {           [gl.RG]: [gl.HALF_FLOAT, gl.FLOAT] },
    [gl.RGB16F]: {          [gl.RGB]: [gl.HALF_FLOAT, gl.FLOAT] },
    [gl.RGBA16F]: {         [gl.RGBA]: [gl.HALF_FLOAT, gl.FLOAT] },
    
    [gl.R32F]: {            [gl.RED]: [gl.FLOAT] },
    [gl.RG32F]: {           [gl.RG]: [gl.FLOAT] },
    [gl.RGB32F]: {          [gl.RGB]: [gl.FLOAT] },
    [gl.RGBA32F]: {         [gl.RGBA]: [gl.FLOAT] },
    
    [gl.SRGB8]: {           [gl.RGB]: [gl.UNSIGNED_BYTE] },
    [gl.SRGB8_ALPHA8]: {    [gl.RGBA]: [gl.UNSIGNED_BYTE] },

    [gl.RGB565]: {          [gl.RGB]: [gl.UNSIGNED_BYTE, gl.UNSIGNED_SHORT_5_6_5] },
    [gl.R11F_G11F_B10F]: {  [gl.RGB]: [gl.UNSIGNED_INT_10F_11F_11F_REV, gl.HALF_FLOAT, gl.FLOAT] },
    [gl.RGB9_E5]: {         [gl.RGB]: [gl.HALF_FLOAT, gl.FLOAT] },
        
    [gl.RGB5_A1]: {         [gl.RGBA]: [gl.UNSIGNED_BYTE, gl.UNSIGNED_SHORT_5_5_5_1] },
    [gl.RGB10_A2]: {        [gl.RGBA]: [gl.UNSIGNED_INT_2_10_10_10_REV] },
    [gl.RGBA4]: {           [gl.RGBA]: [gl.UNSIGNED_BYTE, gl.UNSIGNED_SHORT_4_4_4_4] },
  }
}