# Plan de evolución de DARK IA — versión 1.0

## Objetivo y alcance

Mantener y mejorar la aplicación existente, con cliente estático, servidor Express, catálogo de modelos gratuitos de OpenRouter y Studio de programación. Esta actualización retira el inicio de sesión con Google y permite abrir directamente como invitado. Los chats, preferencias y proyectos se guardan localmente, separados por un identificador aleatorio guardado en el perfil actual del navegador; no se sincronizan entre navegadores ni dispositivos.

El identificador local separa espacios de almacenamiento, pero no autentica a una persona. Quien tenga acceso al mismo perfil del navegador puede leer sus conversaciones y borrar los datos del sitio puede eliminarlas. No se usa almacenamiento de chats en el servidor ni existe una API para consultar historiales. El texto de los mensajes sí llega al backend y se envía a OpenRouter cuando se requiere una respuesta de modelo; si «Fuentes en vivo» está activado, la consulta también usa APIs públicas de GitHub y Stack Overflow. La aplicación informa esos límites y no promete privacidad de una cuenta ni gratuidad ilimitada.

Los historiales locales anteriores no se importan al nuevo espacio invitado. El repositorio DARK_IA sigue siendo público; la privacidad local de las conversaciones no oculta el código fuente.

## Diseño

Se conserva el lenguaje visual cyberpunk premium negro/rojo del producto y se lo refina con navegación compacta tipo centro de control, tarjetas de acción y microestados claros. La referencia a Manus 2.0 Max se limita a una jerarquía limpia y controles pulidos; no se copian marca, logotipo ni recursos. Principios: legibilidad primero, rojo para acciones y estados, privacidad/estado visibles y diseño táctil adaptable. El área central prioriza conversación y compositor; la barra lateral agrupa chats, Studio y ajustes. Animaciones breves respetan `prefers-reduced-motion`. Se mantiene tipografía sans del sistema con mono para código. La marca propia conserva la D geométrica roja; esencia: asistente técnico directo, personalizable y honesto; rasgos: firme, útil y verificable. Microcopy: «Tus chats, en este navegador.» y «El modelo usado aparece en cada respuesta.»

## Enfoque de implementación

1. Mantener `server.js`, API, pruebas, interfaz y Studio; eliminar rutas/middleware y dependencias de Google OAuth, sesiones y PostgreSQL que solo daban servicio al login o a chats remotos.
2. Abrir la interfaz sin pantalla de autenticación. Exponer el espacio como invitado, generar un identificador aleatorio persistente por perfil de navegador y usarlo para separar claves locales de chats, preferencias y datos del Studio. No importar historiales previos ni leer datos de otros espacios.
3. Mantener las rutas públicas de chat y búsqueda con límites por IP. La API no crea, sincroniza ni expone historiales. Responder al saludo literal «hola» sin proveedor; para otras solicitudes informar claramente si falta `OPENROUTER_API_KEY`.
4. Cada conversación conserva el modelo con que fue creada; cambiar modelo abre un chat nuevo. La respuesta muestra el identificador real devuelto por OpenRouter, que puede diferir del router elegido.
5. Personalidad y nivel de emojis se validan con listas permitidas en backend. El mensaje compuesto únicamente por «hola» (ignorando mayúsculas y espacios exteriores) recibe exactamente: `Hola soy una IA creada por vip modifier un creador de aplicaciones para el rendimiento no tan conocido`.
6. Mantener solo modelos que el proveedor etiqueta con costo cero; no añadir fallbacks a modelos pagos. `OPENROUTER_API_KEY` sigue siendo necesaria para inferencia externa. Las opciones gratuitas pueden tener cuotas, disponibilidad y rendimiento variables.
7. Fuentes opcionales: consultar GitHub REST (repositorios públicos) y Stack Exchange API (preguntas de Stack Overflow), limitar resultados, validar URLs HTTPS y delimitar los datos como contenido externo no confiable. Las consultas pueden compartir el texto del usuario con dichos servicios.
8. Mantener Studio y sus límites; proyectos e instantáneas siguen locales en el perfil de navegador y no constituyen una copia en nube.
9. Verificar sintaxis, pruebas HTTP, interfaz sin Google, ausencia de rutas de chat remoto y que el backend no revele ni requiera credenciales de identidad. Publicar en el repositorio DARK_IA de GitHub autorizado; no afirmar que se actualizó el despliegue de Render si no se publicó allí.

## Decisiones técnicas, dependencias y límites

- Reutilizar Node.js 20+, Express 4 y el frontend estático. Mantener como dependencias de producción únicamente módulos necesarios para el servidor, validador y proveedor IA.
- Las claves de proveedor se mantienen solo en servidor. La lista de modelos es una allowlist; cualquier modelo fuera de ella se rechaza.
- Variables del backend: `PORT`, `NODE_ENV`, `TRUST_PROXY_HOPS` y `OPENROUTER_API_KEY`. No se requieren variables Google, secretos de sesión ni `DATABASE_URL` para el modo invitado.
- `localStorage` no está cifrado. La separación por ID aleatorio reduce mezclas accidentales de claves, no protege contra otros usuarios del mismo perfil del navegador ni contra software local con acceso a él.
- La aplicación no sincroniza historiales entre dispositivos ni ofrece restauración de chats. Sin OpenRouter configurado, solo están disponibles las funciones que no requieren inferencia externa, incluido el saludo exacto.
- El repositorio `DARK_IA` es público. No afirmar que se puede ocultar su código con el modo invitado; un cambio de visibilidad requeriría autorización específica.

## Estructura del proyecto

```text
server.js                  # Express, endpoints públicos, límites, validación y proveedor IA
src/code-validator.js      # análisis sintáctico sin ejecutar código
src/chat-policy.js         # preferencias permitidas y saludo exacto
src/models.js              # catálogo y filtrado de modelos gratuitos
src/search.js              # consultas limitadas a GitHub y Stack Overflow
public/index.html          # estructura de chat invitado, ajustes y Studio
public/app.js              # espacio local, chats, preferencias, modelos y fuentes
public/styles.css          # sistema visual propio y adaptación móvil
test/                      # pruebas unitarias y HTTP de API/interfaz
 docs/INTEGRATIONS.md      # modo invitado, claves y límites operativos
```

El cambio es incremental. No se incluyen ejecución de código de usuario, scraping de páginas, fallback a modelos pagos, almacenamiento remoto de chats ni sincronización entre dispositivos.
