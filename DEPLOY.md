# 🚀 Инструкция по деплою StaffEfficiency

Проект StaffEfficiency можно развернуть двумя основными способами:

- **Vercel** — рекомендуемый вариант (самый простой и быстрый)
- **Docker** — для self-hosted развёртывания

---

## 1. Вариант 1: Деплой на Vercel (рекомендуется)

### Шаг 1: Подготовка

1. Создайте аккаунт на [vercel.com](https://vercel.com)
2. Подключите ваш GitHub-репозиторий

### Шаг 2: Импорт проекта

1. Нажмите **Add New Project** → **Import Git Repository**
2. Выберите репозиторий `staff-efficiency`
3. Vercel автоматически определит, что это Next.js проект

### Шаг 3: Настройка переменных окружения

В разделе **Environment Variables** добавьте следующие переменные:

| Переменная                        | Обязательно | Описание                                      | Пример |
|-----------------------------------|-------------|-----------------------------------------------|--------|
| `NEXT_PUBLIC_SUPABASE_URL`        | Да          | URL вашего Supabase проекта                   | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | Да          | Публичный anon ключ                           | `eyJhbGci...` |
| `DATABASE_URL`                    | Да          | Строка подключения к Postgres (с пулером)     | `postgresql://...` |
| `DIRECT_URL`                      | Да          | Прямое подключение (для Prisma)               | `postgresql://...` |
| `SUPABASE_SERVICE_ROLE_KEY`       | Нет*        | Только если используете E2E или seed          | `eyJhbGci...` |
| `VK_BOT_TOKEN`                    | Нет         | Для VK Bot уведомлений                        | - |
| `VK_GROUP_ID`                     | Нет         | ID группы VK                                  | - |
| `VK_CONFIRMATION_TOKEN`           | Нет         | Токен подтверждения VK                        | - |
| `VK_SECRET`                       | Нет         | Секретный ключ для вебхука                    | - |
| `SMARTSHELL_API_TOKEN`            | Нет         | Токен Smartshell API                          | - |

> **Важно:** Для продакшена используйте **Supabase Pooler** (порт 6543) в `DATABASE_URL`.

### Шаг 4: Настройка сборки (опционально)

В большинстве случаев Vercel всё настроит автоматически.

При необходимости укажите:

- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

### Шаг 5: Prisma миграции в продакшене

После первого деплоя обязательно выполните миграции:

```bash
npx prisma migrate deploy
```

Это создаст новые таблицы, появившиеся после P2:
- `audit_logs` (Audit Log)
- `feature_flags` (Feature Flags)

**Рекомендация:** Добавьте `npx prisma migrate deploy` в **Post-Install Command** в настройках Vercel, чтобы миграции применялись автоматически при каждом деплое.

### Шаг 5.1: Инициализация Feature Flags

После применения миграций рекомендуется инициализировать дефолтные feature flags:

```bash
npx prisma db seed
```

Или вручную создайте записи в таблице `feature_flags`:
- `VK_NOTIFICATIONS_ENABLED` = `true` (глобально)
- `BONUS_RESET_CONFIRMATION` = `false` (глобально)
- `AUDIT_LOG_ENABLED` = `true` (глобально) — рекомендуется оставить включённым
- `ENHANCED_INVENTORY_UI` = `false` (глобально)

Это позволит сразу управлять уведомлениями, подтверждениями, аудитом и будущими UI-фичами без изменения кода.

### Шаг 6: Регион и авто-деплой

- Рекомендуемый регион: **Europe (Frankfurt)** или ближайший к вашей Supabase
- Автоматический деплой будет срабатывать при каждом `git push` в ветку `main`

---

## 2. Вариант 2: Docker (self-hosted)

### Требования

- Docker и Docker Compose
- Доступ к Supabase (или другой PostgreSQL)

### Шаг 1: Сборка образа

```bash
docker build -t staff-efficiency .
```

### Шаг 2: Запуск через docker-compose

Создайте файл `.env.production` с переменными окружения и выполните:

```bash
docker-compose up -d
```

### Шаг 3: Применение миграций

```bash
docker-compose exec staff-efficiency npx prisma migrate deploy
```

### Пример `docker-compose.yml`

Смотрите файл `docker-compose.yml` в корне проекта.

### Рекомендации по reverse proxy

Для продакшена рекомендуется использовать:

- **Caddy** (самый простой)
- **Nginx** + Certbot
- **Traefik**

Пример конфигурации Caddy:

```
staff.yourdomain.com {
    reverse_proxy localhost:3000
}
```

---

## 3. Общие рекомендации перед деплоем

1. **Обязательно проверьте сборку локально**:
   ```bash
   npm run build
   npm run test:bonus
   ```

2. Используйте **только production** значения переменных окружения.

3. Настройте мониторинг:
   - Vercel Analytics / Logs
   - Supabase Dashboard (логи запросов)

4. Бэкапы базы данных:
   - Supabase автоматически делает ежедневные бэкапы (в платных тарифах)
   - Для self-hosted — настройте `pg_dump` или используйте Supabase CLI

---

## 4. После деплоя — проверочный чек-лист

- [ ] Приложение открывается по HTTPS
- [ ] Успешная авторизация через Supabase
- [ ] PWA устанавливается (кнопка «Установить приложение»)
- [ ] Работают уведомления VK Bot (если настроены)
- [ ] OWNER видит все филиалы
- [ ] ADMIN видит только свой филиал
- [ ] Создание смены и расчёт бонуса работают
- [ ] Инвентаризация сохраняет данные
- [ ] VK Bot уведомления работают (если включён флаг `VK_NOTIFICATIONS_ENABLED`)
- [ ] Audit Log доступен на странице `/audit` (для OWNER)

---

## Полезные ссылки

- [Vercel Documentation](https://vercel.com/docs)
- [Prisma Migrate in Production](https://www.prisma.io/docs/orm/prisma-migrate/workflows/production-and-testing-environments)
- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [Next.js Standalone Output](https://nextjs.org/docs/app/api-reference/next-config-js/output#automatically-copying-traced-files)

---

**Удачного деплоя!** Если возникнут вопросы — создайте Issue в репозитории.
