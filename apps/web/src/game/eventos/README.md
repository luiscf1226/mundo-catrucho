# Eventos por fecha (MC-54)

El dispositivo activa ocho celebraciones sin red. `calendario.ts` contiene datos y resolución pura de ventanas. Cada evento tiene id, nombre, lugar, departamento (`null` significa nacional), URL fuente, ventana, estilo, color y juego destacado existente. No entrega monedas ni XP ni modifica resultados.

Las ferias Juniana, del Maíz y el Carnaval usan todo su mes como **temporada del juego**. Las fuentes documentan junio, agosto y mayo respectivamente; el calendario no promete el programa oficial de cada edición. Navidad ocupa diciembre hasta el 1 de enero inclusive. La feria de la Inmaculada de Danlí ocupa el 5 al 8 de diciembre. Las ventanas incluyen ambos extremos.

Semana Santa va del Domingo de Ramos al de Pascua. Pascua se calcula con el cómputo gregoriano de Meeus/Jones/Butcher. La Semana Morazánica del juego abarca del primer miércoles de octubre al sábado, por días completos; no representa horarios laborales ni ampliaciones anuales del asueto público.

`fecha.ts` lee el día civil local, comprueba cambios cada segundo y al recuperar el foco. Para pruebas, `#test,go,fecha=2026-06-20` reemplaza la fecha. Sin el token exacto `test` se ignora el reemplazo. Fechas inexistentes se descartan. UTC se usa únicamente para sumar días civiles, evitando cambios por horario de verano.

`Decoracion.tsx` agrega utilería del kit al llegar al lobby o a un departamento. `Banner.tsx` anuncia las celebraciones y permite viajar al departamento del juego destacado. Las celebraciones simultáneas conviven y desaparecen al salir de su ventana, incluso sin recargar.

El panel MC-33 no admite este calendario. `convex/catalogoPanelModelo.ts` exige conservar los campos y filas existentes, y `catalogoModelo.ts` publica exclusivamente departamentos y su catálogo. Habilitar edición requiere versionar ese contrato, agregar validación de ventanas y ampliar panel, publicación y respaldo local. No se amplía la excepción de red en este ticket.

Desde la raíz, después de compilar:

```bash
node apps/web/tools/test-eventos.mjs
```

La prueba usa Chromium mediante `run()` del arnés. Verifica cada extremo, días exteriores, ubicación, lobby, navegación del destacado, fiestas simultáneas, reemplazos inválidos, Pascua de 2026 y 2027 y llamadas de dibujo. Guarda tres capturas en `capturas/mc-54/`. También forma parte de `pnpm test`.
