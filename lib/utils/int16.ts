export function splitInt16(n: number): {
  low: number;
  high: number;
} {
  return { low: n & 0xff, high: (n >> 8) & 0xff };
}

export function mergeInt16(low: number, high: number): number {
  return (high << 8) + low;
}
