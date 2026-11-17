// Lugares reales y reconocibles de cada cabecera (los que no tienen ya una estación propia) y la pulpería del barrio.
// Las marcas van con apodo (regla 3 de AGENTS.md): el nombre real vive solo en `vigilar` de shared/data/apodos.json.

export type TipoSitio =
  | 'iglesia'
  | 'almacen'
  | 'diversiones'
  | 'estadio'
  | 'mercado'
  | 'parque'
  | 'museo'
  | 'fabrica'
  | 'muelle'
  | 'aduana'
  | 'peatonal'
  | 'pista'
  | 'salinera';

export interface SitioReal {
  id: string;
  nombre: string;
  tipo: TipoSitio;
  /** lo que cuenta al acercarse (voseo, corto) */
  nota: string;
  /** color principal de la fachada */
  color?: string;
}
export interface CiudadReal {
  ciudad: string;
  pulperia: string;
  sitios: SitioReal[];
}

export const CIUDADES: Record<string, CiudadReal> = {
  franciscomorazan: {
    ciudad: 'Tegucigalpa',
    pulperia: 'Pulpería La Bendición',
    sitios: [
      {
        id: 'polilandia',
        nombre: 'Polilandia',
        tipo: 'diversiones',
        nota: 'El parque de diversiones de la capital: rueda de Chicago, carrusel y algodón de azúcar. Toda la cipotada de Tegus pasó un cumpleaños aquí.',
      },
      {
        id: 'carrizon',
        nombre: 'Almacenes Carrizón',
        tipo: 'almacen',
        nota: 'El almacén de toda la vida en el centro: uniformes de escuela, zapatos de estreno y la ropa de diciembre. Si no lo hallás aquí, no existe.',
        color: '#e9e2d0',
      },
      {
        id: 'catedral-tegus',
        nombre: 'Catedral San Miguel Arcángel',
        tipo: 'iglesia',
        nota: 'La catedral del centro de Tegucigalpa, frente al Parque Central. Es del siglo XVIII y adentro tiene un retablo dorado que brilla.',
        color: '#f1ead8',
      },
      {
        id: 'peatonal-tegus',
        nombre: 'La Peatonal',
        tipo: 'peatonal',
        nota: 'El paseo peatonal del centro: vendedores, predicadores, payasos y el olor a elotes asados. Agarrá bien la cartera, que hay bulla.',
      },
    ],
  },
  cortes: {
    ciudad: 'San Pedro Sula',
    pulperia: 'Pulpería El Buen Pastor',
    sitios: [
      {
        id: 'guamilito',
        nombre: 'Mercado Guamilito',
        tipo: 'mercado',
        nota: 'El mercado de artesanías y flores de San Pedro Sula. Hay hamacas, cuadros, puros y baleadas recién hechas.',
      },
      {
        id: 'catedral-sps',
        nombre: 'Catedral San Pedro Apóstol',
        tipo: 'iglesia',
        nota: 'La catedral frente al Parque Central sampedrano. Con el calor de la costa norte, adentro se siente fresquito.',
        color: '#f4efe4',
      },
      {
        id: 'museo-sps',
        nombre: 'Museo de Antropología e Historia',
        tipo: 'museo',
        nota: 'Cuenta la historia del valle de Sula: desde los pueblos antiguos hasta las bananeras y el ferrocarril.',
        color: '#efe3c8',
      },
      {
        id: 'parque-sps',
        nombre: 'Parque Central de San Pedro',
        tipo: 'parque',
        nota: 'Bancas a la sombra, lustradores, palomas y el kiosko. El punto de encuentro de la capital industrial.',
      },
    ],
  },
  atlantida: {
    ciudad: 'La Ceiba',
    pulperia: 'Pulpería Doña Toña',
    sitios: [
      {
        id: 'muelle-ceiba',
        nombre: 'Muelle de Cabotaje',
        tipo: 'muelle',
        nota: 'El viejo muelle de La Ceiba, de cuando salía el banano en tren hasta el mar. Hoy es para ver el atardecer.',
      },
      {
        id: 'swinford',
        nombre: 'Parque Swinford',
        tipo: 'parque',
        nota: 'El parque central de La Ceiba, con palmeras y el vagón del tren bananero. Aquí se arma el Carnaval de mayo.',
      },
      {
        id: 'catedral-ceiba',
        nombre: 'Catedral San Isidro',
        tipo: 'iglesia',
        nota: 'La catedral de la Novia de Honduras, dedicada a San Isidro Labrador, el patrono de la feria.',
        color: '#f4efe4',
      },
      {
        id: 'estadio-ceibeno',
        nombre: 'Estadio Ceibeño',
        tipo: 'estadio',
        nota: 'El estadio de La Ceiba. Cuando juegan los Cocoteros, la porra se oye hasta el muelle.',
      },
    ],
  },
  choluteca: {
    ciudad: 'Choluteca',
    pulperia: 'Pulpería Los Cipotes',
    sitios: [
      {
        id: 'catedral-choluteca',
        nombre: 'Catedral de la Inmaculada',
        tipo: 'iglesia',
        nota: 'La catedral colonial de Choluteca, blanca y fresca. Afuera el sol del sur pega a 38 grados.',
        color: '#f6f1e6',
      },
      {
        id: 'parque-valle',
        nombre: 'Parque José Cecilio del Valle',
        tipo: 'parque',
        nota: 'El parque central lleva el nombre del sabio Valle, que nació aquí y escribió el Acta de Independencia de 1821.',
      },
      {
        id: 'estadio-choluteca',
        nombre: 'Estadio Fausto Flores Lagos',
        tipo: 'estadio',
        nota: 'El estadio de Choluteca. Los partidos son de noche porque de día no hay quien aguante el calor.',
      },
    ],
  },
  colon: {
    ciudad: 'Trujillo',
    pulperia: 'Pulpería La Garífuna',
    sitios: [
      {
        id: 'iglesia-trujillo',
        nombre: 'Catedral San Juan Bautista',
        tipo: 'iglesia',
        nota: 'La iglesia de Trujillo, una de las ciudades más antiguas de tierra firme en América.',
        color: '#f4efe4',
      },
      {
        id: 'parque-trujillo',
        nombre: 'Parque Central de Trujillo',
        tipo: 'parque',
        nota: 'Desde aquí se ve la bahía. A la par queda la fortaleza con sus cañones viejos.',
      },
      {
        id: 'muelle-trujillo',
        nombre: 'Muelle de Trujillo',
        tipo: 'muelle',
        nota: 'Las lanchas salen a pescar y a Puerto Castilla. El agua de la bahía es tranquila y clarita.',
      },
    ],
  },
  comayagua: {
    ciudad: 'Comayagua',
    pulperia: 'Pulpería La Colonial',
    sitios: [
      {
        id: 'la-merced',
        nombre: 'Iglesia La Merced',
        tipo: 'iglesia',
        nota: 'La primera catedral de Comayagua, del siglo XVI. Es de las iglesias más antiguas de Honduras.',
        color: '#f3ecdc',
      },
      {
        id: 'caxa-real',
        nombre: 'Caxa Real',
        tipo: 'museo',
        nota: 'La antigua casa donde la Corona guardaba los impuestos de la provincia. Hoy es museo colonial.',
        color: '#efe3c8',
      },
      {
        id: 'mercado-comayagua',
        nombre: 'Mercado de Comayagua',
        tipo: 'mercado',
        nota: 'Frutas del valle, rosquillas, quesillo y las alfombras de aserrín que se venden en Semana Santa.',
      },
    ],
  },
  copan: {
    ciudad: 'Santa Rosa de Copán',
    pulperia: 'Pulpería El Cafetal',
    sitios: [
      {
        id: 'fabrica-puros',
        nombre: 'Fábrica de puros',
        tipo: 'fabrica',
        nota: 'Santa Rosa es tierra de tabaco desde la colonia. Aquí todavía enrollan los puros a mano, hoja por hoja.',
        color: '#c98f5f',
      },
      {
        id: 'catedral-santarosa',
        nombre: 'Catedral de Santa Rosa',
        tipo: 'iglesia',
        nota: 'La catedral frente al parque de Santa Rosa, con su calle empedrada y el fresco de la montaña.',
        color: '#f4efe4',
      },
      {
        id: 'parque-santarosa',
        nombre: 'Parque Central de Santa Rosa',
        tipo: 'parque',
        nota: 'Café de altura en cada esquina y el kiosko donde toca la banda los domingos.',
      },
    ],
  },
  elparaiso: {
    ciudad: 'Yuscarán',
    pulperia: 'Pulpería Doña Chepa',
    sitios: [
      {
        id: 'casa-fortin',
        nombre: 'Casa Fortín',
        tipo: 'museo',
        nota: 'Casona colonial de Yuscarán convertida en museo. El pueblo entero es monumento nacional por sus calles de piedra.',
        color: '#f1e6cc',
      },
      {
        id: 'destileria',
        nombre: 'Destilería de guaro',
        tipo: 'fabrica',
        nota: 'Yuscarán es famoso por su aguardiente de caña. Aquí se huele el guaro desde la calle.',
        color: '#d7ccc8',
      },
      {
        id: 'iglesia-yuscaran',
        nombre: 'Iglesia de Yuscarán',
        tipo: 'iglesia',
        nota: 'La iglesia del antiguo pueblo minero, con el cerro Monserrat de fondo.',
        color: '#f4efe4',
      },
    ],
  },
  graciasadios: {
    ciudad: 'Puerto Lempira',
    pulperia: 'Pulpería La Moskitia',
    sitios: [
      {
        id: 'muelle-plempira',
        nombre: 'Muelle de Puerto Lempira',
        tipo: 'muelle',
        nota: 'Aquí llegan los pipantes y las lanchas desde las comunidades misquitas por la laguna de Caratasca.',
      },
      {
        id: 'pista-plempira',
        nombre: 'Pista de aterrizaje',
        tipo: 'pista',
        nota: 'A la Moskitia no llega carretera: se viene en avioneta o en lancha. Esta pista es la puerta de entrada.',
      },
      {
        id: 'iglesia-morava',
        nombre: 'Iglesia Morava',
        tipo: 'iglesia',
        nota: 'La iglesia morava es la más vieja de la Moskitia. Los cantos en misquito se oyen desde la calle.',
        color: '#f4f4f0',
      },
    ],
  },
  intibuca: {
    ciudad: 'La Esperanza',
    pulperia: 'Pulpería El Frío',
    sitios: [
      {
        id: 'catedral-esperanza',
        nombre: 'Catedral de La Esperanza',
        tipo: 'iglesia',
        nota: 'La iglesia de la ciudad más alta de Honduras. Traé suéter: aquí el frío es en serio.',
        color: '#f4efe4',
      },
      {
        id: 'parque-esperanza',
        nombre: 'Parque Central de La Esperanza',
        tipo: 'parque',
        nota: 'Mujeres lencas con sus pañuelos de colores venden atol, papas y fresas alrededor del parque.',
      },
      {
        id: 'casa-cultura-esperanza',
        nombre: 'Casa de la Cultura',
        tipo: 'museo',
        nota: 'Muestra los tejidos, la cerámica y las tradiciones del pueblo lenca de Intibucá.',
        color: '#e8dcc4',
      },
    ],
  },
  islas: {
    ciudad: 'Roatán',
    pulperia: 'Pulpería Island Shop',
    sitios: [
      {
        id: 'west-end',
        nombre: 'West End',
        tipo: 'peatonal',
        nota: 'La calle de arena de Roatán: casitas de madera de colores, buzos, música caribeña y pan de coco.',
      },
      {
        id: 'muelle-cruceros',
        nombre: 'Muelle de cruceros',
        tipo: 'muelle',
        nota: 'Los barcos gigantes de turistas atracan aquí. En temporada llegan miles en un solo día.',
      },
      {
        id: 'french-harbour',
        nombre: 'French Harbour',
        tipo: 'fabrica',
        nota: 'El puerto pesquero de Roatán: langosta, camarón y caracol salen de aquí para todo el mundo.',
        color: '#7fb7d9',
      },
    ],
  },
  lapaz: {
    ciudad: 'La Paz',
    pulperia: 'Pulpería La Paz de Dios',
    sitios: [
      {
        id: 'parroquia-lapaz',
        nombre: 'Parroquia de La Paz',
        tipo: 'iglesia',
        nota: 'La iglesia de la cabecera, frente al parque. En la feria de noviembre se llena de gente.',
        color: '#f4efe4',
      },
      {
        id: 'parque-lapaz',
        nombre: 'Parque Central de La Paz',
        tipo: 'parque',
        nota: 'Tranquilo, con árboles grandes y el kiosko. Aquí se toma el cafecito de Marcala.',
      },
      {
        id: 'beneficio-cafe',
        nombre: 'Beneficio de café',
        tipo: 'fabrica',
        nota: 'Aquí se lava, seca y trilla el café de altura de La Paz antes de venderlo afuera.',
        color: '#a1887f',
      },
    ],
  },
  lempira: {
    ciudad: 'Gracias',
    pulperia: 'Pulpería Celaque',
    sitios: [
      {
        id: 'san-marcos',
        nombre: 'Iglesia San Marcos',
        tipo: 'iglesia',
        nota: 'La iglesia colonial de Gracias, que fue capital de toda Centroamérica en 1544.',
        color: '#f3ecdc',
      },
      {
        id: 'casa-galeano',
        nombre: 'Casa Galeano',
        tipo: 'museo',
        nota: 'Casona colonial convertida en museo, con jardín botánico y la historia lenca de Lempira.',
        color: '#efe3c8',
      },
      {
        id: 'parque-gracias',
        nombre: 'Parque Central de Gracias',
        tipo: 'parque',
        nota: 'Calles empedradas, casas de adobe y techos de teja alrededor. Al fondo, la montaña de Celaque.',
      },
    ],
  },
  ocotepeque: {
    ciudad: 'Nueva Ocotepeque',
    pulperia: 'Pulpería La Frontera',
    sitios: [
      {
        id: 'el-poy',
        nombre: 'Aduana El Poy',
        tipo: 'aduana',
        nota: 'El paso fronterizo con El Salvador. Camiones, rastras y cambistas con fajos de billetes.',
      },
      {
        id: 'iglesia-ocotepeque',
        nombre: 'Iglesia de Nueva Ocotepeque',
        tipo: 'iglesia',
        nota: 'El pueblo se mudó aquí después de la llena de 1934 que se llevó la vieja Ocotepeque.',
        color: '#f4efe4',
      },
      {
        id: 'mercado-ocotepeque',
        nombre: 'Mercado de Ocotepeque',
        tipo: 'mercado',
        nota: 'Aquí se junta lo de tres países: productos de Honduras, Guatemala y El Salvador.',
      },
    ],
  },
  olancho: {
    ciudad: 'Juticalpa',
    pulperia: 'Pulpería El Olanchano',
    sitios: [
      {
        id: 'catedral-juticalpa',
        nombre: 'Catedral de Juticalpa',
        tipo: 'iglesia',
        nota: 'La iglesia de la capital olanchana. En la feria de diciembre el centro se llena de caballos.',
        color: '#f4efe4',
      },
      {
        id: 'parque-juticalpa',
        nombre: 'Parque Central de Juticalpa',
        tipo: 'parque',
        nota: 'Famoso por sus árboles enormes. Aquí se cuentan los cuentos de Olancho: entra el que quiere, sale el que puede.',
      },
      {
        id: 'estadio-juticalpa',
        nombre: 'Estadio Juan Ramón Brevé',
        tipo: 'estadio',
        nota: 'El estadio de Juticalpa, donde se juega a pura garra olanchana.',
      },
    ],
  },
  santabarbara: {
    ciudad: 'Santa Bárbara',
    pulperia: 'Pulpería El Junco',
    sitios: [
      {
        id: 'iglesia-santabarbara',
        nombre: 'Iglesia de Santa Bárbara',
        tipo: 'iglesia',
        nota: 'La iglesia de la cabecera, al pie de la montaña de Santa Bárbara.',
        color: '#f4efe4',
      },
      {
        id: 'taller-junco',
        nombre: 'Cooperativa del junco',
        tipo: 'fabrica',
        nota: 'Sombreros, petates y canastas de junco tejidos a mano. Es la artesanía que hizo famosa a Santa Bárbara.',
        color: '#d9c38a',
      },
      {
        id: 'parque-santabarbara',
        nombre: 'Parque Central de Santa Bárbara',
        tipo: 'parque',
        nota: 'Aquí se venden los sombreros de junco recién tejidos.',
      },
    ],
  },
  valle: {
    ciudad: 'Nacaome',
    pulperia: 'Pulpería El Golfo',
    sitios: [
      {
        id: 'iglesia-nacaome',
        nombre: 'Iglesia de Nacaome',
        tipo: 'iglesia',
        nota: 'Iglesia colonial de la cabecera de Valle. Nacaome fue capital de Honduras por un tiempo en el siglo XIX.',
        color: '#f6f1e6',
      },
      {
        id: 'salinera',
        nombre: 'Salineras del golfo',
        tipo: 'salinera',
        nota: 'El agua del golfo de Fonseca se seca al sol en pilas hasta que queda la sal. Brilla que encandila.',
      },
      {
        id: 'parque-nacaome',
        nombre: 'Parque Central de Nacaome',
        tipo: 'parque',
        nota: 'Sombra de almendros y raspados de colores para el calor del sur.',
      },
    ],
  },
  yoro: {
    ciudad: 'Yoro',
    pulperia: 'Pulpería Lluvia de Peces',
    sitios: [
      {
        id: 'iglesia-yoro',
        nombre: 'Iglesia de Yoro',
        tipo: 'iglesia',
        nota: 'Aquí se reza para que siga la lluvia de peces de cada junio. El padre Subirana pidió ese milagro, dicen.',
        color: '#f4efe4',
      },
      {
        id: 'parque-yoro',
        nombre: 'Parque Central de Yoro',
        tipo: 'parque',
        nota: 'El parque de la cabecera, con su kiosko y vendedoras de tamales y pan de mantequilla.',
      },
      {
        id: 'mercado-yoro',
        nombre: 'Mercado de Yoro',
        tipo: 'mercado',
        nota: 'Pescado frito, yuca con chicharrón y frutas de la costa. Si llueven peces, aquí se venden.',
      },
    ],
  },
};
