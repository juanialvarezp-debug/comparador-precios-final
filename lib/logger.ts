export function logLine(msg: string) {
  const line = `${new Date().toISOString()}  ${msg}`;
  console.log(line);
  // No escribimos a archivo en producción (Vercel) para evitar errores de permisos
}
