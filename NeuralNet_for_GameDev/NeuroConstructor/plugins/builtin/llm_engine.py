"""
LLM Engine Plugin — плагин для загрузки и управления LLM движками.

Поддерживает:
- llama-cpp-python (LlamaCppEngine)
- Ollama (OllamaEngine)
- Mock (MockEngine — без реальной модели)

Включает UI панель для выбора движка и управления моделями.
"""
from typing import Any
from datetime import datetime

PLUGIN_ID = "llm_engine"
PLUGIN_NAME = "LLM Engine Plugin"
PLUGIN_VERSION = "1.0.0"
PLUGIN_DESCRIPTION = "Управление LLM движками: LlamaCpp, Ollama, Mock. Позволяет загружать и переключать модели."
PLUGIN_AUTHOR = "NeuroConstructor"
PLUGIN_CATEGORY = "llm_engine"
PLUGIN_DESCRIPTION = "Управление LLM движками: LlamaCpp, Ollama, Mock"

HAS_UI_COMPONENT = True
UI_POSITION = "main_panel"
SIDEBAR_ICON = "🧠"
SIDEBAR_LABEL = "LLM Движок"
ENABLED_BY_DEFAULT = True
IS_BUILTIN = True

# capabilities описывают API функции плагина
CAPABILITIES = [
    "load_model",
    "unload_model",
    "generate_response",
    "list_models",
    "switch_engine",
    "stream_tokens",
]

# Зависимости (нет)
DEPENDENCIES = "[]"


class LLMEnginePlugin:
    """Плагин управления LLM движками."""

    def __init__(self):
        self.enabled = True
        self.config = {
            "default_engine": "mock",  # llama_cpp, ollama, mock
            "llama_cpp": {
                "n_gpu_layers": 0,
                "n_ctx": 2048,
                "verbose": False,
            },
            "ollama": {
                "host": "http://localhost:11434",
                "model": "llama3",
                "num_ctx": 2048,
            },
            "mock": {
                "delay_ms": 100,
                "response_template": "Это mock-ответ от LLM. Реальная модель будет загружена когда LLM Engine Plugin включён.",
            },
        }
        self._engine = None
        self._current_model = None
        self._available_models = []

    def on_enable(self):
        """Вызывается при включении плагина."""
        print(f"[LLM Engine Plugin] Enabled with config: {self.config}")
        self._discover_models()
        return {"success": True}

    def on_disable(self):
        """Вызывается при отключении плагина."""
        self._unload_model()
        print("[LLM Engine Plugin] Disabled")

    def _discover_models(self):
        """Находит доступные модели в директориях teacher/student."""
        import os
        import glob

        # Получаем правильный путь к директории
        current_file = os.path.abspath(__file__)
        neuro_root = os.path.dirname(os.path.dirname(os.path.dirname(current_file)))
        
        model_dirs = [
            os.path.join(neuro_root, 'models', 'teacher'),
            os.path.join(neuro_root, 'models', 'student'),
        ]
        
        models = []
        for model_dir in model_dirs:
            if os.path.isdir(model_dir):
                for f in os.listdir(model_dir):
                    if f.endswith(('.gguf', '.pt', '.pth', '.safetensors')):
                        models.append({
                            "filename": f,
                            "path": os.path.join(model_dir, f),
                            "directory": "teacher" if "teacher" in model_dir else "student",
                            "size_mb": self._get_file_size_mb(os.path.join(model_dir, f)),
                        })
        
        self._available_models = models
        return models

    def _get_file_size_mb(self, path: str) -> float:
        try:
            return os.path.getsize(path) / (1024 * 1024)
        except OSError:
            return 0.0

    def _unload_model(self):
        """Выгружает текущую модель."""
        if self._engine:
            try:
                del self._engine
            except Exception:
                pass
            self._engine = None
            self._current_model = None

    def load_model(self, model_path: str, engine: str = None):
        """
        Загружает модель в указанный движок.
        
        Args:
            model_path: Путь к файлу модели
            engine: 'llama_cpp', 'ollama', 'mock' (по умолчанию — из config)
        """
        engine = engine or self.config["default_engine"]

        self._unload_model()

        if engine == "llama_cpp":
            self._engine = self._load_llama_cpp(model_path)
        elif engine == "ollama":
            self._engine = "ollama"
            # Ollama модель указывается в config["ollama"]["model"]
        elif engine == "mock":
            self._engine = "mock"
        else:
            raise ValueError(f"Unknown engine: {engine}")

        self._current_model = {
            "path": model_path,
            "engine": engine,
            "loaded_at": datetime.now().isoformat(),
        }
        return {"success": True, "model": self._current_model}

    def _load_llama_cpp(self, model_path: str):
        """Загружает модель через llama-cpp-python."""
        try:
            from llama_cpp import Llama
            
            llm_config = self.config["llama_cpp"]
            llm = Llama(
                model_path=model_path,
                n_gpu_layers=llm_config["n_gpu_layers"],
                n_ctx=llm_config["n_ctx"],
                verbose=llm_config["verbose"],
            )
            return llm
        except ImportError:
            # llama-cpp-python не установлен, используем mock
            print("[LLM Engine Plugin] llama-cpp-python not installed, using mock")
            self.config["default_engine"] = "mock"
            return "mock"
        except Exception as e:
            raise RuntimeError(f"Failed to load model with llama-cpp: {e}")

    def generate_response(self, prompt: str, engine: str = None):
        """
        Генерирует ответ на prompt.
        
        Args:
            prompt: Текстовый запрос
            engine: Движок для использования
        """
        engine = engine or (self._current_model["engine"] if self._current_model else self.config["default_engine"])

        if engine == "mock":
            template = self.config["mock"]["response_template"]
            return {
                "success": True,
                "response": template.replace("{prompt}", prompt),
                "engine": "mock",
            }
        elif engine == "llama_cpp" and self._engine:
            try:
                result = self._engine.create_chat_completion(
                    messages=[{"role": "user", "content": prompt}]
                )
                return {
                    "success": True,
                    "response": result["choices"][0]["message"]["content"],
                    "engine": "llama_cpp",
                }
            except Exception as e:
                return {"success": False, "error": str(e), "engine": "llama_cpp"}
        elif engine == "ollama":
            try:
                import requests
                ollama_config = self.config["ollama"]
                response = requests.post(
                    f"{ollama_config['host']}/api/generate",
                    json={
                        "model": ollama_config.get("model", "llama3"),
                        "prompt": prompt,
                        "stream": False,
                    },
                    timeout=60,
                )
                response.raise_for_status()
                data = response.json()
                return {
                    "success": True,
                    "response": data.get("response", ""),
                    "engine": "ollama",
                }
            except Exception as e:
                return {"success": False, "error": str(e), "engine": "ollama"}
        else:
            return {
                "success": False,
                "error": "No model loaded. Call load_model() first.",
                "engine": engine,
            }

    def stream_tokens(self, prompt: str, engine: str = None):
        """
        Генерирует ответ по токену (streaming).
        Возвращает generator.
        """
        engine = engine or (self._current_model["engine"] if self._current_model else self.config["default_engine"])

        if engine == "mock":
            # Mock streaming: токены по частям
            response = self.config["mock"]["response_template"]
            for i in range(0, len(response), 3):
                yield response[i:i+3]
            return

        if engine == "llama_cpp" and self._engine:
            try:
                stream = self._engine.create_chat_completion(
                    messages=[{"role": "user", "content": prompt}],
                    stream=True,
                )
                for chunk in stream:
                    delta = chunk["choices"][0].get("delta", {})
                    if "content" in delta:
                        yield delta["content"]
                return
            except Exception as e:
                yield f"[ERROR] {e}"
                return

        yield "[ERROR] Streaming not supported for this engine"

    def list_models(self):
        """Возвращает список доступных моделей."""
        if not self._available_models:
            self._discover_models()
        return {"success": True, "models": self._available_models}

    def get_status(self):
        """Возвращает текущий статус движка."""
        return {
            "success": True,
            "engine": self._current_model["engine"] if self._current_model else self.config["default_engine"],
            "model_loaded": self._current_model is not None,
            "current_model": self._current_model,
            "available_models": len(self._available_models),
            "config": self.config,
        }

    # ==================================================================
    # Методы для UI (вызываются фронтендом через plugin:execute)
    # ==================================================================

    def get_ui_config(self):
        """Возвращает конфигурацию для UI панели."""
        return {
            "engines": ["llama_cpp", "ollama", "mock"],
            "current_engine": self.config["default_engine"],
            "current_model": self._current_model,
            "available_models": self._available_models,
        }

    def update_config(self, key: str, value: Any):
        """Обновляет конфигурацию плагина."""
        if '.' in key:
            section, subkey = key.split('.', 1)
            if section in self.config and subkey in self.config[section]:
                self.config[section][subkey] = value
        elif key in self.config:
            self.config[key] = value
        return {"success": True}

    def execute(self, context):
        """
        Главный метод вызова плагина.
        Вызывается PluginRegistry.execute().
        """
        method = context.config.get('method', 'get_status')
        args = context.config.get('args', {})
        
        method_map = {
            'get_status': lambda: self.get_status(),
            'list_models': lambda: self.list_models(),
            'get_ui_config': lambda: self.get_ui_config(),
            'load_model': lambda: self.load_model(args.get('model_path', ''), args.get('engine', '')),
            'generate_response': lambda: self.generate_response(args.get('prompt', '')),
            'update_config': lambda: self.update_config(args.get('key', ''), args.get('value', '')),
        }
        
        handler = method_map.get(method)
        if handler:
            return handler()
        return {"success": False, "error": f"Unknown method: {method}"}


# Глобальный инстанс плагина (обязательно для PluginRegistry)
instance = LLMEnginePlugin()
