"""
Model Converter Plugin — плагин для конвертации Teacher -> Student.

Масштабирует архитектуру: hidden_size, layers, heads, quantization.
"""
import os
import json
from datetime import datetime
from typing import Dict, Any, Optional

PLUGIN_ID = "model_converter"
PLUGIN_NAME = "Model Converter Plugin"
PLUGIN_VERSION = "1.0.0"
PLUGIN_DESCRIPTION = "Конвертация Teacher -> Student: масштабирование архитектуры, квантификация."
PLUGIN_AUTHOR = "NeuroConstructor"
PLUGIN_CATEGORY = "model_editor"
HAS_UI_COMPONENT = True
UI_POSITION = "dialog"
SIDEBAR_ICON = "🔄"
SIDEBAR_LABEL = "Конвертация"
ENABLED_BY_DEFAULT = True
IS_BUILTIN = True

CAPABILITIES = [
    "convert_teacher_to_student",
    "convert_with_config",
    "validate_compatibility",
    "list_models",
]

DEPENDENCIES = "[]"


class ModelConverterPlugin:
    """Плагин конвертации моделей."""

    def __init__(self):
        self.enabled = True
        self.config = {
            "models_dir": os.path.join(os.path.dirname(__file__), '..', '..', 'models'),
            "default_ratios": {
                "hidden_size": 0.5,
                "num_layers": 0.4,
                "num_heads": 0.5,
                "num_kv_heads": 0.5,
            },
            "quantization": "Q4_0",
        }
        self._conversions = []

    def on_enable(self):
        print("[Model Converter Plugin] Enabled")
        return {"success": True}

    def on_disable(self):
        self._conversions.clear()

    def _extract_architecture(self, model_path: str) -> dict:
        """Извлекает архитектуру из GGUF."""
        try:
            import struct
            with open(model_path, 'rb') as f:
                magic = f.read(4)
                if magic != b'GGUF':
                    return {"error": "Invalid GGUF"}

                f.read(4)  # version
                num_tensors = struct.unpack('Q', f.read(8))[0]
                num_kv = struct.unpack('Q', f.read(8))[0]

                metadata = {}
                for _ in range(num_kv):
                    key_len = struct.unpack('Q', f.read(8))[0]
                    key = f.read(key_len).decode('utf-8')
                    vtype = struct.unpack('B', f.read(1))[0]
                    metadata[key] = vtype

            return {
                "archetype": metadata.get("general.architecture", "unknown"),
                "hidden_size": metadata.get("general.hidden_size", 0),
                "num_layers": metadata.get("general.block_count", 0),
                "num_heads": metadata.get("general.attention.head_count", 0),
                "vocab_size": metadata.get("general.vocab_size", 0),
            }
        except Exception:
            return {"error": "Failed to parse model"}

    def convert_teacher_to_student(self, teacher_path: str, scaling: dict = None) -> dict:
        """Конвертирует Teacher модель в Student."""
        scaling = scaling or self.config["default_ratios"]
        arch = self._extract_architecture(teacher_path)
        if "error" in arch:
            return {"success": False, "error": arch["error"]}

        student_arch = {
            "archetype": arch["archetype"],
            "hidden_size": int(arch["hidden_size"] * scaling.get("hidden_size", 0.5)),
            "num_layers": int(arch["num_layers"] * scaling.get("num_layers", 0.4)),
            "num_heads": max(1, int(arch["num_heads"] * scaling.get("num_heads", 0.5))),
            "num_kv_heads": max(1, int(arch["num_heads"] * scaling.get("num_kv_heads", 0.5))),
            "vocab_size": arch["vocab_size"],
        }

        conversion = {
            "id": f"conv_{len(self._conversions) + 1}",
            "teacher_path": teacher_path,
            "student_architecture": student_arch,
            "scaling": scaling,
            "timestamp": datetime.now().isoformat(),
            "status": "completed",
        }

        self._conversions.append(conversion)

        return {
            "success": True,
            "conversion": conversion,
            "student_architecture": student_arch,
        }

    def convert_with_config(self, config: dict) -> dict:
        """Конвертирует с полной конфигурацией."""
        return self.convert_teacher_to_student(
            config.get("teacher_path", ""),
            config.get("scaling", self.config["default_ratios"]),
        )

    def validate_compatibility(self, teacher_path: str, student_arch: dict) -> dict:
        """Валидирует совместимость."""
        teacher_arch = self._extract_architecture(teacher_path)
        if "error" in teacher_arch:
            return {"success": False, "error": teacher_arch["error"]}

        issues = []
        if teacher_arch.get("archetype", "") != student_arch.get("archetype", ""):
            issues.append("Archetype mismatch")

        if student_arch.get("hidden_size", 0) > teacher_arch.get("hidden_size", 0):
            issues.append("Student hidden_size cannot exceed teacher")

        return {
            "success": len(issues) == 0,
            "compatible": len(issues) == 0,
            "issues": issues,
        }

    def list_models(self, directory: str = None) -> dict:
        """Список моделей."""
        directory = directory or self.config["models_dir"]
        models = []
        if os.path.isdir(directory):
            for f in os.listdir(directory):
                if f.endswith('.gguf'):
                    models.append({
                        "filename": f,
                        "path": os.path.join(directory, f),
                        "size_mb": os.path.getsize(os.path.join(directory, f)) / (1024 * 1024),
                    })
        return {"success": True, "models": models}

    def get_ui_config(self) -> dict:
        return {
            "default_ratios": self.config["default_ratios"],
            "quantization_options": ["Q4_0", "Q5_0", "Q6_0", "Q8_0"],
            "conversions_count": len(self._conversions),
        }

    def execute(self, context) -> dict:
        method = context.config.get('method', 'get_ui_config')
        args = context.config.get('args', {})

        method_map = {
            'convert_teacher_to_student': lambda: self.convert_teacher_to_student(
                args.get('teacher_path', ''), args.get('scaling', {})
            ),
            'convert_with_config': lambda: self.convert_with_config(args),
            'validate_compatibility': lambda: self.validate_compatibility(
                args.get('teacher_path', ''), args.get('student_arch', {})
            ),
            'list_models': lambda: self.list_models(args.get('directory', '')),
            'get_ui_config': lambda: self.get_ui_config(),
        }

        handler = method_map.get(method)
        if handler:
            return handler()
        return {"success": False, "error": f"Unknown method: {method}"}


instance = ModelConverterPlugin()
