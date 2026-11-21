# DARK IA 1.0

Asistente web con cliente estático y API Express. Incluye inicio de sesión Google/OIDC, sesiones y chats PostgreSQL por propietario, ajustes de estilo, selector dinámico de modelos de precio cero y búsqueda opcional en GitHub público y Stack Overflow. No se deben considerar activos los servicios privados hasta configurar las credenciales y realizar las pruebas de despliegue.

## Ejecutar localmente

Requiere Node.js 20 o superior y PostgreSQL persistente accesible. Ejecuta `npm ci`, copia `.env.example` a `.env` y configura los valores del documento [Integraciones](docs/INTEGRATIONS.md). Registra `http://localhost:3000/auth/google/callback` como callback local exacto del cliente OAuth de Google. Configura `SESSION_SECRET` con al menos 32 bytes aleatorios. Luego ejecuta `npm start` y abre `http://localhost:3000`.

Sin credenciales válidas de Google y PostgreSQL, la aplicación muestra solo la pantalla de acceso y no abre el chat. Sin `OPENROUTER_API_KEY`, no se generan respuestas de modelo, aunque el saludo literal «hola» sigue siendo una respuesta local exacta. Nunca pongas claves reales en el frontend o en Git.

Comprobaciones: `npm test`, `node --check server.js` y `npm audit --omit=dev`. `TRUST_PROXY_HOPS` debe corresponder al número real de proxies confiables del host; usa cero en conexión local directa y no confíes en cabeceras reenviadas por clientes no confiables.

## Chats, privacidad y datos locales

Los chats se guardan en PostgreSQL bajo el ID obtenido de la sesión del servidor. Las consultas de lectura y modificación están limitadas al propietario; el cliente no puede indicar un `userId` para seleccionar otra cuenta. Los endpoints de API no permiten caché compartida. El historial local compartido anterior no se importa.

Las preferencias, proyectos y archivos del Studio aún se guardan en `localStorage` por ID de cuenta en el navegador; no se sincronizan con otros dispositivos y no tienen almacenamiento remoto durable. Consulta [Integraciones](docs/INTEGRATIONS.md) antes de subir o almacenar datos sensibles.

## Modelos y fuentes

El catálogo expone `openrouter/free` y variantes `:free` con precio cero en entrada y salida. No incluye modelos de pago ni fallback de pago. Las cuotas y disponibilidad de proveedores gratuitos pueden cambiar, y OpenRouter requiere una clave de servidor para inferencia.

Cuando se activa «Fuentes en vivo», el servidor consulta GitHub REST para repositorios públicos y Stack Overflow API. Muestra resultados enlazados de esos dominios, con límite y timeout. No es búsqueda general de internet ni acceso a GitHub privado; los resultados no se consideran automáticamente ciertos. Referencias y límites: [Fuentes y modelos](docs/SOURCES_AND_MODELS.md).

El repositorio DARK_IA es público en GitHub. OAuth protege los datos de cuenta cuando se configura correctamente, pero no oculta el código fuente público ni convierte el repositorio en privado.
