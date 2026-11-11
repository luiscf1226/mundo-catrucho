export function LoadingScreen() {
  return (
    <div
      data-testid="scene-loading"
      role="status"
      className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-slate-950/95 text-white"
    >
      <div className="text-center">
        <div className="mb-3 text-4xl">🇭🇳</div>
        <p className="text-xl font-bold">Ya casi…</p>
        <p>Estamos preparando tu destino.</p>
      </div>
    </div>
  );
}
