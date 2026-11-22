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
- [x] El chat permite adjuntar una foto JPEG, PNG o WEBP y verla en la conversación; el original no supera 10 MiB ni 16 megapíxeles, se validan sus dimensiones antes de decodificarlo y se comprime localmente a 600 KiB o menos. El blob se guarda en IndexedDB, no en `localStorage`, y solo se envía cuando se solicita analizarlo con un modelo que declara visión o con el router gratuito multimodal; hay validación de MIME/firma y límites en el servidor.

## 4. Modo invitado y privacidad por navegador
- [x] DARK IA abre directamente sin inicio de sesión con Google ni cuenta; el backend no monta OAuth ni expone rutas de sesión.
- [x] Los chats, preferencias, proyectos e instantáneas se guardan en `localStorage` bajo un espacio separado por un identificador aleatorio del perfil de navegador actual.
- [x] Los chats no se sincronizan entre navegadores/dispositivos ni se guardan en servidor; el backend no ofrece API para leer o administrar historiales remotos.
- [x] La interfaz informa que cualquiera con acceso al mismo perfil de navegador puede ver el historial y permite borrar los chats locales.
- [x] No se importan chats antiguos a la nueva clave local; borrar los datos del sitio puede eliminar el historial sin recuperación.
- [x] Las rutas públicas de chat y búsqueda conservan límites por IP; esto no autentica personas ni evita todo abuso.

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
- [x] Las preguntas sobre Brevent incluyen referencias oficiales verificables y orientación prudente de rendimiento; no se inventan comandos universales ni se presentan recomendaciones destructivas o no oficiales como instrucciones seguras.

## 8. Memoria
- [ ] La memoria por usuario recuerda preferencias/proyectos, recupera conversaciones y contexto, organiza/actualiza recuerdos y permite consultar/gestionar datos.
- [ ] Los recuerdos permanecen aislados por cuenta.

## 9. Experiencia de chats
- [x] Crear, eliminar, renombrar y buscar conversaciones independientes en el navegador actual; no hay sincronización ni API de historial remoto.
- [x] En pantallas estrechas, la burbuja del asistente conserva ancho legible y el modelo/fuentes aparecen debajo, sin comprimir ni fragmentar las palabras.
- [~] Markdown seguro, bloques de código, copiar respuestas, indicador de generación, detener y reintentar respuestas; formato Markdown básico implementado, falta cubrir sintaxis completa.
- [~] Las respuestas de modelos compatibles se transmiten progresivamente en el chat; el usuario puede detenerlas y recibe un mensaje visible si la conexión o el proveedor fallan, conservando su mensaje enviado. El protocolo está cubierto por pruebas con proveedor local simulado; queda pendiente comprobarlo en Android y producción.
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
- [x] En Ajustes el nivel de emojis se puede seleccionar exactamente entre “Ninguno”, “Bajo”, “Medio” y “Usar siempre”; las preferencias se guardan en el espacio invitado de este navegador.
- [x] Si el mensaje es solo «hola», con espacios exteriores o cambios de mayúsculas, la respuesta es exactamente «Hola soy una IA creada por vip modifier un creador de aplicaciones para el rendimiento no tan conocido».

## 13. Arquitectura y presentación
- [ ] Frontend, backend, API, IA, base de datos, autenticación, almacenamiento, multimodalidad y seguridad tienen responsabilidades separadas.
- [ ] Arquitectura mantenible y escalable que conserva funciones actuales.
- [x] Dependencias de API/servicio/permisos/configuración manual se indican explícitamente.
- [x] El diseño propio es más llamativo, mantiene tema rojo/negro y disposición tipo centro de control inspirada solo en patrones generales de productividad; no copia marca ni activos de Manus.
- [x] El menú conserva chats, invitado, ajustes y Studio, y recibe un acabado futurista, limpio, responsive y accesible sin romper sus controles existentes.
- [x] La versión visible y el título del producto dicen “DARK IA 1.0”; también se corrigen las etiquetas visibles de Studio, sin modificar versiones históricas del código.

## 14. Pruebas antes de declarar funciones terminadas
- [~] Enviar mensajes y recibir respuestas reales de un modelo; requiere `OPENROUTER_API_KEY`.
- [x] Verificar que la interfaz abre como invitado, no presenta login Google y no expone rutas de chat remoto.
- [x] Verificar que el saludo exacto está disponible sin autenticación ni clave externa y que otras peticiones informan si falta OpenRouter.
- [ ] Probar subida de imágenes, videos <3 minutos y archivos.
- [ ] Comprobar protección Anti Robo y restricciones de seguridad.
- [ ] Verificar Android y escritorio en los dispositivos finales.
- [x] Verificar sintaxis y pruebas automatizadas para interfaz/API invitada; servidor HTTP sin configuración.
- [ ] Una capacidad no se declara completa si solo existe visualmente.

## 15. Estado previo y Studio de programación
- [x] Arreglar el error de sintaxis que impedía ejecutar el cliente y quitar el enfoque automático que abría el teclado virtual; commit `a0c80f0` ya está en `main`.
- [x] Mejorar historial local para restaurar el chat al recargar, no perder el mensaje ante errores, editar/reenviar, renombrar, buscar y eliminar chats; selector real de modelos permitidos, copia de respuestas, reintento, cancelación, timeout y protección de tasa.
- [x] Aplicar tema negro/rojo y comprobar el layout y los controles del Studio en Chromium a 390 px y 1280 px; sin desbordamiento horizontal.
- [x] En esta iteración: `npm test` pasa 25 pruebas, incluida integración SSE con un proveedor local simulado; `node --check` pasa para servidor, cliente, módulos y pruebas; `git diff --check` está limpio. No se probó en un dispositivo Android real.
- [x] Sin `OPENROUTER_API_KEY` no se simulan respuestas de modelo; el saludo exacto funciona localmente y los chats se persisten en el navegador. Las respuestas externas requieren configurar OpenRouter.
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
- [x] Proyectos, archivos, historial del Studio, chats y preferencias se guardan localmente en el espacio del perfil actual; no se promete sincronización ni privacidad frente a otras personas que usen ese mismo perfil.

## 16. Fase actual: modo invitado en versión 1.0
- [x] Se retiraron puerta de Google, rutas/middleware OAuth, sesiones y persistencia PostgreSQL de chats; el acceso se abre directamente como invitado.
- [x] El espacio local usa un identificador aleatorio persistido por perfil del navegador; no autentica ni sincroniza personas/dispositivos.
- [x] Ajustes de personalidad, emojis, proyectos y chats se guardan bajo claves del espacio invitado; no se importa el historial legado.
- [x] Búsqueda opcional contra GitHub y Stack Overflow, salida enlazada validada, límites, sanitización y pruebas deterministas.
- [x] Selector de modelos gratuitos y sin fallback de pago; al cambiar de modelo se crea chat nuevo y se muestra el identificador real devuelto por el proveedor.
- [x] Saludo exacto sin OpenRouter, títulos visibles 1.0, menú refinado y pruebas unitarias/HTTP.
- [x] `README.md`, `docs/INTEGRATIONS.md` y `.env.example` documentan el modo invitado, el almacenamiento local y el requisito de `OPENROUTER_API_KEY` sin claves secretas.
- [x] 21 pruebas automatizadas aprobadas; sintaxis JS, `git diff --check` y `npm audit --omit=dev` limpios. GitHub y Render aún no se han actualizado con este cambio.
