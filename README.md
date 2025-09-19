# Node Raft (NestJS demo)

Простая реализация консенсуса Raft на NestJS. Проект предназначен для демо

## Возможности
- Выборы лидера (RequestVote) и heartbeat (AppendEntries)
- Репликация и согласование логов (prevLogIndex/prevLogTerm, truncate при конфликте)
- Коммит у лидера только для записей текущего term
- Применение записей к in‑memory KV‑хранилищу
- E2E и unit тесты
- Сгенерируемая API‑документация через TypeDoc

## Для разработки

Требования:
- Node.js 20+
- npm 10+

Установка:
```shell
cp templates/template.env .env
npm ci
```

Запуск одного узла:
- npm run start:dev

*По умолчанию читаются переменные из окружения, дефолтные значения указаны в коде*

#### Используемые переменные окружения:

- PORT - порт HTTP сервера
- INDEX - индекс узла в массиве peers (целое число начиная с 0)
- PEERS - список URL узлов через запятую, например: http://localhost:3001,http://localhost:3002
- HEARTBEAT_INTERVAL_MS - интервал heartbeat лидера (по умолчанию 100)
- ELECTION_TIMEOUT_MIN_MS - минимальный таймаут выборов (по умолчанию 150)
- ELECTION_TIMEOUT_MAX_MS - максимальный таймаут выборов (по умолчанию 300)

## Локальный кластер (Docker Compose)
Запуск:
```shell
cp templates/template.docker.env .env
docker compose -f compose.prod.yml up -d
```

#### Используемые переменные окружения:
- PORT_(1-5) - порт HTTP сервера, порт внутри контейнера всегда = 80
- PEERS - список URL узлов через запятую, например: http://node-1,http://node-2,http://node-3,http://node-4,http://node-5
- HEARTBEAT_INTERVAL_MS - интервал heartbeat лидера (по умолчанию 100)
- ELECTION_TIMEOUT_MIN_MS - минимальный таймаут выборов (по умолчанию 150)
- ELECTION_TIMEOUT_MAX_MS - максимальный таймаут выборов (по умолчанию 300)

## Публичный API
- POST /kv/set - записать пару { key, value } (доступно только на лидере)
- POST /kv/get - получить value по key

Примеры тел запросов можно посмотреть в src/raft/core/kv.controller.ts и DTO в src/raft/dto.

## Тесты
```shell
# Запуск юнит‑тестов
npm run test
# Покрытие
npm run test:cov
# Запуск E2E
npm run test:e2e
```

E2E поднимают несколько экземпляров приложения в рамках процесса Jest и проверяют выборы, репликацию, отказоустойчивость.

## Документация (TypeDoc)
Проект содержит конфигурацию TypeDoc (typedoc.json) и может генерировать документацию из TSDoc‑комментариев.

Обновить документацию локально:
```shell
npx typedoc
```

Документация лежит в каталоге "docs", для просмотра открыть index.html в браузере

## Архитектура
- src/raft/core - Основная логика Raft (RaftService), контроллеры KV и Raft RPC
- src/raft/storage - Хранилище состояния, логов и KV
- src/raft/transport - Общение между узлами
- src/raft/dto - DTO объектов
- test - E2E сценарии

Ключевой класс: RaftService - реализует RequestVote/AppendEntries, выборы, heartbeat, обновление commitIndex и применение логов.

## Лицензия
UNLICENSED - для целей демо/интервью.
