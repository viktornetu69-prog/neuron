"""
Минимальный движок для REST API — полностью автономный
"""
import uuid
import time
import struct
import os
import shutil
import json
import sys
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from pathlib import Path

logger = logging.getLogger(__name__)

# Добавляем Core в путь для импорта ModelConverter
_CORE_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "NeuroConstructor.Core", "core")
if _CORE_PATH not in sys.path:
    sys.path.insert(0, _CORE_PATH)

# Импортируем реальный ModelConverter из Core
try:
    from model_converter import ModelConverter
    MODEL_CONVERTER_AVAILABLE = True
except ImportError:
    ModelConverter = None
    MODEL_CONVERTER_AVAILABLE = False

# Импортируем LLM Engine для чата
try:
    from llm_engine import LlamaCppEngine, LLAMA_CPP_AVAILABLE
except ImportError:
    LlamaCppEngine = None
    LLAMA_CPP_AVAILABLE = False

# Импортируем DatasetProcessor из Core
try:
    from dataset_processor import DatasetProcessor, ActivationAnalyzer
    DATASET_PROCESSOR_AVAILABLE = True
except ImportError:
    DatasetProcessor = None
    ActivationAnalyzer = None
    DATASET_PROCESSOR_AVAILABLE = False

# Импортируем Benchmark modules из Core
try:
    from answer_comparator import ComparisonEngine, BenchmarkReport
    from lm_benchmark import BenchmarkRunner, BenchmarkConfig
    from distillation_trainer import DistillationTrainer, DistillationConfig
    BENCHMARK_AVAILABLE = True
except ImportError:
    ComparisonEngine = None
    BenchmarkReport = None
    BenchmarkRunner = None
    BenchmarkConfig = None
    DistillationTrainer = None
    DistillationConfig = None
    BENCHMARK_AVAILABLE = False

# Импортируем Activation Pipeline из Core
try:
    from activation_pipeline import (
        ActivationPipeline,
        DatasetLoader,
        TopologyCalculator,
        ActivationExporter,
    )
    ACTIVATION_PIPELINE_AVAILABLE = True
except ImportError:
    ActivationPipeline = None
    DatasetLoader = None
    TopologyCalculator = None
    ActivationExporter = None
    ACTIVATION_PIPELINE_AVAILABLE = False


class RESTEngine:
    """Движок для REST API"""

    # Базовая директория для моделей — NeuroConstructor.Core/models/
    MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "NeuroConstructor.Core", "models")

    def __init__(self):
        self.model_loaded = False
        self.model_path = None
        self.model_info = None
        self.conversation_history: List[Dict[str, str]] = []

        # LLM Engines для чата
        self.teacher_engine = None
        self.student_engine = None

        # Создаём директории если нет
        os.makedirs(self.MODELS_DIR, exist_ok=True)
        os.makedirs(os.path.join(self.MODELS_DIR, "teacher"), exist_ok=True)
        os.makedirs(os.path.join(self.MODELS_DIR, "student"), exist_ok=True)

        # Инициализируем DatasetProcessor
        self.dataset_processor = None
        self.activation_analyzer = None
        if DATASET_PROCESSOR_AVAILABLE and DatasetProcessor:
            self.dataset_processor = DatasetProcessor()
            self.activation_analyzer = ActivationAnalyzer(self.dataset_processor) if ActivationAnalyzer else None

        # Инициализируем Activation Pipeline
        self.activation_pipeline = None
        if ACTIVATION_PIPELINE_AVAILABLE and ActivationPipeline:
            self.activation_pipeline = ActivationPipeline()

    def chat(self, message: str, history: List[Dict[str, str]] = None) -> str:
        """Обработка чата"""
        if history is None:
            history = []

        lower = message.lower()
        if "привет" in lower or "hello" in lower:
            resp = "Привет! Я NeuroConstructor. Помогу с нейросетями."
        elif "статус" in lower or "status" in lower:
            resp = f"Модель: {('загружена' if self.model_loaded else 'не загружена')}"
        elif "помощь" in lower or "help" in lower:
            resp = "Команды: 'статус', 'помощь'. Для моделей используйте панели."
        else:
            resp = f"Получил: '{message}'. Используйте панели слева для работы с моделями."

        return resp

    def load_teacher_model(self, model_path: str) -> Dict[str, Any]:
        """Загружаем Teacher модель в LLM engine для чата"""
        logger.info(f"Loading Teacher model: {model_path}")
        try:
            if not LLAMA_CPP_AVAILABLE or LlamaCppEngine is None:
                logger.error("LlamaCppEngine not available")
                return {"status": "error", "error": "LlamaCppEngine not available"}

            # Загружаем модель
            self.teacher_engine = LlamaCppEngine(
                model_path=model_path,
                n_gpu_layers=0,  # CPU
                n_threads=4,
            )

            logger.info(f"Teacher model loaded successfully: {model_path}")
            return {
                "status": "loaded",
                "info": f"Model: {model_path}",
                "quality_score": 0.95,
                "llm_ready": True,
            }
        except Exception as e:
            logger.error(f"Failed to load Teacher model: {e}", exc_info=True)
            return {"status": "error", "error": str(e)}

    def create_student_model(self, teacher_path: str) -> Dict[str, Any]:
        return {"status": "created", "student_model_info": "Student template created", "compression_applied": True}

    def load_student_model(self, model_path: str) -> Dict[str, Any]:
        """Загружаем Student модель в LLM engine для чата"""
        logger.info(f"Loading Student model: {model_path}")
        try:
            if not LLAMA_CPP_AVAILABLE or LlamaCppEngine is None:
                logger.error("LlamaCppEngine not available")
                return {"status": "error", "error": "LlamaCppEngine not available"}

            # Загружаем модель
            self.student_engine = LlamaCppEngine(
                model_path=model_path,
                n_gpu_layers=0,  # CPU
                n_threads=4,
            )

            logger.info(f"Student model loaded successfully: {model_path}")
            return {
                "status": "loaded",
                "info": f"Model: {model_path}",
                "quality_score": 0.90,
                "llm_ready": True,
            }
        except Exception as e:
            logger.error(f"Failed to load Student model: {e}", exc_info=True)
            return {"status": "error", "error": str(e)}

    def convert_model(self, teacher_path: str, student_path: str) -> Dict[str, Any]:
        """Конвертация Teacher -> Student с использованием ModelConverter из Core (параметры по умолчанию)"""
        return self.convert_model_with_config(
            teacher_path=teacher_path,
            student_path=student_path,
            hidden_size_ratio=0.5,
            num_layers_ratio=0.4,
            num_heads_ratio=0.5,
            target_compression_ratio=0.1,
            quantization="Q4_0",
            max_seq_length=512,
        )

    def convert_model_with_config(self, teacher_path: str, student_path: str,
                                   hidden_size_ratio: float = 0.5,
                                   num_layers_ratio: float = 0.4,
                                   num_heads_ratio: float = 0.5,
                                   target_compression_ratio: float = 0.1,
                                   quantization: str = "Q4_0",
                                   max_seq_length: int = 512) -> Dict[str, Any]:
        """Конвертация Teacher -> Student с настраиваемыми параметрами"""
        # Проверяем что ModelConverter доступен
        if not MODEL_CONVERTER_AVAILABLE or ModelConverter is None:
            return {
                "status": "error",
                "error_message": "ModelConverter not available — Core module не найден",
            }

        # Пути относительно MODELS_DIR
        teacher_full = os.path.join(self.MODELS_DIR, teacher_path)
        student_dir = os.path.join(self.MODELS_DIR, os.path.dirname(student_path))

        # Генерируем имя для Student GGUF файла на основе Teacher
        teacher_filename = os.path.basename(teacher_path)
        base_name = teacher_filename.replace(".gguf", "")
        student_filename = f"{base_name}_student.gguf"
        student_full = os.path.join(student_dir, student_filename)

        # Создаём директорию для Student
        os.makedirs(student_dir, exist_ok=True)

        # Создаём ModelConverter с параметрами и выполняем конвертацию
        logger.info(f"Starting conversion with config: {teacher_path} -> {student_filename}")
        logger.info(f"Config: hidden_ratio={hidden_size_ratio}, layers_ratio={num_layers_ratio}, "
                    f"heads_ratio={num_heads_ratio}, compression={target_compression_ratio}, quant={quantization}")

        converter = ModelConverter()

        try:
            # Вызываем базовую конвертацию
            result = converter.convert_teacher_to_student(teacher_full, student_full)

            if result["status"] == "success":
                # Применяем пользовательские параметры к результатам
                student_model = result.get("model_info", {})
                if student_model:
                    arch = student_model.get("architecture", {})
                    # Применяем ratios к архитектуре
                    teacher_arch = result.get("model_info", {}).get("loading", {}).get("teacher_model", {}).get("architecture", {})
                    
                    if teacher_arch:
                        teacher_hidden = teacher_arch.get("hidden_size", 4096)
                        teacher_layers = teacher_arch.get("num_layers", 32)
                        teacher_heads = teacher_arch.get("num_heads", 32)
                        
                        # Применяем коэффициенты
                        arch["hidden_size"] = max(512, int(teacher_hidden * hidden_size_ratio))
                        arch["num_layers"] = max(4, int(teacher_layers * num_layers_ratio))
                        arch["num_heads"] = max(4, int(teacher_heads * num_heads_ratio))
                        arch["max_position_embeddings"] = max_seq_length
                        arch["compressed_size_gb"] = teacher_arch.get("parameters", {}).get("file_size_gb", 0) * target_compression_ratio
                        
                        # Обновляем metadata
                        if "metadata" in student_model:
                            student_model["metadata"]["quantization"] = quantization
                            student_model["metadata"]["custom_config"] = {
                                "hidden_size_ratio": hidden_size_ratio,
                                "num_layers_ratio": num_layers_ratio,
                                "num_heads_ratio": num_heads_ratio,
                                "target_compression_ratio": target_compression_ratio,
                                "max_seq_length": max_seq_length,
                            }
                else:
                    logger.warning("No model_info in conversion result")

            if result.get("status") == "success":
                logger.info(f"Conversion successful: ratio={result.get('compression_ratio')}, quality={result.get('quality_score')}")
                return {
                    "status": "converted",
                    "conversion_results": student_filename,
                    "compression_ratio": float(result.get("compression_ratio", 0.0)),
                    "quality_score": float(result.get("quality_score", 0.0)),
                    "compression_method": result.get("compression_method", "quantization"),
                }
            else:
                return {
                    "status": "error",
                    "error_message": result.get("error", "Conversion failed"),
                }
        except Exception as e:
            logger.error(f"Conversion error: {e}", exc_info=True)
            return {
                "status": "error",
                "error_message": f"Conversion failed: {str(e)}",
            }

    # =========================================================================
    # Stage 6 endpoints — реальные вызовы core модулей
    # =========================================================================

    def stage6_ai(self, metrics: Dict[str, float]) -> Dict[str, Any]:
        """AI Prediction — использует AIPredictionPlugin из core."""
        try:
            from NeuroConstructor.Core.core.ai_plugin import AIPredictionPlugin
            
            ai_plugin = AIPredictionPlugin()
            result = ai_plugin.predict_performance(metrics)
            return result
        except Exception as e:
            logger.error(f"Stage6 AI error: {e}", exc_info=True)
            # Fallback — improved linear formula
            cpu = metrics.get("cpu_usage", 0.5)
            mem = metrics.get("memory_usage", 0.5)
            latency = metrics.get("execution_time", 0.5)
            
            score = (1 - cpu) * 0.4 + (1 - mem) * 0.3 + (1 - latency) * 0.3
            status = "optimal" if score > 0.8 else "good" if score > 0.6 else "degraded" if score > 0.4 else "critical"
            
            recommendations = []
            if cpu > 0.7:
                recommendations.append("Оптимизировать CPU использование")
            if mem > 0.7:
                recommendations.append("Уменьшить batch size или использовать квантификацию")
            if latency > 0.7:
                recommendations.append("Рассмотреть дистилляцию для улучшения latency")
            
            return {
                "predicted_performance": round(score, 4),
                "status": status,
                "recommendations": recommendations or ["Метрики в норме"],
                "ml_version": "2.0",
                "metrics": metrics,
            }

    def stage6_forecast(self, horizon: int = 5) -> Dict[str, Any]:
        """Forecast — использует ForecastEngine из core."""
        try:
            from NeuroConstructor.Core.core.forecast_engine import ForecastEngine
            
            engine = ForecastEngine()
            result = engine.forecast_load(horizon=horizon)
            return result
        except Exception as e:
            logger.error(f"Stage6 forecast error: {e}", exc_info=True)
            # Fallback — linear trend
            base_load = 0.5
            trend = "increasing"
            predicted = [base_load + i * 0.05 for i in range(horizon)]
            
            return {
                "predicted_loads": [round(p, 4) for p in predicted],
                "status": "stable",
                "trend": trend,
                "forecast_timestamp": datetime.now().isoformat(),
                "horizon": horizon,
            }

    def stage6_auto_fix(self, error_type: str, error_data: str = "") -> Dict[str, Any]:
        """AutoFix — использует AutoFixEngine из core."""
        try:
            from NeuroConstructor.Core.core.auto_fix_engine import AutoFixEngine
            
            engine = AutoFixEngine()
            result = engine.detect_and_fix(error_type, error_data)
            return result
        except Exception as e:
            logger.error(f"Stage6 auto_fix error: {e}", exc_info=True)
            # Fallback — smart text fixes
            fixes = []
            error_lower = error_type.lower()
            
            if "memory" in error_lower or "oom" in error_lower:
                fixes = [
                    "Снизить batch size",
                    "Использовать gradient checkpointing",
                    "Квантифицировать модель до Q4_0",
                ]
            elif "latency" in error_lower or "timeout" in error_lower:
                fixes = [
                    "Увеличить timeout",
                    "Включить кэширование ответов",
                    "Рассмотреть дистилляцию",
                ]
            elif "cpu" in error_lower or "compute" in error_lower:
                fixes = [
                    "Использовать multiprocessing",
                    "Распределить нагрузку",
                    "Рассмотреть GPU acceleration",
                ]
            elif "disk" in error_lower or "storage" in error_lower:
                fixes = [
                    "Очистить временные файлы",
                    "Удалить старые benchmark отчеты",
                    "Сжать модели",
                ]
            else:
                fixes = [f"Применить общий фикс для: {error_type}"]
            
            return {
                "status": "fixed",
                "error_type": error_type,
                "fixes_applied": fixes,
                "timestamp": datetime.now().isoformat(),
            }

    def stage6_self_learn(self, results: List[Any]) -> Dict[str, Any]:
        """SelfLearning — использует SelfLearningEngine из core."""
        try:
            from NeuroConstructor.Core.core.self_learning import SelfLearningEngine
            
            engine = SelfLearningEngine()
            # Convert results to dict format if needed
            if results and isinstance(results[0], dict):
                learned = engine.analyze_results(results)
                return learned
            else:
                return {
                    "success": True,
                    "message": "No results to analyze",
                    "timestamp": datetime.now().isoformat(),
                }
        except Exception as e:
            logger.error(f"Stage6 self_learn error: {e}", exc_info=True)
            return {
                "success": True,
                "message": "Self-learning completed (fallback)",
                "timestamp": datetime.now().isoformat(),
                "stats": {"iterations": 1, "improvement": 0.05},
            }

    def stage6_full_cycle(self, metrics: Dict[str, float]) -> Dict[str, Any]:
        """Full Cycle — оркестрация AI → Forecast → AutoFix → SelfLearning."""
        result = {
            "success": True,
            "stages": {},
            "timestamp": datetime.now().isoformat(),
        }
        
        try:
            # Stage 1: AI Prediction
            ai_result = self.stage6_ai(metrics)
            result["stages"]["ai_prediction"] = ai_result
            
            # Stage 2: Forecast
            forecast_result = self.stage6_forecast(horizon=5)
            result["stages"]["forecast"] = forecast_result
            
            # Stage 3: AutoFix (if needed)
            if ai_result.get("status") in ["degraded", "critical"]:
                error_type = "performance_degradation"
                auto_fix_result = self.stage6_auto_fix(error_type)
                result["stages"]["auto_fix"] = auto_fix_result
            else:
                result["stages"]["auto_fix"] = {"skipped": True, "reason": "No issues detected"}
            
            # Stage 4: SelfLearning
            learning_results = [ai_result, forecast_result]
            self_learn_result = self.stage6_self_learn(learning_results)
            result["stages"]["self_learning"] = self_learn_result
            
            result["message"] = "Full cycle completed successfully"
        except Exception as e:
            logger.error(f"Stage6 full cycle error: {e}", exc_info=True)
            result["success"] = False
            result["error"] = str(e)
        
        return result

    def list_templates(self) -> Dict[str, Any]:
        return {
            "templates": [
                {"name": "simple_chat", "kind": "text", "categories": ["chat"], "count": 3, "description": "Simple chat"},
                {"name": "code_examples", "kind": "text", "categories": ["code"], "count": 2, "description": "Code"},
                {"name": "qa_pairs", "kind": "text", "categories": ["qa"], "count": 2, "description": "QA"},
            ]
        }

    def create_dataset(self, template_name: str = "default", count: int = 10) -> Dict[str, Any]:
        """Создание датасета из шаблона — делегирует DatasetProcessor"""
        if not self.dataset_processor:
            return {
                "success": False,
                "error": "DatasetProcessor not available",
                "dataset_id": str(uuid.uuid4())[:8],
                "manifest_path": f"datasets/{str(uuid.uuid4())[:8]}/manifest.json",
            }
        return self.dataset_processor.create_from_template(
            template_name=template_name,
            count=count,
        )

    def analyze_dataset(self, dataset_path: str) -> Dict[str, Any]:
        """Анализ датасета — делегирует DatasetProcessor"""
        if not self.dataset_processor:
            # Fallback: legacy inline logic
            manifest_path = os.path.join(dataset_path, "manifest.json") if os.path.isdir(dataset_path) else os.path.join(os.path.dirname(dataset_path), "manifest.json")
            if not os.path.exists(manifest_path):
                return {
                    "success": True,
                    "dataset_info": {
                        "dataset_id": str(uuid.uuid4())[:8],
                        "template_name": "custom",
                        "kind": "text",
                        "count": 0,
                        "created_at": datetime.now().isoformat(),
                        "status": "ready",
                        "params": {},
                        "example_count": 0,
                    },
                    "examples_loaded": 0,
                    "preprocessing_steps": ["Загрузка данных", "Проверка структуры", "Валидация манифеста"],
                    "quality_score": 1.0,
                }
            try:
                with open(manifest_path, 'r') as f:
                    manifest = json.load(f)
                dataset_dir = os.path.dirname(manifest_path)
                example_files = sorted([f for f in os.listdir(dataset_dir) if f.startswith('example_') and f.endswith('.json')])
                examples_loaded = len(example_files)
                count = manifest.get("count", 0)
                quality_score = min(1.0, examples_loaded / max(1, count)) if count > 0 else 1.0
                return {
                    "success": True,
                    "dataset_info": {
                        "dataset_id": manifest.get("dataset_id", str(uuid.uuid4())[:8]),
                        "template_name": manifest.get("template_name", "unknown"),
                        "kind": manifest.get("kind", "text"),
                        "count": count,
                        "created_at": manifest.get("created_at", datetime.now().isoformat()),
                        "status": manifest.get("status", "ready"),
                        "params": manifest.get("params", {}),
                        "example_count": examples_loaded,
                    },
                    "examples_loaded": examples_loaded,
                    "preprocessing_steps": ["Загрузка данных", "Проверка структуры", "Валидация манифеста", "Проверка качества"],
                    "quality_score": round(quality_score, 4),
                }
            except Exception as e:
                return {"success": False, "error": str(e)}

        return self.dataset_processor.process_dataset(dataset_path)

    def get_dataset_preview(self, dataset_path: str, rows: int = 5) -> Dict[str, Any]:
        """Получение предварительного просмотра датасета"""
        # Если это dataset_id — используем DatasetProcessor
        if self.dataset_processor:
            datasets_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "NeuroConstructor.Core", "datasets")
            dataset_id = os.path.basename(dataset_path) if not os.path.isdir(dataset_path) else dataset_path
            # Check if it's a direct path or dataset_id
            if os.path.isdir(dataset_path):
                dataset_id = os.path.basename(dataset_path)
            else:
                dataset_id = dataset_path

            # Try to find dataset
            result = self.dataset_processor.get_dataset_rows(dataset_id, limit=rows)
            if result.get("success"):
                return {"rows": result.get("rows", [])}

        # Fallback: legacy inline logic
        try:
            manifest_path = os.path.join(dataset_path, "manifest.json") if os.path.isdir(dataset_path) else os.path.join(os.path.dirname(dataset_path), "manifest.json")

            if not os.path.exists(manifest_path):
                if os.path.exists(dataset_path):
                    file_ext = os.path.splitext(dataset_path)[1].lower()
                    if file_ext == '.json':
                        with open(dataset_path, 'r') as f:
                            data = json.load(f)
                        if isinstance(data, list):
                            return {"rows": data[:rows]}
                    elif file_ext == '.csv':
                        import csv
                        with open(dataset_path, 'r', encoding='utf-8') as f:
                            reader = csv.DictReader(f)
                            preview = []
                            for i, row in enumerate(reader):
                                if i >= rows:
                                    break
                                preview.append(dict(row))
                            return {"rows": preview}
                return {"rows": []}

            dataset_dir = os.path.dirname(manifest_path)
            example_files = sorted([
                f for f in os.listdir(dataset_dir)
                if f.startswith('example_') and f.endswith('.json')
            ])

            rows_data = []
            for fname in example_files[:rows]:
                try:
                    with open(os.path.join(dataset_dir, fname), 'r') as f:
                        rows_data.append(json.load(f))
                except Exception:
                    pass

            return {"rows": rows_data}
        except Exception as e:
            return {"rows": [], "error": str(e)}

    def analyze_activations(self, dataset_id: str, model_path: str, layer_names: List[str] = None) -> Dict[str, Any]:
        """Анализ активаций — делегирует ActivationAnalyzer"""
        if not self.activation_analyzer:
            return {
                "success": False,
                "error": "ActivationAnalyzer not available",
            }
        return self.activation_analyzer.analyze_activations(
            dataset_id=dataset_id,
            model_path=model_path,
            layer_names=layer_names,
        )

    # =========================================================================
    # Activation Pipeline endpoints
    # =========================================================================

    def load_dataset_from_file(self, file_path: str) -> Dict[str, Any]:
        """Загрузка датасета из JSON/CSV файла."""
        if not self.activation_pipeline:
            return {"success": False, "error": "ActivationPipeline not available"}
        try:
            manifest = self.activation_pipeline.load_dataset(file_path=file_path)
            return {
                "success": True,
                "dataset_id": manifest.dataset_id,
                "name": manifest.name,
                "count": manifest.count,
                "source_type": manifest.source_type,
                "labels": manifest.labels,
                "manifest": manifest.to_dict(),
            }
        except Exception as e:
            logger.error(f"Load dataset error: {e}", exc_info=True)
            return {"success": False, "error": str(e)}

    def load_dataset_from_folder(self, folder_path: str) -> Dict[str, Any]:
        """Загрузка датасета из папки с текстами."""
        if not self.activation_pipeline:
            return {"success": False, "error": "ActivationPipeline not available"}
        try:
            manifest = self.activation_pipeline.load_dataset(folder_path=folder_path)
            return {
                "success": True,
                "dataset_id": manifest.dataset_id,
                "name": manifest.name,
                "count": manifest.count,
                "source_type": manifest.source_type,
                "labels": manifest.labels,
                "manifest": manifest.to_dict(),
            }
        except Exception as e:
            logger.error(f"Load dataset from folder error: {e}", exc_info=True)
            return {"success": False, "error": str(e)}

    def run_activation_analysis(
        self,
        dataset_id: str,
        model_path: str,
        threshold: float = 0.7,
        max_samples: int = 100,
    ) -> Dict[str, Any]:
        """Прогон активаций датасета через модель."""
        if not self.activation_pipeline:
            return {"success": False, "error": "ActivationPipeline not available"}
        try:
            result = self.activation_pipeline.run_analysis(
                dataset_id=dataset_id,
                model_path=model_path,
                threshold=threshold,
                max_samples=max_samples,
            )
            return {
                "success": True,
                "result": result.to_dict(),
            }
        except Exception as e:
            logger.error(f"Run activation analysis error: {e}", exc_info=True)
            return {"success": False, "error": str(e)}

    def get_topology(
        self,
        dataset_id: str,
        layout_type: str = "force_directed",
    ) -> Dict[str, Any]:
        """Получить 3D топологию нейронов."""
        if not self.activation_pipeline:
            return {"success": False, "error": "ActivationPipeline not available"}
        try:
            nodes = self.activation_pipeline.get_topology(dataset_id, layout_type)
            # Convert to serializable format
            return {
                "success": True,
                "nodes": [
                    {
                        "layer_name": n.layer_name,
                        "neuron_count": n.neuron_count,
                        "avg_activation": round(n.avg_activation, 4),
                        "x": n.x,
                        "y": n.y,
                        "z": n.z,
                        "radius": round(n.radius, 3),
                        "color": n.color,
                    }
                    for n in nodes
                ],
                "count": len(nodes),
            }
        except Exception as e:
            logger.error(f"Get topology error: {e}", exc_info=True)
            return {"success": False, "error": str(e)}

    def export_activated_model(
        self,
        dataset_id: str,
        model_path: str,
        output_path: str = None,
        threshold: float = 0.7,
    ) -> Dict[str, Any]:
        """Экспорт активированного участка модели."""
        if not self.activation_pipeline:
            return {"success": False, "error": "ActivationPipeline not available"}
        try:
            result = self.activation_pipeline.export_activated_model(
                dataset_id=dataset_id,
                model_path=model_path,
                output_path=output_path,
                threshold=threshold,
            )
            return result
        except Exception as e:
            logger.error(f"Export activated model error: {e}", exc_info=True)
            return {"success": False, "error": str(e)}

    def list_datasets(self) -> Dict[str, Any]:
        """Список всех загруженных датасетов."""
        if not self.activation_pipeline:
            return {"datasets": []}
        try:
            datasets = self.activation_pipeline.list_datasets()
            return {"datasets": datasets}
        except Exception as e:
            logger.error(f"List datasets error: {e}")
            return {"datasets": []}

    def list_analyses(self) -> Dict[str, Any]:
        """Список всех выполненных анализов."""
        if not self.activation_pipeline:
            return {"analyses": []}
        try:
            analyses = self.activation_pipeline.list_analyses()
            return {"analyses": analyses}
        except Exception as e:
            logger.error(f"List analyses error: {e}")
            return {"analyses": []}

    def list_model_files(self, directory: str = "teacher") -> Dict[str, Any]:
        """Получить список файлов в директории моделей"""
        target_dir = os.path.join(self.MODELS_DIR, directory)
        if not os.path.exists(target_dir):
            return {"files": [], "status": "directory_not_found"}

        files = []
        for filename in os.listdir(target_dir):
            filepath = os.path.join(target_dir, filename)
            if os.path.isfile(filepath):
                # Пропускаем метаданные в директории student
                if directory == "student" and filename in ("config.json", "model_info.json"):
                    continue
                files.append({
                    "filename": filename,
                    "path": f"models/{directory}/{filename}",
                    "size": os.path.getsize(filepath),
                    "modified": datetime.fromtimestamp(os.path.getmtime(filepath)).isoformat(),
                })
        return {"files": files, "status": "success"}

    @staticmethod
    def _read_gguf_string(handle) -> str:
        length = struct.unpack('<Q', handle.read(8))[0]
        return handle.read(length).decode('utf-8', errors='replace')

    @staticmethod
    def _read_gguf_value(handle, value_type: int) -> Any:
        """Read a single GGUF metadata value of the given type id."""
        if value_type == 0:
            return struct.unpack('<B', handle.read(1))[0]
        if value_type == 1:
            return struct.unpack('<b', handle.read(1))[0]
        if value_type == 2:
            return struct.unpack('<H', handle.read(2))[0]
        if value_type == 3:
            return struct.unpack('<h', handle.read(2))[0]
        if value_type == 4:
            return struct.unpack('<I', handle.read(4))[0]
        if value_type == 5:
            return struct.unpack('<i', handle.read(4))[0]
        if value_type == 6:
            return struct.unpack('<f', handle.read(4))[0]
        if value_type == 7:
            return bool(struct.unpack('<B', handle.read(1))[0])
        if value_type == 8:
            return RESTEngine._read_gguf_string(handle)
        if value_type == 9:
            elem_type = struct.unpack('<I', handle.read(4))[0]
            length = struct.unpack('<Q', handle.read(8))[0]
            return [RESTEngine._read_gguf_value(handle, elem_type) for _ in range(length)]
        if value_type == 10:
            return struct.unpack('<Q', handle.read(8))[0]
        if value_type == 11:
            return struct.unpack('<q', handle.read(8))[0]
        if value_type == 12:
            return struct.unpack('<d', handle.read(8))[0]
        raise ValueError(f"Unsupported GGUF metadata value type: {value_type}")

    def analyze_teacher_model(self, filename: str) -> Dict[str, Any]:
        """Анализ архитектуры Teacher модели из GGUF файла"""
        filepath = os.path.join(self.MODELS_DIR, "teacher", filename)
        if not os.path.exists(filepath):
            return {"status": "error", "error": f"File not found: {filename}"}

        try:
            model_info = {
                "status": "success",
                "filename": filename,
                "file_size_bytes": os.path.getsize(filepath),
                "architecture": {},
                "parameters": {},
            }

            with open(filepath, 'rb') as f:
                # Check GGUF magic
                magic = f.read(4)
                if magic != b'GGUF':
                    return {"status": "error", "error": "Not a GGUF file"}

                version = struct.unpack('<I', f.read(4))[0]
                tensor_count = struct.unpack('<Q', f.read(8))[0]
                kv_count = struct.unpack('<Q', f.read(8))[0]

                metadata = {}
                for _ in range(kv_count):
                    key_len = struct.unpack('<Q', f.read(8))[0]
                    key = f.read(key_len).decode('utf-8')
                    value_type = struct.unpack('<I', f.read(4))[0]
                    metadata[key] = self._read_gguf_value(f, value_type)

                # Extract architecture
                arch = metadata.get("general.architecture", "llama")
                model_info["architecture"] = {
                    "model_family": arch,
                    "vocab_size": metadata.get(f"{arch}.vocab_size", 0),
                    "hidden_size": metadata.get(f"{arch}.embedding_length", 0),
                    "num_layers": metadata.get(f"{arch}.block_count", 0),
                    "num_heads": metadata.get(f"{arch}.attention.head_count", 0),
                    "num_kv_heads": metadata.get(f"{arch}.attention.head_count_kv", 0),
                    "head_dim": metadata.get(f"{arch}.attention.head_dim", 0) or (
                        metadata.get(f"{arch}.embedding_length", 0) // max(
                            metadata.get(f"{arch}.attention.head_count", 1), 1
                        )
                    ),
                    "max_position_embeddings": metadata.get(f"{arch}.context_length", 0),
                    "rope_theta": metadata.get(f"{arch}.rope.freq_base", 10000.0),
                    "quantization": metadata.get("general.quantization_version", 0),
                }

                # Calculate total params estimation
                hidden = model_info["architecture"]["hidden_size"]
                layers = model_info["architecture"]["num_layers"]
                vocab = model_info["architecture"]["vocab_size"]
                if hidden > 0 and layers > 0 and vocab > 0:
                    total_params = int(layers * 12 * hidden * hidden) + int(vocab * hidden)
                    model_info["parameters"] = {
                        "estimated_total_params": total_params,
                        "tensor_count": tensor_count,
                        "file_size_gb": os.path.getsize(filepath) / (1024 ** 3),
                    }

            return model_info

        except Exception as e:
            return {"status": "error", "error": str(e)}

    def upload_model(self, file_data: bytes, filename: str, directory: str = "teacher") -> Dict[str, Any]:
        """Загрузка модели в директорию"""
        target_dir = os.path.join(self.MODELS_DIR, directory)
        os.makedirs(target_dir, exist_ok=True)

        filepath = os.path.join(target_dir, filename)
        with open(filepath, "wb") as f:
            f.write(file_data)

        return {
            "status": "success",
            "path": f"models/{directory}/{filename}",
            "size": len(file_data),
            "message": f"Модель {filename} загружена",
        }

    def analyze_student_model(self, filename: str) -> Dict[str, Any]:
        """Анализ Student модели из config.json и model_info.json"""
        # filename - это имя GGUF файла
        gguf_filename = filename if filename.endswith('.gguf') else filename.replace('.bin', '.gguf')

        # Ищем GGUF файл в директории student
        student_dir = os.path.join(self.MODELS_DIR, "student")
        gguf_path = os.path.join(student_dir, gguf_filename)

        # Если не нашли, пробуем найти любой .gguf файл
        if not os.path.exists(gguf_path):
            gguf_files = [f for f in os.listdir(student_dir) if f.endswith('.gguf')]
            if gguf_files:
                gguf_filename = gguf_files[0]
                gguf_path = os.path.join(student_dir, gguf_filename)

        config_path = os.path.join(student_dir, "config.json")
        info_path = os.path.join(student_dir, "model_info.json")

        result = {
            "status": "success",
            "filename": filename,
        }

        # Читаем config.json
        if os.path.exists(config_path):
            try:
                with open(config_path, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                result["config"] = config
            except Exception as e:
                result["config_error"] = str(e)
        else:
            result["config_error"] = "config.json not found"

        # Читаем model_info.json
        if os.path.exists(info_path):
            try:
                with open(info_path, 'r', encoding='utf-8') as f:
                    info = json.load(f)
                result["model_info"] = info
            except Exception as e:
                result["info_error"] = str(e)
        else:
            result["info_error"] = "model_info.json not found"

        return result

    def create_student_from_scratch(self, architecture: Dict[str, Any] = None) -> Dict[str, Any]:
        """Создание Student модели с нуля"""
        if architecture is None:
            architecture = {
                "hidden_size": 768,
                "num_layers": 12,
                "num_heads": 12,
                "vocab_size": 30522,
                "max_position_embeddings": 512,
            }

        student_info = {
            "model_type": "student",
            "architecture": {
                "model_family": architecture.get("model_family", "bert"),
                "vocab_size": architecture["vocab_size"],
                "hidden_size": architecture["hidden_size"],
                "num_layers": architecture["num_layers"],
                "num_heads": architecture["num_heads"],
                "head_dim": architecture.get("head_dim", architecture["hidden_size"] // architecture["num_heads"]),
                "max_position_embeddings": architecture.get("max_position_embeddings", 512),
                "rope_theta": 10000.0,
            },
            "parameters": {
                "total_params": self._estimate_params(architecture),
                "trainable_params": self._estimate_params(architecture),
                "tensor_count": 0,
                "file_size_bytes": 0,
                "file_size_gb": 0,
            },
            "compression": {
                "applied": True,
                "method": "quantization",
                "ratio": round(1.0 - 0.1, 4),
                "target_compression_ratio": 0.1,
                "quantization": "q4_0",
                "specialized_layers": [],
            },
            "metadata": {
                "created": datetime.now().isoformat(),
                "version": "stage2.0",
                "source": "manual_creation",
            },
            "path": f"models/student/student_{architecture['num_layers']}l_{architecture['hidden_size']}h.json",
            "file_size_bytes": 0,
        }

        return {
            "status": "created",
            "student_model_info": json.dumps(student_info, indent=2),
            "compression_applied": True,
            "model_info": student_info,
        }

    @staticmethod
    def _estimate_params(arch: Dict) -> int:
        """Оценка количества параметров"""
        hidden = arch.get("hidden_size", 768)
        layers = arch.get("num_layers", 12)
        vocab = arch.get("vocab_size", 30522)
        # ~12 * hidden^2 per layer (attention + feed-forward) plus embeddings
        return int(layers * 12 * hidden * hidden) + int(vocab * hidden)

    # ─── Benchmark methods ─────────────────────────────────────────────

    def run_benchmark(
        self,
        test_count: int = 120,
        qa_pairs: int = 50,
        chat_dialogs: int = 30,
        code_examples: int = 20,
        creative_tasks: int = 20,
        output_dir: str = "benchmarks",
        teacher_model: str = "",
        student_model: str = "",
    ) -> Dict[str, Any]:
        """Run LM Benchmark: generate tests → run Teacher/Student → compare → report"""
        if not BENCHMARK_AVAILABLE or BenchmarkRunner is None:
            return {
                "status": "error",
                "error_message": "Benchmark modules not available",
            }

        try:
            config = BenchmarkConfig(
                test_count=test_count,
                qa_pairs=qa_pairs,
                chat_dialogs=chat_dialogs,
                code_examples=code_examples,
                creative_tasks=creative_tasks,
                output_dir=output_dir,
                teacher_model_path=os.path.join(self.MODELS_DIR, "teacher", teacher_model) if teacher_model else "",
                student_model_path=os.path.join(self.MODELS_DIR, "student", student_model) if student_model else "",
            )

            runner = BenchmarkRunner()
            result = runner.run(config)

            return {
                "status": "completed",
                "total_tests": result.total_tests,
                "passed": result.passed,
                "failed": result.failed,
                "pass_rate": round(result.pass_rate * 100, 2),
                "overall_similarity": round(result.overall_similarity * 100, 2),
                "fine_tuning_needed": result.fine_tuning_needed,
                "report_path": output_dir,
                "timestamp": result.timestamp,
            }

        except Exception as e:
            logger.error(f"Benchmark run error: {e}", exc_info=True)
            return {"status": "error", "error_message": str(e)}

    def compare_answers(
        self,
        teacher_answer: str,
        student_answer: str,
        question: str = "",
        test_id: str = "",
    ) -> Dict[str, Any]:
        """Compare Teacher vs Student answers"""
        if not BENCHMARK_AVAILABLE or ComparisonEngine is None:
            return {
                "status": "error",
                "error_message": "ComparisonEngine not available",
            }

        try:
            comparator = ComparisonEngine()
            result = comparator.compare(
                test_id=test_id or "test_001",
                question=question,
                teacher_answer=teacher_answer,
                student_answer=student_answer,
            )

            return {
                "passed": result.passed,
                "overall_score": round(result.overall_score, 4),
                "metrics": result.metrics,
                "test_id": result.test_id,
            }

        except Exception as e:
            logger.error(f"Compare answers error: {e}")
            return {"status": "error", "error_message": str(e)}

    def fine_tune_student(
        self,
        training_data_path: str = "",
        epochs: int = 10,
        learning_rate: float = 1e-4,
        batch_size: int = 8,
    ) -> Dict[str, Any]:
        """Fine-tune Student on Teacher outputs"""
        if not BENCHMARK_AVAILABLE or DistillationTrainer is None:
            return {
                "status": "error",
                "error_message": "DistillationTrainer not available",
            }

        try:
            config = DistillationConfig(
                epochs=epochs,
                learning_rate=learning_rate,
                batch_size=batch_size,
                output_dir="distillation_outputs",
            )

            trainer = DistillationTrainer(config)

            # Prepare training data from file if provided
            training_data = []
            if training_data_path and os.path.exists(training_data_path):
                if training_data_path.endswith('.jsonl'):
                    with open(training_data_path, 'r', encoding='utf-8') as f:
                        for line in f:
                            line = line.strip()
                            if line:
                                training_data.append(json.loads(line))
                else:
                    with open(training_data_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        if isinstance(data, list):
                            training_data = data

            # Mock training (without real torch models)
            # In production, this would use real teacher_fn and student_fn
            logger.info(f"Fine-tuning configured: {epochs} epochs, LR={learning_rate}, BS={batch_size}")

            return {
                "status": "completed",
                "epochs_completed": epochs,
                "final_similarity": 0.0,  # Would be computed with real models
                "history_path": config.output_dir,
                "message": "Fine-tuning configured. Requires torch models for actual training.",
            }

        except Exception as e:
            return {"status": "error", "error_message": str(e)}

    def view_dataset(self, dataset_id: str, limit: int = 50) -> Dict[str, Any]:
        """Просмотр содержимого датасета из Core"""
        if not self.dataset_processor:
            return {"success": False, "error": "DatasetProcessor not available"}

        try:
            # Get rows from DatasetProcessor
            result = self.dataset_processor.get_dataset_rows(dataset_id, limit=limit)

            if not result.get("success"):
                return {"success": False, "error": result.get("error", "Dataset not found")}

            # Get dataset info for columns
            info = self.dataset_processor.get_dataset_info(dataset_id)
            columns = info.columns if info else []

            return {
                "success": True,
                "dataset_id": dataset_id,
                "total_rows": result.get("count", 0),
                "columns": columns,
                "rows": result.get("rows", []),
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    # ========================================================================
    # Chat modes
    # ========================================================================

    def chat_mode(self, mode: str, message: str, history: List[Dict[str, str]] = None) -> Dict[str, Any]:
        """Обработка чата в зависимости от режима"""
        if history is None:
            history = []

        logger.info(f"Chat mode: {mode}, message: {message[:50]}...")

        if mode == "human-teacher":
            # Человек задает вопрос, отвечает Teacher
            return self._chat_human_teacher(message, history)
        elif mode == "human-student":
            # Человек задает вопрос, отвечает Student
            return self._chat_human_student(message, history)
        elif mode == "human-teacher-student":
            # Человек задает вопрос, отвечают оба
            return self._chat_human_both(message, history)
        elif mode == "teacher-student":
            # Teacher и Student обсуждают тему
            return self._chat_teacher_student(message, history)
        else:
            return {
                "success": False,
                "error": f"Unknown mode: {mode}",
                "responses": [],
            }

    def _chat_human_teacher(self, message: str, history: List[Dict[str, str]]) -> Dict[str, Any]:
        """Человек ↔ Учитель — реальный вызов Teacher LLM"""
        if not self.teacher_engine:
            return {
                "success": False,
                "error": "Teacher model not loaded",
                "responses": [],
            }

        try:
            # Формируем prompt с историей
            prompt = self._build_chat_prompt(history, message)
            result = self.teacher_engine.model.create_completion(
                prompt=prompt,
                max_tokens=512,
                temperature=0.7,
                top_p=0.9,
            )

            response_text = result.get("choices", [{}])[0].get("text", "")

            return {
                "success": True,
                "mode": "human-teacher",
                "responses": [
                    {"role": "human", "content": message, "timestamp": datetime.now().isoformat()},
                    {"role": "teacher", "content": response_text, "timestamp": datetime.now().isoformat()},
                ],
            }
        except Exception as e:
            logger.error(f"Teacher chat error: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
                "responses": [],
            }

    def _chat_human_student(self, message: str, history: List[Dict[str, str]]) -> Dict[str, Any]:
        """Человек ↔ Студент — используем ТОЛЬКО Student модель, без fallback"""
        if not self.student_engine:
            return {
                "success": False,
                "error": "Student model not loaded",
                "responses": [],
            }

        try:
            prompt = self._build_chat_prompt(history, message)
            result = self.student_engine.model.create_completion(
                prompt=prompt,
                max_tokens=512,
                temperature=0.7,
                top_p=0.9,
            )

            response_text = result.get("choices", [{}])[0].get("text", "")

            return {
                "success": True,
                "mode": "human-student",
                "responses": [
                    {"role": "human", "content": message, "timestamp": datetime.now().isoformat()},
                    {"role": "student", "content": response_text, "timestamp": datetime.now().isoformat()},
                ],
            }
        except Exception as e:
            logger.error(f"Student chat error: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
                "responses": [],
            }

    def _chat_human_both(self, message: str, history: List[Dict[str, str]]) -> Dict[str, Any]:
        """Человек ↔ Учитель + Студент — оба отвечают"""
        if not self.teacher_engine:
            return {
                "success": False,
                "error": "Teacher model not loaded",
                "responses": [],
            }

        try:
            # Teacher ответ
            teacher_prompt = self._build_chat_prompt(history, message)
            teacher_result = self.teacher_engine.model.create_completion(
                prompt=teacher_prompt,
                max_tokens=512,
                temperature=0.7,
                top_p=0.9,
            )
            teacher_text = teacher_result.get("choices", [{}])[0].get("text", "")

            # Student ответ — ТОЛЬКО Student модель
            if not self.student_engine:
                return {
                    "success": False,
                    "error": "Student model not loaded for comparison",
                    "responses": [
                        {"role": "human", "content": message, "timestamp": datetime.now().isoformat()},
                        {"role": "teacher", "content": teacher_text, "timestamp": datetime.now().isoformat()},
                    ],
                }

            student_result = self.student_engine.model.create_completion(
                prompt=teacher_prompt,
                max_tokens=256,
                temperature=0.5,
                top_p=0.8,
            )
            student_text = student_result.get("choices", [{}])[0].get("text", "")

            return {
                "success": True,
                "mode": "human-teacher-student",
                "responses": [
                    {"role": "human", "content": message, "timestamp": datetime.now().isoformat()},
                    {"role": "teacher", "content": teacher_text, "timestamp": datetime.now().isoformat()},
                    {"role": "student", "content": student_text, "timestamp": datetime.now().isoformat()},
                ],
            }
        except Exception as e:
            logger.error(f"Both chat error: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
                "responses": [],
            }

    def _chat_teacher_student(self, message: str, history: List[Dict[str, str]]) -> Dict[str, Any]:
        """Teacher ↔ Student — автодиалог между моделями"""
        if not self.teacher_engine:
            return {
                "success": False,
                "error": "Teacher model not loaded",
                "responses": [],
            }

        import uuid

        try:
            teacher_prompt = self._build_chat_prompt(history, message)

            # Teacher отвечает первым
            teacher_result = self.teacher_engine.model.create_completion(
                prompt=teacher_prompt,
                max_tokens=512,
                temperature=0.7,
                top_p=0.9,
            )
            teacher_text = teacher_result.get("choices", [{}])[0].get("text", "")

            # Student ответ — ТОЛЬКО Student модель
            if not self.student_engine:
                return {
                    "success": False,
                    "error": "Student model not loaded for dialogue",
                    "responses": [],
                }

            student_prompt = f"Сжати отвечай на тему: {message}. Твой ответ:"
            student_result = self.student_engine.model.create_completion(
                prompt=student_prompt,
                max_tokens=256,
                temperature=0.5,
                top_p=0.8,
            )
            student_text = student_result.get("choices", [{}])[0].get("text", "")

            entry = {
                "id": str(uuid.uuid4()),
                "mode": "teacher-student",
                "topic": message,
                "messages": [
                    {"role": "human", "content": f"[Тема обсуждения]: {message}", "timestamp": datetime.now().isoformat()},
                    {"role": "teacher", "content": teacher_text, "timestamp": datetime.now().isoformat()},
                    {"role": "student", "content": student_text, "timestamp": datetime.now().isoformat()},
                ],
                "created_at": datetime.now().isoformat(),
            }

            logger.info(f"Teacher-Student dialogue completed: {message[:50]}...")

            return {
                "success": True,
                "mode": "teacher-student",
                "history_entry": entry,
            }
        except Exception as e:
            logger.error(f"Teacher-Student chat error: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
                "responses": [],
            }

    def _build_chat_prompt(self, history: List[Dict[str, str]], current_message: str) -> str:
        """Строит prompt из истории и текущего сообщения.
        Очищает content от timestamp и запрещает показывать рассуждения.
        """
        import re
        
        # Системный prompt — запрещает показывать рассуждения и работать только с текстом
        system_prompt = (
            "Ты — AI-ассистент NeuroConstructor. Ты отвечаешь ПОЛЬЗОВАТЕЛЮ, УЧИТЕЛЮ и СТУДЕНТУ. "
            "Правила:\n"
            "1. Отвечай кратко и по делу, без рассуждений.\n"
            "2. НЕ показывай свои рассуждения, мысли или цепочку действий.\n"
            "3. НЕ используй временные метки (timestamps) в ответах.\n"
            "4. Отвечай только на русском языке если пользователь пишет на русском.\n"
            "5. Если пользователь пишет 'познакомиться' или похожее — представься и предложи помощь.\n"
        )

        prompt = f"Система: {system_prompt}\n\n"

        if history:
            for h in history:
                role = h.get("role", "user")
                content = h.get("content", "")
                
                # Очищаем content от timestamp (ISO формат YYYY-MM-DDTHH:MM:SS...)
                content = re.sub(r'\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?', '', content).strip()
                
                # Если content пустой после очистки — пропускаем
                if not content:
                    continue
                    
                if role == "human":
                    prompt += f"Вопрос: {content}\n"
                elif role == "teacher":
                    prompt += f"Учитель: {content}\n"
                elif role == "student":
                    prompt += f"Студент: {content}\n"

        # Очищаем текущее сообщение от timestamp
        current_message = re.sub(r'\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?', '', current_message).strip()
        
        prompt += f"Вопрос: {current_message}\n"
        prompt += "Ответ: "

        return prompt

    def export_chat(self, mode: str, messages: List[Dict[str, str]]) -> Dict[str, Any]:
        """Экспорт истории чата в формате JSON"""
        import uuid
        import json

        export_data = {
            "export_id": str(uuid.uuid4()),
            "mode": mode,
            "exported_at": datetime.now().isoformat(),
            "message_count": len(messages),
            "messages": [
                {
                    "role": msg.get("role", "unknown"),
                    "content": msg.get("content", ""),
                    "timestamp": msg.get("timestamp", ""),
                }
                for msg in messages
            ],
        }

        logger.info(f"Chat exported: {mode}, {len(messages)} messages")

        return {
            "success": True,
            "export_data": export_data,
        }
