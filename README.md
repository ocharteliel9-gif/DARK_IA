# DARK IA

Asistente web con cliente estático y API Express que conecta con OpenRouter desde el servidor. La clave del proveedor nunca se coloca en el navegador.

## Ejecutar

Requiere Node.js 20 o superior. Ejecuta `npm install`, copia `.env.example` a `.env`, configura `OPENROUTER_API_KEY` en un entorno privado y luego `npm start`. `TRUST_PROXY_HOPS` debe reflejar los proxies confiables del host (1 por defecto para el despliegue previsto); ajústalo al número real y nunca confíes en cabeceras `X-Forwarded-For` no validadas. Consulta `/api/status`, `/api/modes` y `/api/models`; ejecuta `npm test` para las pruebas locales.

El endpoint de chat limita solicitudes por IP a 20 por minuto para proteger la clave y el gasto del proveedor; es un control antiabuso, no un plan de pago. Usa almacenamiento en memoria por instancia y se reinicia con el proceso.

## Estado de las capacidades

Los chats se guardan en el almacenamiento local del navegador: sobreviven a una recarga en ese dispositivo, pero no se sincronizan entre dispositivos y todavía no son datos de una cuenta privada. El selector muestra únicamente los modelos permitidos por el servidor; OpenRouter todavía puede rechazar un modelo que no esté habilitado en la cuenta. El usuario puede buscar/renombrar/eliminar chats, editar y reenviar mensajes, copiar respuestas, detener una solicitud y reintentar un error. Un mensaje enviado se mantiene aunque el proveedor falle. El modelo y la clave se usan solo en el servidor.

La aplicación aún no procesa cargas multimodales, vídeos, documentos, OAuth de Google, base de datos, memoria de cuenta, búsqueda web ni moderación independiente. Esas funciones requieren implementar y probar componentes del servidor y, según la opción, configurar credenciales, almacenamiento persistente o herramientas del entorno. No hay controles visuales para ellas hasta que sean reales.

El repositorio DARK_IA es público en GitHub. Su código fuente puede ser leído y clonado por cualquier persona; un prompt anti-filtración no puede cambiar esa propiedad. Para proteger la confidencialidad del código se necesita hacer privado el repositorio desde GitHub, operación no realizada por este cambio. La clave OpenRouter debe mantenerse fuera del repositorio, en variables privadas del host.

Las cuotas gratuitas de proveedores no equivalen a uso ilimitado. Consulta las condiciones de OpenRouter y del servicio de despliegue antes de prometer acceso sin límites.
