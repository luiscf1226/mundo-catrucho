// Prueba de la sala: levanta `wrangler dev`, conecta dos jugadores y comprueba que se ven moverse y salir.
import { spawn } from 'node:child_process';
const PORT = 8799, url = `ws://127.0.0.1:${PORT}/sala/dept:olancho:0`;
const w = spawn('pnpm', ['exec', 'wrangler', 'dev', '--port', String(PORT)], { stdio: 'ignore', detached: true });
const fin = code => { try { process.kill(-w.pid, 'SIGKILL'); } catch {} process.exit(code); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const abrir = nombre => new Promise((res, rej) => { const ws = new WebSocket(`${url}?nombre=${nombre}`), cola = []; ws.onmessage = e => cola.push(JSON.parse(e.data)); ws.onopen = () => res({ ws, cola }); ws.onerror = () => rej(new Error('no conectó')); });
const espera = async (c, t, ms = 3000) => { const s = Date.now(); for (;;) { const m = c.cola.find(x => x.t === t); if (m) return m; if (Date.now() - s > ms) throw new Error(`no llegó «${t}»: ${JSON.stringify(c.cola)}`); await sleep(30); } };
try {
  for (let i = 0; ; i++) { try { if ((await fetch(`http://127.0.0.1:${PORT}/`)).ok) break; } catch {} if (i > 150) throw new Error('wrangler dev no arrancó'); await sleep(200); }
  const a = await abrir('Ana'); const holaA = await espera(a, 'hola');
  const b = await abrir('Beto'); const holaB = await espera(b, 'hola');
  if (holaB.jugadores.length !== 1 || holaB.jugadores[0].nombre !== 'Ana') throw new Error('Beto no vio a Ana al entrar');
  const entra = await espera(a, 'entra'); if (entra.nombre !== 'Beto') throw new Error('Ana no supo que entró Beto');
  b.ws.send(JSON.stringify({ t: 'pos', x: 3, y: 0, z: -7.5, yaw: 1, anim: 'run' }));
  const pos = await espera(a, 'pos'); if (pos.id !== holaB.id || pos.x !== 3 || pos.z !== -7.5 || pos.anim !== 'run') throw new Error('posición mal repartida: ' + JSON.stringify(pos));
  b.ws.send(JSON.stringify({ t: 'pos', x: 1e9, anim: 'volar' })); await sleep(150);
  const lim = a.cola.filter(x => x.t === 'pos').at(-1); if (lim.x !== 1000 || lim.anim !== 'idle') throw new Error('no limitó valores raros: ' + JSON.stringify(lim));
  const oc = await (await fetch(`http://127.0.0.1:${PORT}/sala/dept:olancho:0`)).json(); if (oc.ocupacion !== 2) throw new Error('ocupación ' + oc.ocupacion);
  b.ws.close(); const sale = await espera(a, 'sale'); if (sale.id !== holaB.id) throw new Error('salida mal avisada');
  a.ws.close(); console.log('PASA sala: dos jugadores se ven entrar, moverse y salir; id de Ana', holaA.id); fin(0);
} catch (e) { console.log('FALLA', e.message); fin(1); }
