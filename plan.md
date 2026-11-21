# Plan de evolución de DARK IA

## Objetivo y alcance

Transformar el DARK IA existente —cliente estático, servidor Express y proveedor OpenRouter— sin reemplazar lo que ya funciona. Implementar por etapas y validar cada capacidad con evidencia. No publicar botones ni anunciar flujos que requieran una API, credencial, servicio de almacenamiento o paquete del sistema que no esté efectivamente configurado.

El proyecto contiene hoy `server.js`, `public/index.html`, `public/app.js`, `public/styles.css` y `package.json`; los chats se guardan en `localStorage` del navegador. No hay infraestructura de cuentas, base de datos, carga de archivos ni pruebas automatizadas configuradas. Mantendremos el arranque actual (`npm start`) y la API existente mientras se modulariza el código.

## Diseño

**Movimiento:** interfaz de consola ciberpunk premium, oscura y de alto contraste. **Principios:** legibilidad primero; rojo como señal de acción, no como fondo invasivo; estados visibles y honestos; composición adaptable al móvil. **Paleta:** negro carbón, grises azulados y rojo neón propio, reservando rojo brillante para marca, CTA, foco y errores. **Distribución:** conversación ocupa el espacio principal; navegación de chats colapsable; compositor fijo y utilizable con teclado virtual; paneles secundarios accesibles sin cubrir mensajes. **Motivos:** halo rojo tenue alrededor del emblema, líneas finas como circuito y estados luminosos discretos. **Interacción:** respuestas, carga, error y cancelación con estados explícitos; sin botones decorativos. **Animación:** breve y reducida bajo `prefers-reduced-motion`; nada que retrase la lectura. **Tipografía:** sistema sans para texto y mono para código. **Esencia:** asistente de trabajo técnico, directo, privado y verificable; personalidad firme, útil y transparente. El logotipo conserva la “D” existente, rediseñada como marca geométrica roja.

## Enfoque de implementación

1. **Estabilizar y medir:** proteger archivos de entorno en Git, comprobar rutas, corregir regresiones y crear verificaciones automatizables para frontend/servidor. Preservar `/api/status`, `/api/modes` y `/api/chat` donde sea posible.
2. **Chat real y usable:** interfaz roja/negra adaptable; mantener chats y mensajes; selector de modelos solo para los modelos permitidos por el backend; Markdown/código seguro; estados de carga/error, reintento, detención y prevención de envíos duplicados. No descartar el mensaje del usuario si el proveedor falla. Los chats locales no se presentarán como cuenta sincronizada.
3. **Persistencia y cuentas:** separación por capas para autenticación Google, autorización en servidor, sesiones HTTP-only y almacenamiento persistente. La opción de producción requiere `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, URL/callback autorizados, una base PostgreSQL persistente (`DATABASE_URL`) y una clave de sesión. No habilitar login hasta que se configuren y validen esos valores. Todas las consultas deben derivar el propietario del usuario autenticado, nunca de un `userId` confiado desde el cliente.
4. **Contenido multimodal:** validar tipo, tamaño y contenido antes del procesamiento; archivos temporales, no ejecutables, limpieza garantizada y aislamiento por propietario al incorporar cuentas. Activar únicamente formatos cuyos extractores se instalen y prueben. Imágenes requieren un modelo OpenRouter compatible con visión. Video requiere procesamiento real de fotogramas/audio, herramientas del sistema y un modelo compatible; se documentarán sus límites de duración/tamaño y no se afirmará que funciona sin esos requisitos.
5. **Seguridad y herramientas:** límites de tasa, validación del servidor, salida escapada, manejo uniforme de errores, controles para descargas/cargas, lista permitida de modelos y moderación verificable. Búsqueda web, ejecución de herramientas o moderación externa solo se activarán al disponer de un proveedor y credenciales apropiados. Los prompts internos son defensa complementaria, no barrera de autorización.
6. **Verificación y entrega:** comprobaciones de sintaxis, API y persistencia; pruebas de aislamiento de usuarios una vez disponible la autenticación; pruebas móviles si hay un entorno de navegador disponible. Integrar los cambios remotos preservando el historial y subir únicamente cambios comprobados a `main`.

## Decisiones técnicas y dependencias

- Reutilizar Node.js/Express y el cliente estático del repositorio; añadir módulos bajo `src/` para configuración, rutas, middleware y servicios, conservando `server.js` como punto de entrada compatible.
- Mantener OpenRouter del lado del servidor; ninguna clave se incrusta en `public/`. El modelo por defecto seguirá configurable mediante variables de entorno y las opciones expuestas serán una lista permitida.
- No hay claves de Google, URL de base de datos ni proveedor de búsqueda/moderación especificados en el repositorio. La autenticación y el almacenamiento multiusuario requieren configuración explícita antes de poder demostrarse.
- El repositorio `DARK_IA` es público. Ningún prompt ni cambio de interfaz puede impedir que otras personas lean o clonen el código público. Para confidencialidad del código se necesitaría cambiar la visibilidad del repositorio, acción que no haré sin autorización específica. La protección técnica se enfocará en secretos, datos, sesiones y permisos.
- Servicios “gratuitos” pueden imponer cuotas, suspensión o requerir pago. No se asumirá gratuidad ilimitada ni se guardarán datos privados en almacenamiento efímero del proveedor de hosting.

## Estructura prevista

```text
server.js                 # entrada y escucha HTTP compatible
src/config.js             # configuración y validación de entorno
src/routes/               # endpoints de chat, estado, auth y archivos
src/middleware/           # validación, sesión, límites y autorización
src/services/              # proveedor IA, persistencia y extracción de archivos
src/db/                    # conexión, esquema/migraciones y consultas con dueño
public/index.html          # estructura y controles de interfaz
public/app.js              # interfaz de conversación y estado cliente
public/styles.css          # identidad visual y adaptación móvil
test/                      # pruebas unitarias e integración
docs/                      # configuración externa y límites operativos
```

La modularización se hará incrementalmente y solo donde reduzca acoplamiento; no se migrarán datos privados a una base nueva sin tener un proveedor persistente configurado.
