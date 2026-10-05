import { createDistServer } from "./lib/dist-server";
const port = Number(process.env.ELE_PREVIEW_PORT ?? 4173);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error("Niepoprawny port podglądu.");
const server = createDistServer("dist");
server.listen(port, "127.0.0.1", () =>
  console.log(`Gotowy dist: http://127.0.0.1:${port}/ele/`),
);
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => server.close(() => process.exit(0)));
