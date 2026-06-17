import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

// Forzamos a Drizzle a leer el archivo .env
dotenv.config({ path: '.env' });

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    // Usamos el ! al final para decirle a TypeScript que estamos seguros de que existe
    url: process.env.DATABASE_URL!,
  },
});