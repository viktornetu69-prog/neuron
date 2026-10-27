"""
Chat Mode Plugin — плагины для режимов чата.

Поддерживаемые режимы:
- human-teacher: Человек + Teacher
- human-student: Человек + Student
- human-teacher-student: Человек + Teacher + Student
- teacher-student: Teacher ↔ Student
"""
import random
from datetime import datetime
from typing import Dict, Any, List

PLUGIN_ID = "chat_mode"
PLUGIN_NAME = "Chat Mode Plugin"
PLUGIN_VERSION = "1.0.0"
PLUGIN_DESCRIPTION = "Режимы чата: human-teacher, human-student, teacher-student, human-teacher-student."
PLUGIN_AUTHOR = "NeuroConstructor"
PLUGIN_CATEGORY = "utility"
HAS_UI_COMPONENT = True
UI_POSITION = "main_panel"
SIDEBAR_ICON = "💬"
SIDEBAR_LABEL = "Чат"
ENABLED_BY_DEFAULT = True
IS_BUILTIN = True

CAPABILITIES = [
    "list_chat_modes",
    "send_message",
    "get_chat_history",
    "clear_chat",
    "export_history",
]

DEPENDENCIES = "[]"


class ChatModePlugin:
    """Плагин режимов чата."""

    def __init__(self):
        self.enabled = True
        self.config = {
            "chat_modes": [
                {"id": "human-teacher", "name": "Human + Teacher", "description": "Задаёте вопрос — отвечает Teacher модель"},
                {"id": "human-student", "name": "Human + Student", "description": "Задаёте вопрос — отвечает Student модель"},
                {"id": "human-teacher-student", "name": "Human + Teacher + Student", "description": "Сравниваете ответы двух моделей"},
                {"id": "teacher-student", "name": "Teacher ↔ Student", "description": "Модели общаются между собой"},
            ],
            "default_mode": "human-teacher",
            "max_history": 100,
        }
        self._chat_history: Dict[str, List[Dict]] = {}

    def on_enable(self):
        print("[Chat Mode Plugin] Enabled")
        return {"success": True}

    def on_disable(self):
        self._chat_history.clear()

    def list_chat_modes(self) -> dict:
        return {
            "success": True,
            "modes": self.config["chat_modes"],
            "default": self.config["default_mode"],
        }

    def send_message(self, mode: str, message: str) -> dict:
        """Отправляет сообщение в чат."""
        if mode not in [m["id"] for m in self.config["chat_modes"]]:
            return {"success": False, "error": f"Unknown mode: {mode}"}

        if mode not in self._chat_history:
            self._chat_history[mode] = []

        # Добавляем сообщение пользователя
        self._chat_history[mode].append({
            "role": "user",
            "content": message,
            "timestamp": datetime.now().isoformat(),
        })

        # Симулируем ответ модели
        responses = {
            "human-teacher": f"Teacher says: {message} - interesting question about this topic.",
            "human-student": f"Student replies: I think {message} is a good point to explore further.",
            "human-teacher-student": {
                "teacher": f"Teacher: {message} - from my experience teaching this concept...",
                "student": f"Student: {message} - let me think about this carefully.",
            },
            "teacher-student": f"Teacher→Student: {message} - now I'll explain this to my student.",
        }

        response = responses.get(mode, f"Response for {mode}")

        self._chat_history[mode].append({
            "role": "assistant",
            "content": response,
            "timestamp": datetime.now().isoformat(),
            "mode": mode,
        })

        return {
            "success": True,
            "message": "Message sent",
            "mode": mode,
            "response": response,
        }

    def get_chat_history(self, mode: str = None, limit: int = 50) -> dict:
        if mode:
            history = self._chat_history.get(mode, [])
            return {"success": True, "history": history[-limit:], "mode": mode}

        all_history = {}
        for m, h in self._chat_history.items():
            all_history[m] = h[-limit:]
        return {"success": True, "history": all_history}

    def clear_chat(self, mode: str = None) -> dict:
        if mode:
            self._chat_history[mode] = []
        else:
            self._chat_history.clear()
        return {"success": True, "message": "Chat cleared"}

    def export_history(self, mode: str) -> dict:
        history = self._chat_history.get(mode, [])
        return {
            "success": True,
            "mode": mode,
            "export": history,
            "count": len(history),
        }

    def get_ui_config(self) -> dict:
        return {
            "title": "Chat Mode Settings",
            "description": "Настройки режимов чата",
            "fields": [
                {
                    "key": "default_mode",
                    "label": "Режим по умолчанию",
                    "type": "select",
                    "options": [
                        {"value": m["id"], "label": m["name"]}
                        for m in self.config["chat_modes"]
                    ],
                    "default": self.config["default_mode"],
                },
                {
                    "key": "max_history",
                    "label": "Макс. записей истории",
                    "type": "number",
                    "default": self.config["max_history"],
                    "description": "Количество сообщений хранить в истории",
                },
            ],
        }

    def save_settings(self, settings: dict) -> dict:
        """Сохраняет настройки плагина."""
        if 'default_mode' in settings:
            valid_modes = [m["id"] for m in self.config["chat_modes"]]
            if settings['default_mode'] in valid_modes:
                self.config['default_mode'] = settings['default_mode']
        
        if 'max_history' in settings:
            try:
                val = int(settings['max_history'])
                if val > 0:
                    self.config['max_history'] = val
            except (ValueError, TypeError):
                pass
        
        return {
            "success": True,
            "message": "Настройки сохранены",
            "config": self.config,
        }

    def execute(self, context) -> dict:
        method = context.config.get('method', 'get_ui_config')
        args = context.config.get('args', {})

        method_map = {
            'list_chat_modes': lambda: self.list_chat_modes(),
            'send_message': lambda: self.send_message(args.get('mode', ''), args.get('message', '')),
            'get_chat_history': lambda: self.get_chat_history(args.get('mode', '')),
            'clear_chat': lambda: self.clear_chat(args.get('mode', '')),
            'export_history': lambda: self.export_history(args.get('mode', '')),
            'get_ui_config': lambda: self.get_ui_config(),
            'save_settings': lambda: self.save_settings(args),
        }

        handler = method_map.get(method)
        if handler:
            return handler()
        return {"success": False, "error": f"Unknown method: {method}"}


instance = ChatModePlugin()
