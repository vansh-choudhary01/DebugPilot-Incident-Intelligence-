export function cosineSimilarity(a: number[], b: number[]) {
  let dot = 0;
  let aLength = 0;
  let bLength = 0;

  for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
    dot += a[index] * b[index];
    aLength += a[index] * a[index];
    bLength += b[index] * b[index];
  }

  if (aLength === 0 || bLength === 0) {
    return 0;
  }

  return dot / (Math.sqrt(aLength) * Math.sqrt(bLength));
}

export function fitDimensions(vector: number[], dimensions: number) {
  if (vector.length === dimensions) {
    return vector;
  }

  if (vector.length > dimensions) {
    return vector.slice(0, dimensions);
  }

  return [...vector, ...Array.from({ length: dimensions - vector.length }, () => 0)];
}
