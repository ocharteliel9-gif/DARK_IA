# Integraciones pendientes de DARK IA

Este documento describe dependencias que el repositorio todavía no implementa. No crear estos valores en el frontend ni declarar una función operativa hasta completar su implementación y pruebas.

## Google OAuth y datos privados

Hace falta registrar un OAuth Client de Google, agregar callback/redirect URIs exactas para desarrollo y producción, y suministrar al backend `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y un secreto de sesión aleatorio de alta entropía. También hace falta una base PostgreSQL persistente accesible como `DATABASE_URL`; las tablas de usuario, chats, mensajes, archivos y memoria deben aplicar ownership en cada consulta. No guardar sesiones ni mensajes en disco efímero del host. No habilitar login hasta probar inicio/cierre de sesión, expiración de sesión y aislamiento entre dos usuarios distintos.

## OpenRouter e imágenes

`OPENROUTER_API_KEY` y la clave del modelo son configuración del servidor. Para visión se requiere seleccionar un modelo que admita entradas de imagen en la cuenta y confirmar sus cuotas/tamaño. Un selector por sí solo no añade soporte visual: se deben validar el MIME real, el tamaño, el payload enviado y la respuesta de la API.

## Documentos, vídeo, audio y búsqueda

Para PDF/DOCX/XLSX se necesita elegir e instalar extractores, limitar expansión/CPU, procesar en un área temporal con limpieza y probar archivos válidos, malformados y excesivos. Para vídeo inferior a tres minutos se necesita un proceso de fotogramas y, si se analiza audio, decodificación/transcripción; comprobar que el host tiene las utilidades y que los archivos y tokens no exceden cuotas. No ejecutar ni extraer ZIP sin límite. Búsqueda web, moderación externa y generación de documentos requieren proveedores, API, cuotas, controles de seguridad y pruebas que aún no se han configurado.

## Studio de programación: límites operativos

El Studio importa únicamente archivos de texto desde el dispositivo actual: hasta 25 archivos, 100 KiB por archivo y 450 KiB en total. Los archivos y hasta tres instantáneas se guardan en `localStorage`; no se sincronizan con una cuenta, base de datos ni GitHub. Las acciones de depuración, explicación, revisión de seguridad y pruebas envían explícitamente contenido del proyecto (con límite de contexto) al modelo/proveedor seleccionado. Requieren `OPENROUTER_API_KEY` válida para obtener respuesta.

`POST /api/code/validate` usa TypeScript 5.9 para analizar sintaxis de JavaScript, TypeScript, JSX y TSX, y `JSON.parse` para JSON. El límite es 200 000 caracteres y 60 solicitudes por minuto/IP. Es una comprobación sintáctica, no un type-check del proyecto ni una prueba, y nunca ejecuta el contenido. No hay validador de sintaxis para Python u otros lenguajes. El historial remitido al proveedor se limita a 22 000 caracteres acumulados por petición.

La vista previa web solo se inicia al pulsar el control correspondiente. Normaliza el documento para anteponer CSP antes del contenido del usuario, usa un iframe `sandbox` sin acceso al origen padre y bloquea con CSP las conexiones a API y la carga de recursos externos; también suprime el encabezado Referer. El sandbox no impide que su propio contenido intente navegar a otro sitio. JavaScript del usuario se ejecuta dentro del iframe y puede consumir recursos del navegador. DARK IA no ejecuta proyectos en el servidor, no ofrece terminal y no proporciona aislamiento de contenedores ni ejecución de Python/Node.
