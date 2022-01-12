
// stuff for making a grid
function* range(start: number, end: number, step: number = 1) {
  let count = 0;
  if (step === 0) {
    return count;
  }
  for (let i = start; (step > 0 && i < end) || (step < 0 && i > end); i += step) {
    count++;
    yield i;
  }
  return count;
}

function transform_from_ranges(
  [from_min, from_max],
  [to_min, to_max],
) {
  const from_diff = from_max - from_min;
  const to_diff = to_max - to_min;
  const scale = to_diff / from_diff;
  const translate = to_min - (from_min * scale);
  return [ scale, translate ]
}

function transform(x, mat) {
  return x * mat[0] + mat[1];
}