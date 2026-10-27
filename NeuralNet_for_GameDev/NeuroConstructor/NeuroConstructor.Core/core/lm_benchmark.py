"""
LM Benchmark — генерация тестов, прогон Teacher/Student, сравнение, отчёт.

Pipeline:
1. Создать базовый датасет для теста LM (100-150 тестов)
2. Прогнать Teacher → ground truth answers
3. Прогнать Student → predicted answers
4. Сравнить ответы (cosine, BLEU, ROUGE, token F1)
5. Generate report: какие тесты passed, какие failed
6. Если результат < 85% → fine-tune Student (через distillation_trainer)
"""

import json
import logging
import os
from typing import Dict, List, Optional, Any, Callable, Union
from datetime import datetime
from dataclasses import dataclass, field

from answer_comparator import AnswerComparator, ComparisonEngine, BenchmarkReport

logger = logging.getLogger(__name__)

# Import LLM Engine if available
try:
    from llm_engine import LLMEngine, InferenceConfig
    LLM_ENGINE_AVAILABLE = True
except ImportError:
    LLM_ENGINE_AVAILABLE = False
    LLMEngine = None
    InferenceConfig = None


@dataclass
class BenchmarkConfig:
    """Configuration for benchmark run."""
    test_count: int = 120
    qa_pairs: int = 50
    chat_dialogs: int = 30
    code_examples: int = 20
    creative_tasks: int = 20
    pass_threshold: float = 0.85
    output_dir: str = "benchmarks"
    # LLM Engine settings
    teacher_engine_type: str = "llama_cpp"  # "llama_cpp", "ollama", "mock"
    teacher_model_path: str = ""
    teacher_api_url: str = "http://localhost:11434"
    teacher_model_name: str = "llama3"
    student_engine_type: str = "llama_cpp"
    student_model_path: str = ""
    student_api_url: str = "http://localhost:11434"
    student_model_name: str = "llama3"
    inference_params: Dict[str, Any] = field(default_factory=lambda: {
        "max_tokens": 512,
        "temperature": 0.7,
        "top_p": 0.9,
    })


@dataclass
class BenchmarkResult:
    """Result of a single benchmark run."""
    config: BenchmarkConfig
    total_tests: int = 0
    passed: int = 0
    failed: int = 0
    pass_rate: float = 0.0
    overall_similarity: float = 0.0
    report: Optional[Dict] = None
    timestamp: str = ""
    teacher_model: str = ""
    student_model: str = ""
    fine_tuning_needed: bool = False

    def to_dict(self) -> Dict:
        return {
            "config": {
                "test_count": self.config.test_count,
                "qa_pairs": self.config.qa_pairs,
                "chat_dialogs": self.config.chat_dialogs,
                "code_examples": self.config.code_examples,
                "creative_tasks": self.config.creative_tasks,
                "pass_threshold": self.config.pass_threshold,
            },
            "total_tests": self.total_tests,
            "passed": self.passed,
            "failed": self.failed,
            "pass_rate": round(self.pass_rate, 2),
            "overall_similarity": round(self.overall_similarity * 100, 2),
            "teacher_model": self.teacher_model,
            "student_model": self.student_model,
            "fine_tuning_needed": self.fine_tuning_needed,
            "timestamp": self.timestamp,
            "report": self.report,
        }


class TestGenerator:
    """Generate benchmark test cases from templates."""

    # General knowledge QA pairs
    QA_PAIRS = [
        {"question": "Что такое нейросеть?", "expected": "Нейросеть — это математическая модель, вдохновлённая структурой биологических нейронов, состоящая из слоёв узлов (нейронов), связанных весами."},
        {"question": "Как работает обратное распространение ошибки?", "expected": "Backpropagation — алгоритм обучения нейросети, который вычисляет градиент функции потерь по всем весам сети через правило цепи, затем обновляет веса для минимизации ошибки."},
        {"question": "Что такое квантификация моделей?", "expected": "Квантификация — процесс снижения точности числовых представлений весов нейросети (например, из FP32 до INT8), что уменьшает размер модели и ускоряет инференс."},
        {"question": "Чем Teacher-модель отличается от Student?", "expected": "Teacher — большая, точная модель-эксперт, которая передаёт знания Student'у через дистилляцию. Student — меньшая, эффективная модель для инференса."},
        {"question": "Что такое GGUF формат?", "expected": "GGUF (GGML Universal Format) — бинарный формат для хранения квантированных нейросетей, оптимизированный для эффективного инференса на CPU/GPU."},
        {"question": "Что такое attention mechanism?", "expected": "Attention mechanism — способ, позволяющий модели взвешивать важность разных частей входных данных при формировании каждого элемента выхода."},
        {"question": "Как работает Layer Normalization?", "expected": "Layer Normalization нормализует активации по каждому примеру отдельно, вычитая среднее и деля на стандартное отклонение по всем нейронам слоя."},
        {"question": "Что такое dropout?", "expected": "Dropout — техника регуляризации, при которой случайные нейроны отключаются во время обучения, что предотвращает переобучение."},
        {"question": "Что такое transformer архитектура?", "expected": "Transformer — архитектура нейросети, использующая self-attention механизмы для обработки последовательностей, без рекуррентных связей."},
        {"question": "Что такое perplexity в LM?", "expected": "Perplexity — метрика качества языковой модели, показывающая, насколько хорошо модель предсказывает следующий токен. Ниже — лучше."},
    ]

    # Chat dialog prompts
    CHAT_PROMPTS = [
        {"prompt": "Привет! Как дела?", "expected": "Привет! Я NeuroConstructor — ассистент для работы с нейросетями. Помогу с моделями и обучением."},
        {"prompt": "Что ты умеешь?", "expected": "Я умею создавать датасеты, конвертировать Teacher модели в Student, анализировать активации и оптимизировать нейросети."},
        {"prompt": "Расскажи о себе", "expected": "Я — NeuroConstructor, специализируюсь на дистилляции знаний: создаю компактные Student модели на основе больших Teacher."},
        {"prompt": "Как создать модель?", "expected": "Загрузите Teacher модель, затем используйте функцию конвертации для создания Student. Можно настроить степень сжатия."},
        {"prompt": "Что такое дистилляция?", "expected": "Дистилляция — процесс передачи знаний от большой Teacher модели к малой Student модели, сохраняя качество при меньшем размере."},
    ]

    # Code examples
    CODE_EXAMPLES = [
        {"prompt": "Напиши функцию для нормализации массива", "expected": "def normalize(arr):\n    min_val = min(arr)\n    max_val = max(arr)\n    return [(x - min_val) / (max_val - min_val) for x in arr]"},
        {"prompt": "Как посчитать cosine similarity в Python?", "expected": "import math\ndef cosine_sim(a, b):\n    dot = sum(x*y for x,y in zip(a,b))\n    norm_a = math.sqrt(sum(x*x for x in a))\n    norm_b = math.sqrt(sum(x*x for x in b))\n    return dot / (norm_a * norm_b)"},
        {"prompt": "Напиши простой MLP на Python", "expected": "class MLP:\n    def __init__(self, layers):\n        self.weights = [np.random.randn(l1,l2) for l1,l2 in zip(layers[:-1],layers[1:])]\n    def forward(self, x):\n        for w in self.weights:\n            x = self.relu(x @ w)\n        return x"},
        {"prompt": "Как реализовать softmax?", "expected": "import numpy as np\ndef softmax(x):\n    exp_x = np.exp(x - np.max(x))\n    return exp_x / np.sum(exp_x)"},
        {"prompt": "Напиши функцию для вычисления MSE loss", "expected": "def mse_loss(y_true, y_pred):\n    return np.mean((y_true - y_pred) ** 2)"},
    ]

    # Creative tasks
    CREATIVE_TASKS = [
        {"prompt": "Опиши как работает обучение нейросети", "expected": "Обучение нейросети включает: инициализацию весов, прямой проход для получения предсказаний, вычисление функции потерь, обратное распространение ошибки, обновление весов. Этот цикл повторяется на батчах данных до достижения критерия остановки."},
        {"prompt": "Объясни разницу между CNN и RNN", "expected": "CNN (свёрточные сети) используют свёртки для обработки изображений, извлекая пространственные паттерны. RNN (рекуррентные сети) обрабатывают последовательности, сохраняя скрытое состояние. CNN лучше для визуальных данных, RNN — для временных рядов и текста."},
        {"prompt": "Как обучить модель для генерации текста?", "expected": "Для генерации текста нужно: собрать корпус текстов, токенизировать, создать модель (обычно transformer-decoder), обучать предсказывать следующий токен с cross-entropy loss, затем генерировать текст autoregressивно."},
        {"prompt": "Что такое few-shot learning?", "expected": "Few-shot learning — подход, при котором модель учится выполнять задачу с очень небольшим количеством примеров (единицы-десятки). Используется предобученная модель и адаптация через prompt или fine-tuning."},
        {"prompt": "Как уменьшить переобучение модели?", "expected": "Методы борьбы с переобучением: dropout, L2 regularization, early stopping, data augmentation, уменьшение сложности модели, cross-validation, batch normalization."},
    ]

    def generate(
        self,
        config: Optional[BenchmarkConfig] = None,
    ) -> List[Dict]:
        """Generate benchmark test cases."""
        config = config or BenchmarkConfig()
        tests = []
        test_id = 1

        # QA pairs (cycle if needed)
        for i in range(config.qa_pairs):
            qa = self.QA_PAIRS[i % len(self.QA_PAIRS)]
            tests.append({
                "test_id": f"qa_{test_id:03d}",
                "category": "qa",
                "question": qa["question"],
                "expected_answer": qa["expected"],
            })
            test_id += 1

        # Chat dialogs (cycle)
        for i in range(config.chat_dialogs):
            chat = self.CHAT_PROMPTS[i % len(self.CHAT_PROMPTS)]
            tests.append({
                "test_id": f"chat_{test_id:03d}",
                "category": "chat",
                "question": chat["prompt"],
                "expected_answer": chat["expected"],
            })
            test_id += 1

        # Code examples (cycle)
        for i in range(config.code_examples):
            code = self.CODE_EXAMPLES[i % len(self.CODE_EXAMPLES)]
            tests.append({
                "test_id": f"code_{test_id:03d}",
                "category": "code",
                "question": code["prompt"],
                "expected_answer": code["expected"],
            })
            test_id += 1

        # Creative tasks (cycle)
        for i in range(config.creative_tasks):
            creative = self.CREATIVE_TASKS[i % len(self.CREATIVE_TASKS)]
            tests.append({
                "test_id": f"creative_{test_id:03d}",
                "category": "creative",
                "question": creative["prompt"],
                "expected_answer": creative["expected"],
            })
            test_id += 1

        return tests[:config.test_count]


class BenchmarkRunner:
    """Run benchmark: generate tests → run Teacher → run Student → compare → report."""

    def __init__(
        self,
        teacher_fn: Optional[Callable] = None,
        student_fn: Optional[Callable] = None,
        teacher_engine: Any = None,
        student_engine: Any = None,
    ):
        """
        teacher_fn(question: str) -> str
        student_fn(question: str) -> str
        teacher_engine: LLMEngine instance for Teacher
        student_engine: LLMEngine instance for Student
        If no functions or engines provided, uses mock mode.
        """
        self.teacher_fn = teacher_fn
        self.student_fn = student_fn
        self.teacher_engine = teacher_engine
        self.student_engine = student_engine
        self.comparator = ComparisonEngine()
        self.test_generator = TestGenerator()

    def _generate_teacher_answer(self, question: str, config: BenchmarkConfig) -> str:
        """Generate answer using LLM engine or mock function."""
        if self.teacher_fn:
            return self.teacher_fn(question)

        if self.teacher_engine:
            try:
                result = self.teacher_engine.generate(
                    question,
                    max_tokens=config.inference_params.get("max_tokens", 512),
                    temperature=config.inference_params.get("temperature", 0.7),
                    top_p=config.inference_params.get("top_p", 0.9),
                )
                return result.text if result.success else f"[Error] Teacher: {result.error}"
            except Exception as e:
                return f"[Error] Teacher inference failed: {str(e)}"

        # Mock mode
        return f"[Teacher Mock] Answer for: {question}"

    def _generate_student_answer(self, question: str, config: BenchmarkConfig) -> str:
        """Generate answer using LLM engine or mock function."""
        if self.student_fn:
            return self.student_fn(question)

        if self.student_engine:
            try:
                result = self.student_engine.generate(
                    question,
                    max_tokens=config.inference_params.get("max_tokens", 512),
                    temperature=config.inference_params.get("temperature", 0.7),
                    top_p=config.inference_params.get("top_p", 0.9),
                )
                return result.text if result.success else f"[Error] Student: {result.error}"
            except Exception as e:
                return f"[Error] Student inference failed: {str(e)}"

        # Mock mode
        return f"[Student Mock] Answer for: {question}"

    def run(
        self,
        config: Optional[BenchmarkConfig] = None,
        dataset_path: Optional[str] = None,
    ) -> BenchmarkResult:
        """
        Execute full benchmark pipeline.
        1. Generate/load test cases
        2. Run Teacher on each test
        3. Run Student on each test
        4. Compare answers
        5. Generate report
        """
        config = config or BenchmarkConfig()
        config.output_dir = os.path.abspath(config.output_dir)

        # Create LLM Engines if models specified
        teacher_engine = None
        student_engine = None

        if LLM_ENGINE_AVAILABLE and InferenceConfig:
            # Create Teacher engine
            if config.teacher_model_path and os.path.exists(config.teacher_model_path):
                try:
                    teacher_engine = LLMEngine.from_gguf(
                        model_path=config.teacher_model_path,
                        config=InferenceConfig(
                            max_tokens=config.inference_params.get("max_tokens", 512),
                            temperature=config.inference_params.get("temperature", 0.7),
                            top_p=config.inference_params.get("top_p", 0.9),
                        ),
                    )
                except Exception as e:
                    logger.warning(f"Failed to load Teacher model: {str(e)}")

            # Create Student engine
            if config.student_model_path and os.path.exists(config.student_model_path):
                if not config.student_model_path.endswith('.gguf'):
                    logger.warning(f"Student model must be .gguf: {config.student_model_path}")
                else:
                    try:
                        student_engine = LLMEngine.from_gguf(
                            model_path=config.student_model_path,
                            config=InferenceConfig(
                                max_tokens=config.inference_params.get("max_tokens", 512),
                                temperature=config.inference_params.get("temperature", 0.7),
                                top_p=config.inference_params.get("top_p", 0.9),
                            ),
                        )
                    except Exception as e:
                        logger.warning(f"Failed to load Student model: {str(e)}")

        self.teacher_engine = self.teacher_engine or teacher_engine
        self.student_engine = self.student_engine or student_engine

        # 1. Generate or load test cases
        if dataset_path and os.path.exists(dataset_path):
            tests = self._load_test_dataset(dataset_path)
        else:
            tests = self.test_generator.generate(config)

        # 2. Run Teacher + Student + Compare
        comparison_results = []
        for i, test in enumerate(tests):
            test_id = test.get("test_id", f"test_{i+1}")
            question = test.get("question", test.get("prompt", ""))

            # Run Teacher
            teacher_answer = self._generate_teacher_answer(question, config)

            # Run Student
            student_answer = self._generate_student_answer(question, config)

            # Compare
            comp = self.comparator.compare(
                test_id=test_id,
                question=question,
                teacher_answer=teacher_answer,
                student_answer=student_answer,
            )
            comparison_results.append(comp)

        # 3. Generate report
        report = BenchmarkReport.generate(comparison_results)

        # 4. Compute summary
        total = len(comparison_results)
        passed = sum(1 for r in comparison_results if r.passed)
        avg_score = sum(r.overall_score for r in comparison_results) / max(total, 1)

        result = BenchmarkResult(
            config=config,
            total_tests=total,
            passed=passed,
            failed=total - passed,
            pass_rate=passed / max(total, 1),
            overall_similarity=avg_score,
            report=report,
            timestamp=datetime.now().isoformat(),
            fine_tuning_needed=avg_score < config.pass_threshold,
        )

        # 5. Save outputs
        self._save_result(result, config.output_dir)

        return result

    def _load_test_dataset(self, path: str) -> List[Dict]:
        """Load test cases from JSON/JSONL file."""
        if path.endswith('.jsonl'):
            tests = []
            with open(path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line:
                        tests.append(json.loads(line))
            return tests
        else:
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            if isinstance(data, list):
                return data
            return [data]

    def _save_result(self, result: BenchmarkResult, output_dir: str):
        """Save benchmark result to disk."""
        os.makedirs(output_dir, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        # Save full report
        report_path = os.path.join(output_dir, f"benchmark_{timestamp}_report.json")
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(result.to_dict(), f, indent=2, ensure_ascii=False)

        # Save summary
        summary_path = os.path.join(output_dir, f"benchmark_{timestamp}_summary.txt")
        if result.report:
            summary = BenchmarkReport.format_summary(result.report)
            with open(summary_path, 'w', encoding='utf-8') as f:
                f.write(summary)

        return report_path, summary_path


# ─── Convenience Functions ───────────────────────────────────────────────────

def run_benchmark(
    config: Optional[BenchmarkConfig] = None,
    output_dir: str = "benchmarks",
) -> BenchmarkResult:
    """Quick benchmark run with default mock Teacher/Student."""
    config = config or BenchmarkConfig()
    config.output_dir = output_dir

    runner = BenchmarkRunner()
    return runner.run(config)


def run_benchmark_with_models(
    teacher_fn: Callable,
    student_fn: Callable,
    config: Optional[BenchmarkConfig] = None,
    output_dir: str = "benchmarks",
) -> BenchmarkResult:
    """Run benchmark with real model inference functions."""
    config = config or BenchmarkConfig()
    config.output_dir = output_dir

    runner = BenchmarkRunner(teacher_fn=teacher_fn, student_fn=student_fn)
    return runner.run(config)
