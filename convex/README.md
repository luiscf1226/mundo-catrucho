# convex

`schema.ts` es el modelo de datos completo. El proyecto es `mundo-catrucho` en el equipo `luiscf1226` de Convex,
con un entorno de desarrollo en la nube.

```bash
npx convex dev            # sube esquema y funciones al entorno de desarrollo y regenera _generated/ al guardar
npx convex dev --once     # lo mismo una sola vez
```

La primera vez en una máquina nueva: `npx convex login` y luego `npx convex dev` (elegí el proyecto existente
`mundo-catrucho`). Eso escribe `.env.local` con `CONVEX_DEPLOYMENT` y `CONVEX_URL`; está ignorado por git.

Falta escribir las funciones que lista `docs/plan.html` (sección «Datos»): `miPerfil`, `comprar`, `abrirPartida`,
`cerrarPartida`, etc.
