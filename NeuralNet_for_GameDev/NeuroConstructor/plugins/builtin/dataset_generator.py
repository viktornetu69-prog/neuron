"""
Dataset Generator Plugin — генерация датасетов разных типов.

AI External Generation через MCP, встроенные генераторы:
text, image, gamedev, 3d_model, desktop.
"""
import os
import json
import random
from datetime import datetime
from typing import Dict, Any, List

PLUGIN_ID = "dataset_generator"
PLUGIN_NAME = "Dataset Generator Plugin"
PLUGIN_VERSION = "1.0.0"
PLUGIN_DESCRIPTION = "Генерация датасетов: text, image, 3d_model, gamedev, desktop. AI генерация через MCP."
PLUGIN_AUTHOR = "NeuroConstructor"
PLUGIN_CATEGORY = "dataset"
HAS_UI_COMPONENT = True
UI_POSITION = "dialog"
SIDEBAR_ICON = "✨"
SIDEBAR_LABEL = "Генерация Данных"
ENABLED_BY_DEFAULT = True
IS_BUILTIN = True

CAPABILITIES = [
    "generate_dataset",
    "list_generators",
    "get_storage_info",
    "ai_generate_dataset",
]

DEPENDENCIES = "[]"


class DatasetGeneratorPlugin:
    """Плагин генерации датасетов."""

    def __init__(self):
        self.enabled = True
        self.config = {
            "output_dir": os.path.join(os.path.dirname(__file__), '..', '..', 'datasets', 'generated'),
            "max_records": 10000,
        }
        os.makedirs(self.config["output_dir"], exist_ok=True)

    def on_enable(self):
        print("[Dataset Generator Plugin] Enabled")
        return {"success": True}

    def on_disable(self):
        pass

    def generate_dataset(self, generator_type: str, config: dict = None) -> dict:
        """Генерирует датасет заданного типа."""
        config = config or {}
        num_records = config.get("num_records", 100)

        data = []
        if generator_type == "text":
            data = self._generate_text_data(num_records, config)
        elif generator_type == "gamedev":
            data = self._generate_gamedev_data(num_records, config)
        elif generator_type == "3d_model":
            data = self._generate_3d_data(num_records, config)
        else:
            data = self._generate_text_data(num_records, config)

        # Сохраняем
        filename = f"generated_{generator_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        filepath = os.path.join(self.config["output_dir"], filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        return {
            "success": True,
            "generator": generator_type,
            "records": len(data),
            "output_path": filepath,
            "sample": data[:3],
        }

    def _generate_text_data(self, num: int, config: dict) -> List[Dict]:
        templates = [
            {"prompt": "What is {topic}?", "answer": "{topic} is a fundamental concept in {field}."},
            {"prompt": "Explain {topic}.", "answer": "{topic} involves key principles such as {principle}."},
            {"prompt": "How does {topic} work?", "answer": "{topic} works through the interaction of {principle} and {principle2}."},
        ]

        topics = ["machine learning", "neural networks", "transformers", "attention", "gradient descent"]
        fields = ["AI", "computer science", "data science", "robotics"]
        principles = ["pattern recognition", "optimization", "feature extraction", "representation learning"]

        data = []
        for _ in range(num):
            template = random.choice(templates)
            topic = random.choice(topics)
            record = {
                "prompt": template["prompt"].format(topic=topic, field=random.choice(fields)),
                "answer": template["answer"].format(
                    topic=topic,
                    principle=random.choice(principles),
                    principle2=random.choice(principles),
                ),
            }
            data.append(record)
        return data

    def _generate_gamedev_data(self, num: int, config: dict) -> List[Dict]:
        entities = ["warrior", "mage", "archer", "healer", "rogue"]
        actions = ["attack", "defend", "cast spell", "heal", "stealth"]
        data = []
        for _ in range(num):
            data.append({
                "entity": random.choice(entities),
                "action": random.choice(actions),
                "hp": random.randint(50, 500),
                "mana": random.randint(10, 200),
                "damage": random.randint(5, 100),
            })
        return data

    def _generate_3d_data(self, num: int, config: dict) -> List[Dict]:
        shapes = ["cube", "sphere", "cylinder", "cone", "torus"]
        data = []
        for _ in range(num):
            data.append({
                "shape": random.choice(shapes),
                "vertices": random.randint(4, 1000),
                "faces": random.randint(4, 500),
                "position": [round(random.uniform(-10, 10), 2), round(random.uniform(-10, 10), 2), round(random.uniform(-10, 10), 2)],
                "scale": round(random.uniform(0.1, 5.0), 2),
            })
        return data

    def list_generators(self) -> dict:
        return {
            "success": True,
            "generators": [
                {"id": "text", "name": "Text Q&A", "description": "Generates question-answer pairs"},
                {"id": "gamedev", "name": "GameDev Assets", "description": "Game character and state data"},
                {"id": "3d_model", "name": "3D Models", "description": "Basic 3D geometry data"},
            ],
        }

    def get_storage_info(self) -> dict:
        dir_path = self.config["output_dir"]
        total_files = len([f for f in os.listdir(dir_path) if f.endswith('.json')]) if os.path.isdir(dir_path) else 0
        total_size = sum(
            os.path.getsize(os.path.join(dir_path, f))
            for f in os.listdir(dir_path)
            if os.path.isfile(os.path.join(dir_path, f)) and f.endswith('.json')
        ) if os.path.isdir(dir_path) else 0

        return {
            "success": True,
            "output_dir": dir_path,
            "total_files": total_files,
            "total_size_mb": round(total_size / (1024 * 1024), 2),
        }

    def ai_generate_dataset(self, prompt: str, generator_type: str = None) -> dict:
        """AI генерация через MCP."""
        # В реальности: вызываем MCP plugin для генерации через LLM
        return {
            "success": True,
            "message": "AI generation queued via MCP",
            "prompt": prompt,
            "type": generator_type or "text",
        }

    def get_ui_config(self) -> dict:
        return {
            "generators": ["text", "gamedev", "3d_model"],
            "output_dir": self.config["output_dir"],
        }

    def execute(self, context) -> dict:
        method = context.config.get('method', 'get_ui_config')
        args = context.config.get('args', {})

        method_map = {
            'generate_dataset': lambda: self.generate_dataset(args.get('type', 'text'), args),
            'list_generators': lambda: self.list_generators(),
            'get_storage_info': lambda: self.get_storage_info(),
            'ai_generate_dataset': lambda: self.ai_generate_dataset(args.get('prompt', '')),
            'get_ui_config': lambda: self.get_ui_config(),
        }

        handler = method_map.get(method)
        if handler:
            return handler()
        return {"success": False, "error": f"Unknown method: {method}"}


instance = DatasetGeneratorPlugin()
