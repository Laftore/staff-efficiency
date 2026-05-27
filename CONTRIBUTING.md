# Contributing to StaffEfficiency

## Правила коммитов

Используем [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — новая функциональность
- `fix:` — исправление бага
- `refactor:` — рефакторинг без изменения поведения
- `chore:` — технические изменения (зависимости, скрипты и т.д.)

## Процесс Pull Request

1. Создайте ветку от `main`: `git checkout -b feat/your-feature`
2. Внесите изменения + добавьте тесты при необходимости
3. Запустите `npm run lint:fix` и `npm run build`
4. Создайте Pull Request с описанием изменений
5. После ревью и approval — мерж через Squash or Merge Commit

## Полезные команды

```bash
npm run lint:fix
npm run build
npm run test:bonus
```

Благодарим за вклад! 🚀
