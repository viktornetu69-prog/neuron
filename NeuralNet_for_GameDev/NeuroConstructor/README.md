# 🧠 NeuroConstructor

**Конструктор локальных нейронных сетей** — Teacher/Student pipeline с REST API, React UI и real-time визуализацией рассуждений.

---

## 📋 Описание

NeuroConstructor позволяет создавать и оптимизировать нейронные модели по принципу **Teacher-Student**:
1. Загружаем большую модель (Teacher)
2. Создаём маленькую версию (Student) с компрессией
3. Валидируем качество
4. Используем для инференса

### Возможности
- 🧠 Загрузка Teacher моделей (GGUF, PyTorch, safetensors)
- 📦 Создание Student моделей с компрессией (arхитектура + квантификация Q4_0-Q8_0)
- ✅ Валидация качества (6 метрик, cosine similarity, KL-divergence)
- 📊 Обработка датасетов и анализ активаций
- ⚡ Квантификация весов (Q4_0, Q5_0, Q6_0, Q8_0)
- 🔌 Плагинная система (Stage 4 + Stage 6)
- 🤖 Stage 6: AI прогноз, Forecast, AutoFix, SelfLearning
- 🔍 Скиллы и системные промты
- 📡 Real-time token-by-token визуализация рассуждений (WebSocket)

---

## 🚀 Быстрый старт

### 1. Установите зависимости бэкенда

```bash
cd NeuroConstructor
pip install -r backend/requirements.txt
```

### 2. Запустите бэкенд

```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Проверьте здоровье API:
```bash
curl http://localhost:8000/health
```

### 3. Установите зависимости фронтенда

В отдельном терминале:
```bash
cd frontend
npm install
```

### 4. Запустите фронтенд

```bash
npm run dev
# UI откроется на http://localhost:3000
```

---

## 🏗️ Архитектура

```
NeuroConstructor/
├── backend/                    # FastAPI REST API + WebSocket
│   ├── main.py                 # 38+ API endpoints
│   ├── engine_rest.py          # Бизнес-логика REST
│   └── requirements.txt        # Зависимости Python
│
├── frontend/                   # React + TypeScript UI
│   ├── src/
│   │   ├── App.tsx             # Главный компонент
│   │   ├── api.client.ts       # API клиент
│   │   ├── index.css           # Глобальные стили
│   │   └── components/
│   │       ├── AppLayout.tsx   # Основной лейаут
│   │       ├── Sidebar.tsx     # Боковая панель навигации
│   │       ├── HeaderBar.tsx   # Верхняя панель
│   │       ├── ChatArea.tsx    # Чат-интерфейс
│   │       ├── StatusBar.tsx   # Статус сервера
│   │       ├── HeroDock.tsx    # Hero dock для пустого состояния
│   │       ├── ModelsPanel.tsx # Панель моделей
│   │       ├── DatasetPanel.tsx# Панель датасетов
│   │       ├── BenchmarkPanel.tsx # Бенчмарки
│   │       ├── PluginManager.tsx # Управление плагинами
│   │       ├── PreviewPanel.tsx # Предпросмотр
│   │       ├── NeuralNetVisualizer.tsx # Визуализация нейросетей
│   │       ├── ArchitectureView.tsx # Просмотр архитектуры
│   │       ├── DistributionView.tsx # Распределение весов
│   │       └── ...
│   ├── package.json
│   └── vite.config.ts
│
├── NeuroConstructor.Core/      # Python ядро
│   ├── core/
│   │   ├── llm_engine.py       # LlamaCpp + Ollama + Mock
│   │   ├── model_loader.py     # Загрузка моделей
│   │   ├── model_converter.py  # Конвертация teacher->student
│   │   ├── real_quantizer.py   # Квантификация Q4_0-Q8_0
│   │   ├── quality_assurance.py # Валидация качества
│   │   ├── dataset_processor.py # Обработка датасетов
│   │   ├── model_inference.py  # Инференс
│   │   ├── plugin_system.py    # Плагинная система
│   │   ├── answer_comparator.py # Cosine, BLEU, ROUGE-L
│   │   ├── distillation_trainer.py # KL-div distillation
│   │   ├── lm_benchmark.py     # Benchmark runner
│   │   ├── ai_plugin.py        # AI prediction
│   │   ├── forecast_engine.py  # Load forecasting
│   │   ├── auto_fix_engine.py  # Auto-fix errors
│   │   ├── self_learning.py    # Self-learning engine
│   │   ├── stage6_integration.py # Stage 6 orchestration
│   │   ├── stage6_unified_plugin.py # Unified plugin
│   │   ├── stage6_append.py    # Stage 6 extensions
│   │   ├── test_framework.py   # Testing framework
│   │   ├── preview_server_manager.py # Preview subprocess
│   │   └── deepseek_harness_interface.py # DeepSeek Harness
│   ├── config/                 # Конфигурации (skills, prompts)
│   └── prompts/                # Системные промты
│
├── DEV_PLAN.md                 # Дорожная карта
├── README.md                   # Этот файл
├── FINAL_REPORT.md             # Итоговый отчёт
├── AUDIT_REPORT.md             # Аудит проекта
└── FIXES_REPORT.md             # Отчёт об исправлениях
```

---

## 🌐 API Endpoints

### Health
- `GET /health` — Проверка здоровья сервера

### Chat
- `POST /api/chat/mode` — Чат в режиме (human-teacher, human-student, both, teacher-student)
- `POST /api/chat/export` — Экспорт истории в JSON
- `POST /api/chat/stream` — Стриминг генерации (WebSocket)
- `WS /ws/chat/{session_id}` — Real-time token stream

### Status
- `GET /api/status` — Статус сервера и компонентов
- `GET /api/llm/status` — Статус LLM engine (Teacher + Student)

### Models
- `POST /api/models/teacher` — Загрузка Teacher модели
- `POST /api/models/student` — Создание Student модели
- `POST /api/models/convert` — Конвертация teacher->student
- `POST /api/models/validate` — Валидация качества
- `POST /api/models/scratch` — Создание Student шаблона
- `POST /api/models/upload` — Загрузка файлов на диск
- `GET /api/models/list` — Сканирование файловой системы
- `GET /api/models/teacher/{fn}` — Парсинг GGUF архитектуры
- `GET /api/models/student/{fn}` — Чтение config.json

### LLM
- `POST /api/llm/load` — Загрузка модели в LlamaCpp
- `GET /api/llm/status` — Статус LLM engine

### Benchmark
- `POST /api/benchmark/run` — Benchmark runner
- `POST /api/benchmark/compare` — Comparison engine
- `POST /api/benchmark/fine-tune` — Distillation training

### Stage 6
- `POST /api/stage6/ai` — AI прогноз производительности
- `POST /api/stage6/forecast` — Прогнозирование нагрузки
- `POST /api/stage6/auto-fix` — Авто-исправление ошибок
- `POST /api/stage6/self-learning` — Самообучение
- `POST /api/stage6/full-cycle` — Полный цикл оркестрации

### Datasets
- `GET /api/datasets/templates` — Шаблоны датасетов
- `POST /api/datasets/create` — Создание датасета
- `POST /api/datasets/analyze` — Анализ датасетов
- `GET /api/datasets/preview` — Предпросмотр данных
- `POST /api/datasets/activations` — Анализ активаций
- `POST /api/datasets/view` — Просмотр строк

### Plugins
- `GET /api/plugins` — Список плагинов
- `POST /api/plugins` — Создание плагина
- `DELETE /api/plugins/{name}` — Удаление плагина

### Skills
- `GET /api/skills/list` — Список скиллов
- `POST /api/skills/execute` — Выполнение скилла

### System Prompts
- `GET /api/prompts/list` — Список системных промптов
- `POST /api/prompts/switch` — Переключение промпта
- `POST /api/prompts/evaluate` — A/B тестирование промптов

---

## 🎨 UI Дизайн

Интерфейс вдохновлён **DeepSeek Harness**:
- 🖤 Тёмная тема
- 💬 Чат-первый интерфейс
- 📑 Боковая панель навигации
- 🚀 Hero Dock для пустого состояния
- ⚡ Context meter
- 🎭 Plugin panels
- 🔍 Neural network visualizer
- 📊 Architecture + Distribution views
- 📡 Real-time token stream visualization

---

## 🛠️ Разработка

### Запуск в режиме разработки

```bash
# Терминал 1: Бэкенд
cd NeuroConstructor
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload

# Терминал 2: Фронтенд
cd NeuroConstructor/frontend
npm run dev
```

### Структура компонентов UI

| Компонент | Файл | Описание |
|-----------|------|----------|
| AppLayout | `AppLayout.tsx` | Основной лейаут |
| Sidebar | `Sidebar.tsx` | Навигация по панелям |
| HeaderBar | `HeaderBar.tsx` | Верхняя панель |
| ChatArea | `ChatArea.tsx` | Область чата с сообщениями |
| StatusBar | `StatusBar.tsx` | Статус подключения к серверу |
| HeroDock | `HeroDock.tsx` | Hero section для пустого состояния |
| ModelsPanel | `ModelsPanel.tsx` | Upload, convert, analyze |
| DatasetPanel | `DatasetPanel.tsx` | Dataset CRUD |
| BenchmarkPanel | `BenchmarkPanel.tsx` | Benchmark UI |
| PluginManager | `PluginManager.tsx` | Управление плагинами |
| PreviewPanel | `PreviewPanel.tsx` | Real-time subprocess |
| NeuralNetVisualizer | `NeuralNetVisualizer.tsx` | Визуализация нейросетей |
| ArchitectureView | `ArchitectureView.tsx` | Просмотр архитектуры |
| DistributionView | `DistributionView.tsx` | Распределение весов |

---

## 📚 Философия

> **"Не обучать с нуля — а «перепрофилировать известное знание под новую форму»**

1. **Учитель** — большая модель с полными знаниями (NE ОБУЧАЕМ)
2. **Датасет** — данные для fine-tuning
3. **Активации** — анализ внутренних представлений
4. **Пустая модель** — Student архитектура
5. **Прунинг** — удаление избыточных весов
6. **Экспорт** — готовая модель в формате GGUF (Q4_0-Q8_0)

---

## 📖 Roadmap

Смотрите `DEV_PLAN.md` для полного плана разработки.

### Текущий статус
- ✅ Stage 2: Teacher/Student pipeline
- ✅ Stage 3: Dataset processing & Quantization
- ✅ Stage 4: Plugin system & Inference
- ✅ Stage 5: Testing framework
- ✅ Stage 6: AI, Forecast, AutoFix, SelfLearning
- ✅ REST API (FastAPI) — 38+ endpoints
- ✅ React UI (DeepSeek Harness style) — 30+ компонентов
- ✅ Real-time token stream (WebSocket)
- ✅ System prompts & Skills system
- ⏳ Реальная интеграция с моделями

### Приоритеты
| Приоритет | Фича | Статус |
|-----------|------|--------|
| 🔴 P0 | Скиллы | ⬜ TODO |
| 🔴 P0 | Системные промты | ⬜ TODO |
| 🟡 P1 | Stream Chat | ⬜ TODO |
| 🟡 P1 | Attention Heatmap | ⬜ TODO |
| 🟠 P2 | Token Ranking | ⬜ TODO |
| 🟢 P3 | Reasoning Trajectory | ⬜ TODO |

---

## 🤝 Участие

1. Fork проект
2. Создайте feature branch
3. Commit изменения
4. Push в branch
5. Создайте Pull Request

---

## 📄 License

MIT
