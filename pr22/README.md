# Практическое занятие 22

Тестовая система балансировки нагрузки для веб-приложения.

## Состав

| Сервис | Назначение | URL |
| --- | --- | --- |
| `backend1` | основной backend | `http://localhost:3200` |
| `backend2` | основной backend | `http://localhost:3201` |
| `backend3` | резервный backend | `http://localhost:3202` |
| `nginx` | балансировщик Nginx | `http://localhost:8080` |
| `haproxy` | альтернативный балансировщик HAProxy | `http://localhost:8081` |
| `haproxy stats` | статистика HAProxy | `http://localhost:8404/stats` |

Nginx использует round-robin и настройки отказоустойчивости:

```nginx
server backend1:3000 max_fails=2 fail_timeout=30s;
server backend2:3000 max_fails=2 fail_timeout=30s;
server backend3:3000 backup max_fails=2 fail_timeout=30s;
```

HAProxy использует `balance roundrobin`, health checks и резервный сервер `backend3`.

## Запуск

```powershell
npm install
npm run compose:up
```

## Проверка балансировки

```powershell
npm run test:balance
```

Скрипт отправляет серию запросов в Nginx и HAProxy и проверяет, что ответы приходят минимум от двух backend-серверов.

## Проверка отказоустойчивости

```powershell
npm run test:failover
```

Скрипт временно останавливает `backend1` и `backend2`, проверяет переключение Nginx и HAProxy на `backend-backup`, затем запускает основные backend-сервисы обратно.

## Остановка

```powershell
npm run compose:down
```
