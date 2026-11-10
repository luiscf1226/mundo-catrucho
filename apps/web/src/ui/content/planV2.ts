// Plan técnico de la versión 3D independiente (Unity / Unreal). Lo muestra el panel "Plan técnico" de la versión 3D.
export interface PlanSection { title: string; intro?: string; bullets?: string[]; table?: { head: string[]; rows: string[][] } }
export const PLAN_V2: { summary: string; sections: PlanSection[] } = {
  summary: 'Este prototipo 3D corre en el navegador y ya prueba las mecánicas. El siguiente paso es reconstruirlo en un motor profesional, reutilizando datos, reglas y diseños, sin depender de Roblox.',
  sections: [
    {
      title: '1. Motor recomendado: Unity 6 (URP)',
      bullets: [
        'Un solo proyecto para PC y, después, Android y iOS.',
        'C# se parece al TypeScript de este prototipo: la lógica se traduce casi línea por línea.',
        'URP da el estilo 3D estilizado (sombras suaves, niebla, agua) con buen rendimiento en celulares.',
        'Unreal Engine 5 es la alternativa si la prioridad pasa a ser PC de gama alta: mejor iluminación, pero builds más pesados y C++/Blueprints.',
      ],
    },
    {
      title: '2. Qué se reutiliza tal cual',
      table: {
        head: ['Pieza', 'En este prototipo', 'En Unity'],
        rows: [
          ['Datos del juego', 'shared/data/*.json', 'Los mismos JSON, importados como ScriptableObjects'],
          ['Progreso y premios', 'core/store.ts, core/data.ts', 'ProfileService.cs + RewardRules.cs'],
          ['Minijuegos', 'game/minigames/* (intro → juego → resultado)', 'IMinigame + una escena aditiva por minijuego'],
          ['Jugador y cámara', 'PlayerController.tsx + core/phys.ts', 'CharacterController + Cinemachine en tercera persona'],
          ['Mundo', 'lobby/ y dept/ (18 zonas por datos)', 'Una escena Addressable por departamento, cargada por streaming'],
          ['Red', 'core/net.ts (NetAdapter)', 'Misma interfaz sobre Netcode for GameObjects o Photon Fusion'],
          ['Guardado', 'localStorage (perfil JSON)', 'Archivo local + Cloud Save, mismo esquema de perfil'],
        ],
      },
    },
    {
      title: '3. Estructura del proyecto',
      bullets: [
        'Assets/MundoCatrucho/Core: datos, guardado, bus de eventos, reglas de premios (sin dependencias de escena).',
        'Assets/MundoCatrucho/Gameplay: jugador, interacciones, vehículos, monedas, NPC con NavMesh.',
        'Assets/MundoCatrucho/Minigames: Carrera, Fútbol, Feria, Exploradores, Pulpería; cada uno con su escena y su prefab de reglas.',
        'Assets/MundoCatrucho/World: lobby de Tegucigalpa y los 18 departamentos como escenas Addressables.',
        'Assets/MundoCatrucho/UI: UI Toolkit; mismas pantallas y flujos que este prototipo.',
        'Assets/MundoCatrucho/Net: salas públicas y privadas, amigos, validación de premios en el servidor.',
        'Assets/MundoCatrucho/Art: modelos, materiales, animaciones (esqueleto humanoide compatible con Mecanim).',
      ],
    },
    {
      title: '4. Sistemas nuevos de la versión 3D',
      bullets: [
        'Ciclo de día y noche y clima dinámico (ya prototipados aquí): sol, luna, lluvia, neblina en la montaña.',
        'Vehículos con físicas: mototaxi, rapidito, lancha en Roatán y el Golfo de Fonseca.',
        'Personajes con esqueleto y animaciones mezcladas (caminar, correr, saltar, bailar punta, celebrar).',
        'Editor de personaje con prendas por capas y trajes típicos (lenca, garífuna, campesino).',
        'Fútbol con físicas reales de balón, porteros y tiros con efecto; carreras con físicas avanzadas.',
      ],
    },
    {
      title: '5. Multijugador',
      bullets: [
        'Servidor con autoridad: el cliente pide, el servidor valida monedas, compras y resultados. Hoy los demás jugadores son bots.',
        'Salas públicas con emparejamiento y salas privadas con código de 5 letras.',
        'Amigos, equipos, eventos especiales (Carnaval de La Ceiba, Feria Juniana) y tablas de clasificación en línea.',
        'Servicios sugeridos: Unity Gaming Services (Relay, Lobby, Cloud Save, Leaderboards) o servidores dedicados.',
      ],
    },
    {
      title: '6. Rendimiento',
      bullets: [
        'Meta: 60 fps en PC y 30 fps estables en celulares de gama media.',
        'Menos de 300 llamadas de dibujo en móvil: SRP Batcher, instancing, atlas de texturas y LOD.',
        'Carga por streaming: solo el departamento actual está en memoria.',
      ],
    },
    {
      title: '7. Fases',
      table: {
        head: ['Fase', 'Entrega', 'Tiempo estimado'],
        rows: [
          ['1', 'Prototipo web 3D: mapa gigante, 18 departamentos, 226 juegos sobre 14 motores, viajes y ropero (esta entrega)', 'Listo'],
          ['2', 'Unity: jugador, cámara, mapa gigante y terminal de buses', '4–6 semanas'],
          ['3', 'Unity: los 14 motores y el catálogo completo, con arte propio por departamento', '3–4 meses'],
          ['4', 'Multijugador real: dúo, mundo abierto, salas y validación en servidor', '2–3 meses'],
          ['5', 'Versión para celulares, eventos (Carnaval de La Ceiba, Feria Juniana) y más juegos por departamento', 'continuo'],
        ],
      },
    },
  ],
};
