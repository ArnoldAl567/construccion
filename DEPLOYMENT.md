# Despliegue de ConstructControl

El repositorio se despliega como dos servicios conectados:

- `construccion_frontend`: Angular en Vercel.
- `construccion_backend`: Laravel y PostgreSQL en Render.

## 1. Crear el backend en Render

1. Genera una clave de Laravel desde `construccion_backend`:

   ```powershell
   php artisan key:generate --show
   ```

2. En Render selecciona **New > Blueprint** y conecta el repositorio de GitHub.
3. Render detectara `render.yaml` y creara el servicio web y PostgreSQL.
4. Completa las variables solicitadas:

   - `APP_KEY`: la clave generada en el primer paso, incluido el prefijo `base64:`.
   - `APP_URL`: la URL HTTPS asignada al backend, sin `/api/v1`.
   - `CORS_ALLOWED_ORIGINS`: la URL HTTPS exacta del frontend. Se pueden indicar varias separadas por comas.

El contenedor ejecuta las migraciones pendientes antes de iniciar Apache. La comprobacion de salud queda disponible en `APP_URL/up`.

> El plan gratuito de PostgreSQL en Render expira a los 30 dias. Antes de registrar informacion real cambia la base de datos a `basic-256mb` o un plan superior.

## 2. Crear el frontend en Vercel

1. Importa el mismo repositorio en Vercel.
2. Define **Root Directory** como `construccion_frontend`.
3. Vercel detectara Angular y leera `vercel.json`.
4. Crea la variable de entorno para Production y Preview:

   ```text
   API_URL=https://TU-BACKEND.onrender.com/api/v1
   ```

5. Inicia el despliegue.

Cuando Vercel asigne la URL definitiva, vuelve a Render y actualiza `CORS_ALLOWED_ORIGINS`. Por ejemplo:

```text
https://construct-control.vercel.app
```

## 3. Base de datos inicial

La base de datos nueva empieza vacia. Crea la primera cuenta desde la pantalla de registro del login. No ejecutes `php artisan db:seed` sobre una base con informacion real porque el seeder de demostracion reinicia las tablas.

## 4. Verificacion

Comprueba lo siguiente:

1. `https://TU-BACKEND.onrender.com/up` responde correctamente.
2. El registro y el inicio de sesion funcionan desde la URL de Vercel.
3. Al recargar `/dashboard`, `/obras` o `/planillas`, Vercel mantiene la vista.
4. Las peticiones en el navegador apuntan a la URL HTTPS de Render y no a `127.0.0.1`.
