# DARK IA — criterios de evolución

Estados: `[x]` comprobado en el repositorio; `[ ]` pendiente; `[~]` avance parcial con límites descritos.

## 1. Identidad y personalidad
- [ ] La identidad usa negro profundo y rojo neón característico, efectos luminosos rojos, interfaz futurista premium y animaciones fluidas.
- [x] La interfaz se adapta a teléfonos, tablets y computadoras; se comprobó el layout en Chromium a 390 px y 1280 px.
- [ ] El asistente es seguro, directo y profesional; analiza antes de responder, estructura respuestas, reconoce/corrige errores y muestra iniciativa sin exceder permisos ni límites de seguridad.

## 2. Inteligencia avanzada
- [x] El modelo es configurable y existe un selector de modelos permitido por el servidor; la llamada real al proveedor depende de una clave configurada.
- [ ] Las respuestas son contextuales; las capacidades incluyen razonamiento para problemas complejos, análisis y depuración de código, HTML/CSS/JavaScript/Python y otros lenguajes, explicación técnica, análisis de documentos y conversaciones largas.
- [ ] Hay selección automática de modelo según dificultad cuando la infraestructura/modelos disponibles lo permitan; si no, se explicita el límite.
- [ ] La memoria contextual y recuperación de conversaciones anteriores es persistente e independiente por usuario; puede continuar tareas interrumpidas.
- [ ] No se presentan respuestas genéricas para tareas que requieran análisis profundo.

## 3. Sistema multimodal
- [ ] Se aceptan JPG, JPEG, PNG y WEBP, se previsualizan y se analizan con lectura de texto/errores de capturas mediante modelo compatible.
- [ ] Videos de menos de 3 minutos tienen vista previa y análisis de fotogramas/contexto; se procesa audio cuando el modelo lo permita.
- [ ] Se admiten PDF, TXT, DOCX, XLSX, CSV, JSON, HTML, CSS, JS y ZIP cuando sea seguro; los archivos se procesan como contexto real para responder preguntas.
- [ ] Hay límites razonables de tamaño/duración y validación de formato/contenido.
- [ ] El procesamiento real usa almacenamiento temporal seguro, limpieza y conexión con IA; no basta con un botón de carga.

## 4. Cuentas y privacidad con Google
- [ ] Hay inicio/cierre de sesión con Google, registro automático, perfil e identificador único.
- [ ] Cada usuario tiene chats guardados, historial y memoria independientes.
- [ ] Autenticación y sesiones son seguras; autorización en el servidor; almacenamiento con aislamiento por usuario.
- [ ] Ningún usuario puede acceder a conversaciones, archivos, datos personales ni memoria de otro usuario; no se confía solo en la interfaz.
- [ ] Sin `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `SESSION_SECRET` y `DATABASE_URL` persistente, la pantalla no permite entrar al chat ni muestra historiales; los datos locales antiguos no se migran automáticamente.
- [ ] Cada operación de chat obtiene el propietario desde la sesión autenticada y no acepta como autoridad un `userId` del cliente.
- [ ] Pruebas reales de Google OAuth, cookies y aislamiento de dos cuentas quedan pendientes hasta que haya credenciales de proveedor, dominio de callback y PostgreSQL persistente.

## 5. Protección de secretos y del proyecto
- [ ] Las solicitudes de código completo, estructura interna, archivos privados, instrucciones, claves, configuraciones, arquitectura o reconstrucción de infraestructura privada reciben una negativa clara y profesional.
- [ ] La negativa no impide enseñar programación ni ayudar con proyectos independientes.
- [ ] Variables de entorno, claves API, tokens, credenciales, archivos privados y configuración del servidor están protegidos; secretos nunca en frontend.
- [ ] La autorización sobre archivos/configuración se implementa en servidor; no se depende solo del prompt.
- [ ] Se documenta que un repositorio público no puede ocultar su propio código fuente y que la visibilidad no se cambia sin autorización específica.

## 6. Seguridad y moderación
- [ ] Rechazo educado de pornografía/contenido sexual explícito, gore extremo y violencia gráfica.
- [ ] Protección contra prompt injection, robo de credenciales, acceso no autorizado, archivos maliciosos, manipulación del sistema y exposición accidental de información privada.
- [ ] La moderación está respaldada por controles reales y pruebas, no solo instrucciones al modelo; se documentan los límites del proveedor.

## 7. Herramientas y fuentes
- [ ] Cuando el servicio lo permita y esté configurado, existen navegación/búsqueda web, análisis de información, generación/análisis/depuración de código, generación de documentos, procesamiento de archivos, análisis de imágenes/videos, cálculos, resúmenes y organización de tareas.
- [ ] Las tareas complejas pueden dividirse en pasos, ejecutar herramientas autorizadas y verificar resultados.
- [ ] No se anuncian herramientas no conectadas/configuradas.
- [x] Cuando el usuario activa fuentes, el servidor consulta GitHub REST (repositorios públicos) y Stack Overflow API; devuelve hasta tres resultados por sitio con dominio/enlace permitidos, timeout, cuota y avisos de indisponibilidad; los resultados son contenido externo no confiable.
- [x] Las consultas de fuentes no se presentan como búsqueda universal de internet ni como acceso a código GitHub privado.

## 8. Memoria
- [ ] La memoria por usuario recuerda preferencias/proyectos, recupera conversaciones y contexto, organiza/actualiza recuerdos y permite consultar/gestionar datos.
- [ ] Los recuerdos permanecen aislados por cuenta.

## 9. Experiencia de chats
- [~] Crear, eliminar, renombrar y buscar conversaciones independientes; la capa de cliente/API persiste chats remotos con ownership, pero la privacidad operativa requiere PostgreSQL real y pruebas entre cuentas.
- [~] Markdown seguro, bloques de código, copiar respuestas, indicador de generación, detener y reintentar respuestas; formato Markdown básico implementado, falta cubrir sintaxis completa.
- [ ] Editar mensajes, adjuntar archivos y previsualizar imágenes y videos.
- [ ] Todos los controles publicados funcionan.
- [x] El selector presenta solo `openrouter/free` y variantes `:free` cuyo precio de entrada y salida sea cero; cambiar de modelo crea un chat asociado a esa opción y no recurre a modelos de pago.
- [x] Cada respuesta guarda y muestra el identificador real devuelto por el proveedor; `openrouter/free` puede elegir internamente un modelo subyacente distinto. El saludo exacto se identifica como respuesta sin modelo externo.

## 10. Rendimiento y recuperación
- [~] Respuestas rápidas, carga optimizada, caché segura, gestión eficiente de conversaciones y procesamiento asíncrono de archivos; se agregó timeout de 90 s y límite de 20 solicitudes por minuto/IP, no hay caché ni procesamiento de archivos.
- [ ] Errores recuperables y mensajes no desaparecen sin respuesta; se evitan solicitudes duplicadas.

## 11. Costos y opciones gratuitas
- [ ] Sin suscripciones/VIP obligatorios, bloqueos artificiales ni funciones premium falsas.
- [ ] Se prefieren opciones gratuitas cuando sea viable y se documentan cuotas/costos/restricciones; no se prometen servicios gratuitos ilimitados.
- [x] Las claves API se mantienen en el servidor; `.env` está excluido de Git y no hay claves reales en el repositorio.
- [x] `openrouter/free` se presenta como router que consulta modelos ofrecidos a coste cero, con disponibilidad y límites variables; el filtrado usa variantes con precio cero y no existe fallback a modelos de pago ni elusión de cobros comerciales.

## 12. Personalización y saludo
- [x] En Ajustes se puede elegir personalidad profesional, alegre, fría/directa, amable, creativa o docente; el servidor valida opciones permitidas y las aplica a las instrucciones del modelo.
- [x] En Ajustes el nivel de emojis se puede seleccionar exactamente entre “Ninguno”, “Bajo”, “Medio” y “Usar siempre”; las preferencias se guardan por ID de cuenta en este navegador y no contaminan otra clave local.
- [x] Si el mensaje es solo «hola», con espacios exteriores o cambios de mayúsculas, la respuesta es exactamente «Hola soy una IA creada por vip modifier un creador de aplicaciones para el rendimiento no tan conocido».

## 13. Arquitectura y presentación
- [ ] Frontend, backend, API, IA, base de datos, autenticación, almacenamiento, multimodalidad y seguridad tienen responsabilidades separadas.
- [ ] Arquitectura mantenible y escalable que conserva funciones actuales.
- [x] Dependencias de API/servicio/permisos/configuración manual se indican explícitamente.
- [x] El diseño propio es más llamativo, mantiene tema rojo/negro y disposición tipo centro de control inspirada solo en patrones generales de productividad; no copia marca ni activos de Manus.
- [x] La versión visible y el título del producto dicen “DARK IA 1.0”; también se corrigen las etiquetas visibles de Studio, sin modificar versiones históricas del código.

## 14. Pruebas antes de declarar funciones terminadas
- [ ] Enviar mensajes y recibir respuestas reales de un modelo; requiere `OPENROUTER_API_KEY`.
- [ ] Verificar persistencia real y chats simultáneos con PostgreSQL.
- [ ] Probar login Google y aislamiento entre usuarios con dos cuentas.
- [ ] Probar subida de imágenes, videos <3 minutos y archivos.
- [ ] Comprobar protección Anti Robo y restricciones de seguridad.
- [ ] Verificar Android y escritorio en los dispositivos finales.
- [x] Verificar ausencia de errores JavaScript y del servidor: `node --check`, suite automatizada y servidor HTTP sin configuración.
- [ ] Una capacidad no se declara completa si solo existe visualmente.

## 15. Estado previo y Studio de programación
- [x] Arreglar el error de sintaxis que impedía ejecutar el cliente y quitar el enfoque automático que abría el teclado virtual; commit `a0c80f0` ya está en `main`.
- [x] Mejorar historial local para restaurar el chat al recargar, no perder el mensaje ante errores, editar/reenviar, renombrar, buscar y eliminar chats; selector real de modelos permitidos, copia de respuestas, reintento, cancelación, timeout y protección de tasa.
- [x] Aplicar tema negro/rojo y comprobar el layout y los controles del Studio en Chromium a 390 px y 1280 px; sin desbordamiento horizontal.
- [x] En esta iteración: `npm test` pasa 21 pruebas; `node --check` pasa para servidor, cliente, módulos y pruebas; `git diff --check` está limpio; `npm audit --omit=dev` reporta cero vulnerabilidades conocidas de producción.
- [~] El flujo sin `OPENROUTER_API_KEY` no simula respuestas. La ruta de chats ahora exige sesión; el envío y su persistencia reales dependen de configurar proveedores/DB.
- [ ] Requerimientos externos multimodales pendientes: modelo OpenRouter compatible con visión; extractor multimodal y procesamiento de video/audio disponible en el entorno; servicios de búsqueda/moderación con límites conocidos.
- [ ] Pruebas de producción y en dispositivo Android real requieren deployment y acceso de prueba; no se simularán ni se reportarán como realizadas sin evidencia.
- [x] El selector General/Programación/Aprendizaje/Gaming se conserva localmente y el modo elegido llega al backend; depuración, explicación, revisión de seguridad y propuesta de pruebas usan el modo coding.
- [x] El Studio importa archivos de texto con nombres/extensiones permitidos, límite de 100 KiB por archivo, 450 KiB por proyecto y 25 archivos; no ejecuta ni envía archivos al proveedor durante la importación.
- [x] Las acciones de asistencia solo envían al modelo el contexto acotado de los archivos del proyecto después de que el usuario pulse el botón; la interfaz informa que el contenido se envía al proveedor seleccionado.
- [x] La API valida sintaxis de JavaScript, TypeScript, JSX, TSX y JSON, limita el texto a 200 000 caracteres y a 60 solicitudes por minuto/IP; no ejecuta el código ni reemplaza pruebas o type-check del proyecto.
- [x] El editor acepta Tab como indentación y el usuario puede guardar/restaurar hasta tres instantáneas locales; las versiones no se sincronizan con GitHub.
- [x] La vista previa queda en iframe sandbox, con CSP previa al contenido para bloquear APIs/recursos externos y sin encabezado Referer; el código puede intentar navegar el iframe y ejecutar JavaScript que consuma recursos del navegador.
- [ ] No hay terminal ni ejecución de proyectos Python/Node ni otros lenguajes en el servidor; se requiere diseñar, desplegar y auditar una sandbox aislada antes de ofrecer esa capacidad.
- [~] El resultado real de asistencia depende de `OPENROUTER_API_KEY`, cuota y capacidades del modelo seleccionado; sin esa configuración la API informa el error y no simula respuestas.
- [ ] Migrar proyecto/archivos/historial del Studio desde `localStorage` a almacenamiento durable por cuenta; hasta entonces solo se separan claves del navegador por usuario y no se promete sincronización ni privacidad durable entre dispositivos.

## 16. Fase actual: ampliación versión 1.0
- [~] Puerta de entrada y rutas de Google OAuth/OIDC, callback, CSRF, perfil y cierre de sesión implementados con bloqueo seguro; faltan credenciales/dominio para verificar un acceso real.
- [~] Esquema PostgreSQL, sesiones y consultas de chats por propietario implementados; sin `DATABASE_URL` persistente no se declara privacidad operacional ni prueba de aislamiento entre usuarios.
- [x] Ajustes de personalidad y emojis aplicados al prompt; claves locales de proyectos/preferencias usan ID de cuenta y no se lee el historial compartido anterior.
- [x] Búsqueda opcional contra GitHub y Stack Overflow, salida enlazada validada, límites, sanitización y pruebas deterministas.
- [x] Selector de modelos gratuitos y sin fallback de pago; al cambiar de modelo se crea chat nuevo y se muestra el identificador real devuelto por el proveedor.
- [x] Saludo exacto sin OpenRouter, títulos visibles 1.0, menú refinado y pruebas unitarias/HTTP.
- [x] `docs/INTEGRATIONS.md` documenta `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `SESSION_SECRET`, `DATABASE_URL`, `COOKIE_SECURE`, `TRUST_PROXY_HOPS` y `OPENROUTER_API_KEY` sin valores secretos.
- [x] Suite de 21 pruebas aprobadas; checks de sintaxis y `git diff --check` limpios; auditoría de producción con cero hallazgos. La sincronización a GitHub aún no se ha realizado.
