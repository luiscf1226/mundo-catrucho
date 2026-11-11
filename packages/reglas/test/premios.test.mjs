// Premios y niveles: el paquete da exactamente lo mismo que la lógica que tenía store.ts antes de MC-12.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  BONO_VIAJE_MAX,
  bonoViaje,
  ganarXp,
  MONEDA_SUELTA,
  NIVEL_MAX,
  PREMIO_PRIMERA_VISITA,
  PREMIO_RECUERDO,
  PREMIOS,
  premioPartida,
  xpParaNivel,
} from '../src/index.ts';

const REWARDS = JSON.parse(
  readFileSync(new URL('../../../apps/web/shared/data/rewards.json', import.meta.url), 'utf8'),
);

// ---- lógica vieja, copiada tal cual de apps/web/src/core/store.ts y data.ts (ola 4)
const xpForLevel = (n) => REWARDS.level.base + (n - 1) * REWARDS.level.perLevel;
function viejoFinish(r) {
  const R = REWARDS.minigame,
    stars = Math.max(0, Math.min(3, r.stars));
  const coins = r.won ? R.win.coins + stars * R.perStar.coins : R.lose.coins;
  const xp = r.won ? R.win.xp + stars * R.perStar.xp : R.lose.xp;
  return { coins, xp, stars };
}
function viejoGainXp(p, n) {
  p.xp += n;
  let up = false;
  while (p.level < REWARDS.level.max && p.xp >= xpForLevel(p.level)) {
    p.xp -= xpForLevel(p.level);
    p.level++;
    p.coins += REWARDS.levelUp.coins;
    up = true;
  }
  return up;
}

test('los datos salen de rewards.json', () => {
  assert.deepEqual(PREMIOS, REWARDS);
  assert.equal(NIVEL_MAX, REWARDS.level.max);
  assert.deepEqual(PREMIO_PRIMERA_VISITA, { monedas: REWARDS.world.firstVisit.coins, xp: REWARDS.world.firstVisit.xp });
  assert.deepEqual(PREMIO_RECUERDO, { monedas: REWARDS.world.collectible.coins, xp: REWARDS.world.collectible.xp });
  assert.equal(MONEDA_SUELTA, REWARDS.world.coinPickup);
});

test('premio por partida igual al viejo (ganar, perder, estrellas fuera de rango)', () => {
  for (const won of [true, false])
    for (const stars of [-2, 0, 1, 2, 3, 4, 2.5]) {
      const v = viejoFinish({ won, stars }),
        n = premioPartida({ gano: won, estrellas: stars });
      assert.deepEqual({ coins: n.monedas, xp: n.xp, stars: n.estrellas }, v, `won=${won} stars=${stars}`);
    }
  assert.deepEqual(premioPartida({ gano: true, estrellas: 3 }), { monedas: 100, xp: 120, estrellas: 3 });
  assert.deepEqual(premioPartida({ gano: false, estrellas: 3 }), { monedas: 10, xp: 20, estrellas: 3 });
});

test('xpParaNivel igual al viejo', () => {
  for (let n = 1; n <= 60; n++) assert.equal(xpParaNivel(n), xpForLevel(n));
  assert.equal(xpParaNivel(1), 100);
  assert.equal(xpParaNivel(5), 300);
});

test('subir de nivel igual al viejo, con varias subidas y el tope', () => {
  const casos = [
    [1, 0, 0],
    [1, 0, 99],
    [1, 0, 100],
    [1, 50, 400],
    [3, 10, 5000],
    [49, 0, 1e6],
    [50, 20, 999],
    [12, 300, 60],
  ];
  for (const [level, xp, n] of casos) {
    const viejo = { level, xp, coins: 0 },
      up = viejoGainXp(viejo, n);
    const nuevo = ganarXp({ nivel: level, xp }, n);
    assert.deepEqual(
      { level: nuevo.nivel, xp: nuevo.xp, coins: nuevo.monedas, up: nuevo.subidas > 0 },
      { level: viejo.level, xp: viejo.xp, coins: viejo.coins, up },
      `nivel ${level} xp ${xp} +${n}`,
    );
  }
  const tope = ganarXp({ nivel: 49, xp: 0 }, 1e6);
  assert.equal(tope.nivel, NIVEL_MAX);
  assert.ok(tope.xp > 0, 'en el tope la XP se sigue juntando');
});

test('bono de viaje redondeado y con tope', () => {
  const viejo = (b) => (b > 0 ? Math.min(30, Math.round(b)) : 0);
  for (const b of [-5, 0, 0.3, 0.5, 12.4, 29.6, 30, 31, 500]) assert.equal(bonoViaje(b), viejo(b), `bono ${b}`);
  assert.equal(BONO_VIAJE_MAX, 30);
});
