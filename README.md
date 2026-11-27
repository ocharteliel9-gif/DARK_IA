# DARK IA 1.0

Asistente web con cliente estático y API Express. Abre directamente en **modo invitado**, sin cuenta ni Google. Los chats, preferencias y proyectos se guardan solo en el navegador; no se sincronizan con otros dispositivos ni se recuperan al borrar los datos del sitio. Las personas que compartan el mismo perfil de navegador pueden ver el mismo historial, así que no guardes información sensible.

## Ejecutar localmente

Requiere Node.js 20 o superior. Ejecuta `npm ci`, copia `.env.example` a `.env` y añade `OPENROUTER_API_KEY` para permitir respuestas de modelos externos. Luego ejecuta `npm start` y abre `http://localhost:3000`.

El saludo literal «hola» se responde localmente sin clave. Para otras solicitudes, si falta `OPENROUTER_API_KEY`, el servidor informa que no está configurada y no simula una respuesta. El catálogo solo ofrece `openrouter/free` y variantes `:free` con precio indicado como cero; cuotas y disponibilidad varían, por lo que no se promete uso ilimitado.

Comprobaciones: `npm test`, `node --check server.js`, `node --check public/app.js` y `npm audit --omit=dev`. `TRUST_PROXY_HOPS` debe corresponder al número real de proxies confiables del host; usa cero en conexión local directa.


## Módulos especializados

El selector de modo incluye módulos de **Gaming, Modding, Desarrollo de juegos, Unity, Unreal Engine, Godot, Soporte por juego y Diagnóstico técnico**, además de General, Programación y Aprendizaje. Los módulos aplican instrucciones especializadas del lado del servidor y se mantienen compatibles con el chat y el historial existentes.

Para respuestas técnicas, DARK IA debe solicitar juego/aplicación, versión, plataforma, motor o gestor y herramientas solo cuando esos datos cambien la solución. Debe distinguir hechos de hipótesis, incluir pasos de diagnóstico y advertir antes de acciones que puedan afectar archivos o partidas. Se recomienda una copia de seguridad antes de modificar instalaciones o configuraciones.

Los módulos de modding están orientados a modificaciones permitidas, proyectos propios y experiencias de un jugador. No son un sistema de ejecución de mods ni una integración directa con Unity, Unreal, Godot o gestores externos: la generación y revisión de contenido se realiza mediante el modelo seleccionado en OpenRouter. La disponibilidad, precisión y límites dependen de ese proveedor y del contexto que comparta el usuario.

## Chats y privacidad

Los chats permanecen en `localStorage` en el navegador actual y se separan mediante un identificador aleatorio creado allí. No se guardan en PostgreSQL ni hay una API pública para leer conversaciones. El identificador no verifica quién es la persona: cualquiera con acceso al mismo perfil del navegador puede ver esos chats. Si se cambia de dispositivo, se usa otro perfil o se borran los datos del sitio, el historial no estará disponible.

El texto enviado al asistente se procesa en el servidor y puede enviarse a OpenRouter para generar respuestas; cuando «Fuentes en vivo» está activado, también se consulta a GitHub público y Stack Overflow. No envíes secretos ni información confidencial.

## Modelos y fuentes

El servidor limita el catálogo a modelos que el proveedor etiqueta con precio cero y no usa fallback a opciones de pago. OpenRouter requiere una clave de servidor. Cuando se activa «Fuentes en vivo», se consultan repositorios públicos de GitHub y Stack Overflow, con límites y timeout. No es búsqueda general ni acceso a repositorios privados. Consulta [Fuentes y modelos](docs/SOURCES_AND_MODELS.md).

El repositorio DARK_IA es público en GitHub; el modo invitado no oculta su código fuente.
