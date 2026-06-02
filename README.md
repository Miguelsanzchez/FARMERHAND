# FarmerHand — Local Agricultural Products Marketplace
# FarmerHand — Marketplace de Productos Agrícolas Locales

**Final Degree Project · Web Application Development · 2024/2026**  
**Proyecto de Fin de Grado · Desarrollo de Aplicaciones Web · 2024/2026**  
Author / Autor: Miguel Sanz

---

## What is FarmerHand? / ¿Qué es FarmerHand?

**EN:** FarmerHand is a marketplace platform that connects farmers directly with consumers, eliminating intermediaries. Farmers can publish their products and manage their orders, while consumers buy directly from the source with integrated card payments via Stripe. The platform features three distinct roles (consumer, farmer and administrator), a box-size system per product, real card payments, and a farmer application flow subject to admin approval.

**ES:** FarmerHand es una plataforma marketplace que conecta agricultores directamente con consumidores, eliminando intermediarios. Los agricultores pueden publicar sus productos y gestionar sus pedidos, mientras los consumidores compran de forma directa desde el origen con pago integrado mediante Stripe. La plataforma incluye tres roles diferenciados (consumidor, agricultor y administrador), un sistema de cajas por producto, pagos reales con tarjeta, y un flujo de solicitud para convertirse en agricultor con aprobación del administrador.

---

## Tech Stack / Stack Tecnológico

| Layer / Capa | Technology / Tecnología |
|---|---|
| Frontend | HTML5, CSS3, JavaScript (ES Modules, no framework) |
| Backend | Node.js + Express 5 |
| Database / Base de datos | PostgreSQL managed with Supabase |
| Authentication / Autenticación | JWT + bcrypt |
| Payments / Pagos | Stripe (Payment Intents API) |
| Security / Seguridad | Helmet, express-rate-limit, CORS |
| Frontend deploy / Despliegue frontend | Vercel |
| Backend deploy / Despliegue backend | Render |

---

## Live Demo / Demo en producción

- **Frontend:** https://proyect-dom-farmerhand.vercel.app
- **Backend API:** https://proyect-dom-farmerhand.onrender.com

> The backend runs on Render's free tier — it may take a few seconds to respond if idle.  
> El backend está en Render con plan gratuito — puede tardar unos segundos si lleva un rato inactivo.

---

## Features by Role / Funcionalidades por Rol

### Consumer / Consumidor
- Browse the product catalogue with filters / Explorar el catálogo con filtros por categoría y disponibilidad
- Select box size with different prices / Seleccionar tamaño de caja (1 kg, 3 kg, 5 kg) con precios distintos
- Add to cart (persisted in localStorage) / Añadir al carrito (persistente en localStorage)
- Checkout with shipping address and card payment / Finalizar compra con dirección y pago con tarjeta (Stripe)
- View order history / Consultar historial de pedidos y su estado
- Rate received products / Valorar productos recibidos
- Apply to become a farmer / Solicitar convertirse en agricultor desde el panel

### Farmer / Agricultor
- Manage product catalogue (create, edit, delete, enable/disable) / Gestionar catálogo (crear, editar, eliminar, activar/desactivar)
- Configure box options with discounts / Configurar opciones de caja con descuentos
- View and filter received orders / Ver pedidos recibidos con filtros por estado, fecha y producto
- Update order status / Actualizar estado de pedidos (confirmado → enviado → entregado)

### Administrator / Administrador
- View all registered users / Ver todos los usuarios registrados
- Manage farmer requests (approve or reject) / Gestionar solicitudes de alta como agricultor (aprobar o rechazar)
- Monitor overall platform status / Visualizar el estado general de la plataforma

---

## Main Flows / Flujos Principales

### Purchase / Compra con pago
1. Consumer adds products to cart / El consumidor añade productos al carrito
2. Enters shipping address and card details / Introduce dirección y datos de tarjeta
3. Frontend calls `POST /api/pagos/crear-intent` → receives Stripe `clientSecret`
4. Stripe processes payment → order created via `POST /api/pedidos` / Stripe procesa el pago → se crea el pedido
5. Backend verifies payment before registering order (5% fee) / El backend verifica el pago antes de registrar el pedido (comisión del 5%)

### Farmer Application / Solicitud de agricultor
1. User registers or logs in as consumer / El usuario se registra o inicia sesión como consumidor
2. Fills in farm details form / Rellena el formulario con datos de su finca
3. Request set to `pending` / La solicitud queda en estado `pendiente`
4. Admin approves → role upgraded to `farmer` / El administrador aprueba → el usuario pasa a rol `agricultor`

---

## Running Locally / Ejecución en Local

### Prerequisites / Requisitos
- Node.js 18+
- Internet connection / Conexión a internet (Supabase is cloud-hosted / está en la nube)

### 1. Install dependencies / Instalar dependencias

```bash
cd backend
npm install
```

### 2. Environment variables / Variables de entorno

Create `backend/.env` / Crea el archivo `backend/.env`:

```env
PORT=3001
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
JWT_SECRET=a_long_secret_key
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 3. Load demo data / Cargar datos de demo

```bash
npm run seed
```

Safe to run multiple times — does not duplicate data. / Seguro ejecutarlo varias veces, no duplica datos.

### 4. Start / Arrancar

```bash
npm start          # production / producción
npm run dev        # development with auto-restart / desarrollo con auto-restart
```

Server at / Servidor en `http://localhost:3001`

### 5. Frontend

```bash
npm run frontend   # http://localhost:3000
npm run dev        # frontend + backend together / juntos (from project root / desde raíz)
```

---

## Project Structure / Estructura del Proyecto

```
FARMERHAND_CLEAN/
├── Frontend/
│   └── public/
│       ├── index.html                  ← landing + catalogue / catálogo
│       ├── pages/                      ← login, register, dashboards, cart...
│       ├── js/
│       │   ├── api.js                  ← fetch wrapper with automatic JWT
│       │   ├── auth.js                 ← login, register, logout, role redirect
│       │   ├── navbar.js               ← shared navbar
│       │   ├── carrito.js              ← cart logic (localStorage)
│       │   ├── carrito-desplegable.js  ← slide-out drawer + checkout modal
│       │   ├── panel-admin.js
│       │   ├── panel-agricultor.js
│       │   └── panel-consumidor.js
│       └── css/
└── backend/
    ├── server.js                       ← entry point (port 3001)
    ├── seed.js                         ← demo data / datos de demo
    ├── routes/
    │   ├── auth.js                     ← register & login
    │   ├── productos.js                ← product CRUD + box options
    │   ├── pedidos.js                  ← orders
    │   ├── agricultores.js             ← farmer profile
    │   ├── pagos.js                    ← Stripe (intent + webhook)
    │   ├── valoraciones.js             ← ratings / valoraciones
    │   └── admin.js                    ← user & request management
    ├── middleware/
    │   ├── auth.js                     ← JWT verification
    │   ├── authorize.js                ← role-based access control (RBAC)
    │   └── bloquearAdmin.js            ← admin protection
    └── config/
        └── supabase.js                 ← Supabase client
```

---

## Database Schema / Esquema de Base de Datos

| Table / Tabla | Description / Descripción |
|---|---|
| `usuarios` | Users with role / Usuarios con rol (`consumidor`, `agricultor`, `admin`) |
| `agricultores` | Farmer profile with approval status / Perfil agricultor con estado de aprobación |
| `productos` | Products published by farmers / Productos publicados por agricultores |
| `opciones_caja` | Box sizes per product / Tamaños de caja por producto (kg, precio, descuento) |
| `pedidos` | Orders with status and Stripe reference / Pedidos con estado y referencia Stripe |
| `lineas_pedido` | Order line items / Líneas de pedido (producto, cantidad, precio) |
| `valoraciones` | Product ratings / Valoraciones de productos |

---

## Technical Decisions / Decisiones Técnicas

- **No frontend framework / Sin framework de frontend:** plain JavaScript with native ES Modules — deliberate choice to master fundamentals. / JavaScript puro con ES Modules nativos — decisión consciente para dominar los fundamentos.
- **Supabase as BaaS:** real PostgreSQL without managing servers, no ORM needed. / PostgreSQL real sin gestionar servidores, sin necesidad de ORM.
- **Stateless JWT:** role embedded in token to avoid extra DB lookups per request. / El rol viaja en el token para evitar consultas extra en cada request.
- **Stripe Payment Intents:** two-step flow to keep secret key out of the client. / Flujo de dos pasos para no exponer la clave secreta en el cliente.
- **Server-side security:** Helmet (HTTP headers), express-rate-limit (brute-force protection), CORS restricted to frontend origin. / Helmet (cabeceras HTTP), express-rate-limit (protección brute-force), CORS restringido al origen del frontend.

---

## Testing Payments / Probar Pagos

Use Stripe's test card / Usa la tarjeta de prueba de Stripe: `4242 4242 4242 4242`, any future date / cualquier fecha futura, any CVC.

To test the webhook locally use the Stripe CLI (`stripe listen`). In production it works automatically. / Para probar el webhook en local usa la CLI de Stripe. En producción funciona automáticamente.

---

## Notes for Evaluation / Notas para la Corrección

- The backend `.env` **is included in the submission** / está incluido en la entrega para facilitar la evaluación local.
- Seed creates realistic demo data: 3 product categories with multiple box sizes and discounts. / El seed crea datos realistas: 3 categorías de productos con múltiples opciones de caja y descuentos.
