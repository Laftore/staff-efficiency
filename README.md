# 🖥️ StaffEfficiency — Дашборд эффективности администраторов ПК-клуба

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js 16">
  <img src="https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-green?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase">
  <img src="https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma">
  <img src="https://img.shields.io/badge/PWA-Ready-5B21B6?style=for-the-badge&logo=pwa&logoColor=white" alt="PWA">
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="MIT License">
</p>

**Внутренний инструмент для владельца и администраторов 3 филиалов.**  
Главная ценность: **автоматический расчёт бонуса за смену по выручке** + удобная инвентаризация магазина + интеграция Smartshell (смены, продажи товаров).

## 🚀 Ключевые возможности

- **Автоматический расчёт бонуса** (0–1500 ₽) по формулам из Excel (`lib/kpi/bonus.ts`) с учётом выручки, плана, корректировок
- **Инвентаризация live** — факт → продано, разница, остаток на складе (с интеграцией Smartshell)
- **Multi-tenant** (3 филиала) + ролевой доступ: OWNER (все филиалы), SENIOR_ADMIN, ADMIN (свой филиал)
- **Реал-тайм KPI и графики** (Recharts) с периодом переключения (день/месяц)
- **PWA** — устанавливается как приложение, работает оффлайн
- **Интеграция Smartshell** — импорт смен, каталога товаров и данных о продажах
- **VK Bot уведомления** — автоматические оповещения владельца и старших администраторов о новых сменах, необходимости обнуления бонуса и его сбросе
- **Аутентификация Supabase** с RLS (Row-Level Security) для многопользовательской безопасности
- **Мгновенная обратная связь** — toast-уведомления (sonner) на 100% Server Actions
- **Профессиональная DataTable** в инвентаризации (поиск, фильтры по категории, сортировка без @tanstack)
- **Полноценные состояния** — глобальные и секционные `loading.tsx`, `error.tsx`, `not-found.tsx`

## 🛠 Технический стек

| Компонент | Технология |
|-----------|-----------|
| **Framework** | Next.js 16 (App Router, Server Components, Server Actions) |
| **Язык** | TypeScript (strict mode) |
| **База данных** | Supabase (PostgreSQL) + Prisma ORM |
| **Аутентификация** | Supabase Auth + RLS policies |
| **Стили** | Tailwind CSS 4 + shadcn/ui + lucide-react |
| **Формы** | React Hook Form + Zod (валидация) |
| **Графики** | Recharts |
| **Тема** | next-themes (тёмная кибер-тема по умолчанию) |
| **PWA** | @serwist/next + Web App Manifest |
| **Тестирование** | Node.js test runner (Unit tests) |

## 📦 Быстрый старт

```bash
git clone <repository>
cd staff-efficiency
npm install
cp .env.example .env.local   # заполните переменные
npx prisma generate
npx prisma migrate deploy
npm run dev
```

**Основные переменные** (см. `.env.example`):
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `DATABASE_URL` (Supabase Postgres)
- Опционально: VK Bot токены

После запуска приложение доступно на [http://localhost:3000](http://localhost:3000).

> **Инструкция по деплою:** см. [DEPLOY.md](./DEPLOY.md) (Vercel и Docker)

## 🤖 VK Bot (уведомления)

Система поддерживает отправку уведомлений через VK:

- При создании новой смены
- Когда бонус требует обнуления (`needsReset` / Q < 0)
- При принудительном обнулении бонуса

### Настройка

1. Владелец (OWNER) указывает свой **VK Chat ID** (peer_id) на странице **«Филиалы»**.
2. Для получения своего Chat ID напишите боту команду `/myid` (или используйте веб-интерфейс на странице «Филиалы»).
3. Уведомления получают:
   - OWNER — по всем филиалам
   - SENIOR_ADMIN — только по закреплённому за ними филиалу

Переменные окружения описаны в `.env.example`.

## 📐 Архитектура

### Multi-tenant структура

```
User (role: OWNER / SENIOR_ADMIN / ADMIN)
  ├─ Branch 1
  │   ├─ Shifts
  │   ├─ Employees
  │   └─ Inventory
  ├─ Branch 2
  └─ Branch 3
```

- **OWNER**: доступ ко всем 3 филиалам, может управлять ролями, видит агрегированные KPI
- **SENIOR_ADMIN / ADMIN**: доступ только к своему филиалу

Безопасность реализована через:
- Supabase RLS policies на уровне БД
- Проверки `getSessionUser()` + `canAccessAllBranches()` в Server Actions
- `branchId` пользователя влияет на все запросы

### Расчёт бонуса (lib/kpi/bonus.ts)

Автоматическая формула, основанная на Excel:
1. **O** = процент превышения плана (если выручка > план_дня/ночи)
2. **P** = базовый бонус (зависит от O, от 0 до 1000/500 ₽)
3. **Q** = финальный бонус (P + корректировка, макс 1500 ₽)
4. **needsReset** = флаг, требует ли смена обнуления бонуса

Ведущая логика:
```typescript
export function calculateBonus(input: BonusInput): BonusOutput
```

Тесты: `lib/kpi/bonus.test.ts` (14 тестов, все ✓)

### Страницы и компоненты

```
app/(dashboard)/
  ├─ page.tsx          → Дашборд (KPI, графики)
  ├─ shifts/           → Смены (CRUD, бонус)
  ├─ inventory/        → Инвентаризация (live расчёты)
  ├─ employees/        → Сотрудники (CRUD)
  ├─ branches/         → Филиалы (CRUD, только для OWNER)
  └─ audit/            → Журнал аудита действий (только OWNER)
```

Каждая страница:
- Использует **Server Components** для загрузки данных
- **Server Actions** для мутаций (create/update/delete)
- **Client Components** только где нужна интерактивность (формы, диалоги)
- **RLS policies** на уровне БД гарантируют безопасность

### Архитектура после P1/P2

Проект следует гибридному подходу:

- **Тонкие Server Actions** — только валидация + вызов сервиса + side effects (`withAction`)
- **Сервисный слой** — основная бизнес-логика и авторизация:
  - `lib/shifts/shift.service.ts`
  - `lib/inventory/inventory.service.ts`
- **Audit Log** — все важные действия логируются (`lib/audit/audit.service.ts`)
- **Feature Flags** — гибкое управление функциональностью (`lib/feature-flags/feature-flags.service.ts`)

## 🔒 Security

Проект построен с акцентом на безопасность в multi-tenant среде:

- **Supabase Row Level Security (RLS)** — политики на уровне базы данных для всех таблиц
- **Серверные проверки доступа** — `getSessionUser()`, `canAccessAllBranches()`, `assertBranchAccess()` в Server Actions
- **Security Headers** — настроены в `next.config.ts` (`X-Frame-Options: DENY`, `Strict-Transport-Security`, `Referrer-Policy` и др.)
- **Принцип наименьших привилегий** — каждый пользователь видит данные только своего филиала (кроме OWNER)

**Рекомендации:**
- Не коммитьте `.env.local` и Service Role Key
- Используйте `.env.example` как эталон
- Service Role Key применяется только в доверенном коде (seed, E2E setup)

## 📋 Audit Log

Система логирования важных действий в проекте:

- Автоматически логируются: создание/изменение смен, сброс бонусов, изменение ролей, сохранение инвентаризации.
- Доступ к полному журналу есть только у **OWNER**.
- Страница: `/audit` (с фильтрами по филиалу, типу действия и датам).

Сервис: `lib/audit/audit.service.ts`

## 🚩 Feature Flags

Простая система feature flags с поддержкой глобальных и per-branch значений:

- `VK_NOTIFICATIONS_ENABLED` — глобальное включение/отключение VK Bot уведомлений
- `BONUS_RESET_CONFIRMATION` — требует дополнительного подтверждения при сбросе бонуса
- `AUDIT_LOG_ENABLED` — kill-switch для Audit Log (по умолчанию включён)
- `ENHANCED_INVENTORY_UI` — зарезервирован для прогрессивного улучшения UI инвентаризации

Использование:
```ts
import { isFeatureEnabled } from "@/lib/feature-flags/feature-flags.service";

const enabled = await isFeatureEnabled("VK_NOTIFICATIONS_ENABLED", branchId);
```

Сервис: `lib/feature-flags/feature-flags.service.ts`

## 🧪 Тестирование

### Unit-тесты формулы бонуса

```bash
npm run test:bonus
```

### Тесты сервисов и Server Actions

```bash
npx vitest run
```

Покрытие включает:
- `shift.service.ts` и `inventory.service.ts` (мульти-тенантность, роли, авторизация)
- Server Actions с использованием `withAction`
- Интеграцию с Audit Log и Feature Flags

### E2E-тесты

```bash
npm run test:e2e
```

## 🔌 Интеграция Smartshell

### Импорт данных

1. **Смены** (`/api/smartshell/shifts`) — рабочие периоды администратора
2. **Каталог товаров** (`/api/smartshell/catalog`) — список товаров со свойствами
3. **Продажи товаров** (`/api/smartshell/sales`) — кол-во проданных товаров и выручка

Данные автоматически кешируются в Prisma и отображаются в таблице инвентаризации.

## 📱 PWA (Progressive Web App)

Приложение полностью готово к установке как приложение:

- **Manifest**: `public/manifest.webmanifest` содержит метаданные (название, иконки, категории, shortcuts)
- **Иконки**: 192×192 и 512×512 пикселей (PNG, maskable)
- **Service Worker**: `app/sw.ts` + `public/sw.js` (сгенерирован через Serwist)
- **Offline режим**: Стратегии кеширования для ключевых маршрутов

### Установка

- **Desktop/Chrome**: Адресная строка → "Установить приложение"
- **iOS**: Safari → Поделиться → Добавить на экран
- **Android**: Меню → "Установить приложение"

## 📸 Скриншоты

> Реальные скриншоты будут добавлены в папку `public/screenshots/`

<div align="center">

### Главный дашборд
![Dashboard](https://placehold.co/800x450/111113/a855f7?text=Dashboard%0AKPI+%26+Recharts)

### Инвентаризация (DataTable)
![Inventory](https://placehold.co/800x450/111113/a855f7?text=Inventory%0ASearch+%2B+Filters+%2B+Sorting)

### PWA на мобильном устройстве
![PWA Mobile](https://placehold.co/400x700/111113/a855f7?text=PWA%0Aon+Mobile)

</div>

---

## 🎨 Стиль и тема

**Кибер-тёмная тема** по умолчанию:
- Фон: `#07070d` (почти чёрный)
- Основной акцент: `#a855f7` (фиолетовый)
- Используется `next-themes` для переключения тём (light/dark)

Палитра настраивается в `tailwind.config.ts` и `globals.css`.

## 📚 Дополнительная информация

- [LICENSE](./LICENSE) — MIT License
- [SECURITY.md](./SECURITY.md) — Политика безопасности
- [CONTRIBUTING.md](./CONTRIBUTING.md) — Правила участия в разработке
- [PROJECT_STATUS.md](./PROJECT_STATUS.md) — Текущий статус разработки и история спринтов

## 🛠 Полезные команды

| Команда | Описание |
|---------|---------|
| `npm run dev` | Запуск dev сервера (localhost:3000) |
| `npm run build` | Build для production |
| `npm start` | Запуск production сервера |
| `npm run lint` | Проверка ESLint |
| `npm run test:bonus` | Запуск тестов формулы бонуса |
| `npm run gen:icons` | Переgenerate иконки PWA |
| `npm run db:generate` | Обновление Prisma Client |
| `npm run db:push` | Синхронизация schema.prisma с БД |
| `npm run db:seed` | Заполнение БД тестовыми данными |
| `npm run db:studio` | Prisma Studio (UI для БД) |

## 📝 Лицензия

Проект распространяется под лицензией MIT. См. [LICENSE](./LICENSE).
