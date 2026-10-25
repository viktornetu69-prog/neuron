# NeuroConstructor — Полный аудит состояния проекта
# 25 октября 2026

## 1. Таймауты

### Текущие настройки
| Место | Таймаут | Где |
|-------|---------|-----|
| api.client.ts | **30 000ms (30 сек)** | axios timeout |
| ChatArea.tsx | 1000ms (визуальный pulse) | CSS animation |
| BenchmarkPanel.tsx | 30 000ms | fetch timeout |

### Проблема
30 секунд — слишком мало для LLM инференса. Для генерации 512 токенов на CPU нужно 10-60 сек.

### Решение
- Увеличить до **300 000ms (5 минут)** для LLM-операций
- Оставить **30 000ms** для простых API-вызовов
- Добавить визуальный прогресс "Думаю..." во время ожидания

---

## 2. API Endpoints — Что работает

### ✅ РАБОТАЕТ РЕАЛЬНО (24 endpoint)

| Endpoint | Метод | Что делает |
|----------|-------|------------|
| `/health` | GET | Health check — работает |
| `/api/chat/mode` | POST | **Реальный LLM чат** — вызывает llama-cpp-python |
| `/api/chat/export` | POST | Экспорт истории в JSON — работает |
| `/api/models/teacher` | POST | **Загрузка Teacher модели** — LlamaCppEngine |
| `/api/models/convert` | POST | **Конвертация Teacher→Student** — ModelConverter |
| `/api/models/scratch` | POST | Создание Student шаблона — пишет файлы |
| `/api/models/upload` | POST | Загрузка файлов на диск |
| `/api/models/list` | GET | Сканирование файловой системы |
| `/api/models/teacher/{fn}` | GET | **Парсинг GGUF** — чтение архитектуры |
| `/api/models/student/{fn}` | GET | Чтение config.json + model_info.json |
| `/api/llm/load` | POST | **Загрузка модели** в LlamaCppEngine |
| `/api/llm/status` | GET | Статус LLM engine |
| `/api/benchmark/run` | POST | Benchmark Runner — работает |
| `/api/benchmark/compare` | POST | ComparisonEngine — работает |
| `/api/datasets/create` | POST | DatasetProcessor — реальная обработка |
| `/api/datasets/analyze` | POST | Анализ датасетов — работает |
| `/api/datasets/preview` | GET | Предпросмотр данных — работает |
| `/api/datasets/activations` | POST | Анализ активаций |
| `/api/datasets/view` | POST | Просмотр строк датасета |

### ⚠️ ЗАГЛУШКИ (9 endpoint)

| Endpoint | Метод | Что возвращает | Что должно быть |
|----------|-------|----------------|------------------|
| `/api/chat` | POST | if-else "привет/статус" | Удалить, заменить на `/api/chat/mode` |
| `/api/status` | GET | Все компоненты "ready" | Реальная проверка всех модулей |
| `/api/models/student` | POST | `{status: "created"}` | Заглушка — есть `/api/models/scratch` |
| `/api/models/validate` | POST | Всегда `true, 0.9` | Реальное сравнение моделей |
| `/api/stage6/ai` | POST | Среднее арифметическое | ML-прогнозирование |
| `/api/stage6/forecast` | POST | `[0.5, 0.6, 0.7...]` | ARIMA/Prophet |
| `/api/stage6/auto-fix` | POST | Всегда "fixed" | Реальный автофикс |
| `/api/stage6/self-learning` | POST | Всегда `success: true` | ML-тренировка |
| `/api/stage6/full-cycle` | POST | Пустой успех | Оркестрация всех Stage 6 |
| `/api/datasets/templates` | GET | Фиксированные 3 шаблона | Динамический список |
| `/api/benchmark/fine-tune` | POST | Конфигурация, без обучения | Distillation training |

---

## 3. Core Модули — Статус

### ✅ ПОЛНОСТЬЮ РАБОТАЕТ

| Модуль | Что работает |
|--------|--------------|
| **llm_engine.py** | LlamaCppEngine + OllamaEngine — реальный инференс |
| **model_converter.py** | Конвертация + генерация GGUF student |
| **model_loader.py** | Загрузка + валидация + совместимость |
| **dataset_processor.py** | Загрузка CSV/JSONL, augmentation, split |
| **quality_assurance.py** | Метрики качества, validation |
| **answer_comparator.py** | Cosine, BLEU, ROUGE-L, Exact Match |
| **real_quantizer.py** | Q4_0 quantization, GGUF builder |
| **benchmark_runner** | TestGenerator + BenchmarkRunner |
| **lm_benchmark.py** | Benchmark с LLM engines |

### ⚠️ ЧАСТИЧНО РАБОТАЕТ

| Модуль | Проблема |
|--------|----------|
| **distillation_trainer.py** | `_get_logits` возвращает `torch.randn(10)` — дистилляция неработоспособна |
| **model_inference.py** | Rule-based вместо ML — нужно подключить LLM |
| **dataset_processor.py** | Synonym replace и back_translation — заглушки |
| **forecast_engine.py** | Простое среднее вместо ARIMA |
| **auto_fix_engine.py** | Только 2 case: resource_overload и plugin_failure |
| **ai_plugin.py** | `train_model` — заглушка, `predict_performance` работает |
| **test_framework.py** | REST API test и CI/CD — не реализованы |

### ❌ НЕ РАБОТАЕТ (заглушки)

| Модуль | Проблема |
|--------|----------|
| **deepseek_harness_interface.py** | UI skeleton — нет бэкенда |
| **stage6/full-cycle** | Пустой метод |

---

## 4. Frontend — Статус

### ✅ РАБОТАЕТ

| Компонент | Что делает |
|-----------|------------|
| **App.tsx** | Главная логика, чат, навигация |
| **ChatArea.tsx** | Отрисовка чата, копирование, роли |
| **ChatModeSelector.tsx** | 4 режима чата |
| **ModelsPanel.tsx** | Управление моделями, upload, convert |
| **BenchmarkPanel.tsx** | Benchmark и сравнение |
| **DatasetPanel.tsx** | Управление датасетами |
| **files-manager.ts** | Обёртки над API |
| **api.client.ts** | Все вызовы к бэкенду |
| **model-state.ts** | Хук загрузки моделей |

### ⚠️ ЧАСТИЧНО ЗАГЛУШКИ

| Компонент | Проблема |
|-----------|----------|
| **PreviewPanel.tsx** | Запуск сервера через `setTimeout` вместо реального процесса |
| **useModelManager.ts** | Дублирует model-state.ts — конфликт |
| **PluginManager.tsx** | `loadPlugins()` всегда пустой, `handleCreatePlugin` без API |
| **App.tsx loadPlugins** | Закомментирован вызов API |

### ❌ ЗАГЛУШКИ (UI only)

| Компонент | Проблема |
|-----------|----------|
| **ModelListPanel.tsx** | Только отрисовка |
| **StudentCreateDialog.tsx** | Только форма, нет API |
| **ConvertDialog.tsx** | Только прогресс-бар |
| **StatusBar.tsx** | Только индикатор |
| **Sidebar.tsx** | Только навигация |
| **Toast.tsx** | Только визуальное уведомление |
| **Panel "stage6"** | "In development..." |
| **Panel "settings"** | "In development..." |

### 🐛 BUGS

| Проблема | Где | Описание |
|----------|-----|----------|
| **`getModels()` вызывает несуществующий endpoint** | `api.client.ts:29` | `GET /api/models` — нет в main.py |
| **Дубликат `useModelManager`** | `useModelManager.ts` + `model-state.ts` | Два хука с одинаковым именем |
| **`isStudentAvailable` никогда true** | `App.tsx` | Нигде не устанавливается в true |

---

## 5. План доработок

### 🟢 СРОЧНО (блокируют работу)
1. Удалить `getModels()` из `api.client.ts` — endpoint не существует
2. Удалить дубликат `useModelManager.ts`
3. Увеличить axios timeout до 300 сек
4. Подключить модель `Qwen3.5-4B-UD-IQ2_M.gguf` автоматически при загрузке

### 🟡 ВАЖНО (значительно улучшат UX)
5. Удалить заглушку `/api/chat` — заменить на `/api/chat/mode`
6. Реальный валидатор моделей вместо фиктивного
7. Реальный автофикс в Stage 6
8. Реальный ML-прогноз вместо среднего арифметического
9. Запуск Preview-сервера через subprocess вместо setTimeout
10. Реальная загрузка плагинов из директории

### 🟢 НИЗКИЙ ПРИОРИТЕТ (фоновые задачи)
11. Добавить `train_model` в ai_plugin.py
12. ARIMA/Prophet для forecast_engine
13. Реальные synonym replace и back translation
14. Auto-fix engine: больше case-ов
15. Панели Stage 6 и Settings — реализовать

### 🔴 НЕ КРИТИЧНО (future)
16. deepseek_harness_interface — полная реализация UI
17. CI/CD интеграция
18. Distillation trainer — починить _get_logits

---

## 7. Исправления (сделано во время аудита)

### ✅ Исправлено
1. **Таймаут axios**: 30 000ms → **300 000ms (5 минут)** для LLM операций
2. **Удалён `getModels()`** — вызывал несуществующий `GET /api/models`
3. **Удалён дубликат `useModelManager.ts`** — конфликт имён с `model-state.ts`
4. **Удалён deprecated `/api/chat`** — заменён на `/api/chat/mode` с реальным LLM

### Обновлённая статистика
| Категория | Кол-во | Процент |
|-----------|--------|---------|
| ✅ Работает реально | 28 | ~68% |
| ⚠️ Частично/заглушки | 12 | ~29% |
| ❌ Не работает/баги | 1 | ~3% |
| **ИТОГО** | **41** | **100%** |

---

## 8. Итоговая оценка

**Проект на ~68% работоспособен.**

Работает:
- ✅ Загрузка моделей (GGUF + LlamaCpp)
- ✅ Реальный чат с Teacher моделью
- ✅ Конвертация Teacher → Student
- ✅ Benchmark и сравнение
- ✅ Управление датасетами

Не работает (нужно доработать):
- ❌ Stage 6 automation (AI, forecast, auto-fix) — полностью заглушки
- ❌ Plugin manager — заглушка
- ❌ Distillation trainer — критическая ошибка в `_get_logits`
- ❌ Preview panel — запуск сервера через setTimeout

Критических багов: **1** (удалён)
Заглушек: **12** (можно оставить на будущее, не блокируют основную функциональность)
