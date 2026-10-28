import "dotenv/config";
import { createCapServer } from "./app";

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";

const bundle = createCapServer();

bundle.httpServer.listen(port, host, () => {
  console.log(`[cap] listening on http://localhost:${port}`);
  console.log(`[cap] environment: ${process.env.NODE_ENV ?? "development"}`);
});

let shuttingDown = false;

function shutdown(signal: string): void {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[cap] ${signal} received, shutting down`);
  bundle.manager.stop();
  bundle.io.close();
  bundle.httpServer.close(() => {
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 4000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("unhandledRejection", (reason) => {
  console.error("[cap] unhandled rejection", reason);
});
