import { ConvexHttpClient } from 'convex/browser';
import { makeFunctionReference } from 'convex/server';
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { type Catalogo, type Entrada, MAX_TEXTO, validarEdicion } from '../../../convex/catalogoPanelModelo';
import './style.css';

const cliente = import.meta.env.VITE_CONVEX_URL
  ? new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL, { logger: false })
  : null;
const ultima = makeFunctionReference<'query', Record<string, never>, Catalogo | null>('catalogo:ultima');
const entrar = makeFunctionReference<'query', { llave: string }, boolean>('catalogoPanel:entrar');
const guardar = makeFunctionReference<
  'mutation',
  { llave: string; version: number; departamento: Entrada },
  { version: number }
>('catalogoPanel:guardar');
const deshacer = makeFunctionReference<'mutation', { llave: string; version: number }, { version: number }>(
  'catalogoPanel:deshacer',
);
const secciones = ['lugares', 'comidas', 'palabras', 'turismo', 'locuras', 'juegos'] as const;
type Seccion = (typeof secciones)[number];
const etiquetas: Record<string, string> = {
  name: 'Nombre',
  nota: 'Nota',
  dice: 'Se dice',
  es: 'Significa',
  lugar: 'Lugar (id)',
  desc: 'Descripción',
  guino: 'Guiño',
  etapas: 'Etapas',
  tema: 'Tema',
  nombre: 'Nombre',
  queHaces: 'Qué hacés',
  dato: 'Dato',
  fuente: 'Fuente',
  queEs: 'Qué es',
  comoAparece: 'Cómo aparece',
};
function Campos({ valor, cambiar, ruta }: { valor: unknown; cambiar: (v: unknown) => void; ruta: string }) {
  const campo = ruta.split('.').at(-1) ?? '';
  const titulo = etiquetas[campo] ?? (/^\d+$/.test(campo) ? `Valor ${Number(campo) + 1}` : campo);
  if (
    typeof valor === 'string' &&
    ['nota', 'desc', 'guino', 'queHaces', 'dato', 'queEs', 'comoAparece'].includes(campo)
  )
    return (
      <label>
        {titulo}
        <textarea
          data-testid={ruta}
          maxLength={MAX_TEXTO}
          rows={3}
          value={valor}
          onChange={(e) => cambiar(e.target.value)}
        />
      </label>
    );

  if (typeof valor === 'string' || typeof valor === 'number')
    return (
      <label>
        {titulo}
        <input
          data-testid={ruta}
          type={typeof valor === 'number' ? 'number' : 'text'}
          maxLength={MAX_TEXTO}
          value={valor}
          onChange={(e) => cambiar(typeof valor === 'number' ? Number(e.target.value) : e.target.value)}
        />
      </label>
    );
  if (Array.isArray(valor))
    return (
      <div className="campos grupo">
        <span className="grupo-titulo">{titulo}</span>
        {valor.map((v, i) => (
          <Campos
            key={i}
            valor={v}
            ruta={`${ruta}.${i}`}
            cambiar={(n) => cambiar(valor.map((x, j) => (j === i ? n : x)))}
          />
        ))}
      </div>
    );
  if (valor && typeof valor === 'object')
    return (
      <div className="campos">
        {Object.entries(valor)
          .filter(([k]) => !['id', 'dept', 'motor', 'icon', 'tipo'].includes(k))
          .map(([k, v]) => (
            <Campos key={k} valor={v} ruta={`${ruta}.${k}`} cambiar={(n) => cambiar({ ...valor, [k]: n })} />
          ))}
      </div>
    );
  return null;
}
function App() {
  const [llave, setLlave] = useState(() => sessionStorage.getItem('panel-llave') ?? '');
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);
  const [base, setBase] = useState<Entrada | null>(null),
    [borrador, setBorrador] = useState<Entrada | null>(null);
  const [seccion, setSeccion] = useState<Seccion>('lugares');
  const [mensaje, setMensaje] = useState(''),
    [ocupado, setOcupado] = useState(false),
    [sucio, setSucio] = useState(false);
  async function cargar(id?: string) {
    if (!cliente) throw new Error('Configurá CONVEX_URL o VITE_CONVEX_URL antes de iniciar el panel.');
    const c = await cliente.query(ultima);
    if (!c) throw new Error('Primero subí el catálogo con pnpm catalogo:subir.');
    const d = c.departamentos.find((d) => d.deptId === id) ?? c.departamentos[0];
    setCatalogo(c);
    setBase(d);
    setBorrador(structuredClone(d));
    setSucio(false);
  }
  async function ejecutar(fn: () => Promise<void>) {
    setOcupado(true);
    setMensaje('');
    try {
      await fn();
    } catch (e) {
      setMensaje(e instanceof Error ? e.message : 'No se pudo conectar. Intentá de nuevo.');
    } finally {
      setOcupado(false);
    }
  }
  const filas = borrador
    ? seccion === 'turismo' || seccion === 'locuras'
      ? borrador.datos.editorial[seccion]
      : borrador.datos.catalogo[seccion]
    : [];
  function editar(i: number, v: unknown) {
    if (!borrador || !v || typeof v !== 'object') return;
    const copia = structuredClone(borrador);
    const destino =
      seccion === 'turismo' || seccion === 'locuras' ? copia.datos.editorial[seccion] : copia.datos.catalogo[seccion];
    Object.assign(destino[i], v);
    setBorrador(copia);
    setSucio(true);
  }
  return (
    <>
      <header>
        <div className="marca">MC</div>
        <div>
          <small>MUNDO CATRUCHO</small>
          <h1>Panel de contenido</h1>
        </div>
        <span className="insignia">{catalogo ? `Publicación v${catalogo.version}` : 'Acceso privado'}</span>
      </header>
      {!catalogo ? (
        <main className="entrada">
          <small>HECHO EN HONDURAS</small>
          <h2>El contenido, en tus manos.</h2>
          <p>Editá los departamentos y publicá los cambios sin compilar el juego.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void ejecutar(async () => {
                if (!cliente) throw new Error('Falta CONVEX_URL.');
                await cliente.query(entrar, { llave });
                sessionStorage.setItem('panel-llave', llave);
                await cargar();
              });
            }}
          >
            <label>
              Llave de administrador
              <input
                type="password"
                autoComplete="off"
                data-testid="llave"
                required
                value={llave}
                onChange={(e) => setLlave(e.target.value)}
              />
            </label>
            <button type="submit" disabled={ocupado} data-testid="entrar">
              Entrar al panel
            </button>
          </form>
          <p className="ayuda">La llave dura solo en esta pestaña. Con Clerk (MC-07) se reemplaza por roles.</p>
        </main>
      ) : (
        <main className="editor">
          <aside>
            <small>LOS 18 DEPARTAMENTOS</small>
            <label>
              Departamento
              <select
                data-testid="departamento"
                disabled={ocupado}
                value={borrador?.deptId}
                onChange={(e) => {
                  const d = catalogo.departamentos.find((d) => d.deptId === e.target.value);
                  if (d && (!sucio || confirm('Tenés cambios sin publicar. ¿Querés descartarlos?'))) {
                    setBase(d);
                    setBorrador(structuredClone(d));
                    setSucio(false);
                  }
                }}
              >
                {catalogo.departamentos.map((d) => (
                  <option key={d.deptId} value={d.deptId}>
                    {d.datos.departamento.name}
                  </option>
                ))}
              </select>
            </label>
            <nav>
              {secciones.map((s) => (
                <button
                  type="button"
                  key={s}
                  aria-pressed={seccion === s}
                  data-testid={`seccion-${s}`}
                  onClick={() => setSeccion(s)}
                >
                  {s}
                </button>
              ))}
            </nav>
            <p className="ayuda">Una mecánica nueva requiere código. Los motores y los ids se conservan.</p>
            <button
              type="button"
              onClick={() => {
                sessionStorage.removeItem('panel-llave');
                setLlave('');
                setCatalogo(null);
              }}
            >
              Salir del panel
            </button>
          </aside>
          <section>
            <div className="titulo">
              <div>
                <small>{borrador?.datos.departamento.name}</small>
                <h2>{seccion}</h2>
              </div>
              <span>{filas.length} elementos</span>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void ejecutar(async () => {
                  if (!cliente || !base || !borrador) return;
                  validarEdicion(
                    base,
                    borrador,
                    catalogo.departamentos.map((d) => d.deptId),
                  );
                  await cliente.mutation(guardar, { llave, version: catalogo.version, departamento: borrador });
                  await cargar(borrador.deptId);
                  setMensaje('Publicación lista. El juego la lee al iniciar.');
                });
              }}
            >
              <fieldset disabled={ocupado}>
                {filas.map((fila, i) => {
                  const valor =
                    seccion === 'lugares'
                      ? { name: 'name' in fila ? fila.name : '', nota: 'nota' in fila ? fila.nota : '' }
                      : seccion === 'juegos'
                        ? Object.fromEntries(
                            Object.entries(fila).filter(([k]) =>
                              ['name', 'desc', 'guino', 'etapas', 'tema'].includes(k),
                            ),
                          )
                        : Object.fromEntries(
                            Object.entries(fila).filter(
                              ([k]) => !['id', 'lugar', 'tipo'].includes(k) || seccion === 'comidas',
                            ),
                          );
                  return (
                    <article key={i}>
                      <h3>
                        {i + 1}.{' '}
                        {'name' in fila
                          ? String(fila.name)
                          : 'nombre' in fila
                            ? String(fila.nombre)
                            : 'dice' in fila
                              ? String(fila.dice)
                              : seccion}
                      </h3>
                      <Campos valor={valor} ruta={`${seccion}.${i}`} cambiar={(v) => editar(i, v)} />
                    </article>
                  );
                })}
                <footer>
                  <span>{sucio ? 'Tenés cambios sin publicar' : 'Estás viendo la versión publicada'}</span>
                  <button type="submit" data-testid="publicar" disabled={!sucio}>
                    Publicar cambios
                  </button>
                </footer>
              </fieldset>
            </form>
            <div className="acciones">
              <button
                type="button"
                disabled={ocupado}
                onClick={() =>
                  void ejecutar(async () => {
                    await cargar(borrador?.deptId);
                    setMensaje('Catálogo recargado.');
                  })
                }
              >
                Recargar catálogo
              </button>
              <button
                type="button"
                data-testid="deshacer"
                disabled={ocupado || sucio}
                onClick={() => {
                  if (confirm('¿Querés volver a la publicación anterior?'))
                    void ejecutar(async () => {
                      if (!cliente) return;
                      await cliente.mutation(deshacer, { llave, version: catalogo.version });
                      await cargar(borrador?.deptId);
                      setMensaje('Se restauró la publicación anterior.');
                    });
                }}
              >
                Deshacer última publicación
              </button>
            </div>
          </section>
        </main>
      )}
      {mensaje && (
        <div role="status" data-testid="mensaje" className="mensaje">
          {mensaje}
        </div>
      )}
    </>
  );
}
const root = document.getElementById('root');
if (root)
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
