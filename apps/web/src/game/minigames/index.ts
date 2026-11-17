import { type FC, lazy } from 'react';
import type { MinigameId } from '../../core/types';
import type { Guia } from './api';

function motor(load: () => Promise<{ default: FC; guia?: Guia }>) {
  let module: { default: FC; guia?: Guia } | undefined;
  let pending: ReturnType<typeof load> | undefined;
  const resolve = () =>
    (pending ??= load().then((m) => {
      module = m;
      return m;
    }));
  return {
    Scene: lazy(resolve),
    guide: () => {
      if (!module) throw resolve();
      return module.guia;
    },
  };
}
const MOTORS = {
  'intibuca.carrera': motor(() => import('./intibuca/Carrera').then((m) => ({ ...m, default: m.Carrera }))),
  'intibuca.telar': motor(() => import('./intibuca/Telar').then((m) => ({ ...m, default: m.Telar }))),
  'intibuca.hongos': motor(() => import('./intibuca/Hongos').then((m) => ({ ...m, default: m.Hongos }))),
  'intibuca.callejero': motor(() => import('./intibuca/Callejero').then((m) => ({ ...m, default: m.Callejero }))),
  'intibuca.papas': motor(() => import('./intibuca/Papas').then((m) => ({ ...m, default: m.Papas }))),
  'intibuca.semilla': motor(() => import('./intibuca/Semilla').then((m) => ({ ...m, default: m.Semilla }))),
  'intibuca.vaho': motor(() => import('./intibuca/Vaho').then((m) => ({ ...m, default: m.Vaho }))),
  'intibuca.ondas': motor(() => import('./intibuca/Ondas').then((m) => ({ ...m, default: m.Ondas }))),
  'lempira.barro': motor(() => import('./lempira/Barro').then((m) => ({ ...m, default: m.Barro }))),
  'lempira.opalo': motor(() => import('./lempira/Opalo').then((m) => ({ ...m, default: m.Opalo }))),
  'lempira.cuencas': motor(() => import('./lempira/Cuencas').then((m) => ({ ...m, default: m.Cuencas }))),
  'lempira.rebote': motor(() => import('./lempira/Rebote').then((m) => ({ ...m, default: m.Rebote }))),
  'lempira.pigmentos': motor(() => import('./lempira/Pigmentos').then((m) => ({ ...m, default: m.Pigmentos }))),
  'lempira.trapiche': motor(() => import('./lempira/Trapiche').then((m) => ({ ...m, default: m.Trapiche }))),
  'lempira.termal': motor(() => import('./lempira/Termal').then((m) => ({ ...m, default: m.Termal }))),
  // El Paraíso
  'elparaiso.trivia': motor(() => import('./elparaiso/Archivo').then((m) => ({ ...m, default: m.Archivo }))),
  'elparaiso.montuca': motor(() => import('./elparaiso/Montuca').then((m) => ({ ...m, default: m.Montuca }))),
  'elparaiso.carrozamaiz': motor(() => import('./elparaiso/Carroza').then((m) => ({ ...m, default: m.Carroza }))),
  'elparaiso.mina': motor(() => import('./elparaiso/Mina').then((m) => ({ ...m, default: m.Mina }))),
  'elparaiso.tapisca': motor(() => import('./elparaiso/Tapisca').then((m) => ({ ...m, default: m.Tapisca }))),
  'elparaiso.aleros': motor(() => import('./elparaiso/Aleros').then((m) => ({ ...m, default: m.Aleros }))),
  'elparaiso.fronterafila': motor(() => import('./elparaiso/Frontera').then((m) => ({ ...m, default: m.Frontera }))),
  'elparaiso.costura': motor(() => import('./elparaiso/Costura').then((m) => ({ ...m, default: m.Costura }))),
  // Valle
  'valle.curil': motor(() => import('./valle/Curil').then((m) => ({ ...m, default: m.Curil }))),
  'valle.bicitaxi': motor(() => import('./valle/Bicitaxi').then((m) => ({ ...m, default: m.Bicitaxi }))),
  'valle.embarque': motor(() => import('./valle/Embarque').then((m) => ({ ...m, default: m.Embarque }))),
  'valle.volcan': motor(() => import('./valle/Volcan').then((m) => ({ ...m, default: m.Volcan }))),
  'valle.raices': motor(() => import('./valle/Raices').then((m) => ({ ...m, default: m.Raices }))),
  'valle.saljocote': motor(() => import('./valle/Saljocote').then((m) => ({ ...m, default: m.Saljocote }))),
  'valle.redviva': motor(() => import('./valle/Redviva').then((m) => ({ ...m, default: m.Redviva }))),
  'valle.punche': motor(() => import('./valle/Punche').then((m) => ({ ...m, default: m.Punche }))),
  // Choluteca
  'choluteca.puentes': motor(() => import('./choluteca/Puentes').then((m) => ({ ...m, default: m.Puentes }))),
  'choluteca.tortuga': motor(() => import('./choluteca/Tortuga').then((m) => ({ ...m, default: m.Tortuga }))),
  'choluteca.estanque': motor(() => import('./choluteca/Estanque').then((m) => ({ ...m, default: m.Estanque }))),
  'choluteca.sombra': motor(() => import('./choluteca/Sombra').then((m) => ({ ...m, default: m.Sombra }))),
  'choluteca.mielrosca': motor(() => import('./choluteca/MielRosca').then((m) => ({ ...m, default: m.MielRosca }))),
  'choluteca.cincha': motor(() => import('./choluteca/Cincha').then((m) => ({ ...m, default: m.Cincha }))),
  'choluteca.ventanasbus': motor(() => import('./choluteca/Bus').then((m) => ({ ...m, default: m.Bus }))),
  'choluteca.mareapaseo': motor(() => import('./choluteca/Marea').then((m) => ({ ...m, default: m.Marea }))),
  // La Paz
  'lapaz.catacion': motor(() => import('./lapaz/Catacion').then((m) => ({ ...m, default: m.Catacion }))),
  'lapaz.cafe': motor(() => import('./lapaz/Cafe').then((m) => ({ ...m, default: m.Cafe }))),
  'lapaz.tostador': motor(() => import('./lapaz/Tostador').then((m) => ({ ...m, default: m.Tostador }))),
  'lapaz.reciprocidad': motor(() => import('./lapaz/Reciprocidad').then((m) => ({ ...m, default: m.Reciprocidad }))),
  'lapaz.vapor': motor(() => import('./lapaz/Vapor').then((m) => ({ ...m, default: m.Vapor }))),
  'lapaz.pesas': motor(() => import('./lapaz/Pesas').then((m) => ({ ...m, default: m.Pesas }))),
  'lapaz.abrasigo': motor(() => import('./lapaz/Abrasigo').then((m) => ({ ...m, default: m.Abrasigo }))),
  'lapaz.estiba': motor(() => import('./lapaz/Estiba').then((m) => ({ ...m, default: m.Estiba }))),
  // Colón
  'colon.salinidad': motor(() => import('./colon/Salinidad').then((m) => ({ ...m, default: m.Salinidad }))),
  'colon.visualbahia': motor(() => import('./colon/VisualBahia').then((m) => ({ ...m, default: m.VisualBahia }))),
  'colon.gajos': motor(() => import('./colon/Gajos').then((m) => ({ ...m, default: m.Gajos }))),
  'colon.remolque': motor(() => import('./colon/Remolque').then((m) => ({ ...m, default: m.Remolque }))),
  'colon.redjuvenil': motor(() => import('./colon/RedJuvenil').then((m) => ({ ...m, default: m.RedJuvenil }))),
  'colon.plano': motor(() => import('./colon/Plano').then((m) => ({ ...m, default: m.Plano }))),
  'colon.racimos': motor(() => import('./colon/Racimos').then((m) => ({ ...m, default: m.Racimos }))),

  'copan.cadera': motor(() => import('./copan/Cadera').then((m) => ({ ...m, default: m.Cadera }))),
  'copan.glifos': motor(() => import('./copan/Glifos').then((m) => ({ ...m, default: m.Glifos }))),
  'copan.guaras': motor(() => import('./copan/Guaras').then((m) => ({ ...m, default: m.Guaras }))),
  'copan.estratigrafia': motor(() => import('./copan/Estratigrafia').then((m) => ({ ...m, default: m.Estratigrafia }))),
  'copan.hojas': motor(() => import('./copan/Hojas').then((m) => ({ ...m, default: m.Hojas }))),
  'copan.adoquin': motor(() => import('./copan/Adoquin').then((m) => ({ ...m, default: m.Adoquin }))),
  'copan.estelas': motor(() => import('./copan/Estelas').then((m) => ({ ...m, default: m.Estelas }))),
  'copan.atol': motor(() => import('./copan/Atol').then((m) => ({ ...m, default: m.Atol }))),
  'olancho.batea': motor(() => import('./olancho/Batea').then((m) => ({ ...m, default: m.Batea }))),
  'olancho.arreo': motor(() => import('./olancho/Arreo').then((m) => ({ ...m, default: m.Arreo }))),
  'olancho.calcita': motor(() => import('./olancho/Calcita').then((m) => ({ ...m, default: m.Calcita }))),
  'olancho.cuajada': motor(() => import('./olancho/Cuajada').then((m) => ({ ...m, default: m.Cuajada }))),
  'olancho.postura': motor(() => import('./olancho/Postura').then((m) => ({ ...m, default: m.Postura }))),
  'olancho.tablas': motor(() => import('./olancho/Tablas').then((m) => ({ ...m, default: m.Tablas }))),
  'franciscomorazan.niebla': motor(() =>
    import('./franciscomorazan/Niebla').then((m) => ({ ...m, default: m.Niebla })),
  ),
  'franciscomorazan.baleada': motor(() =>
    import('./franciscomorazan/Baleada').then((m) => ({ ...m, default: m.Baleada })),
  ),
  'franciscomorazan.repartidor': motor(() =>
    import('./franciscomorazan/Repartidor').then((m) => ({ ...m, default: m.Repartidor })),
  ),
  'franciscomorazan.artesania': motor(() =>
    import('./franciscomorazan/Artesania').then((m) => ({ ...m, default: m.Artesania })),
  ),

  'cortes.chuco': motor(() => import('./Chuco').then((m) => ({ ...m, default: m.Chuco }))),
  'cortes.gruas': motor(() => import('./Gruas').then((m) => ({ ...m, default: m.Gruas }))),
  'cortes.cortina': motor(() => import('./Cortina').then((m) => ({ ...m, default: m.Cortina }))),
  'cortes.garitas': motor(() => import('./Garitas').then((m) => ({ ...m, default: m.Garitas }))),
  'cortes.merendon': motor(() => import('./Merendon').then((m) => ({ ...m, default: m.Merendon }))),
  'cortes.cusuco': motor(() => import('./Cusuco').then((m) => ({ ...m, default: m.Cusuco }))),
  'cortes.topo': motor(() => import('./Topo').then((m) => ({ ...m, default: m.Topo }))),
  'islas.ballena': motor(() => import('./islas/Ballena').then((m) => ({ ...m, default: m.Ballena }))),
  'islas.coral': motor(() => import('./islas/Coral').then((m) => ({ ...m, default: m.Coral }))),
  'islas.bonacca': motor(() => import('./islas/Bonacca').then((m) => ({ ...m, default: m.Bonacca }))),
  'islas.estela': motor(() => import('./islas/Estela').then((m) => ({ ...m, default: m.Estela }))),
  'islas.flotacion': motor(() => import('./islas/Flotacion').then((m) => ({ ...m, default: m.Flotacion }))),
  'islas.colorprofundo': motor(() => import('./islas/ColorProfundo').then((m) => ({ ...m, default: m.ColorProfundo }))),
  'islas.cangrejo': motor(() => import('./islas/Cangrejo').then((m) => ({ ...m, default: m.Cangrejo }))),
  'islas.absorcion': motor(() => import('./islas/Absorcion').then((m) => ({ ...m, default: m.Absorcion }))),
  'comayagua.aserrin': motor(() => import('./comayagua/Aserrin').then((m) => ({ ...m, default: m.Aserrin }))),
  'comayagua.reloj': motor(() => import('./comayagua/Reloj').then((m) => ({ ...m, default: m.Reloj }))),
  'comayagua.eco': motor(() => import('./comayagua/Eco').then((m) => ({ ...m, default: m.Eco }))),
  'comayagua.pilon': motor(() => import('./comayagua/Pilon').then((m) => ({ ...m, default: m.Pilon }))),
  'comayagua.tenampua': motor(() => import('./comayagua/Tenampua').then((m) => ({ ...m, default: m.Tenampua }))),
  'comayagua.anden': motor(() => import('./comayagua/Anden').then((m) => ({ ...m, default: m.Anden }))),
  'comayagua.mantas': motor(() => import('./comayagua/Mantas').then((m) => ({ ...m, default: m.Mantas }))),
  'comayagua.fachadas': motor(() => import('./comayagua/Fachadas').then((m) => ({ ...m, default: m.Fachadas }))),
  'atlantida.balsa': motor(() => import('./atlantida/Balsa').then((m) => ({ ...m, default: m.Balsa }))),
  'atlantida.pancoco': motor(() => import('./atlantida/PanCoco').then((m) => ({ ...m, default: m.PanCoco }))),
  'atlantida.vagon': motor(() => import('./atlantida/Vagon').then((m) => ({ ...m, default: m.Vagon }))),
  'atlantida.manati': motor(() => import('./atlantida/Manati').then((m) => ({ ...m, default: m.Manati }))),
  'atlantida.lancetilla': motor(() => import('./atlantida/Lancetilla').then((m) => ({ ...m, default: m.Lancetilla }))),
  'atlantida.canopy': motor(() => import('./atlantida/Canopy').then((m) => ({ ...m, default: m.Canopy }))),
  'atlantida.carnaval': motor(() => import('./atlantida/Carnaval').then((m) => ({ ...m, default: m.Carnaval }))),
  'franciscomorazan.rosquilla': motor(() => import('./Rosquilla').then((m) => ({ ...m, default: m.Rosquilla }))),
  'franciscomorazan.taxi': motor(() => import('./franciscomorazan/Taxi').then((m) => ({ ...m, default: m.Taxi }))),
  'franciscomorazan.asalto': motor(() =>
    import('./franciscomorazan/Asalto').then((m) => ({ ...m, default: m.Asalto })),
  ),
  carrera: motor(() => import('./Carrera').then((m) => ({ ...m, default: m.Carrera }))),
  futbol: motor(() => import('./Futbol').then((m) => ({ ...m, default: m.Futbol }))),
  feria: motor(() => import('./Feria').then((m) => ({ ...m, default: m.Feria }))),
  exploradores: motor(() => import('./Exploradores').then((m) => ({ ...m, default: m.Exploradores }))),
  pulperia: motor(() => import('./Pulperia').then((m) => ({ ...m, default: m.Pulperia }))),
  corte: motor(() => import('./Corte').then((m) => ({ ...m, default: m.Corte }))),
  monta: motor(() => import('./Monta').then((m) => ({ ...m, default: m.Monta }))),
  ritmo: motor(() => import('./Ritmo').then((m) => ({ ...m, default: m.Ritmo }))),
  ruta: motor(() => import('./lempira/Sendero').then((m) => ({ ...m, default: m.Ruta }))),
  pesca: motor(() => import('./Pesca').then((m) => ({ ...m, default: m.Pesca }))),
  atrapa: motor(() => import('./Atrapa').then((m) => ({ ...m, default: m.Atrapa }))),
  cocina: motor(() => import('./Cocina').then((m) => ({ ...m, default: m.Cocina }))),
  trivia: motor(() => import('./Trivia').then((m) => ({ ...m, default: m.Trivia }))),
  manejo: motor(() => import('./Manejo').then((m) => ({ ...m, default: m.Manejo }))),
  // Ocotepeque
  'ocotepeque.trifinio': motor(() => import('./ocotepeque/Trifinio').then((m) => ({ ...m, default: m.Trifinio }))),
  'ocotepeque.archivoagua': motor(() => import('./ocotepeque/Archivo').then((m) => ({ ...m, default: m.Archivo }))),
  'ocotepeque.boveda': motor(() => import('./ocotepeque/Boveda').then((m) => ({ ...m, default: m.Boveda }))),
  'ocotepeque.mercadomadruga': motor(() => import('./ocotepeque/Mercado').then((m) => ({ ...m, default: m.Mercado }))),
  'ocotepeque.gotasviento': motor(() => import('./ocotepeque/Brujula').then((m) => ({ ...m, default: m.Brujula }))),
  'ocotepeque.reservas': motor(() => import('./ocotepeque/Reservas').then((m) => ({ ...m, default: m.Reservas }))),
  'ocotepeque.moras': motor(() => import('./ocotepeque/Cesta').then((m) => ({ ...m, default: m.Cesta }))),
  'ocotepeque.rotulos': motor(() => import('./ocotepeque/Rotulos').then((m) => ({ ...m, default: m.Rotulos }))),
  // Yoro
  'yoro.cable': motor(() => import('./yoro/Cable').then((m) => ({ ...m, default: m.Cable }))),
  'yoro.acuerdos': motor(() => import('./yoro/Archivo').then((m) => ({ ...m, default: m.Archivo }))),
  'yoro.jamo': motor(() => import('./yoro/Jamo').then((m) => ({ ...m, default: m.Jamo }))),
  'yoro.ulua': motor(() => import('./yoro/Crecida').then((m) => ({ ...m, default: m.Crecida }))),
  'yoro.pijol': motor(() => import('./yoro/Cascadas').then((m) => ({ ...m, default: m.Cascadas }))),
  'yoro.almohadilla': motor(() => import('./yoro/Almohadilla').then((m) => ({ ...m, default: m.Almohadilla }))),
  'yoro.coyol': motor(() => import('./yoro/Miel').then((m) => ({ ...m, default: m.Miel }))),
} satisfies Record<MinigameId, ReturnType<typeof motor>>;
export const MINIGAME_SCENES = MOTORS;
export function motorGuide(id: MinigameId) {
  return MOTORS[id].guide();
}
