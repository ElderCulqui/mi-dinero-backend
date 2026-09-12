# CONTEXT.md — Mi Dinero Backend (estado de avance)

> Documento de contexto para cualquier modelo/agente que retome este proyecto.
> Creado el 2026-09-04. Última revisión: 2026-09-11 (revisión de estado + fixes).
> Stack: Node + Express + Prisma 7 + PostgreSQL.

## 1. Objetivo
Backend de finanzas personales: registrar ingresos/egresos, controlar deuda
(préstamos bancarios + compras en cuotas en tarjeta), ciclos de facturación de
tarjeta, deudas con familiares (reparto y cobro multi-divisa) y transferencias
entre cuentas propias.

## 2. Decisiones de diseño
- Una cuenta por divisa (`Account.currency` ∈ {PEN, USD}). La tarjeta
  multimoneda = 2 cuentas (Tarjeta Soles / Tarjeta USD).
- **Una tarjeta de crédito es una entidad (`CreditCard`) dueña de N cuentas
  (1 o 2 según monedas) y dueña de los BillingCycles.** Los ciclos del año
  pertenecen a la tarjeta física, no a cada cuenta PEN/USD por separado
  (evita duplicación 12×2).
- `Transaction` sigue apuntando a `Account` (mantiene `currency`, reportes
  por cuenta/divisa). El `billingCycleId` resuelve el ciclo a nivel de tarjeta.
- `CreditCard.bankCurrency` (PEN/USD) define en qué moneda se expresa
  `BillingCycle.bankAmount`. Total del ciclo se calcula convirtiendo las
  transactions del rango a esa moneda con TC histórico.
- Cronograma de préstamos/cuotas en modelos separados, enlazados a Transaction
  (permite amortización parcial/total).
- Divisa base de consolidación: **PEN**. Helper `convertToBase`.
- Gastos familiares: se dividen vía `TransactionShare` (pivot). Estado
  pendiente/cobrado.
- Transferencias entre cuentas propias = `Transfer`, excluidas de totales
  (source='transfer').
- Reembolso: ingreso real en cuenta + share marcado cobrado con TC usado.
- Si una transacción de tarjeta cae **fuera** de todo BillingCycle existente
  (por rango de fechas) → se crea con `billingCycleId = null` para
  reasignación manual posterior. No se auto-crea el ciclo.
- Validación condicional por `type`: `creditCardId` es requerido solo para
  cuentas `tarjeta_credito`; para el resto se permite `null` (implementado en
  `routes/accounts.js` con `optional({ nullable, checkFalsy })` + `.if(...)`).
- `BillingCycle.creditCardId` es requerido y se valida contra la tarjeta del
  usuario (`existsActiveOwnedByUser`), más validación de solapamiento por rango.

## 3. Estructura de carpetas (src/)
- config/db.js                  -> prisma client singleton con extensión `softDelete` (ver §7)
- app.js / server.js
- routes/                       -> index.js + un archivo por recurso
- controllers/                  -> uno por recurso
- services/                     -> uno por recurso (lógica)
- helpers/                      -> paginationHelper.js, currencyHelper.js,
                                   dateValidators.js (ventanas de fecha, dateAfter, maxDaysApart)
- middlewares/                  -> auth.js, validateRequest.js, errorHandler.js, logger.js
- middlewares/validators/       -> fkValidators.js (existsActive / existsActiveOwnedByUser),
                                   ownership.js (requireOwnership), commonRules.js
                                   (paramIntId, positiveInt, nonNegativeNumeric),
                                   domainValidators.js (noBillingCycleOverlap), index.js
- jobs/                         -> exchangeRateJob.js
- __tests__/                    -> services/, controllers/, routes/ (Jest) — ver §11

Rutas registradas en `routes/index.js`:
- /auth, /accounts, /categories, /exchange-rates, /transactions,
  /billing-cycles, /credit-cards (todas bajo prefijo /api en app.js).

## 4. Estado por módulo

### Fase 1 — Base de datos  [HECHO]
Migraciones aplicadas:
- 20260315040251_init
- 20260315040549_rename_user_to_users
- 20260329004601_add_password_field
- 20260403005527_create_accounts_table
- 20260403062920_add_deleted_at_to_accounts_table
- 20260405002434_add_deleted_at_to_users
- 20260411165036_create_categories_table
- 20260412044030_create_exchange_rates_table
- 20260412061205_add_deleted_at_to_exchange_rates_table
- 20260903231754_create_financial_entities
- 20260903232846_add_user_id_to_contacts
- 20260904025419_null_for_columns
- 20260904064021_null_for_bank_amount
- 20260904174225_all_new (CreditCard + account.creditCardId + billing_cycles.creditCardId)

Tablas: users, accounts, categories, exchange_rates, billing_cycles,
credit_cards, transactions, transfers, contacts, transaction_shares, loans,
loan_payments, installment_plans, installments.

### Correcciones aplicadas el 2026-09-11
1. `creditCardService.delete`: faltaban `const cardId = parseInt(id)` y
   `const now = new Date()` → `ReferenceError`. Añadidos. El cascade de soft
   delete (billingCycles → accounts → creditCard) ya funciona con
   `$transaction([updateMany, updateMany, update])`.
2. `authService.register`: `prisma.user.findUnique({ where: { email } })`
   (estaba `{ user: { email } }`, inválido).
3. `routes/creditCards.js`: se quitó la regla `body("description")` porque el
   modelo `CreditCard` no tiene ese campo.
4. `routes/categories.js`: se añadió `validateRequest` tras `paramIntId()`.
5. `middlewares/validators/commonRules.js`: `nonNegativeNumeric` usaba
   `body(param)` (undefined) → corregido a `body(field)` y typo de mensaje.
6. `app.js`: `errorHandler` estaba registrado ANTES de las rutas (nunca se
   ejecutaba). Movido al final.
7. `exchangeRateController.getLatestRate`: leía `req.query.base/target` pero la
   ruta valida `baseCurrency/targetCurrency` → corregido.

### Fase 6 — Refactor BillingCycle → CreditCard  [CASI CERRADA]
Schema aplicado (migración `all_new`):
- Nuevo modelo `CreditCard` (userId, name, brand?, bankCurrency?, isActive,
  soft delete). **No tiene `description`.**
- `Account.creditCardId` (nullable; null para cuentas que NO son tarjeta).
- `BillingCycle.accountId` reemplazado por `BillingCycle.creditCardId`.
- `User.creditCards` relación añadida.

Archivos:
- src/services/creditCardService.js (create, getAll, getById, update, delete)
- src/controllers/creditCardController.js
- src/routes/creditCards.js (registrado en routes/index.js; con requireOwnership)
- prisma/migrations/20260904174225_all_new/migration.sql

Estado de pendientes:
1. ✅ Cascade de soft delete en `delete` (billingCycles + accounts + tarjeta).
2. ✅ `getAll(userId, filters)` soporta `isActive` y `name` (contains, insensitive).
3. ✅ Ownership en GET/:id, PUT y DELETE vía `requireOwnership`.
4. ❌ Falta un método/endpoint de detalle con `include` de cuentas y ciclos
   (útil para pantalla de tarjeta).
5. ✅ `create` fuerza `bankCurrency || "PEN"` si llega null/undefined.
6. ✅ `BillingCycle.creditCardId` requerido y con ownership.
7. ❌ Sin tests para `creditCardService` ni `billingCycleService`.
8. ❌ Faltan `GET /credit-cards/:id/billing-cycles?year=YYYY` y
   **`GET /billing-cycles/:id/summary`** (el más importante: total consolidado
   `amountBase`, total en `bankCurrency`, lista de transactions del ciclo).
9. ❌ Sin paginación en el listado de tarjetas (findMany sí filtra `deletedAt`
   por la extensión §7).

### Fase 2 — Transactions + BillingCycles  [PARCIALMENTE HECHO]
Archivos:
- helpers/currencyHelper.js -> convertToBase(amount, currency, date)
- services/transactionService.js (create, getAll, getById, delete, resolveBillingCycle)
- services/billingCycleService.js (create, getById, getByUser, delete)
- controllers/transactionController.js, billingCycleController.js
- routes/transactions.js, billingCycles.js (con middleware de validación/ownership)

Estado de pendientes:
1. ✅ `resolveBillingCycle` busca por `account.creditCardId`.
2. ✅ Ownership de delete/getById resuelto a nivel de ruta con `requireOwnership`
   (los services siguen usando `prisma.x.delete`, que la extensión convierte en
   soft delete).
3. ✅ `getAll` (transactions) soporta filtros type, accountId, categoryId,
   source y rango `from`/`to` (validados en la ruta con `listQueryRules`).
4. ✅ `create` valida que la cuenta exista ("Account no existe o fue eliminada")
   y usa `safeParseInt` para `accountId`/`categoryId`/`billingCycleId`.
5. ❌ Falta método/route de UPDATE para Transaction y BillingCycle.
6. ✅ Sin `console.log` en transactionService.
7. ❌ No hay endpoint para reasignar `billingCycleId` de una transacción.
8. ❌ No hay tests de transactionService/transactionController/billingCycleController.

### Fase 3 — Contacts + TransactionShare + Transfers  [PENDIENTE]
- CRUD Contact (solo el modelo existe; falta service/route/controller).
- POST /transactions/:id/shares (repartir gasto).
- PATCH /transaction-shares/:id/cobrar (marcar cobrado + settlementRate/
  Currency/Amount + reimbursementTxnId + crear Transaction ingreso).
- CRUD Transfer (crea 2 Transactions source='transfer', excluidas de totales).

### Fase 4 — Loans + LoanPayment, InstallmentPlan + Installment  [PENDIENTE]
- CRUD Loan → genera LoanPayment (cronograma).
- Pagar cuota (parcial/total): crea Transaction + suma paidAmount + recalcula
  PayStatus. Idem para InstallmentPlan → Installment (cada cuota genera
  Transaction en tarjeta que cae en su BillingCycle por rango de fechas de
  la tarjeta dueña de la cuenta).

### Fase 5 — Tests + Reportes  [PENDIENTE — ver §11]
- Reportes pendientes:
  - GET /billing-cycles/:id/summary (mover a Fase 6 / hacer aquí)
  - GET /reports/debt-summary
  - GET /reports/debts-by-contact

## 5. Convenciones a respetar
- Servicios exponen `create/getAll/getById/update/delete` (no `createX`).
  Errores P2025 → "not found".
- Controllers: `req.user.id` del token, try/catch, 201/400/404/500/204.
- Rutas: `express-validator` + `validateRequest` + `authenticateToken`.
- Middlewares de validación reutilizables:
  - `existsActiveOwnedByUser(modelName, source, field, customName)` valida que
    el FK exista, no esté borrado y pertenezca a `req.user.id`.
  - `requireOwnership(modelName, { notFoundMsg })` valida 404 (no existe) / 403
    (de otro usuario) y deja el recurso en `req.ownedResource`.
  - `paramIntId()` valida `:id` entero (requiere `validateRequest`).
  - `helpers/dateValidators.js`: `isInDateWindow`, `dateAfter`, `maxDaysApart`.
- Soft delete con `deletedAt`.
- `amountBase` siempre en PEN (`convertToBase`) para sumar entre divisas.
- Aliasing de imports: `@/services/...`, `@/helpers/...` (configurado en
  `jsconfig.json` + `module-alias` en `server.js`).
- `errorHandler` siempre al final en `app.js` (después de las rutas).

## 6. Tipo de cambio
- exchangeRateService.getRateByDate(base, target, date); saveExchangeRate.
- Job automático: cron `0 6 * * *` en `jobs/exchangeRateJob.js`
  (fetchFromSunat + save con `buy` de SUNAT).
- currencyHelper asume `rate = PEN por 1 unidad de la divisa origen`.
- ⚠️ `exchangeRateController.syncManually` guarda el `sell` de **BCRP** pero con
  `source: "SUNAT"` (inconsistente con el job, que guarda `buy` de SUNAT).
  Revisar cuál usar (compra para gastos, venta para ingresos).
- ✅ `getLatestRate` ahora lee `baseCurrency`/`targetCurrency` (antes leía
  `base`/`target` y el filtro quedaba en undefined).
- ❌ Falta `convertFromBase(amount, baseCurrency, targetCurrency, date)` para
  armar el resumen del BillingCycle en `bankCurrency`.

## 7. Capa de soft delete (db.js)
El singleton de Prisma está extendido con un `$allModels` que sobreescribe
`findMany`, `findFirst`, `findUnique` y `update` para añadir `deletedAt: null`
automáticamente al `where`, y un override a nivel `model` para `delete` que
hace `update deletedAt = now()` en lugar de hard delete.

Implicaciones:
- `prisma.x.delete()` ya es soft delete.
- `prisma.x.findMany/findFirst/findUnique/update` ya filtran `deletedAt: null`.
- Si necesitas BYPASS (ej. admin query), usar `prisma.$queryRaw`.
- ⚠️ La extensión NO cascada: borrar un CreditCard no marca sus Accounts ni
  BillingCycles. Por eso `creditCardService.delete` usa
  `$transaction([updateMany, updateMany, update])`.
- ⚠️ El override de `delete` a nivel `model` devuelve un `Promise` común, NO un
  `PrismaPromise`; por tanto **no se puede usar dentro de
  `$transaction([...])`** (error: "All elements of the array need to be Prisma
  Client promises"). Dentro de transacciones usar `updateMany`/`update`.
- ⚠️ `paginationHelper.paginate` usa `prisma[model].count`, que NO pasa por la
  extensión → el `total` incluiría filas con `deletedAt` no nulo. Corregir
  agregando `deletedAt: null` al `where` del `count` cuando se use.

## 8. Auth
- `authService.register(email, password, name)` → bcrypt.hash +
  `prisma.user.create`. Busca duplicado con `where: { email }`.
- `authService.login(email, password)` → bcrypt.compare + JWT (2h, secret en
  .env). Payload: `{ id, email, name }`.
- `middlewares/auth.js` valida `Authorization: Bearer <token>` y setea
  `req.user = { id, email, name }`.
- ✅ Consistencia: todos los controllers usan `req.user.id`.
- ✅ El bug transversal de ownership quedó resuelto con `requireOwnership` en
  las rutas de accounts, categories, transactions, billingCycles y creditCards
  (404 si no existe, 403 si es de otro usuario).

## 9. Estado de las migraciones contra la realidad
Las últimas dos migraciones funcionales son de **2026-09-04**:
- `20260904064021_null_for_bank_amount`
- `20260904174225_all_new`

Antes hubo otras de 2026-04 (categorías, exchange rates, deletedAt). El
init original es de 2026-03. No hay migraciones nuevas desde entonces.

No hay archivo `prisma/seed.js` aún. Cuando se necesite poblar la BD de
desarrollo tras un reset, hay que crearlo desde cero.

## 10. Riesgos / notas adicionales
- **Prisma 7** con `@prisma/adapter-pg`: requiere `DATABASE_URL` apuntando a
  Postgres (definido en `.env` apuntando a host `pgsql` vía docker).
- `Account.balance` se modifica en código pero no hay endpoint para
  recalcular desde transactions (no es crítico, es informativo).
- `Loan.accountId` y `InstallmentPlan.accountId` siguen apuntando a la
  cuenta específica (PEN o USD). En fase 4, decidir si esos también migran
  a `creditCardId` (recomendado para `InstallmentPlan`).
- No hay validación de `bankAmount` cuando se paga (el campo es nullable;
  se informa a mano o vía summary endpoint cuando esté hecho).
- `accountService.js` importa `paginate` de `paginationHelper` pero no lo usa
  (import muerto). `positiveInt` en `commonRules.js` tampoco se usa.

## 11. Tests (estado real 2026-09-11)
`npm test` → **4 suites fallan, 35 tests fallan / 3 pasan**. Los tests actuales
son de ANTES del refactor y referencian métodos que ya no existen
(`createAccount`, `getAccountById`, `getAccounts`, `updateAccount`,
`deleteAccount`, `createCategory`, `getCategoryById`, `getCategories`,
`updateCategory`, `deleteCategory`). Los servicios ahora exponen
`create/getAll/getById/update/delete`.

Además `__tests__/routes/accounts.test.js` espera validaciones antiguas
(`userId` en el body, paginación) que ya no aplican (ahora el `userId` sale del
token y el listado no pagina).

Suites existentes:
- `__tests__/services/accountService.test.js` (desactualizado)
- `__tests__/services/categoryService.test.js` (desactualizado)
- `__tests__/controllers/accountController.test.js` (desactualizado)
- `__tests__/routes/accounts.test.js` (desactualizado)

Faltan por crear: creditCardService, billingCycleService, transactionService,
transactionController, billingCycleController, authService, y rutas de
creditCards/billingCycles/transactions/categories/exchangeRate/auth.
