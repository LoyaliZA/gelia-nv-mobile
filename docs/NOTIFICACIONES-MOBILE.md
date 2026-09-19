# Notificaciones en GELIA Mobile

Esta primera versión muestra las notificaciones que GELIA ya guarda en la base de datos. No implementa todavía notificaciones *push* del sistema operativo.

## Cómo viaja la información

1. `NotificationCenter` pide los datos mediante `notification.api.ts`.
2. `notification.api.ts` usa el cliente HTTP común de la app y agrega el token de la sesión.
3. GELIA responde desde `GET /api/v1/mobile/notifications`.
4. El componente guarda la lista y el contador en su estado y React actualiza la campana.
5. Al tocar una alerta, la app llama a `PATCH /api/v1/mobile/notifications/{id}/read`.

La consulta se repite al abrir el centro de alertas y cuando la aplicación vuelve a primer plano. Esto mantiene la interfaz actualizada sin agregar todavía WebSockets o Firebase.

## Responsabilidad de cada archivo

| Archivo | Responsabilidad |
| --- | --- |
| `src/components/navigation/MobileTopBar.tsx` | Compone la barra: menú, tema, atrás, logo, campana y perfil. |
| `src/features/notifications/NotificationCenter.tsx` | Controla el panel, su estado y las interacciones. |
| `src/features/notifications/notification.api.ts` | Contiene únicamente las llamadas HTTP. |
| `src/features/notifications/notification.types.ts` | Describe con TypeScript la respuesta del servidor. |
| `src/components/ui/Icon.tsx` | Mantiene los SVG reutilizables de la interfaz. |
| `src/index.css` | Define la apariencia, animaciones y adaptación móvil. |

Esta separación responde a una regla útil: un componente decide **qué mostrar**, el archivo API decide **cómo obtenerlo** y los tipos deciden **qué forma tienen los datos**.

## Endpoints necesarios en GELIA

| Método | Ruta | Uso |
| --- | --- | --- |
| `GET` | `/api/v1/mobile/notifications` | Lista hasta 50 alertas y devuelve el total sin leer. |
| `PATCH` | `/api/v1/mobile/notifications/{id}/read` | Marca una alerta del usuario autenticado. |
| `PATCH` | `/api/v1/mobile/notifications/read-all` | Marca todas las alertas como leídas. |

El servidor busca cada notificación a través del usuario autenticado. Por eso un usuario no puede leer ni modificar la notificación de otra persona aunque conozca su identificador.

## Cómo razonar una función nueva

Antes de escribir código, contesta estas preguntas:

1. ¿De dónde sale el dato: local, API o dispositivo?
2. ¿Quién debe ser dueño del estado?
3. ¿Qué puede fallar y qué verá la persona si falla?
4. ¿La acción cambia datos del servidor o sólo la vista?
5. ¿Cómo se comprobará que el usuario correcto tiene acceso?

Para mensajería, por ejemplo, no basta con agregar un icono: hacen falta lista de conversaciones, mensajes, lectura, envío, adjuntos y actualización en tiempo real. Por eso conviene construirla como una función independiente después de estabilizar notificaciones.

## Verificación local

```bash
npm run lint
npm run build
```

Para probar datos reales, primero despliega las rutas móviles en GELIA y configura `VITE_API_BASE_URL` con la URL que termina en `/api/v1`.
