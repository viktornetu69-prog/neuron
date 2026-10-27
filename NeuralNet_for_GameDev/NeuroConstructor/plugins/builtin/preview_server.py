"""
Preview Server Plugin — управление предпросмотром.

Управление subprocess серверами (npm dev, preview server).
Встроенная визуализация нейросети.
"""
import os
import subprocess
import json
from datetime import datetime
from typing import Dict, Any, List

PLUGIN_ID = "preview_server"
PLUGIN_NAME = "Preview Server Plugin"
PLUGIN_VERSION = "1.0.0"
PLUGIN_DESCRIPTION = "Управление предпросмотром: subprocess серверы, визуализация нейросети, iframe."
PLUGIN_AUTHOR = "NeuroConstructor"
PLUGIN_CATEGORY = "utility"
HAS_UI_COMPONENT = True
UI_POSITION = "overlay"
SIDEBAR_ICON = "👁"
SIDEBAR_LABEL = "Предпросмотр"
ENABLED_BY_DEFAULT = True
IS_BUILTIN = True

CAPABILITIES = [
    "start_preview_server",
    "stop_preview_server",
    "get_server_status",
    "list_servers",
    "render_neural_network",
]

DEPENDENCIES = "[]"


class PreviewServerPlugin:
    """Плагин предпросмотра серверов и визуализации."""

    def __init__(self):
        self.enabled = True
        self.config = {
            "servers_dir": os.path.join(os.path.dirname(__file__), '..', '..', 'servers'),
            "default_command": "npm run dev",
            "default_port": 5173,
        }
        os.makedirs(self.config["servers_dir"], exist_ok=True)
        self._servers: Dict[str, subprocess.Popen] = {}
        self._server_status: Dict[str, Dict] = {}

    def on_enable(self):
        print("[Preview Server Plugin] Enabled")
        return {"success": True}

    def on_disable(self):
        for name, proc in self._servers.items():
            try:
                proc.terminate()
            except Exception:
                pass
        self._servers.clear()
        self._server_status.clear()

    def start_preview_server(self, name: str = "preview", command: str = None, port: int = None) -> dict:
        """Запускает сервер предпросмотра."""
        try:
            cmd = command or self.config["default_command"]
            actual_port = port or self.config["default_port"]

            proc = subprocess.Popen(
                cmd.split(),
                cwd=os.getcwd(),
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )

            self._servers[name] = proc
            self._server_status[name] = {
                "status": "running",
                "pid": proc.pid,
                "port": actual_port,
                "started_at": datetime.now().isoformat(),
            }

            return {
                "success": True,
                "name": name,
                "pid": proc.pid,
                "port": actual_port,
                "status": "running",
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def stop_preview_server(self, name: str = "preview") -> dict:
        """Останавливает сервер."""
        proc = self._servers.get(name)
        if proc:
            try:
                proc.terminate()
                proc.wait(timeout=3)
                del self._servers[name]
                self._server_status[name]["status"] = "stopped"
                return {"success": True, "name": name, "status": "stopped"}
            except Exception as e:
                return {"success": False, "error": str(e)}
        return {"success": False, "error": f"Server not found: {name}"}

    def get_server_status(self, name: str = "preview") -> dict:
        return {
            "success": True,
            "status": self._server_status.get(name, {"status": "idle"}),
        }

    def list_servers(self) -> dict:
        servers = []
        for name, status in self._server_status.items():
            servers.append({
                "name": name,
                "status": status["status"],
                "pid": status.get("pid"),
                "port": status.get("port"),
            })
        return {"success": True, "servers": servers}

    def render_neural_network(self, architecture: Dict = None) -> dict:
        """Рендерит нейросеть в формате для визуализации."""
        if not architecture:
            architecture = {
                "model_family": "qwen3",
                "hidden_size": 768,
                "num_layers": 12,
                "num_heads": 12,
                "vocab_size": 32000,
            }

        # Формируем визуализацию
        nodes = []
        edges = []

        for i in range(architecture["num_layers"]):
            nodes.append({
                "id": f"layer_{i}",
                "name": f"Layer {i}",
                "type": "transformer",
                "position": {"x": i * 100, "y": 50},
            })
            if i > 0:
                edges.append({"from": f"layer_{i-1}", "to": f"layer_{i}"})

        return {
            "success": True,
            "visualization": {
                "nodes": nodes,
                "edges": edges,
                "architecture": architecture,
            },
        }

    def get_ui_config(self) -> dict:
        return {
            "title": "Preview Server Settings",
            "description": "Настройки сервера предпросмотра",
            "fields": [
                {
                    "key": "default_port",
                    "label": "Порт по умолчанию",
                    "type": "number",
                    "default": self.config["default_port"],
                },
                {
                    "key": "servers_dir",
                    "label": "Директория серверов",
                    "type": "string",
                    "default": self.config["servers_dir"],
                    "description": "Путь к директории с серверами",
                },
            ],
        }

    def save_settings(self, settings: dict) -> dict:
        """Сохраняет настройки плагина."""
        if 'default_port' in settings:
            try:
                val = int(settings['default_port'])
                if val > 0:
                    self.config['default_port'] = val
            except (ValueError, TypeError):
                pass
        
        if 'servers_dir' in settings:
            dir_path = settings['servers_dir']
            if dir_path:
                self.config['servers_dir'] = dir_path
                os.makedirs(dir_path, exist_ok=True)
        
        return {
            "success": True,
            "message": "Настройки сохранены",
            "config": self.config,
        }

    def execute(self, context) -> dict:
        method = context.config.get('method', 'get_ui_config')
        args = context.config.get('args', {})

        method_map = {
            'start_preview_server': lambda: self.start_preview_server(
                args.get('name', 'preview'),
                args.get('command', ''),
                args.get('port', 5173),
            ),
            'stop_preview_server': lambda: self.stop_preview_server(args.get('name', 'preview')),
            'get_server_status': lambda: self.get_server_status(args.get('name', 'preview')),
            'list_servers': lambda: self.list_servers(),
            'render_neural_network': lambda: self.render_neural_network(args.get('architecture', {})),
            'get_ui_config': lambda: self.get_ui_config(),
            'save_settings': lambda: self.save_settings(args),
        }

        handler = method_map.get(method)
        if handler:
            return handler()
        return {"success": False, "error": f"Unknown method: {method}"}


instance = PreviewServerPlugin()
