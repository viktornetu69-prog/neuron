# 🧠 NeuroConstructor

**Конструктор локальных нейронных сетей** — Teacher/Student pipeline с REST API и React UI.

---

## 📋 Описание

NeuroConstructor позволяет создавать и оптимизировать нейронные модели по принципу **Teacher-Student**:
1. Загружаем большую модель (Teacher)
2. Создаём маленькую версию (Student) с компрессией
3. Валидируем качество
4. Используем для инференса

### Возможности
- 🧠 Загрузка Teacher моделей (GGUF, PyTorch)
- 📦 Создание Student моделей с компрессией
- ✅ Валидация качества (6 метрик)
- 📊 Обработка датасетов и анализ активаций
- ⚡ Квантификация весов (Q4_0)
- 🔌 Плагинная система
- 🤖 Stage 6: AI прогноз, Forecast, AutoFix, SelfLearning

---

## 🚀 Быстрый старт

### 1. Установите зависимости бэкенда

```bash
cd backend
pip install -r requirements.txt
```

### 2. Запустите бэкенд

```bash
python main.py
# Сервер запустится на http://localhost:8000
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
├── backend/                    # FastAPI REST API
│   ├── main.py                 # API сервер
│   └── requirements.txt        # Зависимости Python
│
├── frontend/                   # React + TypeScript UI
│   ├── src/
│   │   ├── App.tsx             # Главный компонент
│   │   ├── api.ts              # API клиент
│   │   ├── index.css           # Глобальные стили
│   │   └── components/
│   │       ├── Sidebar.tsx     # Боковая панель
│   │       ├── ChatArea.tsx    # Чат-интерфейс
│   │       ├── StatusBar.tsx   # Статус сервера
│   │       └── HeroDock.tsx    # Hero dock для пустого состояния
│   ├── package.json
│   └── vite.config.ts
│
├── NeuroConstructor.Core/      # Python ядро
│   ├── core/
│   │   ├── model_loader.py     # Загрузка моделей
│   │   ├── model_converter.py  # Конвертация teacher->student
│   │   ├── quality_assurance.py # Валидация качества
│   │   ├── dataset_processor.py # Обработка датасетов
│   │   ├── real_quantizer.py   # Квантификация
│   │   ├── model_inference.py  # Инференс
│   │   ├── plugin_system.py    # Плагинная система
│   │   ├── stage6_*.py         # Stage 6 плагины
│   │   └── test_framework.py   # Testing framework
│   ├── config/                 # Конфигурации
│   └── models/                 # Файлы моделей (*.gguf)
│
├── DEV_PLAN.md                 # Дорожная карта
└── README.md                   # Этот файл
```

---

## 🌐 API Endpoints

### Health
- `GET /health` — Проверка здоровья сервера

### Chat
- `POST /api/chat` — Отправка сообщений

### Status
- `GET /api/status` — Статус сервера и компонентов

### Models
- `POST /api/models/teacher` — Загрузка Teacher модели
- `POST /api/models/student` — Создание Student модели
- `POST /api/models/convert` — Конвертация teacher->student
- `POST /api/models/validate` — Валидация модели

### Stage 6
- `POST /api/stage6/ai` — AI прогноз
- `POST /api/stage6/forecast` — Прогнозирование нагрузки
- `POST /api/stage6/auto-fix` — Авто-исправление
- `POST /api/stage6/self-learning` — Самообучение
- `POST /api/stage6/full-cycle` — Полный цикл

### Datasets
- `GET /api/datasets/templates` — Шаблоны датасетов
- `POST /api/datasets/create` — Создание датасета

---

## 🎨 UI Дизайн

Интерфейс вдохновлён **DeepSeek Harness**:
- 🖤 Тёмная тема
- 💬 Чат-первый интерфейс
- 📑 Боковая панель навигации
- 🚀 Hero Dock для пустого состояния
- ⚡ Context meter
- 🎭 Plugin panels

---

## 🛠️ Разработка

### Запуск в режиме разработки

```bash
# Терминал 1: Бэкенд
cd backend
python main.py

# Терминал 2: Фронтенд
cd frontend
npm run dev
```

### Структура компонентов UI

| Компонент | Файл | Описание |
|-----------|------|----------|
| Sidebar | `Sidebar.tsx` | Навигация по панелям |
| ChatArea | `ChatArea.tsx` | Область чата с сообщениями |
| StatusBar | `StatusBar.tsx` | Статус подключения к серверу |
| HeroDock | `HeroDock.tsx` | Hero section для пустого состояния |

---

## 📚 Философия

> **"Не обучать с нуля — а «перепрофилировать известное знание под новую форму»**

1. **Учитель** — большая модель с полными знаниями
2. **Датасет** — данные дляfine-tuning
3. **Активации** — анализ внутренних представлений
4. **Пустая модель** — Student архитектура
5. **Прунинг** — удаление избыточных весов
6. **Экспорт** — готовая модель в формате GGUF

---

## 📖 Roadmap

Смотрите `DEV_PLAN.md` для полного плана разработки.

### Текущий статус
- ✅ Stage 2: Teacher/Student pipeline
- ✅ Stage 3: Dataset processing & Quantization
- ✅ Stage 4: Plugin system & Inference
- ✅ Stage 5: Testing framework
- ✅ Stage 6: AI, Forecast, AutoFix, SelfLearning
- ✅ REST API (FastAPI)
- ✅ React UI (DeepSeek Harness style)
- ⏳ Реальная интеграция с моделями

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
