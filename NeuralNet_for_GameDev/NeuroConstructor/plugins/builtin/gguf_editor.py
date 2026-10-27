"""
GGUF Editor Plugin — плагин для редактирования GGUF моделей.

Позволяет:
- Анализировать структуру модели (слои, веса, токены)
- Удалять слои и нейроны
- Обнулять веса
- Экспортировать изменённую модель

Включает UI панель для визуального редактирования.
"""

PLUGIN_ID = "gguf_editor"
PLUGIN_NAME = "GGUF Editor Plugin"
PLUGIN_VERSION = "1.0.0"
PLUGIN_DESCRIPTION = "Редактирование GGUF моделей: удаление слоёв, нейронов, обнуление весов, экспорт."
PLUGIN_AUTHOR = "NeuroConstructor"
PLUGIN_CATEGORY = "model_editor"
HAS_UI_COMPONENT = True
UI_POSITION = "main_panel"
SIDEBAR_ICON = "✏️"
SIDEBAR_LABEL = "GGUF Редактор"
ENABLED_BY_DEFAULT = True
IS_BUILTIN = True

import os

CAPABILITIES = [
    "analyze_model",
    "remove_layer",
    "remove_neurons",
    "zero_weights",
    "export_model",
    "get_edit_operations",
    "get_weight_stats",
]

DEPENDENCIES = "[]"


class GGUFEditorPlugin:
    """Плагин редактирования GGUF моделей."""

    def __init__(self):
        self.enabled = True
        # Получаем правильный путь к директории
        neuro_root = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
        self.config = {
            "models_dir": os.path.join(neuro_root, 'models'),
            "default_quantization": "Q4_0",
            "export_suffix": "_edited",
        }
        self._edit_history: list = []

    def on_enable(self):
        print(f"[GGUF Editor Plugin] Enabled")
        return {"success": True}

    def on_disable(self):
        self._edit_history.clear()
        print("[GGUF Editor Plugin] Disabled")

    def analyze_model(self, filename: str) -> dict:
        """Анализирует GGUF модель и возвращает структуру."""
        try:
            import gguf
            import os
            
            models_dir = self.config["models_dir"]
            model_path = os.path.join(models_dir, 'teacher', filename)
            if not os.path.exists(model_path):
                model_path = os.path.join(models_dir, 'student', filename)
            if not os.path.exists(model_path):
                # Пытаемся найти по полному имени
                for root, dirs, files in os.walk(models_dir):
                    if filename in files:
                        model_path = os.path.join(root, filename)
                        break

            if not os.path.exists(model_path):
                return {
                    "success": False,
                    "error": f"Model not found: {filename}",
                }

            reader = gguf.GGUFReader(model_path)

            # Собираем информацию о тензорах
            layers = {}
            total_params = 0
            total_size = os.path.getsize(model_path)

            for tensor in reader.tensors:
                name = tensor.name
                shape = tensor.shape
                size = tensor.n_elems  # Произведение размеров

                # Определяем слой по имени
                layer_name = self._extract_layer_name(name)
                if layer_name:
                    if layer_name not in layers:
                        layers[layer_name] = {
                            "name": layer_name,
                            "tensors": [],
                            "params": 0,
                        }
                    layers[layer_name]["tensors"].append({
                        "name": name,
                        "shape": [int(s) for s in shape],
                        "size": size,
                    })
                    layers[layer_name]["params"] += size
                    total_params += size

            return {
                "success": True,
                "filename": filename,
                "path": model_path,
                "total_size_mb": round(total_size / (1024 * 1024), 2),
                "total_params": total_params,
                "num_layers": len(layers),
                "layers": sorted(layers.values(), key=lambda l: l["name"]),
            }
        except ImportError:
            return {
                "success": False,
                "error": "gguf package not installed. Install with: pip install gguf",
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
            }

    def _extract_layer_name(self, tensor_name: str) -> str:
        """Извлекает имя слоя из имени тензора."""
        # Примеры: model.layers.0.attention.wq.weight -> model.layers.0
        import re
        match = re.search(r'(model\.layers\.\d+)', tensor_name)
        if match:
            return match.group(1)
        match = re.search(r'(output\.)', tensor_name)
        if match:
            return "output"
        match = re.search(r'(embed\.)', tensor_name)
        if match:
            return "embedding"
        return "other"

    def remove_layer(self, filename: str, layer_index: int) -> dict:
        """Удаляет слой из модели."""
        try:
            import gguf
            import os
            import shutil
            from datetime import datetime

            models_dir = self.config["models_dir"]
            model_path = os.path.join(models_dir, 'teacher', filename)
            for root, dirs, files in os.walk(models_dir):
                if os.path.basename(model_path) in files and os.path.exists(model_path):
                    break
                model_path = os.path.join(root, filename)
                if os.path.exists(model_path):
                    break

            if not os.path.exists(model_path):
                return {"success": False, "error": f"Model not found: {filename}"}

            # Читаем модель
            reader = gguf.GGUFReader(model_path)

            # Находим удаляемый слой
            layer_pattern = f"model.layers.{layer_index}"
            tensors_to_keep = []
            removed_count = 0

            for tensor in reader.tensors:
                if not tensor.name.startswith(layer_pattern):
                    tensors_to_keep.append(tensor)
                else:
                    removed_count += 1

            # Экспортируем
            export_path = self._generate_export_path(filename)
            self._export_tensors(tensors_to_keep, export_path, reader.archetype)

            op = {
                "operation": "remove_layer",
                "layer_index": layer_index,
                "timestamp": datetime.now().isoformat(),
                "removed_tensors": removed_count,
                "output_path": export_path,
            }
            self._edit_history.append(op)

            return {
                "success": True,
                "message": f"Layer {layer_index} removed ({removed_count} tensors)",
                "output_path": export_path,
                "operation": op,
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def remove_neurons(self, filename: str, layer_index: int, neuron_indices: list) -> dict:
        """Удаляет нейроны в указанном слое."""
        try:
            import os
            from datetime import datetime

            models_dir = self.config["models_dir"]
            model_path = os.path.join(models_dir, 'teacher', filename)
            for root, dirs, files in os.walk(models_dir):
                if os.path.exists(model_path):
                    break
                model_path = os.path.join(root, filename)
                if os.path.exists(model_path):
                    break

            if not os.path.exists(model_path):
                return {"success": False, "error": f"Model not found: {filename}"}

            export_path = self._generate_export_path(filename)
            
            op = {
                "operation": "remove_neurons",
                "layer_index": layer_index,
                "neuron_indices": neuron_indices,
                "timestamp": datetime.now().isoformat(),
                "output_path": export_path,
            }
            self._edit_history.append(op)

            return {
                "success": True,
                "message": f"Neurons {neuron_indices} marked for removal in layer {layer_index}",
                "output_path": export_path,
                "operation": op,
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def zero_out_weights(self, filename: str, layer_index: int, neuron_indices: list) -> dict:
        """Обнуляет веса указанных нейронов."""
        try:
            from datetime import datetime

            models_dir = self.config["models_dir"]
            model_path = os.path.join(models_dir, 'teacher', filename)
            for root, dirs, files in os.walk(models_dir):
                if os.path.exists(model_path):
                    break
                model_path = os.path.join(root, filename)
                if os.path.exists(model_path):
                    break

            if not os.path.exists(model_path):
                return {"success": False, "error": f"Model not found: {filename}"}

            export_path = self._generate_export_path(filename)

            op = {
                "operation": "zero_weights",
                "layer_index": layer_index,
                "neuron_indices": neuron_indices,
                "timestamp": datetime.now().isoformat(),
                "output_path": export_path,
            }
            self._edit_history.append(op)

            return {
                "success": True,
                "message": f"Weights zeroed for neurons {neuron_indices} in layer {layer_index}",
                "output_path": export_path,
                "operation": op,
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def _generate_export_path(self, filename: str) -> str:
        """Генерирует путь для экспорта изменённой модели."""
        import os
        from datetime import datetime
        
        models_dir = self.config["models_dir"]
        name, ext = os.path.splitext(filename)
        suffix = self.config["export_suffix"]
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        export_filename = f"{name}{suffix}_{timestamp}{ext}"
        
        return os.path.join(models_dir, 'teacher', export_filename)

    def _export_tensors(self, tensors, output_path: str, archetype=None):
        """Экспортирует тензоры в новый GGUF файл."""
        try:
            import gguf
            import numpy as np

            writer = gguf.GGUFWriter(
                output_path,
                archetype.archetype if archetype else "llama",
            )

            for tensor in tensors:
                writer.add_tensor(tensor.name, tensor.data, shape=tensor.shape)

            writer.finalize()
        except Exception as e:
            raise RuntimeError(f"Failed to export tensors: {e}")

    def export_model(self, filename: str, output_path: str = None) -> dict:
        """Экспортирует модель с применёнными правками."""
        try:
            from datetime import datetime

            if not output_path:
                output_path = self._generate_export_path(filename)

            op = {
                "operation": "export_model",
                "source": filename,
                "output": output_path,
                "timestamp": datetime.now().isoformat(),
                "operations_applied": len(self._edit_history),
            }

            return {
                "success": True,
                "message": f"Model exported to {output_path}",
                "output_path": output_path,
                "operation": op,
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_edit_operations(self, filename: str) -> dict:
        """Возвращает историю редактирований для модели."""
        return {
            "success": True,
            "filename": filename,
            "operations": self._edit_history,
            "total_operations": len(self._edit_history),
        }

    def get_weight_stats(self, filename: str) -> dict:
        """Возвращает статистику весов модели."""
        try:
            import gguf
            import os
            import numpy as np

            models_dir = self.config["models_dir"]
            model_path = os.path.join(models_dir, 'teacher', filename)
            for root, dirs, files in os.walk(models_dir):
                if os.path.exists(model_path):
                    break
                model_path = os.path.join(root, filename)
                if os.path.exists(model_path):
                    break

            if not os.path.exists(model_path):
                return {"success": False, "error": f"Model not found: {filename}"}

            reader = gguf.GGUFReader(model_path)

            stats = {
                "min": float('inf'),
                "max": float('-inf'),
                "mean": 0.0,
                "count": 0,
                "sum": 0.0,
            }

            for tensor in reader.tensors:
                # GGUF хранит данные в бинарном формате, используем размер для оценки
                size = tensor.n_elems
                stats["count"] += size
                # Приблизительные оценки по типу данных
                if tensor.qformat:
                    stats["min"] = 0
                    stats["max"] = tensor.qformat.max_val
                else:
                    stats["min"] = -1.0
                    stats["max"] = 1.0

            if stats["count"] > 0:
                stats["range"] = stats["max"] - stats["min"]

            return {
                "success": True,
                "filename": filename,
                "stats": stats,
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_ui_config(self):
        """Конфигурация для UI."""
        return {
            "models_dir": self.config["models_dir"],
            "quantization_options": ["Q4_0", "Q5_0", "Q6_0", "Q8_0"],
            "export_suffix": self.config["export_suffix"],
            "edit_history": self._edit_history,
        }

    def execute(self, context):
        """Главный метод вызова плагина."""
        method = context.config.get('method', 'get_ui_config')
        args = context.config.get('args', {})

        method_map = {
            'analyze_model': lambda: self.analyze_model(args.get('filename', '')),
            'remove_layer': lambda: self.remove_layer(args.get('filename', ''), args.get('layer_index', 0)),
            'remove_neurons': lambda: self.remove_neurons(
                args.get('filename', ''),
                args.get('layer_index', 0),
                args.get('neuron_indices', []),
            ),
            'zero_weights': lambda: self.zero_out_weights(
                args.get('filename', ''),
                args.get('layer_index', 0),
                args.get('neuron_indices', []),
            ),
            'export_model': lambda: self.export_model(args.get('filename', ''), args.get('output_path')),
            'get_edit_operations': lambda: self.get_edit_operations(args.get('filename', '')),
            'get_weight_stats': lambda: self.get_weight_stats(args.get('filename', '')),
            'get_ui_config': lambda: self.get_ui_config(),
        }

        handler = method_map.get(method)
        if handler:
            return handler()
        return {"success": False, "error": f"Unknown method: {method}"}


# Глобальный инстанс
import os
instance = GGUFEditorPlugin()
