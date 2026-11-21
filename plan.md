# Plan de evolución de DARK IA — versión 1.0

## Objetivo y alcance

Ampliar la aplicación existente (cliente estático, Express, OpenRouter y Studio) sin reemplazar las capacidades ya probadas. Esta iteración añade una experiencia visual más cuidada, ajustes de personalidad y emojis, atribución visible del modelo elegido y realmente usado, saludo exacto solicitado y búsqueda opcional en APIs públicas de GitHub y Stack Overflow.

La privacidad requiere autenticación OAuth real, sesión verificada en el servidor y persistencia con autorización por propietario en cada consulta. Se implementará el flujo de Google y el esquema de datos con cierre seguro: si faltan `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `SESSION_SECRET` o `DATABASE_URL`, el frontend solo mostrará que el acceso todavía no está configurado y no abrirá el chat ni leerá el historial antiguo de `localStorage`. Se documentará la configuración requerida. No se presentará el login como operativo ni se podrá probar la separación entre usuarios hasta disponer de credenciales y PostgreSQL persistente.

Los historiales, proyectos y preferencias antiguos de `localStorage` no se importan: anteriormente podían pertenecer al usuario del dispositivo y mezclarlos con una identidad sería inseguro. Las preferencias y proyectos locales nuevos se guardan bajo claves por ID de cuenta. Las conversaciones serán remotas y propiedad del usuario autenticado. El código fuente del repositorio continúa siendo público; la privacidad de chats no oculta el código del repositorio.

## Diseño

Se conserva el lenguaje visual cyberpunk premium negro/rojo del producto y se lo refina con una navegación compacta tipo centro de control, tarjetas de acción y microestados claros. La referencia a Manus 2.0 Max se limita a una jerarquía limpia y controles pulidos; no se copiarán su marca, logotipo ni recursos. Principios: legibilidad primero, rojo para acciones y estados, privacidad/estado de conexión visibles, y diseño táctil adaptable. El área central prioriza conversación y compositor; la barra lateral agrupa chats, Studio y ajustes. Animaciones breves respetan `prefers-reduced-motion`. Se mantiene tipografía sans del sistema con mono para código. La marca propia conserva la D geométrica roja; esencia: asistente técnico directo, personalizable y honesto; rasgos: firme, útil y verificable. Microcopy: «Tu espacio, tus conversaciones.» y «El modelo usado aparece en cada respuesta.»

## Enfoque de implementación

1. Mantener el punto de entrada `server.js`, pruebas, endpoints existentes y Studio, actualizar el plan/ToDo y preservar cambios anteriores.
2. Autenticación Google con flujo Authorization Code/OIDC, `state` y `nonce` aleatorios, intercambio de código desde el servidor y verificación del ID token con la biblioteca oficial de Google. Rotar sesión tras el login, cookies HTTP-only con `Secure; SameSite=None` para HTTPS mediante `COOKIE_SECURE`/producción y `Lax` solo para HTTP local, token CSRF para mutaciones. En caso de configuración parcial o ausencia de DB, cerrar el acceso; no crear modo de demostración que simule identidad.
3. Persistencia en PostgreSQL de usuarios Google y conversaciones. La sesión usa `connect-pg-simple`. API de chats para listar/crear/actualizar/borrar; todas las consultas restringen por el ID obtenido de la sesión, nunca por un ID de propietario recibido del cliente. `GET /api/me` expone únicamente perfil básico y estado/configuración, y devuelve token CSRF. Sin configuración, la app responde cerrado con 503; una sesión no autenticada recibe 401 cuando OAuth está configurado. Sin despliegue con credenciales/DB no se afirmará aislamiento probado.
4. Frontend con portada de inicio de sesión, estados auténticos de configuración, perfil/cierre de sesión, experiencia oscura de calidad, selector de modelo, preferencias y cambios de cuenta. Cada chat conserva el modelo con que fue creado; cambiar el modelo inicia un chat nuevo. La respuesta muestra el modelo real devuelto por OpenRouter, que puede diferir del router seleccionado.
5. Personalidad y nivel de emojis se validan con listas permitidas en backend y se incorporan como instrucciones al prompt. Para un mensaje compuesto únicamente por «hola» (ignorando mayúsculas y espacios exteriores), el servidor devuelve exactamente: `Hola soy una IA creada por vip modifier un creador de aplicaciones para el rendimiento no tan conocido`.
6. Modelos: eliminar del catálogo expuesto las opciones que pueden tener costo. Mantener `openrouter/free` como selección de costo cero, con aviso visible de cuotas, disponibilidad y rendimiento variables. No usar fallbacks a modelos de pago ni ofrecer acceso gratuito que eluda tarifas. La llamada a inferencia continúa requiriendo `OPENROUTER_API_KEY` del titular del despliegue.
7. Fuentes: búsqueda opcional desde el servidor contra GitHub REST (búsqueda de repositorios públicos) y Stack Exchange API (preguntas de Stack Overflow); validar longitud, timeout, tamaño, cuotas y URLs de salida. Mostrar resultados con título, fragmento/metadata, dominio y enlace. Solo se incorpora a la solicitud IA cuando el usuario activa la opción; se delimita como contenido externo no confiable. Los resultados no garantizan verdad y su disponibilidad/cuota pertenece a los proveedores.
8. Mantener el Studio previo y sus límites; al iniciar sesión, almacenar su estado y preferencias con clave por usuario en el dispositivo. El Studio todavía no es una copia en nube ni cuenta con el aislamiento durable de la base de datos.
9. Verificar sintaxis, pruebas HTTP/seguridad y ausencia de filtración de información. Probar el flujo completo multiusuario solo cuando el usuario configure OAuth y PostgreSQL. Revisar los cambios y sincronización GitHub autorizados, sin exponer secretos.

## Decisiones técnicas, dependencias y límites

- Reutilizar Node.js 20+, Express 4 y el frontend estático. Añadir `express-session`, `connect-pg-simple`, `pg` y `google-auth-library`; crear el esquema SQL idempotente durante el arranque seguro de `src/auth.js`.
- Mantener claves de proveedor solo en servidor. La lista de modelos es una allowlist y cualquier elemento fuera de ella se rechaza.
- Variables de autenticación necesarias: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `SESSION_SECRET` (mínimo 32 bytes aleatorios) y `DATABASE_URL` persistente; configurar en Google Cloud el callback exacto y un origen HTTPS de producción. Proveer secretos en el host del despliegue, no en Git. Para inferencia: `OPENROUTER_API_KEY`. Las llamadas a GitHub/Stack Overflow usan APIs públicas, por tanto quedan sujetas a sus cuotas y disponibilidad.
- No se guarda sesión ni conversación en el sistema de archivos efímero. No se migra el historial preexistente. Un error de DB o sesión nunca cae a almacenamiento sin aislar.
- El repositorio `DARK_IA` es público. No afirmar que se puede esconder su código con OAuth; un cambio de visibilidad requeriría autorización específica.
- La prueba local de esta iteración no puede validar el acceso real Google, cookies en hosting ni privacidad entre dos cuentas mientras no se configuren los proveedores y la base persistente.

## Estructura del proyecto

```text
server.js                  # Express, endpoints, OAuth, validación y proveedor IA
src/code-validator.js      # análisis sintáctico sin ejecutar código
src/auth.js                # helpers de sesión, Google OIDC, CSRF y usuario actual
src/chat-policy.js         # preferencias permitidas y saludo exacto
src/models.js              # catálogo y filtrado de modelos gratuitos
src/search.js              # consultas limitadas a GitHub y Stack Overflow
public/index.html          # puerta de acceso y estructura de chat/ajustes/Studio
public/app.js              # cuenta, chats remotos, preferencias, modelos y fuentes
public/styles.css          # sistema visual propio y adaptación móvil
test/                      # pruebas unitarias y HTTP; OAuth/DB externa condicionada
docs/INTEGRATIONS.md       # variables, configuración y límites operativos
```

El nuevo soporte debe ser incremental. No se incluyen ejecución de código de usuario, bases de datos efímeras, scraping de páginas, fallback a modelos pagos ni almacenamiento local compartido.
