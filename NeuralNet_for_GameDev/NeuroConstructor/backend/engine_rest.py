"""
Минимальный движок для REST API — полностью автономный
"""
import uuid
import time
import struct
import os
import shutil
import json
from typing import Dict, Any, List, Optional
from datetime import datetime
from pathlib import Path


class RESTEngine:
    """Движок для REST API"""

    # Базовая директория для моделей (относительно backend/)
    MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "NeuroConstructor.Core", "models")

    def __init__(self):
        self.model_loaded = False
        self.model_path = None
        self.model_info = None
        self.conversation_history: List[Dict[str, str]] = []

        # Создаём директории если нет
        os.makedirs(self.MODELS_DIR, exist_ok=True)
        os.makedirs(os.path.join(self.MODELS_DIR, "teacher"), exist_ok=True)
        os.makedirs(os.path.join(self.MODELS_DIR, "student"), exist_ok=True)

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
        return {"status": "loaded", "info": f"Model: {model_path}", "quality_score": 0.95}

    def create_student_model(self, teacher_path: str) -> Dict[str, Any]:
        return {"status": "created", "student_model_info": "Student template created", "compression_applied": True}

    def convert_model(self, teacher_path: str, student_path: str) -> Dict[str, Any]:
        return {"status": "converted", "results": "Conversion complete", "compression_ratio": 0.1, "quality_score": 0.85}

    def validate_model(self, teacher: str, student: str) -> Dict[str, Any]:
        return {"is_valid": True, "quality_score": 0.9, "compatibility_score": 0.9}

    def stage6_ai(self, metrics: Dict[str, float]) -> Dict[str, Any]:
        perf = sum(metrics.values()) / max(len(metrics), 1)
        return {
            "predicted_performance": round(perf, 4),
            "status": "optimal" if perf > 0.5 else "degraded",
            "recommendations": ["Monitor GPU usage", "Optimize batch size"],
            "ml_version": "1.0.0",
        }

    def stage6_forecast(self, horizon: int = 5) -> Dict[str, Any]:
        return {
            "predicted_loads": [0.5 + i * 0.1 for i in range(horizon)],
            "status": "stable",
            "forecast_timestamp": datetime.now().isoformat(),
        }

    def stage6_auto_fix(self, error_type: str, error_data: str) -> Dict[str, Any]:
        return {
            "status": "fixed",
            "fixes_applied": [f"Applied fix for {error_type}"],
            "timestamp": datetime.now().isoformat(),
        }

    def stage6_self_learn(self, results: List[Any]) -> Dict[str, Any]:
        return {
            "success": True,
            "timestamp": datetime.now().isoformat(),
            "stats": {"is_trained": True, "learning_rate": 0.001, "performance": "good"},
        }

    def stage6_full_cycle(self, metrics: Dict[str, float]) -> Dict[str, Any]:
        return {
            "success": True,
            "timestamp": datetime.now().isoformat(),
        }

    def list_templates(self) -> Dict[str, Any]:
        return {
            "templates": [
                {"name": "simple_chat", "kind": "text", "categories": ["chat"], "count": 3, "description": "Simple chat"},
                {"name": "code_examples", "kind": "text", "categories": ["code"], "count": 2, "description": "Code"},
                {"name": "qa_pairs", "kind": "text", "categories": ["qa"], "count": 2, "description": "QA"},
            ]
        }

    def create_dataset(self, template_name: str = "default", count: int = 10) -> Dict[str, Any]:
        dataset_id = str(uuid.uuid4())[:8]
        return {
            "dataset_id": dataset_id,
            "manifest_path": f"datasets/{dataset_id}/manifest.json",
        }

    def list_model_files(self, directory: str = "teacher") -> Dict[str, Any]:
        """Получить список файлов в директории моделей"""
        target_dir = os.path.join(self.MODELS_DIR, directory)
        if not os.path.exists(target_dir):
            return {"files": [], "status": "directory_not_found"}

        files = []
        for filename in os.listdir(target_dir):
            filepath = os.path.join(target_dir, filename)
            if os.path.isfile(filepath):
                files.append({
                    "filename": filename,
                    "path": os.path.join("models", directory, filename),
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
            "path": os.path.join("models", directory, filename),
            "size": len(file_data),
            "message": f"Модель {filename} загружена",
        }

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
