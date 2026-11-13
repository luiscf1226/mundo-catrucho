export const COMPACT_QUALITY =
  matchMedia('(pointer: coarse)').matches || (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4);
