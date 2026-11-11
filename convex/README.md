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

## Catálogo público

```bash
npx convex dev --once
pnpm catalogo:subir
node apps/web/tools/test-catalogo-convex.mjs
```

`catalogo:reemplazar` es una mutación interna, ejecutada con los permisos administrativos del CLI.
El script arma los 18 departamentos desde `shared/data/departments.json`, `minigames.json`,
`catalogo/*.json`, los apodos públicos de `apodos.json` y `docs/generador/contenido.json`.
Guarda el contenido jugable y editorial por departamento. Reemplaza todo en una transacción;
subir contenido idéntico conserva la versión y no duplica filas. Un cambio incrementa la versión.
`catalogo:ultima` es una consulta pública de solo lectura que devuelve la última versión completa.

La regla de cero red tiene una excepción explícita. Compilá con `VITE_CONVEX_URL` para consultar
ese catálogo al iniciar mediante el cliente HTTP de Convex. Si falla, está vacío o tarda más de
3 segundos, se usa el catálogo empaquetado. Sin `VITE_CONVEX_URL` no se consulta la red.
`CONVEX_URL` en `.env.local` configura el CLI; no activa la carga remota del juego por sí sola.

La prueba de integración lee `CONVEX_URL` de `.env.local`, sube un nombre de juego temporal,
comprueba que aparece en la tarjeta de inicio y restaura el contenido anterior en `finally`.
También verifica que repetir la carga conserva la versión y prueba el respaldo local ante errores
y ante una consulta que nunca responde. El arnés permite únicamente el
origen configurado para esa prueba. Sin `.env.local`, imprime `SALTA` y termina con código 0.
No la ejecutes a la vez que otra edición del catálogo en el mismo entorno de desarrollo.

El JSON excede el límite de tamaño de un argumento del sistema. `scripts/convex-stdin.mjs`
pasa los argumentos al CLI por stdin mediante `npx --node-options=--import=… convex run`.
No necesita leer ni mostrar credenciales; las resuelve el CLI con la sesión existente.
