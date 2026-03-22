/**
 * Vercel serverless does not always load .env.local / VITE_* vars the same as Vite.
 * Load project root env files so local `vercel dev` picks up your keys.
 */
import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// Later files do not override earlier keys by default; we want .env then .env.local to win
config({ path: resolve(root, '.env') });
config({ path: resolve(root, '.env.local'), override: true });
