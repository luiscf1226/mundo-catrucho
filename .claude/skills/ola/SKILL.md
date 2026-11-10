---
name: ola
description: Hace una ola de Mundo Catrucho de punta a punta - reparte sus tickets entre agentes en paralelo, junta todo en la rama ola-N, la prueba y la entrega con vista previa, capturas y un pull request. Úsala cuando el usuario diga «haz la ola N», «sigue con la ola», «trabaja en la ola N» o «/ola N».
---

# Ola N

Una ola = varios tickets en paralelo, una rama `ola-N`, una vista previa y una aprobación. La lista de olas y sus
tickets está en `docs/OLAS.md`; cada ticket es un issue `MC-NN` en el hito «Ola N · …» de
`luiscf1226/mundo-catrucho`. Lee `AGENTS.md` antes de empezar.

## 1. Preparar

1. `gh issue list -R luiscf1226/mundo-catrucho --milestone "<título del hito>" --state open` para ver qué falta.
   Lee cada issue completo: el criterio de «Listo cuando» es lo que se entrega.
2. Separa los tickets que **necesitan cuentas del usuario** (Convex, Clerk, Cloudflare). Si faltan, haz el resto y
   pide solo lo que falta, con el comando exacto que tiene que correr (`npx convex login`, `wrangler login`…).
3. Revisa los límites de uso (skill `usage-limits`) antes de lanzar agentes. Si no alcanza, haz los tickets de uno en uno.
4. `git switch -c ola-N origin/main` (o retoma `ola-N` si ya existe) y súbela.

## 2. Repartir

Un agente por ticket, todos a la vez, cada uno en su propia copia (`isolation: "worktree"`) y en su rama
`ola-N/mc-NN-<algo>` que sale de `ola-N`. Si dos tickets tocan los mismos archivos, júntalos en un solo agente o hazlos
uno después del otro.

El encargo de cada agente lleva:
- el texto completo del issue y su criterio de «Listo cuando»;
- que lea `AGENTS.md` y, si toca el juego, `apps/web/docs/CONTRATO.md`;
- qué archivos son suyos y cuáles no puede tocar;
- que termine con `pnpm check` y `pnpm test` en verde, un commit en español que diga `Cierra #NN`, y
  capturas propias si cambia algo que se ve;
- que su informe diga qué hizo, cómo lo probó y qué quedó pendiente.

## 3. Juntar

1. Une cada rama de ticket a `ola-N` (`git merge --no-ff`), resolviendo conflictos tú mismo.
2. En `ola-N`: `pnpm install`, `pnpm check`, `pnpm test`, `pnpm capturas`.
3. **Mira las capturas y el video** (`capturas/INDICE.md`). Si algo se ve mal o no cumple el «Listo cuando», corrígelo
   o devuélvelo al agente de ese ticket. No se entrega una ola con pruebas en rojo.
4. Un revisor que no escribió el código (otro modelo o un agente nuevo) revisa el diff de `ola-N` contra `main`.

## 4. Entregar

1. Sube `ola-N`. La revisión automática de GitHub corre `check`, `test` y `capturas` y deja las capturas como artefacto.
2. **Vista previa:** con Cloudflare listo (MC-11), `pnpm --filter @mundo-catrucho/web exec wrangler versions upload`
   da la dirección de la rama. Mientras no exista, publica `apps/web/dist/mundo-catrucho-hd.html` como Artifact privado.
3. Abre el pull request de `ola-N` a `main` con la plantilla: lo nuevo en palabras simples, cómo se probó, la vista
   previa, capturas, video y `Cierra #NN` por cada ticket terminado.
4. Al usuario le das: el enlace del PR, la vista previa, lo que «Vas a ver» según `docs/OLAS.md` y lo que quedó
   pendiente y por qué.

## 5. Aprobar

- **No unas el PR a `main` hasta que el usuario diga «full send»** (o lo pida claramente).
- Si pide cambios, se corrigen dentro de la misma ola, en la misma rama, y se vuelve a probar y a mostrar.
- Con «full send»: se une con merge, los issues se cierran solos por el `Cierra #NN` y se borra `ola-N`.
