# CONTEXT.md — Mi Dinero Backend (estado de avance)

> Documento de contexto para cualquier modelo/agente que retome este proyecto.
> Generado el 2026-09-04 (actualizado tras refactor BillingCycle → CreditCard).
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

## 3. Estructura de carpetas (src/)
- config/db.js                  -> prisma client singleton con extensión `softDelete` (ver §7)
- app.js / server.js
- routes/                       -> index.js + un archivo por recurso
- controllers/                  -> uno por recurso
- services/                     -> uno por recurso (lógica)
- helpers/                      -> paginationHelper.js, currencyHelper.js
- middlewares/                  -> auth.js, validateRequest.js, errorHandler.js, logger.js
- jobs/                         -> exchangeRateJob.js
- __tests__/                    -> services/ y routes/controllers (Jest)

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
- **20260904174225_all_new** (CreditCard + account.creditCardId + billing_cycles.creditCardId)

Tablas: users, accounts, categories, exchange_rates, billing_cycles,
credit_cards, transactions, transfers, contacts, transaction_shares, loans,
loan_payments, installment_plans, installments.

### Fase 6 — Refactor BillingCycle → CreditCard  [HECHO A NIVEL SCHEMA, PENDIENTES ABAJO]
Arquitectura nueva implementada parcialmente.

Schema aplicado (migración `all_new`):
- Nuevo modelo `CreditCard` (userId, name, brand?, bankCurrency, isActive,
  soft delete).
- `Account.creditCardId` (nullable; null para cuentas que NO son tarjeta).
- `BillingCycle.accountId` reemplazado por `BillingCycle.creditCardId`.
- `User.creditCards` relación añadida.

Archivos nuevos:
- src/services/creditCardService.js
- src/controllers/creditCardController.js
- src/routes/creditCards.js (registrado en routes/index.js)
- prisma/migrations/20260904174225_all_new/migration.sql

Archivos modificados para usar `creditCardId`:
- src/services/billingCycleService.js
- src/services/transactionService.js (helper `resolveBillingCycle` por
  `account.creditCardId` — bug del punto 2.1 RESUELTO)
- src/routes/billingCycles.js (validador `creditCardId`)

**Pendientes Fase 6:**
1. `creditCardService.deleteCreditCard` sigue usando `prisma.creditCard.delete`
   (hard delete); además tiene un `//TODO:` indicando que falta implementar la
   cascada de soft delete hacia `Account` y `BillingCycle`. Cambiar a:
   ```js
   const now = new Date();
   await prisma.$transaction([
     prisma.billingCycle.updateMany({ where: { creditCardId: id, deletedAt: null }, data: { deletedAt: now } }),
     prisma.account.updateMany({     where: { creditCardId: id, deletedAt: null }, data: { deletedAt: now } }),
     prisma.creditCard.update({      where: { id }, data: { deletedAt: now } }),
   ]);
   ```
   Nota: la extensión Prisma `softDelete` en `config/db.js` ya reescribe
   `prisma.creditCard.delete(...)` a un update con `deletedAt`, pero NO
   cascadea automáticamente a otras tablas; hay que hacerlo a mano.
2. `creditCardService.getCreditCards` recibe `filters` pero lo ignora
   (firma `getCreditCards(userId, filters)` → no usa `filters`). Añadir
   soporte para filtros: `isActive`, búsqueda por `name` (contains).
3. Validación `routes/creditCards.js`: `creditCardId` no aparece en ninguna
   regla (es correcto, el body solo necesita name/brand/bankCurrency). Sin
   embargo falta el middleware/auth de ownership antes de update/delete (hoy
   cualquiera con token puede borrar cualquier CreditCard por id).
4. No hay `creditCardService.getCreditCardsByUser` con `include` de cuentas y
   ciclos (útil para la pantalla de detalle de tarjeta).
5. `routes/creditCards.js` valida `bankCurrency` con `isIn(["PEN","USD"])`
   pero el modelo lo define como **opcional** (`Currency?`). El servicio
   no fuerza el default → si no se envía, en BD queda `NULL`. Decidir:
   (a) forzar default PEN en el servicio si llega null/undefined;
   (b) permitir null y mostrar "moneda a definir".
6. `BillingCycle.creditCardId` validado como `.optional()` en el route
   (`body("creditCardId").optional().isInt()`). Debería ser **requerido**
   para nuevos ciclos (un BillingCycle sin tarjeta no tiene sentido).
7. **No hay tests** para `creditCardService` ni `billingCycleService` (la
   lógica con CreditCard nueva no está cubierta). Tampoco para
   `transactionService` ni `transactionController`.
8. Falta `GET /credit-cards/:id/billing-cycles?year=YYYY` y
   `GET /billing-cycles/:id/summary` (este último es el más importante:
   total consolidado `amountBase`, total en `bankCurrency`, lista de
   transactions del ciclo).
9. `routes/creditCards.js` no usa `controller.getCreditCards` con paginación
   ni filtra `deletedAt: null` en listados. La extensión `softDelete` del
   prisma client ya filtra automáticamente (ver §7), así que findMany está
   cubierto; verificar que `getCreditCardById` también pase por ahí.

### Fase 2 — Transactions + BillingCycles  [PARCIALMENTE HECHO, REPLANTEADO]
Implementado en su mayoría, ahora con `creditCardId`.

Archivos:
- helpers/currencyHelper.js  -> convertToBase(amount, currency, date)
- services/transactionService.js (createTransaction + getTransactions + getTransactionById + deleteTransaction + resolveBillingCycle)
- services/billingCycleService.js (create, getById, getByUser, delete)
- controllers/transactionController.js, billingCycleController.js
- routes/transactions.js, billingCycles.js (registrados en routes/index.js)

Pendientes / bugs conocidos en Fase 2:
1. ~~BUG en transactionService.js:12~~ — RESUELTO en Fase 6; ahora `resolveBillingCycle`
   busca por `account.creditCardId` (no por tipo de cuenta).
2. deleteTransaction / deleteBillingCycle siguen usando `prisma.x.delete` (hard
   delete). Aunque la extensión `softDelete` del prisma client (§7) los
   reescribe a `update deletedAt`, **deleteBillingCycle** no está protegido:
   no valida ownership (`userId`), cualquiera con token puede borrar cualquier
   BillingCycle. deleteTransaction idem (no filtra `userId`).
3. getTransactions tiene TODO: faltan filtros (type, accountId, categoryId,
   source, rango de date).
4. createTransaction no valida que la cuenta exista (account puede ser null →
   crash en `.currency`) ni protege `categoryId` undefined antes de parseInt
   (`parseInt(undefined)` → NaN).
5. Falta método/route de UPDATE para Transaction y BillingCycle.
6. `console.log` ya no aparece en transactionService (limpio).
7. Transacción fuera de BillingCycle → guardada con `billingCycleId = null`
   (decisión §2). No hay aún endpoint para reasignar a un ciclo.
8. No hay tests.

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

### Fase 5 — Tests + Reportes  [PENDIENTE]
- Tests por módulo:
  - ✅ accountService (unit), categoryService (unit), accountController (unit),
    accounts route (integration con supertest).
  - ❌ creditCardService, billingCycleService, transactionService,
    transactionController, billingCycleController, authService.
  - ❌ routes/creditCards, routes/billingCycles, routes/transactions,
    routes/categories, routes/exchangeRate, routes/auth.
- Reportes pendientes:
  - GET /billing-cycles/:id/summary (mover a Fase 6 / hacer aquí)
  - GET /reports/debt-summary
  - GET /reports/debts-by-contact

## 5. Convenciones a respetar
- Servicios reciben `data` y usan `prisma.<model>`. Errores P2025 → "not found".
- Controllers: `req.user.id` del token, try/catch, 201/400/404/500/204.
- Rutas: express-validator + validateRequest + authenticateToken.
- Soft delete con `deletedAt`.
- `amountBase` siempre en PEN (`convertToBase`) para sumar entre divisas.
- Aliassing de imports: `@/services/...`, `@/helpers/...` (configurado en
  `jsconfig.json` + `module-alias` en `server.js`).
- Tests: mocks de `db.getClient()` y de servicios vía `jest.mock` (ver patrón
  en `__tests__/services/accountService.test.js`).

## 6. Tipo de cambio
- exchangeRateService.getRateByDate(base, target, date); saveExchangeRate.
- Job automático: cron `0 6 * * *` en `jobs/exchangeRateJob.js` (fetchFromSunat + save).
- currencyHelper asume `rate = PEN por 1 unidad de la divisa origen` (se guarda
  USD→PEN con "buy" de SUNAT para compras, "sell" para ventas). **OJO**: en
  `exchangeRateController.syncManually` se guarda `sell` de BCRP como rate, lo
  cual es una inconsistencia con el job que guarda `buy` de SUNAT. Revisar.
- Falta `convertFromBase(amount, baseCurrency, targetCurrency, date)` para
  armar el resumen del BillingCycle en `bankCurrency`.

## 7. Capa de soft delete (db.js)
El singleton de Prisma está extendido con un `$allModels` que sobreescribe
`findMany`, `findFirst`, `findUnique` y `update` para añadir
`deletedAt: null` automáticamente al `where`, y sobreescribe `delete` para
hacer `update deletedAt = now()` en lugar de hard delete.

Implicaciones:
- `prisma.x.delete()` ya es soft delete. No hace falta cambiarlo a `update`.
- `prisma.x.findMany/findFirst/findUnique/update` ya filtran `deletedAt: null`.
- Si necesitas BYPASS (ej. admin query), usar `prisma.$queryRaw` o saltarse
  la extensión. Hoy no hay caso.
- ⚠️ La extensión NO cascada: borrar un CreditCard vía `prisma.creditCard.delete`
  no marca sus Accounts ni BillingCycles. Por eso la Fase 6 #1 requiere
  lógica explícita con `$transaction([updateMany, updateMany, update])`.

## 8. Auth
- `authService.registerUser(email, password, name)` → bcrypt.hash + prisma.user.create.
- `authService.loginUser(email, password)` → bcrypt.compare + JWT (2h, secret en .env).
- `middlewares/auth.js` valida `Authorization: Bearer <token>` y setea
  `req.user = { id, email }` (decoded JWT).
- ⚠️ El login mete `name` (puede ser string) en el JWT y los controllers
  hacen `req.user.id` o `req.user.userId`. Revisar consistencia.
- ⚠️ Casi todos los controllers confían en `req.user.id` pero `update` y
  `delete` de creditCards/accounts/categories/transactions/billingCycles
  **no verifican ownership** (no comparan el recurso.userId con req.user.id).
  Solo `categoryController.getCategories` usa `req.user.userId`. Bug de
  seguridad transversal.

## 9. Estado de las migraciones contra la realidad
Las últimas dos migraciones funcionales son de **2026-09-04**:
- `20260904064021_null_for_bank_amount`
- `20260904174225_all_new`

Antes hubo otras de 2026-04 (categorías, exchange rates, deletedAt). El
init original es de 2026-03.

No hay archivo `prisma/seed.js` aún (no existe en el árbol). Cuando se
necesite poblar la BD de desarrollo tras un reset, hay que crearlo desde cero.

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
