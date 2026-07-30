import { env } from "./config/env.js";
import { connectDatabase } from "./config/database.js";
import { createApp } from "./app.js";

async function bootstrap() {
  await connectDatabase();

  const app = createApp();

  app.listen(env.PORT, () => {
    console.log(`Backend API listening on port ${env.PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error("Backend failed to start", error);
  process.exit(1);
});

