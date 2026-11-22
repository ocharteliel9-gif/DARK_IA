# Modo invitado e integraciones de DARK IA 1.0

DARK IA abre sin cuenta ni inicio de sesión con Google. Cada navegador crea un identificador aleatorio local y guarda sus conversaciones, preferencias, proyectos y ajustes en `localStorage` bajo claves separadas para ese perfil de navegador. No se sincronizan entre dispositivos ni se recuperan al borrar los datos del navegador. Las personas que compartan el mismo perfil del navegador pueden acceder a ese historial; no guardes allí información sensible.

El servidor no conserva ni ofrece una API para consultar chats. El contenido que se envía al asistente sí viaja al servidor y, cuando se usa un modelo externo, al proveedor de inferencia. El modo invitado no acredita la identidad de la persona. Las rutas públicas de chat y búsqueda usan límites por IP, pero esos límites no sustituyen una cuenta ni evitan todo abuso.

## Ejecutar localmente

Requiere Node.js 20 o superior. Ejecuta `npm ci`, copia `.env.example` a `.env` y configura `OPENROUTER_API_KEY` si deseas respuestas de modelos externos. Luego ejecuta `npm start` y abre `http://localhost:3000`.

La respuesta literal solicitada para el saludo «hola» se genera localmente sin proveedor externo. Para otras solicitudes, el servidor necesita `OPENROUTER_API_KEY`; sin ella informa el error y no inventa una respuesta. El catálogo solo expone `openrouter/free` y variantes `:free` con precio reportado cero; disponibilidad, cuota y rendimiento cambian según el proveedor y no se garantiza uso ilimitado.

El chat solicita respuestas progresivas cuando el proveedor admite Server-Sent Events (SSE). DARK IA muestra cada fragmento mientras llega, permite detener la generación y conserva el mensaje enviado y cualquier texto parcial si la conexión falla. Se mantiene la respuesta JSON para clientes antiguos y el saludo local.
El chat permite adjuntar una foto por solicitud en JPEG, PNG o WEBP. El original debe pesar como máximo 10 MiB y no exceder 16 megapíxeles ni 16.384 píxeles por lado; el navegador comprueba dimensiones desde la cabecera antes de decodificar, comprime a 600 KiB o menos y guarda el blob en IndexedDB local para poder volver a mostrarlo. No guarda Base64 en `localStorage` ni sincroniza fotos. Al enviar, el archivo pasa por el servidor a OpenRouter. Solo se admite un modelo gratuito cuyo catálogo declare `architecture.input_modalities` con `image`; `openrouter/free` puede enrutar según la modalidad solicitada, pero modelo y disponibilidad varían. La petición de inferencia sí comparte la foto con el proveedor.

## Variables del servidor

```dotenv
PORT=3000
NODE_ENV=production
TRUST_PROXY_HOPS=1
OPENROUTER_API_KEY=
```

`OPENROUTER_API_KEY` se configura únicamente como secreto del servidor, nunca en HTML, JavaScript del navegador, GitHub o este chat. En Render configura las variables en **Environment** y usa **Save and deploy** para aplicarlas. Ajusta `TRUST_PROXY_HOPS` al número de proxies confiables; Render normalmente requiere `1`, mientras una conexión HTTP local directa usa `0`.

## Privacidad y almacenamiento

Los chats y los datos de Studio se guardan solo en el navegador mediante `localStorage`, con un espacio aleatorio por perfil. Los blobs de fotos se guardan localmente en `IndexedDB`, no cifrados por DARK IA y bajo el mismo origen/perfil. La aplicación no importa el historial compartido de versiones antiguas. Cualquiera con acceso al mismo perfil puede leer los datos. Borrar datos del sitio o usar otro navegador/dispositivo puede hacer que conversaciones y fotos no estén disponibles. No hay recuperación de cuenta ni sincronización en la nube.

El backend no incluye endpoints de historial de chats ni autenticación de Google. Las respuestas de API incluyen `Cache-Control: no-store`. La clave de OpenRouter permanece en el servidor y los modelos publicados se limitan a opciones marcadas como gratuitas; una opción gratuita puede tener cuotas y disponibilidad limitadas.

## Búsqueda opcional de fuentes

Cuando «Fuentes en vivo» está activado, el servidor consulta las APIs públicas de búsqueda de repositorios de GitHub y Stack Overflow. Las consultas comparten el texto del mensaje con esos proveedores. Se limita a tres resultados por fuente, con timeout y límite por IP; solo se aceptan enlaces HTTPS de `github.com` y `stackoverflow.com`. No es búsqueda universal ni accede a repositorios privados. Los resultados externos pueden fallar o ser incorrectos.

Si la consulta menciona Brevent, DARK IA añade enlaces de referencia preseleccionados del [repositorio oficial](https://github.com/brevent/Brevent), sus [cadenas oficiales de ayuda](https://github.com/brevent/Brevent/blob/translation/brevent/src/main/res/values/strings.xml) y la [wiki de ejecución de comandos](https://github.com/brevent/Brevent/wiki/Exec-Command-via-Brevent-%28Since-2.6.6%29). La documentación describe la activación inicial del servidor con ADB y el uso de standby/force-stop en aplicaciones elegidas; no define una lista universal de comandos shell cotidianos para acelerar Android. DARK IA debe recomendar seguir el comando que la propia aplicación Brevent genera para el dispositivo y advertir que detener apps puede afectar notificaciones, sincronización, red o trabajos. No debe convertir issues antiguos ni comandos de terceros en recetas seguras.

El formato de visión se basa en la documentación de [OpenRouter Chat Completions](https://openrouter.ai/docs/api_reference/overview): partes de texto y `image_url` dentro del contenido del mensaje. La guía de [Image Inputs](https://openrouter.ai/docs/guides/overview/multimodal/image-understanding) documenta JPEG, PNG, WEBP y data URLs; la compatibilidad debe revisarse en `architecture.input_modalities` del [catálogo de modelos](https://openrouter.ai/docs/api/api-reference/models/list-all-models-and-their-properties). El [router gratuito](https://openrouter.ai/docs/guides/routing/routers/free-router) filtra por requisitos declarados, pero el conjunto de modelos es dinámico y no garantiza disponibilidad permanente.

Más detalles en [SOURCES_AND_MODELS.md](./SOURCES_AND_MODELS.md).
