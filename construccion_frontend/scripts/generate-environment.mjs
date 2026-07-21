import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const localApiUrl = 'http://127.0.0.1:8000/api/v1';
const configuredApiUrl = process.env['API_URL']?.trim() || localApiUrl;

if (!/^https?:\/\//i.test(configuredApiUrl)) {
  throw new Error('API_URL debe ser una URL HTTP o HTTPS valida.');
}

const apiUrl = configuredApiUrl.replace(/\/+$/, '');
const currentDirectory = dirname(fileURLToPath(import.meta.url));
const target = resolve(currentDirectory, '../src/environments/environment.generated.ts');
const source = `// Este archivo se actualiza automaticamente antes de iniciar, compilar o probar la aplicacion.\nexport const environment = Object.freeze({\n  apiUrl: ${JSON.stringify(apiUrl)},\n});\n`;

mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, source, 'utf8');

console.log(`API configurada para ${apiUrl}`);
