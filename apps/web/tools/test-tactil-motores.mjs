// MC-04: cada motor del registro se juega en un celular emulado (pantalla táctil, sin teclado ni mouse) hasta
// `mg-result`, solo con los controles táctiles que el juego muestra. Por motor revisa:
//   1. la tarjeta de inicio enseña controles táctiles y ninguno es de teclado (WASD, Shift, clic, «apretá F»…);
//   2. palanca, 🎯, E, Q y salto están en pantalla y nada los tapa (hit test en su centro);
//   3. con toques de verdad (Input.dispatchTouchEvent de CDP) cada control que la guía promete llega al motor:
//      🎯/E/Q se gastan (`input.take`), la palanca y el dedo en la pantalla se leen (contadores de lectura);
//   4. el HUD no pide teclas mientras se juega;
//   5. se llega al resultado tocando (en los motores del kit el reloj se adelanta con `avanzar`, nada más).
// No usa teclado, bots, `finish`, puntajes inyectados ni `window.__mc` para mover al jugador: `__mc` solo se lee.
// Con MC_GPU=0 (GitHub) o `--muestra` corre una muestra corta; la corrida completa va con GPU (ver docs/CELULAR.md).
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { run } from './harness.mjs';

const web = join(dirname(fileURLToPath(import.meta.url)), '..');
const motores = [
  ...readFileSync(join(web, 'src/game/minigames/index.ts'), 'utf8').matchAll(/^ {2}(?:'([^']+)'|(\w+)): motor\(/gm),
].map((m) => m[1] ?? m[2]);
assert.ok(motores.length > 100, 'Registro con motores');
// Muestra: uno de mesa fija con 🎯/E, uno libre (palanca mueve al muñeco) y uno de arrastrar en pantalla.
const MUESTRA = ['intibuca.telar', 'atlantida.pancoco', 'franciscomorazan.niebla'];
const muestra = process.env.MC_GPU === '0' || process.argv.includes('--muestra');
if (muestra)
  console.log(
    `SALTA motores táctiles: ${motores.length - MUESTRA.length} de ${motores.length} (sin GPU o --muestra corre solo ${MUESTRA.join(', ')}; la corrida completa va con GPU)`,
  );
const shard = Number(process.env.MC_SHARD ?? 0);
const shards = Number(process.env.MC_SHARDS ?? 1);
assert.ok(
  Number.isInteger(shards) && shards > 0 && Number.isInteger(shard) && shard >= 0 && shard < shards,
  'Fragmento válido',
);
const solo = process.env.MC_MOTOR?.split(',');
const seleccion = (muestra ? MUESTRA : motores).filter((id, i) => i % shards === shard && (!solo || solo.includes(id)));
assert.ok(seleccion.length > 0, 'Hay motores seleccionados');
const suffix = solo ? `-${solo.join('+')}` : muestra ? '-muestra' : shards > 1 ? `-${shard}` : '';
const out = resolve('capturas/mc-04');
mkdirSync(out, { recursive: true });
const saved = `${out}/motores${suffix}.json`;
const rows =
  process.env.MC_RESUME === '1' && existsSync(saved)
    ? JSON.parse(readFileSync(saved, 'utf8')).filter((r) => r.estado === 'OK' && seleccion.includes(r.motor))
    : [];
const S = 'window.__mc.store.getState()';
const sinGpu = process.env.MC_GPU === '0';

// Texto de teclado que no sirve con los dedos. «E» y «Q» sí: son las letras de los botones táctiles.
const TECLADO = [
  /\b(WASD|Shift|Espacio|Enter)\b/,
  /\b(mouse|rueda del)\b/i,
  /\bclic\b/i,
  /\btecla/i,
  /(^|[\s(·/])(F|RT|LT|RB|LB|A\s*\/\s*D|W\s*\/\s*S)(?=$|[\s).,·/:])/,
  /\b(apretá|apreta|pulsá|presioná)\s+(la\s+)?[A-Z]\b/i,
];
const teclado = (texto) => TECLADO.find((r) => r.test(texto));

// Qué control promete cada fila de la guía táctil y qué señal del motor lo prueba.
function controlesDe(fila) {
  const k = fila.join(' ');
  const c = new Set();
  // «🎯: nada: …» avisa que ese botón no hace falta
  if (/^nada\b/i.test(fila[1] ?? '')) return ['nada'];
  if (/palanca/i.test(k)) c.add('palanca');
  if (/🎯|toque al picar/i.test(k)) c.add('fire');
  if (/(^|[^\p{L}])E($|[^\p{L}])/u.test(fila[0])) c.add('use');
  if (/(^|[^\p{L}])Q($|[^\p{L}])/u.test(fila[0])) c.add('alt');
  if (/salt|⬆|⤴|brinc/i.test(fila[0])) c.add('jump');
  // arrastrar para girar la cámara es del juego entero (PlayerController), no del motor
  if (/arrastr/i.test(fila[0]) && /cámara/i.test(fila[1] ?? '')) c.add('camara');
  else if (/arrastr|desliz|tocá la pantalla|mantené la pantalla|\/ tocá/i.test(fila[0])) c.add('pantalla');
  if (/quiet/i.test(fila[0])) c.add('nada');
  return [...c];
}

// Cuenta lecturas de la entrada (solo observa: no cambia ningún valor).
const CONTAR = `(()=>{const i=window.__mc.input;if(i.__cuenta)return;const c={};i.__cuenta=c;
  const d=Object.getOwnPropertyDescriptors(i),n=(k)=>{if(!i.__mirando)c[k]=(c[k]||0)+1};
  for(const k of ['mx','mz'])Object.defineProperty(i,k,{configurable:true,get(){n(k);return d[k].get.call(i)}});
  for(const k of ['jx','jz','px','py','pointerDown','jump']){let v=i[k];Object.defineProperty(i,k,{configurable:true,get(){n(k);return v},set(x){v=x}})}
  const take=i.take;i.take=function(e){n('lee:'+e);const r=take.call(this,e);if(r)n('usa:'+e);return r};
  const press=i.press;i.press=function(e){c['toca:'+e]=(c['toca:'+e]||0)+1;return press.call(this,e)};})()`;

const ok = await run(
  'tactil-motores',
  process.argv.find((a, i) => i > 1 && !a.startsWith('--')) ?? 'apps/web/dist/mundo-catrucho-hd.html',
  { width: 412, height: 915, touch: true, hash: '#test,go' },
  async (t) => {
    const W = 412,
      H = 915;
    const cuadros = async (n = 4) => {
      const f0 = await t.ev('window.__mc.gl.info.render.frame');
      await t.waitFor(`window.__mc.gl.info.render.frame >= ${f0 + n}`, 20000, `${n} cuadros`);
    };
    const centro = (id) =>
      t.ev(
        `(()=>{const r=document.querySelector('[data-testid=touch-${id}]')?.getBoundingClientRect();return r&&{x:r.x+r.width/2,y:r.y+r.height/2}})()`,
      );
    const toque = async (x, y) => {
      await t.cdp('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
      await cuadros(2);
      await t.cdp('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    };
    // lee la entrada sin que cuente como lectura del motor
    const mirar = (expr) =>
      t.ev(`(()=>{const i=window.__mc.input;i.__mirando=1;try{return ${expr}}finally{i.__mirando=0}})()`);
    const hud = () => t.ev(`document.querySelector('[data-testid=mg-hud]')?.innerText ?? ''`);
    const avisosHud = new Set();
    const revisarHud = async (id) => {
      const texto = await hud();
      const r = teclado(texto);
      if (r) avisosHud.add(`${id}: HUD «${texto.replace(/\s+/g, ' ').slice(0, 160)}» (${r})`);
      return r;
    };
    // camina con la palanca (dedo sostenido) hasta que la condición se cumpla; la posición solo se lee para apuntar
    const caminar = async (x, z, hasta, label) => {
      const joy = await centro('joy');
      await t.cdp('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...joy, id: 1 }] });
      const inicio = Date.now();
      try {
        while (!(await t.ev(hasta))) {
          if (Date.now() - inicio > 60000)
            assert.fail(
              `Llega caminando: ${label} (en ${await t.ev('JSON.stringify(window.__mc.player.pos.map(Math.round))')})`,
            );
          const [dx, dy] = await t.ev(
            `(()=>{const p=window.__mc.player,dx=${x}-p.pos[0],dz=${z}-p.pos[2],d=Math.hypot(dx,dz)||1,c=Math.cos(p.camYaw),s=Math.sin(p.camYaw);return [(dx*c-dz*s)/d*44,(dx*s+dz*c)/d*44]})()`,
          );
          await t.cdp('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{ x: joy.x + dx, y: joy.y + dy, id: 1 }],
          });
          await t.sleep(80);
        }
      } finally {
        await t.cdp('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      }
    };
    // Feria no tiene reloj: se camina a un puesto, se tira tocando los blancos y se cobra el premio
    const jugarFeria = async () => {
      const F = 'window.__mcTest.feria.state()';
      // la prueba de controles pudo haber entrado ya a un puesto con E: se juega ese
      if (await t.ev(`${F}.booth < 0`)) {
        // un E tocado antes queda guardado hasta que algo lo usa: puede abrir el puesto apenas se llega
        await caminar(-11, 0.9, `/Jugar/.test(${S}.prompt?.label ?? '') || ${F}.booth >= 0`, 'puesto');
        if (await t.ev(`${F}.booth < 0`)) await t.click('touch-use');
        await t.waitFor(`${F}.booth >= 0`);
      }
      while (await t.ev(`${F}.booth >= 0`)) {
        await t.waitFor(`${F}.ready || ${F}.booth < 0`);
        if (await t.ev(`${F}.booth < 0`)) break;
        const blanco = (await t.ev('window.__mcTest.feria.targets()'))
          .filter((p) => p.x > 10 && p.x < W - 10 && p.y > 230 && p.y < 690)
          .sort((a, b) => b.points - a.points)[0];
        const tiros = await t.ev(`${F}.shots`);
        await t.mouse(blanco?.x ?? W / 2, blanco?.y ?? H / 2);
        await t.waitFor(`${F}.shots < ${tiros} || ${F}.booth < 0`);
      }
      await caminar(20, 3, `/Cobrar/.test(${S}.prompt?.label ?? '')`, 'premios');
      await t.click('touch-use');
      await t.waitFor("!!document.querySelector('[data-testid=mg-result]')", 15000);
    };
    await t.waitFor('!!window.__mc.input && !!window.__mc.gl');
    // marca de la carga: si la página se recarga (o el proceso de la pestaña se cae) se nota y se vuelve a contar
    const marcar = () => t.ev('window.__mcMarca = 1');
    await marcar();
    for (const id of seleccion) {
      await t.waitFor('!!window.__mc?.input && !!window.__mc.gl', 30000, 'juego cargado');
      await t.ev(CONTAR);
      if (rows.some((r) => r.motor === id && r.estado === 'OK')) continue;
      const fila = { motor: id };
      try {
        // abrir la tarjeta equivale a llegar caminando al puesto; de ahí en adelante todo es con los dedos
        await t.ev(`${S}.startMinigame(${JSON.stringify(id)})`);
        await t.waitFor(`!!document.querySelector('[data-testid=mg-start]')`, 30000, 'tarjeta de inicio');
        const guia = await t.ev(
          `[...document.querySelectorAll('[data-testid=mg-intro] li')].filter(li=>li.querySelector('kbd')).map(li=>[li.querySelector('kbd').innerText.trim(),li.innerText.replace(li.querySelector('kbd').innerText,'').trim()])`,
        );
        fila.guia = guia.map((g) => g.join(': ')).join(' · ');
        assert.ok(guia.length > 0, 'La tarjeta no enseña controles táctiles');
        for (const g of guia) assert.ok(!teclado(g.join(' ')), `Guía táctil con tecla: «${g.join(': ')}»`);
        const pide = [...new Set(guia.flatMap(controlesDe))];
        const raras = guia.filter((g) => controlesDe(g).length === 0);
        assert.equal(raras.length, 0, `Fila de guía sin control táctil conocido: ${JSON.stringify(raras)}`);
        await t.click('mg-start');
        await t.waitFor(
          `${S}.mg?.phase === 'playing' && !!document.querySelector('[data-testid=touch-fire]')`,
          20000,
          'partida empezada con controles táctiles',
        );
        const kit = await t.ev(`window.__mcTest?.motor?.estado().id === ${JSON.stringify(id)}`);
        // Hit test: un control escondido o tapado (HUD, guía de primeros pasos) no pasa.
        const hit = await t.ev(
          `['joy','fire','jump','use','alt'].map(id=>{const e=document.querySelector('[data-testid=touch-'+id+']');if(!e)return {id,ok:false};const r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;return {id,ok:x>=0&&y>=0&&x<innerWidth&&y<innerHeight&&e.contains(document.elementFromPoint(x,y))}})`,
        );
        assert.ok(
          hit.every((x) => x.ok),
          `Control táctil tapado o fuera: ${JSON.stringify(hit.filter((x) => !x.ok))}`,
        );
        // la cuenta regresiva no es del jugador: en el kit se adelanta el reloj, en los otros se espera
        if (kit) await t.ev('window.__mcTest.motor.avanzar(3.2)');
        else await t.sleep(sinGpu ? 6000 : 3500);
        await cuadros();
        await t.ev(`for(const k in window.__mc.input.__cuenta)delete window.__mc.input.__cuenta[k]`);
        // --- toques de verdad (CDP): palanca, arrastre y toque en la pantalla, y cada botón
        const joy = await centro('joy');
        await t.cdp('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...joy, id: 1 }] });
        for (const [dx, dy] of [
          [0, -40],
          [40, 0],
          [0, 40],
          [-40, 0],
        ]) {
          await t.cdp('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{ x: joy.x + dx, y: joy.y + dy, id: 1 }],
          });
          await cuadros(3);
        }
        const palancaUi = await mirar('Math.abs(i.jx)+Math.abs(i.jz)');
        await t.cdp('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        assert.ok(palancaUi > 0.5, 'La palanca no responde al dedo');
        // E por cercanía: el motor pone puntos para usar con E (Exploradores, Feria, Pulpería…)
        const cercanos = await t.ev(
          `[...(window.__mc.interactions?.values?.() ?? window.__mc.interactions ?? [])].filter(x=>!x.enabled||x.enabled()).length`,
        );
        fila.cercanos = cercanos;
        const giro0 = await t.ev('window.__mc.player.camYaw');
        if (!(await t.exists('mg-result'))) await t.drag(W * 0.45, H * 0.4, W * 0.6, H * 0.45, 8);
        await cuadros(3);
        const giro = Math.abs((await t.ev('window.__mc.player.camYaw')) - giro0) > 0.01;
        const usa = {};
        for (const b of ['fire', 'use', 'alt', 'jump']) {
          // un motor corto (Monta: el toro te bota) puede terminar en plena prueba y los controles se esconden
          if (await t.exists('mg-result')) break;
          const p = await centro(b);
          await t.ev(`window.__mc.input.pressed.delete('${b}')`);
          const antes = await mirar(`i.__cuenta['toca:${b}'] ?? 0`);
          await t.cdp('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...p, id: 1 }] });
          await cuadros(4);
          // el toque llegó si el botón llamó a input.press; se gastó si el motor (u otro) lo tomó después
          const llego = (await mirar(`i.__cuenta['toca:${b}'] ?? 0`)) > antes;
          usa[b] = llego && !(await mirar(`i.pressed.has('${b}')`));
          await t.cdp('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
          await cuadros(2);
          assert.ok(llego, `El botón ${b} no registra el toque`);
        }
        if (!(await t.exists('mg-result'))) await toque(W * 0.5, H * 0.42);
        await cuadros(3);
        await revisarHud(id);
        await t.shot(`${out}/${id}-jugando.png`);
        if (id === 'feria') await jugarFeria();
        // --- hasta el resultado: toques sintéticos sobre los mismos controles ya comprobados (más rápidos que CDP)
        const limit = kit ? 60000 : id === 'exploradores' ? 420000 : 240000;
        const started = Date.now();
        let n = 0;
        while (!(await t.exists('mg-result')) && Date.now() - started < limit) {
          if (await t.exists('dialog-close')) await t.click('dialog-close');
          await t.ev(`(()=>{
          const tap=(el,x,y)=>{if(!el)return;for(const type of ['pointerdown','pointerup'])el.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerType:'touch',pointerId:7,clientX:x,clientY:y,buttons:type==='pointerdown'?1:0}));};
          for(let i=0;i<${kit ? 20 : 1};i++){
            const k=${n}+i;
            const joy=document.querySelector('[data-testid=touch-joy]');
            if(joy){const r=joy.getBoundingClientRect();joy.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerType:'touch',pointerId:8,buttons:1,clientX:r.x+r.width/2+Math.sin(k*.7)*44,clientY:r.y+r.height/2+Math.cos(k*.7)*44}));}
            const canvas=document.querySelector('[data-testid=canvas-wrap]');
            tap(canvas,innerWidth*(.2+(k%7)*.1),innerHeight*(.3+(k%5)*.06));
            const el=document.querySelector('[data-testid=touch-'+(['fire','use','jump','alt'][k%4])+']');
            if(el){const r=el.getBoundingClientRect();tap(el,r.x+r.width/2,r.y+r.height/2);}
            ${kit ? 'window.__mcTest.motor.avanzar(.25);' : ''}
          }
        })()`);
          n += kit ? 20 : 1;
          if (n % 200 < (kit ? 20 : 1)) await revisarHud(id);
          await t.sleep(kit ? 16 : 100);
        }
        await t.ev(
          `document.querySelector('[data-testid=touch-joy]')?.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerType:'touch',pointerId:8}))`,
        );
        assert.ok(await t.exists('mg-result'), 'No llega al resultado');
        // lo que la guía promete se revisa con todo lo que el motor leyó desde la primera prueba hasta el final
        const c = await t.ev('({...window.__mc.input.__cuenta})');
        const señal = {
          palanca: (c.mx ?? 0) + (c.mz ?? 0) + (c.jx ?? 0) + (c.jz ?? 0) > 0,
          fire: usa.fire || (c['usa:fire'] ?? 0) > 0,
          use: usa.use || (c['lee:use'] ?? 0) > 0 || cercanos > 0,
          alt: usa.alt || (c['lee:alt'] ?? 0) > 0,
          jump: (c['lee:jump'] ?? 0) + (c.jump ?? 0) > 0,
          pantalla: (c.px ?? 0) + (c.py ?? 0) + (c.pointerDown ?? 0) > 0 || (c['usa:fire'] ?? 0) > 0,
          camara: giro,
          nada: true,
        };
        fila.lee = Object.entries(señal)
          .filter(([k, v]) => v && k !== 'nada')
          .map(([k]) => k)
          .join(', ');
        const faltan = pide.filter((k) => !señal[k]);
        assert.equal(faltan.length, 0, `La guía promete ${faltan.join(', ')} pero el motor no lo lee`);
        assert.ok(fila.lee, 'El motor no lee ningún control táctil');
        const result = await t.ev(`${S}.mg.result`);
        Object.assign(fila, {
          estado: 'OK',
          victoria: result.won,
          score: result.score,
          detalle: result.won ? 'Victoria con toques' : 'Resultado con derrota (toques al azar, no estrategia)',
        });
        await t.shot(`${out}/${id}-resultado.png`);
        // salir con el dedo: el botón de salida de la pantalla de resultados
        await t.click('mg-exit');
        await t.waitFor(`!${S}.mg`, 20000, 'sale del minijuego');
      } catch (e) {
        Object.assign(fila, { estado: 'issue', detalle: e.message });
        await t.shot(`${out}/${id}-falla.png`).catch(() => {});
        await t.ev(`${S}.mg && ${S}.exitMinigame?.()`).catch(() => {});
      }
      if (!(await t.ev('window.__mcMarca === 1').catch(() => false))) {
        Object.assign(fila, {
          estado: 'issue',
          detalle: `La página se recargó durante el motor (${fila.detalle ?? ''})`,
        });
        await t.waitFor('!!window.__mc?.store', 30000, 'juego recargado');
        await marcar();
      }
      rows.push(fila);
      console.log(`${id}: ${JSON.stringify(fila)}`);
      writeFileSync(saved, JSON.stringify(rows, null, 2));
    }
    const hudMal = [...avisosHud];
    writeFileSync(
      `${out}/motores${suffix}.md`,
      `| Motor | Estado | Guía táctil | Controles que lee | Resultado |\n|---|---|---|---|---|\n${rows
        .map(
          (r) =>
            `| ${r.motor} | ${r.estado} | ${r.guia ?? ''} | ${r.lee ?? ''} | ${r.estado === 'OK' ? `${r.victoria ? 'Victoria' : 'Derrota'}, ${r.score}` : r.detalle} |`,
        )
        .join('\n')}\n${hudMal.length ? `\nHUD con teclas:\n\n${hudMal.map((x) => `- ${x}`).join('\n')}\n` : ''}`,
    );
    for (const x of hudMal) console.log(`HUD con teclas: ${x}`);
    assert.equal(hudMal.length, 0, 'El HUD pide teclas en el celular');
    assert.equal(rows.length, seleccion.length);
    const mal = rows.filter((r) => r.estado !== 'OK');
    assert.equal(mal.length, 0, `Motores que no se terminan con los dedos: ${mal.map((r) => r.motor).join(', ')}`);
    console.log(`${rows.length} motores terminados con los dedos (${rows.filter((r) => r.victoria).length} victorias)`);
  },
);
process.exitCode = ok ? 0 : 1;
