# SDD: work.rodion.pro

## 1. Кратко

`work.rodion.pro` — личный внутренний центр управления проектами и разработкой.

Это **не Jira / Confluence / Notion-клон**. Это быстрый, понятный, минималистичный internal tool для одного разработчика, в котором в одном месте собраны:

- проекты
- задачи
- заметки / документация / runbooks
- учёт LLM-расходов по проектам и сессиям
- учёт инфраструктуры и затрат (домены, серверы, подписки, API)
- быстрые runtime/deploy actions для локальной и серверной разработки

Главная идея: **минимум рутины, максимум оперативного контроля**.

---

## 2. Цели продукта

### 2.1. Что должно решать приложение

1. Давать быстрый доступ ко всем текущим проектам.
2. Хранить задачи, заметки и технический контекст по каждому проекту.
3. Позволять вручную и быстро логировать LLM-сессии и расходы.
4. Давать понимание: куда уходят лимиты / деньги / время.
5. Давать доступ к безопасным операциям управления окружениями:
   - старт dev
   - стоп dev
   - restart prod
   - открыть логи
   - открыть сайт / репозиторий / серверную ссылку
6. Хранить инфру и recurring-costs по проектам.
7. Быть удобным для **ежедневного использования** без тяжёлой корпоративной рутины.

### 2.2. Не-цели MVP

В MVP **не делать**:

- multi-user collaboration
- роли и сложные права доступа
- канбан/спринты/epics/story points
- комментарии к задачам
- arbitrary shell terminal в браузере
- хранение секретов в БД
- сложные workflow automation-конструкторы
- мобильное приложение
- realtime sync между несколькими пользователями
- deep AI automation внутри самого сервиса

---

## 3. Основные сценарии использования

### 3.1. Как пользователь работает с системой

Пользователь (один владелец системы) хочет:

- открыть проект и сразу увидеть его контекст
- добавить новую задачу за 5–10 секунд
- сделать быструю заметку по проекту
- зафиксировать LLM-сессию: какой сервис, по какому проекту, сколько потратилось, какой результат
- посмотреть, сколько стоит проект в месяц
- увидеть, что сейчас запущено
- нажать безопасную кнопку `Start Dev`, `Stop Dev`, `Restart Prod`
- быстро открыть repo/site/logs/ssh-related links
- увидеть сводку: чем занимался, что сжирает лимиты, что надо продлить/оплатить

---

## 4. Product principles

1. **Fast capture first** — быстрое создание записи важнее идеальной структуры.
2. **Low ceremony** — минимум обязательных полей.
3. **Single-user optimized** — всё заточено под одного разработчика.
4. **Operational clarity** — на главной должны быть понятны: активные проекты, расходы, ближайшие действия.
5. **Safe actions only** — никакой произвольной удалённой консоли. Только allowlist действий.
6. **Markdown everywhere** — заметки и документация в markdown.
7. **No secrets in notes/db** — не хранить реальные ключи, client secrets и пароли в контенте.

---

## 5. Технологический стек

### 5.1. Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- React Router
- TanStack Query
- react-hook-form
- zod
- lucide-react

### 5.2. Backend

- Node.js
- TypeScript
- Express
- Drizzle ORM
- PostgreSQL
- zod для валидации
- node-cron или аналог для периодических задач

### 5.3. Infra

- Ubuntu server
- Nginx reverse proxy
- PM2 для backend/frontend процессов
- PostgreSQL

### 5.4. Auth

MVP:
- простой email/password login **или** single local admin auth
- дополнительно можно сразу сделать Google OAuth, если хочется

Рекомендация для MVP:
- сделать **одного локального админа**, так как система внутренняя
- в будущем расширить до Google login

---

## 6. Архитектура

### 6.1. Общая схема

Монорепозиторий:

- `apps/web` — фронтенд
- `apps/api` — backend API
- `packages/shared` — общие типы/схемы/zod DTO

### 6.2. Структура репозитория

```txt
work.rodion.pro/
  apps/
    web/
      src/
        app/
        components/
        features/
        pages/
        hooks/
        lib/
        api/
        types/
    api/
      src/
        app.ts
        server.ts
        config/
        db/
        modules/
          auth/
          projects/
          tasks/
          notes/
          llm/
          resources/
          actions/
          dashboard/
          deployments/
          activity/
        middleware/
        utils/
        jobs/
  packages/
    shared/
      src/
        dto/
        constants/
        schemas/
  drizzle/
  docs/
  scripts/
  package.json
  pnpm-workspace.yaml
```

### 6.3. Модули backend

- `auth`
- `projects`
- `tasks`
- `notes`
- `llm`
- `resources`
- `actions`
- `dashboard`
- `deployments`
- `activity`

---

## 7. Основные сущности

### 7.1. Project

Проект — центральная сущность.

Поля:
- id
- slug
- name
- description
- color
- status (`active`, `paused`, `archived`)
- repo_url
- site_url
- docs_url
- local_path
- server_path
- notes
- created_at
- updated_at

### 7.2. Project Link

Дополнительные ссылки проекта.

Поля:
- id
- project_id
- type (`repo`, `site`, `admin`, `docs`, `server`, `figma`, `other`)
- title
- url
- sort_order

### 7.3. Task

Поля:
- id
- project_id
- parent_task_id nullable
- title
- description_md
- status (`todo`, `doing`, `blocked`, `done`, `cancelled`)
- priority (`low`, `medium`, `high`, `critical`)
- kind (`feature`, `bug`, `ops`, `research`, `idea`, `content`, `other`)
- due_date nullable
- estimate_text nullable
- source (`manual`, `imported`, `generated`)
- created_at
- updated_at
- closed_at nullable

### 7.4. Task Status History

История статусов задачи.

Поля:
- id
- task_id
- from_status nullable
- to_status
- changed_at
- note nullable

### 7.5. Note

Заметка / документация / runbook.

Поля:
- id
- project_id
- title
- slug
- kind (`note`, `doc`, `runbook`, `meeting`, `idea`, `postmortem`, `reference`)
- content_md
- is_pinned
- created_at
- updated_at

### 7.6. Note Link

Связка заметки с другими сущностями.

Поля:
- id
- note_id
- entity_type (`task`, `llm_session`, `deployment`, `resource`, `project`)
- entity_id

### 7.7. LLM Session

Ключевая сущность учёта использования AI-инструментов.

Поля:
- id
- project_id
- title
- tool (`codex`, `qoder`, `cursor`, `cline`, `chatgpt`, `openrouter`, `ollama`, `other`)
- provider (`openai`, `anthropic`, `openrouter`, `qoder`, `local`, `other`)
- model nullable
- started_at
- ended_at nullable
- duration_minutes nullable
- balance_before nullable
- balance_after nullable
- spent nullable
- spent_unit (`tokens`, `credits`, `messages`, `usd`, `other`)
- burn_class (`L`, `M`, `H`)
- outcome (`done`, `partial`, `failed`, `unknown`)
- summary_md nullable
- created_at
- updated_at

### 7.8. LLM Session Event

Детализация событий внутри сессии при необходимости.

Поля:
- id
- llm_session_id
- event_type (`start`, `checkpoint`, `issue`, `retry`, `result`, `manual_note`)
- content_md
- created_at

### 7.9. Resource

Любой инфраструктурный или биллинговый ресурс.

Поля:
- id
- project_id nullable
- type (`server`, `domain`, `subscription`, `api`, `service`, `database`, `other`)
- name
- provider
- status (`active`, `paused`, `cancelled`, `expired`)
- cost_type (`monthly`, `yearly`, `one_time`, `usage_based`, `unknown`)
- amount nullable
- currency nullable
- renewal_date nullable
- start_date nullable
- end_date nullable
- notes_md nullable
- created_at
- updated_at

### 7.10. Environment Action

Безопасное заранее описанное действие проекта.

Поля:
- id
- project_id
- key
- title
- description
- target (`local`, `server`)
- action_type (`command`, `url`, `script`)
- command
- workdir nullable
- host nullable
- shell (`bash`, `sh`, `powershell`, `cmd`)
- confirmation_required
- dangerous_level (`safe`, `warning`, `danger`)
- is_enabled
- sort_order
- created_at
- updated_at

### 7.11. Action Run

Журнал запусков environment actions.

Поля:
- id
- action_id
- started_at
- finished_at nullable
- status (`running`, `success`, `failed`)
- exit_code nullable
- output_preview nullable
- triggered_by

### 7.12. Deployment

Запись о деплоях и релизах.

Поля:
- id
- project_id
- title
- environment (`dev`, `staging`, `prod`)
- status (`started`, `success`, `failed`, `rolled_back`)
- commit_hash nullable
- notes_md nullable
- created_at

### 7.13. Activity Log

Общий журнал действий внутри системы.

Поля:
- id
- project_id nullable
- entity_type
- entity_id nullable
- action
- payload_json
- created_at

---

## 8. Отношения между сущностями

- `projects 1->many tasks`
- `projects 1->many notes`
- `projects 1->many llm_sessions`
- `projects 1->many resources`
- `projects 1->many environment_actions`
- `projects 1->many deployments`
- `tasks 1->many task_status_history`
- `notes 1->many note_links`
- `llm_sessions 1->many llm_session_events`
- `environment_actions 1->many action_runs`

---

## 9. UX и страницы

## 9.1. Dashboard `/`

Главный экран должен показывать:

- блок активных проектов
- последние задачи в статусе `doing` / `blocked`
- последние заметки
- LLM summary за день / неделю
- ближайшие оплаты / renewal dates
- последние action runs
- быстрые действия:
  - новый проект
  - новая задача
  - новая заметка
  - новая LLM-сессия
  - открыть проекты

### Виджеты

1. `Active Projects`
2. `Focus Tasks`
3. `Recent Notes`
4. `LLM Burn Today / Week`
5. `Upcoming Renewals`
6. `Recent Deploys / Actions`

## 9.2. Projects list `/projects`

Список карточек проектов.

На карточке:
- название
- slug
- статус
- быстрые ссылки
- количество открытых задач
- количество заметок
- количество LLM-сессий за 7 дней
- monthly costs summary
- быстрые кнопки `Open`, `New Task`, `New Note`

## 9.3. Project details `/projects/:slug`

Основной центр проекта.

Секции:
- header
- overview
- links
- quick actions
- open tasks
- notes/docs
- llm sessions
- resources/costs
- deployments
- recent activity

### Header
- name
- status
- description
- repo/site/docs buttons
- `New Task`
- `New Note`
- `Start LLM Session`

### Overview cards
- open tasks
- doing tasks
- notes count
- monthly recurring cost
- last deployment
- last llm burn

## 9.4. Tasks `/tasks` и `/projects/:slug/tasks`

Представление списком.

Фильтры:
- project
- status
- priority
- kind
- search

Сортировки:
- updated desc
- priority desc
- due date asc

### Task create/edit modal
Поля:
- title
- project
- status
- priority
- kind
- description_md
- due_date

## 9.5. Notes `/notes` и `/projects/:slug/notes`

Список markdown-заметок.

Поддержать:
- pinned
- kind filter
- search by title/content

### Editor
- markdown textarea
- preview toggle
- autosave draft optional later

## 9.6. LLM Usage `/llm`

Таблица и summary.

Фильтры:
- project
- tool
- provider
- burn_class
- outcome
- period

Показывать:
- spent total
- average spent per session
- median spent
- number of H sessions
- failed expensive sessions

### Карточка/таблица сессии
- title
- project
- tool/provider/model
- time
- spent
- burn class
- outcome
- summary

## 9.7. Resources `/resources`

Список инфраструктуры и затрат.

Фильтры:
- type
- project
- renewal window
- status

Показывать:
- recurring monthly total
- yearly total
- upcoming renewals

## 9.8. Actions `/actions` и `/projects/:slug/actions`

Список разрешённых действий.

На карточке действия:
- title
- description
- target
- dangerous level
- last run
- run button
- view runs

Если `confirmation_required = true`, перед запуском показывать confirmation dialog.

## 9.9. Deployments `/deployments`

История релизов и запусков.

## 9.10. Settings `/settings`

Для MVP достаточно:
- профиль admin user
- auth settings minimal
- UI preferences optional
- system health minimal

---

## 10. Основные бизнес-правила

1. Все сущности привязаны к проекту, если это логично.
2. Resource может быть глобальным, без project_id.
3. Нельзя запускать disabled action.
4. Нельзя выполнять arbitrary shell input с клиента.
5. Нельзя хранить секреты в markdown notes в открытом виде по договорённости проекта.
6. LLM session может быть создана даже без точных цифр расходов.
7. Для расходов допустимы nullable поля, если пользователь знает только класс прожора и итог.
8. Completed task получает `closed_at` автоматически.
9. Archived project скрывается из default views, но остаётся доступен через фильтры.

---

## 11. API design

Все API под префиксом `/api`.

## 11.1. Auth

### POST `/api/auth/login`
Вход.

### POST `/api/auth/logout`
Выход.

### GET `/api/auth/me`
Вернуть текущего пользователя.

---

## 11.2. Dashboard

### GET `/api/dashboard/summary`
Вернуть summary для главной:
- active projects
- focus tasks
- llm burn today/week
- upcoming renewals
- recent notes
- recent action runs

---

## 11.3. Projects

### GET `/api/projects`
Список проектов.

### POST `/api/projects`
Создать проект.

### GET `/api/projects/:id`
Получить проект.

### PATCH `/api/projects/:id`
Обновить проект.

### DELETE `/api/projects/:id`
Soft delete / archive.

### GET `/api/projects/:id/overview`
Обзор по проекту.

### GET `/api/projects/:id/links`
Список ссылок проекта.

### POST `/api/projects/:id/links`
Создать ссылку.

---

## 11.4. Tasks

### GET `/api/tasks`
Список задач с фильтрами.

Query params:
- `projectId`
- `status`
- `priority`
- `kind`
- `search`

### POST `/api/tasks`
Создать задачу.

### GET `/api/tasks/:id`
Получить задачу.

### PATCH `/api/tasks/:id`
Обновить задачу.

### POST `/api/tasks/:id/status`
Изменить статус и создать запись в history.

### DELETE `/api/tasks/:id`
Soft delete optional.

---

## 11.5. Notes

### GET `/api/notes`
Список заметок.

### POST `/api/notes`
Создать заметку.

### GET `/api/notes/:id`
Получить заметку.

### PATCH `/api/notes/:id`
Обновить заметку.

### DELETE `/api/notes/:id`
Удалить заметку.

---

## 11.6. LLM Sessions

### GET `/api/llm/sessions`
Список LLM-сессий.

### POST `/api/llm/sessions`
Создать сессию.

### GET `/api/llm/sessions/:id`
Получить сессию.

### PATCH `/api/llm/sessions/:id`
Обновить сессию.

### POST `/api/llm/sessions/:id/events`
Добавить событие в сессию.

### GET `/api/llm/stats`
Вернуть агрегаты:
- total spent by period
- average spent by tool
- H/M/L distribution
- expensive failed sessions
- forecast based on average recent sessions

---

## 11.7. Resources

### GET `/api/resources`
Список ресурсов.

### POST `/api/resources`
Создать ресурс.

### GET `/api/resources/:id`
Получить ресурс.

### PATCH `/api/resources/:id`
Обновить ресурс.

### DELETE `/api/resources/:id`
Удалить ресурс.

### GET `/api/resources/stats`
Агрегаты по расходам и renewal dates.

---

## 11.8. Actions

### GET `/api/actions`
Список environment actions.

### POST `/api/actions`
Создать action.

### PATCH `/api/actions/:id`
Обновить action.

### POST `/api/actions/:id/run`
Запустить action.

### GET `/api/actions/:id/runs`
История запусков.

### GET `/api/action-runs`
Общий журнал запусков.

---

## 11.9. Deployments

### GET `/api/deployments`
Список деплоев.

### POST `/api/deployments`
Создать запись о деплое.

### PATCH `/api/deployments/:id`
Обновить статус деплоя.

---

## 11.10. Search

### GET `/api/search?q=...`
Глобальный поиск по:
- projects
- tasks
- notes
- resources
- llm sessions

---

## 12. Безопасность

Это критичный раздел.

### 12.1. Общие правила

1. Сервис внутренний, но должен быть защищён.
2. Нужна авторизация.
3. Сессии через httpOnly cookies.
4. CSRF protection при cookie auth.
5. rate limiting на login.
6. basic audit logging.
7. action executor только по allowlist.

### 12.2. Runtime actions

**Строго запрещено**:
- выполнять команду, присланную напрямую с клиента
- давать веб-терминал
- передавать shell string из input формы без предварительного сохранения и валидации

**Разрешено**:
- сохранять заранее описанные actions в БД
- запускать только их по `action_id`
- логировать результат
- ограничивать timeout
- ограничивать max output

### 12.3. Secrets

- реальные секреты не хранить в notes/content
- не показывать env значения в UI
- если в будущем будет нужен secrets vault, это отдельная система, не MVP

### 12.4. SSRF / RCE considerations

Если будут URL actions или fetch-related actions:
- whitelist hosts
- disable arbitrary URLs for MVP

---

## 13. Action Executor Design

### 13.1. Задача

Нужен безопасный механизм выполнения фиксированных команд.

### 13.2. Принцип работы

1. Пользователь нажимает `Run`.
2. Backend получает `action_id`.
3. Backend ищет action в БД.
4. Проверяет `is_enabled`.
5. Проверяет тип действия.
6. Выполняет заранее сохранённую команду.
7. Создаёт `action_run`.
8. Возвращает `status`, `output_preview`, `exit_code`.

### 13.3. Ограничения

- timeout: например 120 секунд
- stdout/stderr preview max 10–20 KB
- не запускать параллельно слишком много действий
- для `danger` действий — confirmation на UI

### 13.4. Примеры действий

**Local**
- start dev
- stop dev
- open logs script

**Server**
- pm2 restart app
- docker compose up -d
- docker compose down
- git pull && npm run build && pm2 restart app

### 13.5. Реализация server actions

Для MVP проще и безопаснее сделать один из вариантов:

#### Вариант A — локальный backend на той же машине/сервере, где нужны команды
Подходит, если сервер сам может выполнять локальные команды.

#### Вариант B — backend вызывает локальные shell scripts по allowlist
Например заранее положенные скрипты в:
- `/opt/work-rodion/actions/*.sh`

Рекомендация для MVP:
- **использовать scripts + allowlist**
- не городить SSH orchestration в первой версии

---

## 14. UI/UX стиль

Нужен минималистичный, быстрый и немного “операционный” стиль.

### Характер интерфейса
- тёмная тема по умолчанию
- чистые карточки и таблицы
- хороший search / command feel
- без перегруза цветами
- акцент на статусах, расходах и быстрых действиях

### Компоненты
- sticky topbar
- sidebar navigation
- compact cards
- keyboard-friendly forms
- searchable selects
- status badges
- confirm dialogs
- markdown editor + preview

---

## 15. Frontend feature breakdown

## 15.1. app shell

- layout
- sidebar
- topbar
- breadcrumbs
- global search entry point

## 15.2. dashboard feature

- summary widgets
- fetch dashboard summary
- loading/skeleton states

## 15.3. projects feature

- list page
- detail page
- create/edit forms
- project overview cards

## 15.4. tasks feature

- task table/list
- filters
- create/edit dialog
- quick status switch

## 15.5. notes feature

- notes list
- note editor
- markdown preview
- pinned note badge

## 15.6. llm feature

- sessions list
- create/edit form
- stats dashboard
- forecast widget

## 15.7. resources feature

- resources table
- cost summaries
- renewals list

## 15.8. actions feature

- actions list
- run action flow
- action runs log

---

## 16. Backend feature breakdown

## 16.1. auth module
- login/logout/me
- session middleware

## 16.2. projects module
- CRUD
- overview summary
- links CRUD

## 16.3. tasks module
- CRUD
- status transitions
- list filters

## 16.4. notes module
- CRUD
- search
- pin/unpin

## 16.5. llm module
- CRUD sessions
- session events
- stats calculations
- forecast calculations

## 16.6. resources module
- CRUD
- upcoming renewals query
- monthly/yearly totals

## 16.7. actions module
- CRUD actions
- run executor
- runs history

## 16.8. dashboard module
- aggregate cross-module summary

## 16.9. deployments module
- CRUD simplified

---

## 17. Forecast logic for LLM usage

Это важная часть продукта.

### 17.1. Что должен показывать forecast

Если пользователь ведёт `balance_before`, `balance_after`, `spent`, сервис должен считать:

- средний расход по tool/provider/model
- средний расход по burn_class
- медианный расход
- прогноз, на сколько хватит остатка

### 17.2. Базовая формула

Для выбранного набора сессий за последние 14/30 дней:

- `avg_spent = average(spent where spent is not null)`
- `median_spent`
- `heavy_avg = average(spent where burn_class='H')`
- `medium_avg = average(spent where burn_class='M')`
- `light_avg = average(spent where burn_class='L')`

Если введён текущий остаток:

- `remaining_heavy_sessions = balance_after / heavy_avg`
- `remaining_medium_sessions = balance_after / medium_avg`
- `remaining_light_sessions = balance_after / light_avg`

### 17.3. Ограничения

- forecast показывать только если есть минимум 5–10 релевантных сессий
- если мало данных, показывать `not enough data`

---

## 18. Search

Нужен быстрый глобальный поиск.

MVP:
- SQL ILIKE / trigram search по title/content
- результаты сгруппированы по сущностям

Искать по:
- projects.name
- tasks.title/description
- notes.title/content
- resources.name/provider
- llm_sessions.title/summary

---

## 19. Notifications / reminders

MVP-lite:
- upcoming renewals list on dashboard
- overdue tasks badge
- actions failures badge

Later:
- email/telegram reminders

---

## 20. Логирование и observability

Минимум:
- backend request logs
- action run logs
- error logs
- activity logs в БД по ключевым пользовательским действиям

---

## 21. Drizzle schema plan

Создать таблицы:

- `users`
- `projects`
- `project_links`
- `tasks`
- `task_status_history`
- `notes`
- `note_links`
- `llm_sessions`
- `llm_session_events`
- `resources`
- `environment_actions`
- `action_runs`
- `deployments`
- `activity_logs`
- `sessions` или аналог для auth

### Общие поля
У большинства таблиц:
- `id` uuid
- `created_at`
- `updated_at`

### Индексы

Индексы обязательно сделать на:
- `projects.slug`
- `tasks.project_id`
- `tasks.status`
- `notes.project_id`
- `llm_sessions.project_id`
- `llm_sessions.tool`
- `resources.project_id`
- `resources.renewal_date`
- `environment_actions.project_id`
- full text / trigram indexes later if needed

---

## 22. Seed data

Сразу предусмотреть seed script.

Первичные проекты:
- Reader.Market
- rodion.pro
- llmstore.pro
- crimson-wars

Для каждого проекта можно сидировать:
- базовые ссылки
- пару задач
- пару заметок
- пару resources
- пару actions

---

## 23. ENV variables

Пример:

```env
NODE_ENV=production
PORT=3010
APP_URL=https://work.rodion.pro
API_URL=https://work.rodion.pro/api
DATABASE_URL=postgres://...
SESSION_SECRET=...
AUTH_MODE=local
ADMIN_EMAIL=...
ADMIN_PASSWORD_HASH=...
ACTION_SCRIPTS_DIR=/opt/work-rodion/actions
ACTION_RUN_TIMEOUT_MS=120000
```

Если будет разделение фронта и API, добавить нужные CORS/env.

---

## 24. Deployment plan

## 24.1. Domain
- `work.rodion.pro`

## 24.2. Server path
Предлагаемый путь:
- `/var/www/work.rodion.pro`

## 24.3. PM2 apps
- `work-rodion-api`
- `work-rodion-web` (если нужен отдельный frontend dev/build serve)

Можно также собрать фронт в статику и отдавать через nginx.

### Рекомендация
Сделать production deployment так:
- backend на PM2
- frontend build в static dist
- nginx reverse proxy

---

## 25. Nginx sketch

- `work.rodion.pro` -> frontend
- `/api` -> backend port 3010

---

## 26. Реализация по этапам

## Этап 1 — Foundation

### Цель
Поднять проект, auth, DB, базовый shell.

### Сделать
- монорепо
- web/api/shared
- auth local admin
- Drizzle setup
- базовые migrations
- layout, sidebar, topbar
- dashboard stub

### Критерии приёмки
- можно зайти в систему
- есть защищённые маршруты
- БД поднята
- миграции применяются

---

## Этап 2 — Projects + Tasks + Notes

### Сделать
- CRUD проектов
- CRUD задач
- status history
- CRUD заметок
- markdown editor basic
- project detail page

### Критерии приёмки
- можно создать проект
- можно добавлять задачи и заметки
- проект показывает свои сущности

---

## Этап 3 — LLM Usage

### Сделать
- CRUD llm sessions
- session events
- stats screen
- forecast widget
- dashboard summary for llm usage

### Критерии приёмки
- можно логировать LLM-сессии
- видно расход по проектам и инструментам
- работает базовый прогноз

---

## Этап 4 — Resources / Billing

### Сделать
- CRUD resources
- upcoming renewals
- monthly/yearly summaries
- project-level cost aggregation

### Критерии приёмки
- видно recurring costs
- видно upcoming renewals
- видно привязку ресурсов к проектам

---

## Этап 5 — Runtime Actions

### Сделать
- CRUD environment actions
- executor
- action runs
- UI with confirmation
- output preview

### Критерии приёмки
- можно безопасно запускать заранее описанные действия
- есть журнал запусков
- нет arbitrary shell input

---

## Этап 6 — Polish

### Сделать
- global search
- activity feed
- deployments basic
- dashboard improvements
- better UX/forms/loading/errors

---

## 27. Acceptance criteria MVP

MVP считается готовым, если:

1. Есть логин и защищённый доступ.
2. Можно создавать и редактировать проекты.
3. Можно вести задачи по проектам.
4. Можно вести markdown-заметки по проектам.
5. Можно фиксировать LLM-сессии и видеть агрегаты.
6. Можно вести ресурсы/затраты и видеть renewal dates.
7. Можно запускать заранее описанные safe actions.
8. Главная страница реально полезна в ежедневной работе.

---

## 28. Что важно для Codex при реализации

### 28.1. Общие требования

- Писать аккуратно, без overengineering.
- Не внедрять лишние abstraction layers без необходимости.
- Все DTO валидировать через zod.
- Все CRUD формы делать с понятными error states.
- На backend соблюдать модульную структуру.
- На frontend держать feature-based organization.
- Использовать строгую типизацию.

### 28.2. Что не делать

- не городить CQRS/event-sourcing
- не добавлять redux без необходимости
- не строить enterprise-архитектуру
- не тащить multi-tenant design
- не делать generic mega-form builders

### 28.3. Что делать обязательно

- сделать чистые migrations
- сделать seed script
- сделать .env.example
- сделать README с запуском
- сделать базовые empty/loading/error состояния
- сделать confirm dialogs для dangerous actions

---

## 29. Рекомендуемый порядок коммитов

1. `init monorepo with web api shared packages`
2. `setup drizzle postgres local auth and protected app shell`
3. `implement projects module api and ui`
4. `implement tasks module with status history`
5. `implement notes module with markdown editor`
6. `implement dashboard summary basics`
7. `implement llm sessions module and stats`
8. `implement resources and billing module`
9. `implement environment actions and action runs`
10. `implement search deployments and final polish`
11. `add seed scripts env example and readme`

---

## 30. Дополнительные идеи на потом

После MVP можно добавить:

- telegram reminders
- шаблоны проектов
- quick capture command palette
- attachment support
- import задач/заметок из txt/md
- AI summary по заметкам и LLM sessions
- авто-парсинг расходов из каких-то сервисов
- weekly review page
- personal changelog / work journal
- linking tasks to git commits/releases

---

## 31. Итог

`work.rodion.pro` должен стать не ещё одной системой учёта ради учёта, а **реальным ежедневным operational cockpit** для разработки и управления своими проектами.

Главный критерий успеха:

После запуска сервиса пользователь должен хотеть открывать его каждый день, потому что там:
- видно что происходит
- понятно что делать дальше
- быстро создаются задачи и заметки
- понятны расходы
- удобно дёргать окружения

Если интерфейс станет тяжёлым и бюрократичным — проект провален.

Если интерфейс даёт ощущение: **"вот тут у меня весь мой рабочий мир под рукой"** — значит всё сделано правильно.

