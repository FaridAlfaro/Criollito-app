export function PosLoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center bg-background text-foreground">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="font-semibold text-muted-foreground">Cargando módulo POS...</p>
      </div>
    </div>
  );
}
