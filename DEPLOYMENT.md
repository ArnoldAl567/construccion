# Despliegue de ConstructControl

El repositorio se despliega como dos servicios conectados:

- `construccion_frontend`: Angular en Vercel.
- `construccion_backend`: Laravel en Render, conectado a una base PostgreSQL exclusiva en Neon.

## 1. Crear el backend en Render

1. Genera una clave de Laravel desde `construccion_backend`:

   ```powershell
   php artisan key:generate --show
   ```

2. En Render selecciona **New > Blueprint** y conecta el repositorio de GitHub.
3. Render detectara `render.yaml` y creara el servicio web.
4. Completa las variables solicitadas:

   - `APP_KEY`: la clave generada en el primer paso, incluido el prefijo `base64:`.
   - `APP_URL`: la URL HTTPS asignada al backend, sin `/api/v1`.
   - `CORS_ALLOWED_ORIGINS`: la URL HTTPS exacta del frontend. Se pueden indicar varias separadas por comas.
   - `DB_URL`: la cadena de conexion de Neon, incluida la opcion `sslmode=require`.

No configures `DB_PREFIX`: ConstructControl usa una base Neon exclusiva y sus tablas no se mezclan con otros sistemas. El contenedor ejecuta las migraciones pendientes antes de iniciar Apache. La comprobacion de salud queda disponible en `APP_URL/up`.

> El plan gratuito de Neon puede suspender la base cuando no hay actividad, por lo que la primera peticion puede tardar algunos segundos. Para produccion critica configura copias de seguridad y evalua un plan con mayor disponibilidad.

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

En una instalacion nueva, el despliegue crea las tablas mediante las migraciones de Laravel. Crea la primera cuenta desde la pantalla de registro del login. No ejecutes `php artisan db:seed` sobre una base con informacion real porque el seeder de demostracion reinicia las tablas.

## 4. Verificacion

Comprueba lo siguiente:

1. `https://TU-BACKEND.onrender.com/up` responde correctamente.
2. El registro y el inicio de sesion funcionan desde la URL de Vercel.
3. Al recargar `/dashboard`, `/obras` o `/planillas`, Vercel mantiene la vista.
4. Las peticiones en el navegador apuntan a la URL HTTPS de Render y no a `127.0.0.1`.
