import { input } from '../../../core/input';
import { Block, Cyl, Label } from '../../kit';
import { defineMotor, type Motor } from '../kit';
import { duracion, metas, Taller } from './Taller';

type Estado = { peso: number; drenaje: number; canales: number; buenas: number; malas: number; aviso: string };
type Sesion = Motor<{ dif: number; nombre: string }, Estado>;
function pesar(m: Sesion) {
  const s = m.datos;
  if (s.drenaje < s.peso * 0.25) {
    s.canales = Math.max(0, s.canales - 0.4);
    s.aviso = 'Muy pronto: sellaste canales';
  }
  s.peso++;
  if (s.peso > 4) {
    m.sumar(-20);
    s.malas++;
    reiniciar(s);
  }
}
function reiniciar(s: Estado) {
  s.peso = 0;
  s.drenaje = 0;
  s.canales = 1;
}
const motor = defineMotor({
  id: 'olancho.cuajada',
  guia: {
    goal: 'Agregá un peso con F. Esperá que drene 25% antes del siguiente. Cuatro pesos completan la cuajada.',
    keys: [['F / clic / B / RT', 'agregar un peso']],
    touch: [['🎯', 'agregar un peso']],
  },
  etapa: (p) => ({ dif: p.dif, nombre: typeof p.tema.nombre === 'string' ? p.tema.nombre : 'Cuajada de Catacamas' }),
  metas,
  duracion,
  crear: (): Estado => ({ peso: 0, drenaje: 0, canales: 1, buenas: 0, malas: 0, aviso: 'Poné el primer peso' }),
  actualizar(m, dt) {
    const s = m.datos;
    s.drenaje += (dt * s.peso * 0.07 * s.canales) / (1 + m.parametros.dif * 0.6);
    if (input.take('fire')) pesar(m);
    if (s.drenaje >= 1) {
      m.sumar(s.canales >= 0.9 ? 40 : -20);
      if (s.canales >= 0.9) s.buenas++;
      else s.malas++;
      s.aviso = s.canales >= 0.9 ? 'Textura pareja, prepará otra' : 'Humedad atrapada, probá otra';
      reiniciar(s);
    }
    m.objetivo = s.aviso;
    m.lineas = [
      `Pesos ${s.peso}/4 · Suero ${Math.round(s.drenaje * 100)}%`,
      `Canales abiertos ${Math.round(s.canales * 100)}% · F para cargar`,
    ];
    m.stats = { buenas: s.buenas, malas: s.malas, peso: s.peso, drenaje: s.drenaje };
  },
  bot(m, _dt, actor) {
    if (actor === 'compa') {
      if (m.datos.peso === 0) pesar(m);
      return;
    }
    const s = m.datos;
    if (s.peso < 4 && s.drenaje >= s.peso * 0.25) pesar(m);
  },
  Escena: ({ motor: m }) => (
    <Taller nombre={m.parametros.nombre} aviso="Peso gradual · Dejá salir el suero">
      <Block pos={[0, 0.45, 0]} size={[6, 0.9, 5]} color="#865c39" mat="wood" />
      <Cyl pos={[0, 1.2, 0]} r={1.6} h={0.6} color="#fff0ca" mat="sand" />
      {Array.from({ length: m.datos.peso }, (_, i) => (
        <Block key={i} pos={[0, 1.7 + i * 0.3, 0]} size={[2.4, 0.25, 2]} color="#586772" mat="stone" />
      ))}
      <Block pos={[2, 1, 1]} size={[0.22, 0.15, 2]} color="#d7e69b" mat="water" />
      <Label
        pos={[0, 2.1, 3]}
        text={`Suero ${Math.round(m.datos.drenaje * 100)}% · Canales ${Math.round(m.datos.canales * 100)}%`}
        h={0.36}
      />
    </Taller>
  ),
});
export const Cuajada = motor.Escena;
export const guia = motor.guia;
