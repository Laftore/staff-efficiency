# 🖥️ StaffEfficiency — Дашборд эффективности администраторов ПК-клуба

**Внутренний инструмент для владельца и администраторов 3 филиалов.**  
Главная ценность: **автоматический расчёт бонуса за смену по выручке** + удобная инвентаризация магазина + интеграция Smartshell (смены, продажи товаров).

## 🚀 Ключевые возможности

- **Автоматический расчёт бонуса** (0–1500 ₽) по формулам из Excel (`lib/kpi/bonus.ts`) с учётом выручки, плана, корректировок
- **Инвентаризация live** — факт → продано, разница, остаток на складе (с интеграцией Smartshell)
- **Multi-tenant** (3 филиала) + ролевой доступ: OWNER (все филиалы), SENIOR_ADMIN, ADMIN (свой филиал)
- **Реал-тайм KPI и графики** (Recharts) с периодом переключения (день/месяц)
- **PWA** — устанавливается как приложение, работает оффлайн
- **Интеграция Smartshell** — импорт смен, каталога товаров и данных о продажах
- **Аутентификация Supabase** с RLS (Row-Level Security) для многопользовательской безопасности

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

### 1️⃣ Клонирование и установка

```bash
git clone <repository>
cd staff-efficiency
npm install
```

### 2️⃣ Создание проекта Supabase

1. Перейти на [supabase.com](https://supabase.com)
2. Создать новый проект
3. Получить `SUPABASE_URL` и `SUPABASE_ANON_KEY` из Project Settings

### 3️⃣ Конфигурация переменных окружения

```bash
cp .env.example .env.local
```

Заполнить:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...

# Prisma
DATABASE_URL=postgresql://xxx:xxx@xxx.supabase.co:5432/postgres

# (опционально) VK Bot
VK_BOT_TOKEN=xxx
VK_GROUP_ID=xxx
```

### 4️⃣ Инициализация БД и Prisma

```bash
# Генерация Prisma Client
npx prisma generate

# Применение миграций
npx prisma migrate deploy

# Заполнение БД тестовыми данными
npx prisma db seed
```

### 5️⃣ Запуск приложения

```bash
# Режим разработки
npm run dev

# Или build + production
npm run build
npm start
```

Откройте [http://localhost:3000](http://localhost:3000) и отредактируйте `app/page.tsx`.

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
  └─ branches/         → Филиалы (CRUD, только для OWNER)
```

Каждая страница:
- Использует **Server Components** для загрузки данных
- **Server Actions** для мутаций (create/update/delete)
- **Client Components** только где нужна интерактивность (формы, диалоги)
- **RLS policies** на уровне БД гарантируют безопасность

## 🧪 Тестирование

### Тест формулы бонуса

```bash
npm run test:bonus
```

Проверяет:
- Корректность вычисления процента превышения плана (O)
- Расчёт базового бонуса (P) по формулам
- Финальный бонус (Q) с корректировками
- Флаг `needsReset` для смен с отрицательным бонусом

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

## 🎨 Стиль и тема

**Кибер-тёмная тема** по умолчанию:
- Фон: `#07070d` (почти чёрный)
- Основной акцент: `#a855f7` (фиолетовый)
- Используется `next-themes` для переключения тём (light/dark)

Палитра настраивается в `tailwind.config.ts` и `globals.css`.

## 📚 Дополнительная информация

- [PRD.md](./PRD.md) — Полная спецификация проекта
- [PROJECT_STATUS.md](./PROJECT_STATUS.md) — Текущий статус разработки и todo-лист

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

Internal use only.
