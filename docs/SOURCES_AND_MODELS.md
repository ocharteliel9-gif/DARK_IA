# Fuentes externas y verificación de modelos — DARK IA 1.0

Consulta puntual realizada el 20 de noviembre de 2026. Los catálogos, límites y APIs pueden cambiar; las observaciones en vivo de esa fecha no garantizan disponibilidad futura.

## Modelos gratuitos de OpenRouter

La documentación oficial explica que `openrouter/free` selecciona un modelo gratuito disponible y que la lista, el rendimiento y los límites pueden variar. Las variantes `:free` indican precio cero en el catálogo cuando el catálogo devuelve coste de entrada y salida igual a cero. Para conservar costo cero no debe añadirse un fallback a modelos de pago. [1] [2] [3]

Una consulta GET del catálogo público respondió HTTP 200 con 477 modelos en el momento de la comprobación. Al filtrar los IDs terminados en `:free` y coste de entrada y salida exactamente cero, se encontraron 15 variantes gratuitas. El selector vuelve a consultar el catálogo, conserva únicamente estas variantes y mantiene `openrouter/free` como opción automática cuando la consulta falla. El número de 15 no es permanente. [3]

`OPENROUTER_API_KEY` sigue siendo necesaria para inferencia. Que una variante esté marcada gratuita no garantiza cupo, disponibilidad ni uptime del proveedor. [1] [2]

## Fuentes consultadas por DARK IA

GitHub documenta la búsqueda REST de repositorios y sus cuotas diferenciadas. El servidor consulta solo `/search/repositories`, con máximo de tres resultados y sin token de acceso; por ello no accede a repositorios privados. Una comprobación de conectividad obtuvo HTTP 200. [4]

Stack Exchange API v2.3 ofrece `/search/advanced` con el parámetro `site=stackoverflow`. El servidor pide preguntas ordenadas por relevancia, con un máximo de tres resultados. Una comprobación de conectividad obtuvo HTTP 200. Las cuotas y la disponibilidad dependen del servicio. [5] [6]

La respuesta se limita a títulos, metadatos públicos y enlaces HTTPS cuyo hostname se valida contra `github.com` o `stackoverflow.com`. El servidor envía estos datos al modelo solo cuando el usuario activa «Fuentes en vivo». El texto de la consulta se comparte con esos proveedores. Los resultados son contenido externo no confiable; no equivalen a verificación de verdad ni a búsqueda general de internet.

## Referencias

[1]: https://openrouter.ai/docs/guides/routing/routers/free-router "OpenRouter Free Models Router"
[2]: https://openrouter.ai/docs/guides/routing/model-variants/free "OpenRouter Free Variant"
[3]: https://openrouter.ai/docs/api/api-reference/models/list-all-models-and-their-properties "OpenRouter Models API"
[4]: https://docs.github.com/en/rest/search/search "GitHub REST API Search"
[5]: https://api.stackexchange.com/docs/advanced-search "Stack Exchange Advanced Search"
[6]: https://stackexchange.com/legal/api-terms-of-use "Stack Exchange API Terms of Use"
