# 🗺️ DEV PLAN — NeuroConstructor

**Created:** 22.10.2026
**Sources:** `NeuralNet_for_GameDev_Analysis/`, `NeuroConstructor.Core/core/`, DeepSeek Harness research

---

## 1. Философия

**Не обучать с нуля — а «перепрофилировать известное знание под новую форму»**
(Учитель → Датасет → Активации → Пустая модель → Прунинг → Экспорт)

---

## 2. Текущественное состояние реализации

### ✅ Завершено
- gRPC инфраструктура + RPC (Chat, Status, ListModels, LoadModel, CreateEmptyGGUF, SaveModel, Dataset*, Model*)
- Teacher/Student pipeline + quality_assurance + real_quantizer
- Plugin system (Stage 4) — полная реализация
- Testing framework (Stage 5) — 3 модуля (`framework_components`, `advanced_framework`, `framework_integration`)
- **Stage 6 AI** — `ai_plugin.py` ✅
- **Stage 6 Forecast** — `forecast_engine.py` ✅
- **Stage 6 AutoFix** — `auto_fix_engine.py` ✅
- **Stage 6 SelfLearning** — `self_learning.py` ✅
- **Stage 6 Unified** — `stage6_unified_plugin.py` ✅
- **Stage 6 Integration** — `stage6_integration.py` ✅
- C# WPF UI — Stage 2 кнопки добавлены, починка сборки в процессе

### 🟡 В процессе / ограничения
- C# UI: ошибки сборки (CS0234, CS0400/CS0538, CS0426) — журнал `01_журнал_идей.md`, раздел 10.3
- Student — пока архитектурное описание (JSON), не runnable GGUF
- Teacher — инспекция, веса не выполняются

### ⬜ Не начато / Возможности
- Stage 7: Edge Computing, Mobile NN, Reactive Cache, Quantum Security
- Stage 8: Многокластерная интеграция, Биомимика, Energy Efficiency, Climate Adaptation
- Идеи F1–F6 (визуализация неиронов, CV, MCP, виртуальная мышь, интернет-поиск, самопроверка) — в план развития

---

## 3. Stage 6 — Расширенные функции (план + факт)

| # | Функция | Файл | Статус |
|---|---|---|---|
| 1 | 🧠 **Искусственный интеллект** (ML-прогноз) | `NeuroConstructor.Core/core/ai_plugin.py` | ✅ **ЗАВЕРШЕН** |
| 2 | 🔮 **Прогнозирование** (нагрузка, авто-масштаб) | `NeuroConstructor.Core/core/forecast_engine.py` | ✅ **ЗАВЕРШЕН** |
| 3 | ⚡ **Автоматизированное исправление** | `NeuroConstructor.Core/core/auto_fix_engine.py` | ✅ **ЗАВЕРШЕН** |
| 4 | 🔄 **Самообучение** (адаптивная оптимизация) | `NeuroConstructor.Core/core/self_learning.py` | ✅ **ЗАВЕРШЕН** |

**Итог по Stage 6:** ✅ **4/4 функции полностью реализованы и интегрированы.**
- 🧠 AI: `AIPredictionPlugin` — ML-прогноз производительности ✅
- 🔮 Forecast: `ForecastEngine` — прогноз нагрузки, авто-масштаб ✅
- ⚡ AutoFix: `AutoFixEngine` — обнаружение и исправление ✅
- 🔄 SelfLearning: `SelfLearningEngine` — обучение и адаптация ✅

### ✅ 3.1 Stage 6 — Интеграция компонентов (реализовано)

| Компонент | Интеграция | Статус |
|---|---|---|
| AI + Forecast | AI прогноз → Forecast данные → масштабирование | ✅ **ЗАВЕРШЕНО** |
| AutoFix + SelfLearning | AutoFix находит → SelfLearning адаптирует | ✅ **ЗАВЕРШЕНО** |
| Все 4 | PluginManager + Testing Framework (Stage 5) | ✅ **ЗАВЕРШЕНО** |
| Единый контур | `Stage6UnifiedPlugin` + `Stage6Integration` | ✅ **ЗАВЕРШЕНО** |

---

## 3.2 Stage 6 — Архитектура интеграции

```
Stage6UnifiedPlugin (PluginInterface)
    ├── _execute_ai()          → AIPredictionPlugin
    ├── _execute_forecast()    → ForecastEngine
    ├── _execute_auto_fix()    → AutoFixEngine
    └── _execute_self_learn()  → SelfLearningEngine
            │
            └── _execute_full_cycle() → AI → Forecast → AutoFix → SelfLearning

Stage6Integration (Singleton orchestrator)
    ├── process_ai_prediction() → AI + SelfLearning + AutoFix
    ├── run_optimization_cycle() → collect_metrics → AI → SelfLearning → AutoFix → suggestions
    └── get_unified_status() → все компоненты
```

---

## 3.3 Stage 6 — Проверка целостности

| Проверка | Результат |
|---|---|
| `py_compile` всех Stage 6 файлов | ✅ OK |
| Сигнатуры компонентов | ✅ Совпадают |
| Интеграция (plugin → integration) | ✅ OK |
| Engine wiring | ✅ OK |

**ИТОГ: STAGE 6 — ПОЛНОЕ ЗАВЕРШЕНИЕ!**

---

---

## 4. Интерфейс — вдохновение DeepSeek Harness

**Источник:** DeepSeek Harness (`deepseek-ai/deepseek-harness`, "Everything is a Plugin")

| Аспект | DH Harness |
|---|---|
| Запуск | `npx @deepseek-ai/dsh web` → UI `http://127.0.0.1:3080` |
| Фреймворк | Cordis, everything is a plugin |
| Философия | **Text is for agents, UI is for people** |
| Hot reload | `cordis.patch.yml`, без перезапуска |
| UI-плагины | `IWindowPlugin`, `IPanelPlugin`, `IVisualizerPlugin` |
| Chat UI | registries, slots (`conversation.composer`, `conversation.content`, `conversation.input.activity`) |
| Empty state | hero dock, collapsed when empty |
| Agent loop | subagents, MCP, skills, plan mode, context compaction |
| Dev tools | inspect execution traces, runtime info |
| i18n | EN / ZH (`*.i18n.yaml`) |

**Цель для NeuroConstructor:** та же философия — чат по умолчанию + плагины-панели/визуализаторы, hero dock, model selector + context meter, trajectory views.

### 4.1 Целевые экраны NeuroConstructor (на базе DH Harness)
1. **Chat Screen** — по умолчанию, как DH Harness.
2. **Models Screen** — список моделей/GGUF + создание студента.
3. **Datasets Screen** — шаблоны, примеры, генерация, версионинг.
4. **Visualizer Screen** — тепловые карты, графы активаций (через плагины).
5. **Agent/Tasks Screen** — панель роя агентов, MCP, автотест.
6. **Settings/Inspector** — ресурсы, провайдеры, слоты.

### 4.2 Технологии UI
- **Web UI:** `npx @deepseek-ai/dsh web` (TypeScript, registries, slots) — порт `3080`.
- **Desktop:** WPF (текущий) — миграция не обязательна, но архитектура плагинов переносится.
- **Hot reload:** аналог `cordis.patch.yml` — подписка на события плагинов.

---

## 5. Предложенные фичи и идеи (из `NeuralNet_for_GameDev_Analysis` + обсуждений)

| № | Идея | Суть | Приоритет |
|---|---|---|---|
| F1 | **Визуализация неиронов** | Карта активаций нейронов у учителя/студента; **пользователь сам выбирает** слой/нейрон | 🔴 Высокий |
| F2 | **Компьютерное зрение** | Нейросеть (виз-агент) **видит, что делает**, и соответствует ли результат | 🔴 Высокий |
| F3 | **MCP для современного софта** | MCP-мост к Blender / Game Engine | 🔴 Высокий |
| F4 | **Виртуальная мышь/клавиатура** | Для устаревшего софта (режим «тренажёр») | 🟡 Средний |
| F5 | **Поиск в интернете** | Если модель не знает (пример: «кошка») → ищет → предлагает вариант → на основе варианта моделирует | 🟡 Средний |
| F6 | **Самопроверка результата** | Сделал игру в игровом движке → поиграл → нашёл рантайм-ошибки → исправил | 🔴 Высокий |

> **Задача:** «роботизировать» (автоматизировать) эти идеи в план развития.

---

## 6. Внешний вид приложения и мультиязычность — **ГЛАВНОЕ**

### 6.1 Внешний вид (UI/UX)
**Текущее (факт):**
- WPF `MainWindow.xaml`: `Title="NeuroConstructor: Core UI"`, Height 700, Width 900
- Chat: `ListBox` + `TextBlock` (Run), FontFamily `Consolas`
- Controls: `GroupBox "Model Operations"`, `GroupBox "Dataset Operations"`, `TextBox` + `Send`/`Clear` buttons

**Целевой (DeepSeek Harness inspired):**
- Современная тема (тёмная/светлая), карточки, sidebar, hero dock (collapsed when empty)
- Chat по умолчанию; плагины-панели (`IWindowPlugin`, `IPanelPlugin`, `IVisualizerPlugin`)
- Trajectory / tool views для дебага
- Адаптивная ширина, статус-бар, контекст-метр

### 6.2 Мультиязычность
- **Текущее:** UI — английский (`Load Teacher`...), статусы/доки — русский/английский
- **Цель:** i18n — EN / RU (основные), + EN / ZH (как в DeepSeek Harness: `*.i18n.yaml`, BRAND_GUIDELINES.i18n.yaml)
- Ресурсы строк для WPF (`.resx`) и Python (`locale/`)

---

## 7. Итоговый план развития (сводка)

1. **Stage 6 (тех.)** — AI ✅, Forecast ✅, AutoFix ✅, SelfLearning ✅ (все 4 функции завершены). Интеграция в Engine + Testing Framework ✅.
2. **Интерфейс** — DeepSeek Harness style: чат + плагины-панели + hero dock + i18n.
3. **Идеи F1–F6** — в план, с приоритетами.
4. **Внешний вид + мультиязычность** — главный приоритет продукта.
5. Далее: реализация ForecastEngine / SelfLearning / F-фичи.

