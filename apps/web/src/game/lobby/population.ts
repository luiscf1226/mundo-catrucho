// Presencia simulada local: cambia como máximo una persona por minuto.
export function conectados(deptId: string) {
  const seed = [...deptId].reduce((s, c) => s * 31 + c.charCodeAt(0), 7) >>> 0;
  return 8 + (seed % 47) + Math.round(Math.sin(Math.floor(Date.now() / 60000) * 0.14 + seed) * 2);
}
