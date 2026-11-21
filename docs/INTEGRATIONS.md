# Integraciones pendientes de DARK IA

Este documento describe dependencias que el repositorio todavía no implementa. No crear estos valores en el frontend ni declarar una función operativa hasta completar su implementación y pruebas.

## Google OAuth y datos privados

Hace falta registrar un OAuth Client de Google, agregar callback/redirect URIs exactas para desarrollo y producción, y suministrar al backend `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y un secreto de sesión aleatorio de alta entropía. También hace falta una base PostgreSQL persistente accesible como `DATABASE_URL`; las tablas de usuario, chats, mensajes, archivos y memoria deben aplicar ownership en cada consulta. No guardar sesiones ni mensajes en disco efímero del host. No habilitar login hasta probar inicio/cierre de sesión, expiración de sesión y aislamiento entre dos usuarios distintos.

## OpenRouter e imágenes

`OPENROUTER_API_KEY` y la clave del modelo son configuración del servidor. Para visión se requiere seleccionar un modelo que admita entradas de imagen en la cuenta y confirmar sus cuotas/tamaño. Un selector por sí solo no añade soporte visual: se deben validar el MIME real, el tamaño, el payload enviado y la respuesta de la API.

## Documentos, vídeo, audio y búsqueda

Para PDF/DOCX/XLSX se necesita elegir e instalar extractores, limitar expansión/CPU, procesar en un área temporal con limpieza y probar archivos válidos, malformados y excesivos. Para vídeo inferior a tres minutos se necesita un proceso de fotogramas y, si se analiza audio, decodificación/transcripción; comprobar que el host tiene las utilidades y que los archivos y tokens no exceden cuotas. No ejecutar ni extraer ZIP sin límite. Búsqueda web, moderación externa y generación de documentos requieren proveedores, API, cuotas, controles de seguridad y pruebas que aún no se han configurado.
