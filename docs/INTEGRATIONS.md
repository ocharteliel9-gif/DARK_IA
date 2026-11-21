# Configuración e integraciones de DARK IA 1.0

El código incluye un flujo real de acceso Google, sesiones PostgreSQL y chats asociados al propietario autenticado. Estas funciones permanecen cerradas hasta configurar el proveedor y la base de datos. No se incluyen credenciales ni una instancia PostgreSQL en este repositorio; no declares privacidad de producción hasta completar la configuración y probar dos cuentas distintas.

## Google OAuth y callback

Crea un cliente OAuth de tipo **Web application** en Google Cloud. Registra el origen público de la aplicación y el URI de redirección exacto. El callback implementado es:

```text
https://TU-DOMINIO/auth/google/callback
```

En desarrollo local, el URI normalmente será `http://localhost:3000/auth/google/callback`. Registra exactamente el mismo valor en Google Cloud y en `GOOGLE_REDIRECT_URI`; esquema, host, puerto y ruta deben coincidir. No registres callbacks HTTP públicos.

El servidor pide `openid`, `email` y `profile`; valida `state`, verifica el ID token y el `nonce`, exige correo verificado, rota la sesión después del login y emite un token CSRF para las mutaciones. La sesión utiliza cookie HTTP-only y el store de PostgreSQL. En producción, o con `COOKIE_SECURE=true`, usa `Secure` y `SameSite=None` para HTTPS/Preview; en desarrollo HTTP local se mantiene `SameSite=Lax` sin `Secure`. En despliegues tras un proxy, configura correctamente `TRUST_PROXY_HOPS` para el número de proxies confiables.

## Variables del servidor

Suministra valores como variables de entorno del proceso o del gestor de secretos del despliegue. Nunca los pongas en HTML, JavaScript del navegador, commits o capturas.

```dotenv
PORT=3000
NODE_ENV=production
TRUST_PROXY_HOPS=1
COOKIE_SECURE=true
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://TU-DOMINIO/auth/google/callback
SESSION_SECRET=
DATABASE_URL=postgresql://USUARIO:CONTRASENA@HOST:5432/BASE
OPENROUTER_API_KEY=
```

`SESSION_SECRET` debe contener al menos 32 bytes impredecibles. Puedes generar un valor localmente con `openssl rand -base64 48`; guárdalo únicamente en el entorno del servidor. `DATABASE_URL` debe ser de una base PostgreSQL persistente y accesible desde el proceso. Comprueba TLS, ACL/red, rotación de contraseña, cuota, respaldo y política de retención con el proveedor elegido.

El arranque ejecuta inicialización SQL idempotente desde `src/auth.js` para las tablas `darkia_users` y `darkia_chats`. `connect-pg-simple` crea su propia tabla de sesiones. La cuenta de DB requiere permisos para crear estas tablas e índices al arrancar y para leer/escribirlas después. Un fallo al inicializar la DB impide iniciar la aplicación en lugar de desactivar la autorización silenciosamente.

Si falta cualquier variable necesaria para OAuth/sesión/DB, `/api/me` informa que el acceso no está configurado, el botón de Google permanece deshabilitado y no se abre el chat. Los endpoints privados responden sin identidad válida. El acceso a los chats filtra por el ID guardado en la sesión del servidor; el cliente no puede elegir el propietario. Las respuestas API llevan `Cache-Control: no-store`.

## Datos y privacidad

Los chats se guardan en PostgreSQL y cada lectura, modificación y borrado está limitado al usuario de la sesión. Las sesiones vencen en ocho horas. Los chats locales existentes de la versión anterior no se importan; el cliente nunca lee la clave histórica compartida.

Los ajustes del asistente, archivos del Studio e instantáneas del proyecto todavía se guardan únicamente en `localStorage`, con claves nuevas por ID de cuenta en este navegador. No se sincronizan entre dispositivos y no están protegidos por PostgreSQL; cierran al salir de la cuenta, pero siguen siendo datos locales del dispositivo. No subas información sensible al Studio en un dispositivo compartido.

El inicio/cierre de sesión, el aislamiento de dos cuentas y el comportamiento de cookies deben probarse en el dominio final con OAuth y PostgreSQL reales. No se ha ejecutado esa prueba mientras falten las credenciales y el servicio de base de datos.

## Modelos e inferencia

`OPENROUTER_API_KEY` es necesaria para respuestas de modelos externos. `/api/models` expone `openrouter/free` y variantes `:free` cuya entrada y salida indican precio cero en el catálogo consultado; no expone modelos de pago ni usa fallback a modelos pagados. El catálogo se actualiza con caché y, si OpenRouter no responde, conserva modelos gratuitos previamente obtenidos o muestra el router gratuito.

La disponibilidad, cuota, velocidad y capacidad de las opciones gratuitas pueden variar por modelo/proveedor; una etiqueta de precio cero no garantiza cupo ni respuesta. El modelo elegido queda asociado al chat; la respuesta muestra el identificador devuelto por OpenRouter, que puede diferir si se eligió `openrouter/free`. El saludo literal solicitado se responde localmente y se identifica expresamente como respuesta sin modelo externo.

## Búsqueda opcional de fuentes

Cuando «Fuentes en vivo» está activado, el servidor consulta la API pública de búsqueda de repositorios de GitHub y la API de Stack Overflow. El máximo es tres resultados por fuente, con timeout y límite por IP. Las búsquedas se hacen con texto del mensaje y se comparten con esos proveedores. Solo se aceptan enlaces HTTPS de `github.com` y `stackoverflow.com`; los resultados se enlazan y se tratan como contenido externo no confiable. No es una búsqueda universal de internet ni accede a repositorios privados. Las fuentes públicas pueden fallar, imponer cuotas o devolver resultados incorrectos.

Más detalles y referencias oficiales en [SOURCES_AND_MODELS.md](./SOURCES_AND_MODELS.md).
