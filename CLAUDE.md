# lealtad-wallet — Contexto del proyecto

Sistema propio de tarjetas de lealtad digitales (sellos) para restaurantes, cafeterías y heladerías.
Inspirado en Digital Zeta (agencia que revende GoHighLevel + tarjetas wallet + WhatsApp a $297/mes).
Objetivo: replicarlo con **costo casi cero** (el usuario recién está empezando).

## Stack (100% free tier)
- Backend: Node.js + Express (CommonJS), desplegado en **Render.com** (free)
- Base de datos: **MongoDB Atlas** M0 (free, 512 MB)
- Tarjetas: **Google Wallet API** (Service Account `bot-wallet`, clave en `google-key.json`, NUNCA se sube a Git)
- Tiempo real: **Socket.io** (panel de caja)
- CRM / formularios / WhatsApp: **GoHighLevel (GHL)**
- Hardware: etiquetas NFC **NTAG213** (baratas; la aprobación de la cajera evita el fraude)
- Apple Wallet: **fase 2** (requiere Apple Developer $99/año) — pendiente de confirmar

## Flujos
1. **Registro**: NFC/QR en mesa → formulario GHL (nombre, teléfono, cumpleaños, consentimiento)
   → webhook `POST /api/crear-pase` → guardar cliente en MongoDB → crear LoyaltyObject
   → devolver URL firmada (`https://pay.google.com/gp/v/save/...`) → GHL la guarda en Custom Field y la envía por WhatsApp.
2. **Sellos**: cliente toca NFC en caja → página "Esperando aprobación..." → `POST /api/solicitar-sello`
   → Socket.io avisa a `/caja` → cajera aprueba → `POST /api/aprobar-sello` → MongoDB +1 → PATCH a Google Wallet → notificación.
3. **Premios multinivel**: ej. 4 sellos = 20% off, 8 sellos = producto gratis. Lógica en MongoDB (Google Wallet no tiene niveles nativos).
4. **Retención**: cumpleaños, inactividad 10 días (win-back), promo del día (`POST /api/notificacion-masiva`), "te falta 1 sello".

## Decisiones de diseño acordadas / propuestas (pendiente confirmación del usuario)
1. **Identificar al cliente al tocar NFC**: el navegador no accede al pase de Wallet. El link de WhatsApp pasa primero por
   nuestro servidor (`/bienvenida?t=TOKEN`), que pone una cookie con el ID y redirige a Google Wallet. Mismo link dentro del pase
   (linksModuleData). Sin cookie → pedir teléfono.
2. **Render free se duerme** (~15 min inactivo, arranque 30–60 s): usar **cron-job.org** (gratis) para llamar endpoints de
   cumpleaños/inactividad y mantenerlo despierto en horario del restaurante. El panel `/caja` debe reconectarse solo.
3. **Solicitudes de sello en MongoDB**, no en memoria; al reconectar el panel carga las pendientes.
4. **Límite Google Wallet**: máx. 3 notificaciones por pase cada 24 h. Usar Wallet para sello y "te falta 1";
   cumpleaños, promos y win-back también por **WhatsApp desde GHL**.
5. **Datos**: cumpleaños y `contact_id` solo en MongoDB (no en el pase). **Una LoyaltyClass por restaurante**;
   colección `restaurantes` desde el día 1 (multi-restaurante). Sellos visuales = 9 imágenes pre-generadas (0–8) que se cambian en cada PATCH.
6. **Seguridad**: PIN/login por restaurante en `/caja`; secreto compartido para validar el webhook de GHL; `cors` restringido;
   QR/ID del pase no adivinable; Atlas con `0.0.0.0/0` (Render free sin IP fija) → contraseña fuerte;
   `google-key.json` en Render como Secret File.

## Pendientes antes de producción
- Google Wallet empieza en **modo demo** (solo cuentas de prueba): pedir acceso de producción con tiempo.
- Casilla de consentimiento (WhatsApp + uso de cumpleaños) en el formulario GHL.
- GHL tiene costo propio (~$97/mes plan más bajo) — revisar vs. objetivo de bajo costo.

## Estado actual (2026-10-22)
- Archivos: `package.json` (express 5, google-auth-library, jsonwebtoken, dotenv, cors), `.gitignore`, `google-key.json`, `server.js`.
- `server.js`: Express con GoogleAuth; `POST /api/crear-pase` solo comprueba el token, aún no crea pases.
- **Git NO está inicializado** y **no existe `.env`**.
- Falta instalar: `socket.io`, `mongoose` (o driver de MongoDB).

## Preguntas abiertas al usuario
1. ¿Acepta los 6 ajustes de diseño (sobre todo la cookie de identificación)?
2. ¿Claude escribe el código explicando, o el usuario lo escribe con guía (modo mentor)?
3. ¿Apple Wallet queda para fase 2?

## Siguiente paso
Tarea 1: vincular el **Issuer ID** en Google Pay & Wallet Console con la Service Account (solo configuración, sin código).
Luego: LoyaltyClass + `/api/crear-pase` → panel `/caja` + Socket.io → `.env` + Atlas + deploy en Render.

## Referencias de costos investigadas
- WhatsApp API (Meta): marketing ~$0.03/msg en México; utilidad < $0.01; cobro por mensaje entregado.
- PassKit (alternativa evaluada): $39.50/mes, 250 pases incluidos; cobra por pases **acumulados** (creados − borrados), no por mes.
- Wallet gratis alternativos evaluados: 7Stamp, WalletU, FaveCard. Boomerangme ~$69–129/mes (plan agencia).
