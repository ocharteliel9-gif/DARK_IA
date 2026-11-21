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

## 7. Herramientas
- [ ] Cuando el servicio lo permita y esté configurado, existen navegación/búsqueda web, análisis de información, generación/análisis/depuración de código, generación de documentos, procesamiento de archivos, análisis de imágenes/videos, cálculos, resúmenes y organización de tareas.
- [ ] Las tareas complejas pueden dividirse en pasos, ejecutar herramientas autorizadas y verificar resultados.
- [ ] No se anuncian herramientas no conectadas/configuradas.

## 8. Memoria
- [ ] La memoria por usuario recuerda preferencias/proyectos, recupera conversaciones y contexto, organiza/actualiza recuerdos y permite consultar/gestionar datos.
- [ ] Los recuerdos permanecen aislados por cuenta.

## 9. Experiencia de chats
- [~] Crear, eliminar, renombrar y buscar conversaciones independientes con historial persistente local en el navegador; todavía no se sincronizan entre dispositivos/cuentas.
- [~] Markdown seguro, bloques de código, copiar respuestas, indicador de generación, detener y reintentar respuestas; formato Markdown básico implementado, falta cubrir sintaxis completa.
- [ ] Editar mensajes, adjuntar archivos y previsualizar imágenes y videos.
- [ ] Todos los controles publicados funcionan.

## 10. Rendimiento y recuperación
- [~] Respuestas rápidas, carga optimizada, caché segura, gestión eficiente de conversaciones y procesamiento asíncrono de archivos; se agregó timeout de 90 s y límite de 20 solicitudes por minuto/IP, no hay caché ni procesamiento de archivos.
- [ ] Errores recuperables y mensajes no desaparecen sin respuesta; se evitan solicitudes duplicadas.

## 11. Costos y plan gratuito
- [ ] Sin suscripciones/VIP obligatorios, bloqueos artificiales ni funciones premium falsas.
- [ ] Se prefieren opciones gratuitas cuando sea viable y se documentan cuotas/costos/restricciones; no se prometen servicios gratuitos ilimitados.
- [x] Las claves API se mantienen en el servidor; `.env` está excluido de Git y no hay claves reales en el repositorio.

## 12. Arquitectura
- [ ] Frontend, backend, API, IA, base de datos, autenticación, almacenamiento, multimodalidad y seguridad tienen responsabilidades separadas.
- [ ] Arquitectura mantenible y escalable que conserva funciones actuales.
- [ ] Dependencias de API/servicio/permisos/configuración manual se indican explícitamente.

## 13. Pruebas antes de declarar funciones terminadas
- [ ] Enviar mensajes y recibir respuestas.
- [ ] Verificar que mensajes no desaparecen y que hay conversaciones simultáneas.
- [ ] Probar login Google y aislamiento entre usuarios.
- [ ] Probar subida de imágenes, videos <3 minutos y archivos.
- [ ] Comprobar protección Anti Robo y restricciones de seguridad.
- [ ] Verificar Android y escritorio.
- [ ] Verificar ausencia de errores JavaScript y del servidor.
- [ ] Una capacidad no se declara completa si solo existe visualmente.

## Fase actual
- [x] Arreglar el error de sintaxis que impedía ejecutar el cliente y quitar el enfoque automático que abría el teclado virtual; commit `a0c80f0` ya está en `main`.
- [x] Mejorar historial local para restaurar el chat al recargar, no perder el mensaje ante errores, editar/reenviar, renombrar, buscar y eliminar chats; selector real de modelos permitidos, copia de respuestas, reintento, cancelación, timeout y protección de tasa.
- [x] Aplicar tema negro/rojo y comprobar el layout y los controles del Studio en Chromium a 390 px y 1280 px; sin desbordamiento horizontal.
- [x] Reproducir instalación con `npm ci --ignore-scripts`; ejecutar `npm test`: 13 pruebas aprobadas; `node --check` para cliente, servidor y pruebas; `git diff --check`; `npm audit --omit=dev` sin vulnerabilidades conocidas en producción.
- [~] El flujo frontend/API se probó con `OPENROUTER_API_KEY` ausente: el error se muestra y el mensaje permanece después de recargar. No fue posible comprobar una respuesta real del modelo.
- [ ] Requerimientos externos: credenciales OAuth de Google, `DATABASE_URL` PostgreSQL persistente y secreto de sesión; modelo OpenRouter compatible con visión; extractor multimodal y procesamiento de video/audio disponible en el entorno; servicios de búsqueda/moderación con límites conocidos.
- [ ] Pruebas de producción y en dispositivo Android real requieren deployment y acceso de prueba; no se simularán ni se reportarán como realizadas sin evidencia.


## 14. Programación avanzada (Studio)
- [x] El selector General/Programación/Aprendizaje/Gaming se conserva localmente y el modo elegido llega al backend; depuración, explicación, revisión de seguridad y propuesta de pruebas usan el modo coding.
- [x] El Studio importa archivos de texto con nombres/extensiones permitidos, límite de 100 KiB por archivo, 450 KiB por proyecto y 25 archivos; no ejecuta ni envía archivos al proveedor durante la importación.
- [x] Las acciones de asistencia solo envían al modelo el contexto acotado de los archivos del proyecto después de que el usuario pulse el botón; la interfaz informa que el contenido se envía al proveedor seleccionado.
- [x] La API valida sintaxis de JavaScript, TypeScript, JSX, TSX y JSON, limita el texto a 200 000 caracteres y a 60 solicitudes por minuto/IP; no ejecuta el código ni reemplaza pruebas o type-check del proyecto.
- [x] El editor acepta Tab como indentación y el usuario puede guardar/restaurar hasta tres instantáneas locales; las versiones no se sincronizan con GitHub.
- [x] La vista previa queda en iframe sandbox, con CSP previa al contenido para bloquear APIs/recursos externos y sin encabezado Referer; el código puede intentar navegar el iframe y ejecutar JavaScript que consuma recursos del navegador.
- [ ] No hay terminal ni ejecución de proyectos Python/Node ni otros lenguajes en el servidor; se requiere diseñar, desplegar y auditar una sandbox aislada antes de ofrecer esa capacidad.
- [~] El resultado real de asistencia depende de `OPENROUTER_API_KEY`, cuota y capacidades del modelo seleccionado; sin esa configuración la API informa el error y no simula respuestas.
