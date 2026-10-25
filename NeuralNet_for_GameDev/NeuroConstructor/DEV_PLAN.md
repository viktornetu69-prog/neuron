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
- Teacher/Student pipeline + quality_assurance + real_quantizer
- Plugin system (Stage 4) — полная реализация
- Testing framework (Stage 5) — 3 модуля (`framework_components`, `advanced_framework`, `framework_integration`)
- REST API (FastAPI) — `backend/main.py`
- **Stage 6 AI** — `ai_plugin.py` ✅
- **Stage 6 Forecast** — `forecast_engine.py` ✅
- **Stage 6 AutoFix** — `auto_fix_engine.py` ✅
- **Stage 6 SelfLearning** — `self_learning.py` ✅
- **Stage 6 Unified** — `stage6_unified_plugin.py` ✅
- **Stage 6 Integration** — `stage6_integration.py` ✅
- React UI (DeepSeek Harness style) — `frontend/`

### 🟡 В процессе / ограничения
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
- **Web UI:** React + TypeScript + Vite — порт `3000`.
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
- React `App.tsx` с Vite, тёмная тема
- Chat: `ListBox` + `TextBlock`, FontFamily `Consolas`
- Controls: кнопки, панели навигации

**Целевой (DeepSeek Harness inspired):**
- Современная тема (тёмная/светлая), карточки, sidebar, hero dock (collapsed when empty)
- Chat по умолчанию; плагины-панели (`IWindowPlugin`, `IPanelPlugin`, `IVisualizerPlugin`)
- Trajectory / tool views для дебага
- Адаптивная ширина, статус-бар, контекст-метр

### 6.2 Мультиязычность
- **Текущее:** UI — английский (`Load Teacher`...), статусы/доки — русский/английский
- **Цель:** i18n — EN / RU (основные), + EN / ZH (как в DeepSeek Harness: `*.i18n.yaml`, BRAND_GUIDELINES.i18n.yaml)
- Ресурсы строк для React (`i18next`) и Python (`locale/`)

---

## 7. Итоговый план развития (сводка)

1. **Stage 6 (тех.)** — AI ✅, Forecast ✅, AutoFix ✅, SelfLearning ✅ (все 4 функции завершены). Интеграция в Engine + Testing Framework ✅.
2. **Интерфейс** — DeepSeek Harness style: чат + плагины-панели + hero dock + i18n.
3. **Идеи F1–F6** — в план, с приоритетами.
4. **Внешний вид + мультиязычность** — главный приоритет продукта.
5. Далее: реализация ForecastEngine / SelfLearning / F-фичи.

---

## 8. 🔮 Roadmap: Улучшение конвертации Teacher → Student

**Диагноз:** текущая конвертация — это «математическое масштабирование JSON-конфига», а не реальное преобразование модели. Student `weights.bin` — точная копия Teacher через `shutil.copy2()`. RealQuantizer существует, но не вызывается. Архитектура пересчитывается дважды (двойное сжатие). Quality Assurance считает score по гиперпараметрам, без реального инференс-теста.

### 🔴 Критичные (блок 100% конвертации)

| № | Задача | Файл | Детали | Статус |
|---|--------|------|--------|--------|
| R1 | **Убрать дублирование масштабирования** | `model_converter.py` — `_create_student_from_teacher()` + `_apply_intelligent_compression()` | Два прохода: сначала ×0.5/×0.4/×0.5, потом ×√0.316. Итог: hidden ×0.158, layers ×0.126. Оставить ОДИН шаг с единым коэффициентом. | ⬜ TODO |
| R2 | **Интегрировать RealQuantizer в пайплайн** | `model_converter.py` → `real_quantizer.py` | Вызывать `RealQuantizer.quantize_model()` вместо `shutil.copy2()`. Реально квантифицировать FP32 → Q4_0 через `GGUFBuilder`. | ⬜ TODO |
| R3 | **Копировать весы через state_dict, а не файл** | `model_converter.py` — `_save_student_model()` | Загружать state_dict из Teacher (torch/safetensors), применять квантификацию к каждой матрице, сохранять результат через GGUFBuilder. | ⬜ TODO |
| R4 | **Дескретизировать vocab_size** | `model_converter.py` — `_create_student_from_teacher()` | Сейчас vocab_size копируется 1:1 (32000), хотя config заявляет 10x сжатие. Уменьшить до ~1/2–1/3 (32000 → 12000–16000). | ⬜ TODO |

### 🟡 Важные (блок качества валидации)

| № | Задача | Файл | Детали | Статус |
|---|--------|------|--------|--------|
| R5 | **Пересчитать quality metrics** | `quality_assurance.py` — `_calculate_architectural_similarity()` | Нормализация относительно max (8000) даёт всегда низкий score для маленького Student. Сравнивать ratio размеров, а не нормализованные абсолютные значения. | ⬜ TODO |
| R6 | **Добавить реальный инференс-тест** | `quality_assurance.py` + `model_converter.py` | Прогнать один и тот же вход через Teacher и Student, сравнить outputs (cosine similarity / KL-divergence). Это единственный способ проверить 100% сходимость. | ⬜ TODO |
| R7 | **Сохранять compressed_size_gb правильно** | `model_converter.py` — `_save_student_model()` | В config.json `size_bytes` Student = `size_bytes` Teacher (копируется). После квантификации размер будет ~1/2–1/4. | ⬜ TODO |

### 🟢 Желательные (оптимизация)

| № | Задача | Файл | Детали | Статус |
|---|--------|------|--------|--------|
| R8 | **Экспериментальная настройка ratio** | `model_converter_config.json` | Позволить пользователю выбирать target_compression_ratio (0.05, 0.1, 0.2) вместо хардкода 0.1. | ⬜ TODO |
| R9 | **Выбор метода квантификации** | `real_quantizer.py` | Поддержка q4_0, q5_0, q6_0, q8_0 (сейчас только q4_0). | ⬜ TODO |
| R10 | **Валидация загружаемости Student** | `_validate_conversion_quality()` | После сохранения — попробовать загрузить Student через `gguf.GGUFModel.from_file()`. Если не грузится — конвертация провалилась. | ⬜ TODO |

---

## 8.1 Приоритетный бэклог (последовательность реализации)

```
Приоритет 1 (must-have):
  R1 → Убрать двойное сжатие архитектуры
  R2 → Интегрировать RealQuantizer
  R3 → Реальный перенос весов (state_dict + quantize)

Приоритет 2 (should-have):
  R5 → Исправить quality metrics
  R6 → Инференс-тест Teacher vs Student
  R4 → Дескретизация vocab_size

Приоритет 3 (nice-to-have):
  R7 → Правильный compressed_size_gb
  R8 → Настраиваемый ratio
  R9 → Выбор метода квантификации
  R10 → Валидация загружаемости Student

---

## 9. 🌍 Визион: Мультимодальный дистиллятор знаний

**Философия:** Teacher — неизменный эталон. Student учится у Teacher'а, а не у данных.
Pipeline: создать тест → прогнать Teacher → прогнать Student → сравнить → дообучить Student → повторить с новым модальностью.

### 📝 Этап 1: Базовый лингвистический дистиллятор (MVP)

```
┌─────────────────────────────────────────────────────────────────┐
│  1. Создать базовый датасет для теста LM (100-150 тестов)        │
│     - QA-пары (шаблон "qa_pairs")                                │
│     - Чат-диалоги (шаблон "simple_chat")                         │
│     - Код-примеры (шаблон "code_examples")                       │
│     - Сохранить manifest + train/val/test splits                  │
│                                                                  │
│  2. Загрузить Teacher LM (GGUF/Q4_0)                             │
│     - Проанализировать архитектуру (GGUF header)                  │
│     - Зафиксировать веса Teacher (НЕ ОБУЧАЕМ)                     │
│                                                                  │
│  3. Прогнать датасет по Teacher → сохранить ответы                │
│     - input: вопросы из test split                                │
│     - output: ответы Teacher (сохраняем как "ground truth")       │
│                                                                  │
│  4. Создать Student LM (уменьшенная архитектура)                  │
│     - hidden_size × 0.5, layers × 0.4, heads × 0.5              │
│     - Квантификация Q4_0                                         │
│                                                                  │
│  5. Прогнать тот же датасет по Student → сохранить ответы          │
│     - Те же input, тот же test split                              │
│                                                                  │
│  6. Сравнить Teacher vs Student                                   │
│     - Cosine similarity ответов                                  │
│     - BLEU / ROUGE score                                        │
│     - Перплексия (teacher vs student)                            │
│     - Exact match percentage                                     │
│     - Generate report: какие тесты passed, какие failed            │
│                                                                  │
│  7. Если результат < 85% → дообучить Student                      │
│     - Создать fine-tuning датасет (супервизорное обучение)        │
│     - Пейринг: Teacher ответ = target, Student ответ = signal     │
│     - Distillation loss: KL-divergence between logits             │
│     - Fine-tune Student на (input, Teacher_output)                │
│     - Вернуться к шагу 5                                         │
│                                                                  │
│  8. Если результат ≥ 85% → Student готов для LM                   │
│     - Сохранить финальный checkpoint                              │
│     - Generate benchmark report                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Файлы для реализации:**
- `NeuroConstructor.Core/core/` — `lm_benchmark.py`, `distillation_trainer.py`, `answer_comparator.py`
- `backend/main.py` — `/api/benchmark/create`, `/api/benchmark/run`, `/api/benchmark/compare`, `/api/benchmark/fine-tune`
- `frontend/` — экран **Benchmark** с таблицей результатов

**Тесты: 100-150 примеров**
- 50 QA-пар (general knowledge)
- 30 chat-диалогов (multi-turn context)
- 20 code-примеров (syntax + logic)
- 20 prompt-response (creative tasks)

---

### 🖼️ Этап 2: Computer Vision — дистилляция визуальных признаков

```
┌─────────────────────────────────────────────────────────────────┐
│  1. Скачать новую Teacher CV модель (напр. CLIP / ViT)            │
│     - Teacher НЕ обучаем — только inference                       │
│                                                                  │
│  2. СоздатCV датасет (изображения)                                │
│     - Загрузить набор картинок (CIFAR-10 / COCO / custom)         │
│     - Классификация + детекция + segmentation                     │
│                                                                  │
│  3. Прогнать Teacher → сохранить активации                         │
│     - Классы объектов                                             │
│     - Bounding boxes                                              │
│     - Feature maps (активные нейроны)                              │
│                                                                  │
│  4. Создать Student CV модель (smaller ViT / MobileNet)            │
│     - Меньше слоёв, меньше каналов, квантификация                 │
│                                                                  │
│  5. Прогнать тот же датасет по Student → сравнить                  │
│     - Top-1 / Top-5 accuracy vs Teacher                           │
│     - mAP (mean Average Precision) для детекции                   │
│     - Feature map similarity (CSSIM / L2)                         │
│                                                                  │
│  6. Distillation для CV                                           │
│     - Feature-level distillation (student feature map ≈ teacher)  │
│     - Logits-level distillation (KL-divergence)                   │
│     - Relationship-level distillation (gram matrices)             │
│                                                                  │
│  7. Fine-tune Student → повторить сравнение                       │
│     - До convergence или ≥ 90% от Teacher                         │
└─────────────────────────────────────────────────────────────────┘
```

**Файлы для реализации:**
- `NeuroConstructor.Core/core/cv_processor.py` — загрузка CV моделей, inference, feature extraction
- `NeuroConstructor.Core/core/cv_distiller.py` — feature-level + logits-level distillation
- `NeuroConstructor.Core/core/answer_comparator.py` — compare_teacher_student для CV (accuracy, mAP, CSSIM)

---

### 🎵 Этап 3: Audio — дистилляция звуковых моделей

```
┌─────────────────────────────────────────────────────────────────┐
│  1. Teacher: Whisper / Wav2Vec2 / SpeechT                         │
│  2. Датасет: аудиофайлы + транскрипты                             │
│  3. Прогнать Teacher → ASR output + phoneme activations           │
│  4. Student: smaller Whisper / Tiny Wav2Vec                       │
│  5. Прогнать Student → сравнить WER (Word Error Rate)             │
│  6. Distillation: logits + hidden state matching                  │
│  7. Fine-tune Student → повторить                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 🖥️ Этап 4: Real-time Desktop Vision — студент «видит» экран

```
┌─────────────────────────────────────────────────────────────────┐
│  1. Захват видео с рабочего стола (screen capture)                │
│     - Windows: DXGI Desktop Duplication / DirectX                 │
│     - Захват кадров 30-60 fps                                     │
│                                                                  │
│  2. Teacher CV модель: realtime object detection                  │
│     - Загружаем обученного Teacher CV                             │
│     - Каждый кадр → bounding boxes + class labels                 │
│     - Сохраняем как «ground truth scene understanding»            │
│                                                                  │
│  3. Student CV модель: lightweight detection                      │
│     - MobileNet-SSD / YOLO-Nano / TinyViT                         │
│     - Тот же кадр → те же bounding boxes                          │
│     - Сравниваем: IoU, class match, confidence                    │
│                                                                  │
│  4. Real-time distillation                                        │
│     - Student учится «смотреть» как Teacher                       │
│     - Если Student пропустил объект → correction signal            │
│     - If Student detected wrong class → cross-entropy loss          │
│                                                                  │
│  5. Визуализация                                                   │
│     - Overlay: Teacher boxes (green), Student boxes (red)          │
│     - Live comparison panel: fps, accuracy, missed objects          │
└─────────────────────────────────────────────────────────────────┘
```

**Файлы для реализации:**
- `NeuroConstructor.Core/core/screen_capture.py` — захват экрана (DXGI / mss / PIL)
- `NeuroConstructor.Core/core/realtime_detector.py` — pipeline: frame → teacher → student → compare → overlay
- `frontend/` — экран **Live Vision** с двумя окнами (Teacher vs Student)

---

### 🎨 Этап 5: Creative Tools Integration — Blender, Game Engines, Graphics Editors

```
┌─────────────────────────────────────────────────────────────────┐
│  Цель: Студент помогает моделировать объекты в профессиональных   │
│         инструментах, глядя на примеры из интернета               │
│                                                                  │
│  Пример: «Смоделировать кошку»                                    │
│  ─────────────────────────────────────────────                     │
│                                                                  │
│  1. Пользователь просит: «Смоделировать кошку»                     │
│                                                                  │
│  2. Student ищет в интернете (или локальной БД)                    │
│     - 5-10 изображений кошек (фото, 3D-рефы)                      │
│     - 3D-модели кошек (GLTF/FBX из Sketchfab / Mixamo)             │
│     - Текстовые описания анатомии кошки                           │
│                                                                  │
│  3. Multimodal Teacher анализирует                               │
│     - CV: распознаёт позу, анатомию, текстуры                      │
│     - LM: описывает структуру (4 лапы, хвост, шерсть...)           │
│     - Audio: если есть — звуки кошки                              │
│     → Teacher формирует «reference profile»                       │
│                                                                  │
│  4. Student генерирует вариант                                     │
│     - Blender API: создаёт базовую 3D-модель кошки                 │
│       - Sphere modifier → body                                   │
│       - Cylinders → legs                                          │
│       - Custom topology → head, ears, tail                        │
│     - Или: Unity prefab via script                                │
│     - Или: SVG/texture via Photoshop API                          │
│                                                                  │
│  5. Сравнение: Student vs Teacher reference                       │
│     - Geometric similarity (mesh comparison)                      │
│     - Texture similarity (feature matching)                       │
│     - Semantic similarity (CV: same class/pose)                    │
│                                                                  │
│  6. If similarity < threshold → Student улучшает                   │
│     - Regenerates with adjusted parameters                        │
│     - Uses Teacher feedback as guidance                            │
│     - Loop until acceptable                                        │
│                                                                  │
│  7. Final export                                                   │
│     - GLTF / FBX / OBJ для импорта в игровые движки                │
│     - Пакет материалов (PBR textures)                              │
│     - LOD variants (for game engines)                              │
└─────────────────────────────────────────────────────────────────┘
```

**Файлы для реализации:**
- `NeuroConstructor.Core/core/creative_tools/` — Blender API, Unity CLI, Photoshop API
- `NeuroConstructor.Core/core/web_search.py` — поиск изображений/3D-моделей (DuckDuckGo / Sketchfab API)
- `NeuroConstructor.Core/core/mesh_comparator.py` — сравнение 3D-моделей (mesh, topology, UV)
- `NeuroConstructor.Core/core/reference_profile.py` — создание «reference profile» из multimodal sources

---

### 🧩 Архитектурная схема всего конвейера

```
┌─────────────────────────────────────────────────────────────────────┐
│                     NeuroConstructor — Full Pipeline                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────────┐  │
│  │  TEXT    │    │   IMAGE  │    │  AUDIO   │    │   3D / VIDE  │  │
│  │  LM      │    │   CV     │    │  ASR     │    │  CREATIVE    │  │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘    └──────┬───────┘  │
│       │               │               │                 │          │
│       ▼               ▼               ▼                 ▼          │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                   TEACHER MODELS ( frozen )                  │  │
│  │  GPT / Llama (text)    ·   CLIP / ViT (vision)              │  │
│  │  Whisper (audio)       ·   Desktop Vision (screen)           │  │
│  └────────────────────┬────────────────────────────────────────┘  │
│                       │ Teacher НЕ ОБУЧАЕМ — эталон                 │
│                       ▼                                            │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                  STUDENT MODELS ( trainable )                │  │
│  │  Quantized Q4_0 · Smaller Architecture · Distilled          │  │
│  └────────────────────┬────────────────────────────────────────┘  │
│                       │                                            │
│                       ▼                                            │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │            DISTILLATION TRAINER (контур)                      │  │
│  │  1. Generate test dataset (100-150 samples)                  │  │
│  │  2. Run Teacher → ground truth                               │  │
│  │  3. Run Student → prediction                                 │  │
│  │  4. Compare (similarity / accuracy / mAP)                    │  │
│  │  5. If < threshold → fine-tune Student                       │  │
│  │  6. Repeat until ≥ threshold (85-90%)                        │  │
│  │  7. Export Student checkpoint                                │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              CREATIVE TOOLS INTEGRATION                      │  │
│  │  Blender API · Unity CLI · Photoshop · Game Engines          │  │
│  │  Student generates 3D/texture/audio → Teacher validates       │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                   FRONTEND SCREENS                           │  │
│  │  Models · Datasets · Benchmark · Live Vision · Creative      │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 9.1 Приоритеты реализации этапов

| Этап | Приоритет | Зависит от | Статус |
|------|-----------|------------|--------|
| **Этап 1: LM Benchmark** | 🔴 P0 | datasets ✅ | ⬜ TODO |
| **Этап 2: CV Distillation** | 🟡 P1 | Этап 1, torch, torchvision | ⬜ TODO |
| **Этап 3: Audio** | 🟡 P1 | Этап 1, transformers | ⬜ TODO |
| **Этап 4: Desktop Vision** | 🟠 P2 | Этап 2, screen_capture | ⬜ TODO |
| **Этап 5: Creative Tools** | 🟢 P3 | Этапы 1-4, Blender/Unity API | ⬜ TODO |

**Сейчас фокус на Этапе 1:** лингвистический benchmark — создать тест, прогнать Teacher/Student, сравнить, дообучить.

---

## 9.2 Скиллы и системные промты

### 9.2.1 Система скиллов

Скиллы — это специализированные модули, которые расширяют способности Teacher и Student моделей. Каждый скилл — это плагин с чётким интерфейсом.

```
Skills System (PluginInterface)
    ├── 🔍 SearchSkill        — поиск в интернете, БД, Knowledge Graph
    ├── 🎨 CreativeSkill      — генерация изображений, 3D-моделей, текста
    ├── 🔧 DevSkill           — генерация кода, рефакторинг, тесты
    ├── 🎮 GameDevSkill       — Blender API, Unity CLI, Unreal Tooling
    ├── 📊 AnalyticsSkill     — анализ данных, визуализация, отчёты
    ├── 🔊 AudioSkill         — ASR, TTS, звуковая обработка
    ├── 🖼️ CVSkill             — классификация, детекция, сегментация
    └── 🔄 AutoFixSkill       — автоматическое исправление ошибок
```

**Реализация:**
- Каждый скилл реализует `SkillInterface` (`execute()`, `get_capabilities()`, `get_config()`)
- Скиллы регистрируются в `PluginManager`
- Конфигурация: `NeuroConstructor.Core/config/skills_config.json`
- Команды: `GET /api/skills/list`, `POST /api/skills/execute`

**Пример:** `CreativeSkill` для Blender
```python
class CreativeSkill(SkillInterface):
    name = "creative"
    capabilities = ["blender_generate", "mesh_edit", "texture_apply"]
    
    async def execute(self, command: str, params: dict) -> SkillResult:
        # Отправка команды через Blender API
        # Возврат результата с метаданными
```

### 9.2.2 Системные промты

Системные промты — это шаблоны, которые определяют «роль» и поведение модели при генерации. Каждый пройт хранится в `NeuroConstructor.Core/prompts/`.

```
System Prompts
    ├── system_teacher.json      — Teacher как эксперт-наставник
    ├── system_student.json      — Student как ученик с ограничениями
    ├── system_creative.json     — креативный режим (Blender, 3D)
    ├── system_code.json         — генерация и рефакторинг кода
    ├── system_analytics.json    — аналитика и отчёты
    └── system_multimodal.json   — мультимодальный режим
```

**Структура системного промта:**
```json
{
  "name": "teacher",
  "version": "1.0",
  "system_prompt": "Ты — Teacher Model, эксперт-наставник. Отвечай подробно, объясняй концепции, приводи примеры из практики.",
  "parameters": {
    "temperature": 0.7,
    "max_tokens": 2048,
    "top_p": 0.95,
    "frequency_penalty": 0.1
  },
  "skills": ["knowledge", "explanation", "code_generation"],
  "fallback": "student"
}
```

**Применение:**
- `llm_engine.py` загружает промпт при инициализации
- Промпт передаётся в `system` поле API-запроса
- Динамическая подмена: Teacher → Student при low-confidence
- A/B тестирование промптов: `prompt_evaluation.py`

**API:**
- `GET /api/prompts/list` — список системных промптов
- `POST /api/prompts/switch` — переключение промпта
- `POST /api/prompts/evaluate` — A/B тестирование

---

## 9.3 Визуальное отображение рассуждений моделей в реальном времени

### 9.3.1 Token-by-Token Visualization

Ключевая фича: **пользователь видит, как модель "думает" в реальном времени** — генерация и подгрузка каждого токена с визуализацией.

```
Token Stream Pipeline
    ┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
    │  LLM Engine  │────▶│ Token Parser │────▶│  Visual Renderer│
    │ (llama.cpp/  │     │  (streaming) │     │  (WebSocket)    │
    │  Ollama)     │     │              │     │                 │
    └─────────────┘     └──────────────┘     └────────┬────────┘
                                                      │
                    ┌─────────────────────────────────┤
                    │                                 │
              ┌─────┴─────┐                   ┌─────┴─────┐
              │ Text Panel│                   │ Heat Map  │
              │ (chat)    │                   │ (tokens)  │
              └───────────┘                   └───────────┘
                                                      │
                    ┌─────────────────────────────────┤
                    │                                 │
              ┌─────┴─────┐                   ┌─────┴─────┐
              │Attention  │                   │Token Prob │
              │  View     │                   │  Ranking  │
              └───────────┘                   └───────────┘
```

**Техническая реализация:**
- `llm_engine.py` → streaming генерация (llama-cpp-python `n_predict=0`, chunk-by-chunk)
- WebSocket (`/ws/chat/{session_id}`) — передача токенов в реальном времени
- Frontend: `TokenStreamRenderer.tsx` — отображение каждого токена как только он получен
- `AttentionVisualizer.tsx` — heat map attention weights (layer × head × seq_len)

**Компоненты визуализации:**

1. **Stream Chat Panel** — текст появляется слово за словом (не ждать окончания)
2. **Token Probability Heatmap** — цветная карта: яркие = высокая вероятность
3. **Attention Flow** — анимированные линии между "понимаемыми" токенами
4. **Token Rank Panel** — топ-N альтернатив для каждого токена (с вероятностями)
5. **Generation Metrics** — latency per token, throughput (tok/s), total time

**API + WebSocket:**
```
POST /api/chat/stream     →  { session_id, messages, mode }
WS   /ws/chat/{session_id} →  { type: "token", data: { token, text, prob } }
                            →  { type: "attention", data: { layer, head, weights } }
                            →  { type: "metrics", data: { tokens_per_sec, total_time } }
                            →  { type: "done", data: { total_tokens, stop_reason } }
```

**Frontend компоненты:**
- `TokenStreamRenderer.tsx` — основной компонент стриминга
- `AttentionHeatMap.tsx` — heat map attention weights
- `TokenRanking.tsx` — ranking альтернативных токенов
- `GenerationMetrics.tsx` — метрики генерации в реальном времени
- `ReasoningTrajectory.tsx` — визуализация "пути рассуждений" модели

**Метрики рассуждений:**
| Метрика | Описание |
|---------|----------|
| **Token Latency** | Время между токенами (мс) |
| **Throughput** | Скорость генерации (ток/сек) |
| **Attention Entropy** | Насколько "сосредоточена" модель |
| **Decision Confidence** | Средний probability выбранных токенов |
| **Reasoning Depth** | Количество "шагов" в рассуждении |

**Пример использования:**
Пользователь спрашивает: *"Почему кошка мяукает?"*
- Каждое слово появляется в реальном времени
- Heatmap показывает, на какие слова из вопроса модель "смотрит"
- Ranking показывает альтернативы (мяукает/рычит/лаял)
- Metrics: 45 ток/сек, уверенность 0.87, attention entropy 0.31

---

## 9.4 Приоритеты реализации фич

| Фича | Приоритет | Зависит от | Статус |
|------|-----------|------------|--------|
| **Скиллы** | 🔴 P0 | Plugin System ✅ | ⬜ TODO |
| **Системные промты** | 🔴 P0 | LLM Engine ✅ | ⬜ TODO |
| **Stream Chat** | 🟡 P1 | WebSocket | ⬜ TODO |
| **Attention Heatmap** | 🟡 P1 | Stream Chat, llama.cpp attention | ⬜ TODO |
| **Token Ranking** | 🟠 P2 | Stream Chat, logits sampling | ⬜ TODO |
| **Reasoning Trajectory** | 🟢 P3 | Stream Chat + Attention | ⬜ TODO |

**Сейчас фокус на Stream Chat** — базовая реализация real-time отображения генерации.
```

