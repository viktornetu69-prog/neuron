"""
Preview Server Manager — реальный запуск и остановка subprocess
"""
import subprocess
import os
import logging
import signal
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


class PreviewServerManager:
    """Управление процессами сервера предпросмотра"""

    def __init__(self):
        self.process: Optional[subprocess.Popen] = None
        self.processes: Dict[str, subprocess.Popen] = {}

    def start_server(self, command: str, cwd: str = None, name: str = "default") -> Dict[str, Any]:
        """Запуск сервера через subprocess"""
        try:
            if cwd:
                os.makedirs(cwd, exist_ok=True)

            # Определяем shell для Windows
            shell = os.name == 'nt'

            process = subprocess.Popen(
                command,
                cwd=cwd,
                shell=shell,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
            )

            self.processes[name] = process
            logger.info(f"Сервер '{name}' запущен (PID: {process.pid})")

            return {
                "success": True,
                "pid": process.pid,
                "command": command,
                "message": f"Сервер запущен с PID {process.pid}",
            }
        except Exception as e:
            logger.error(f"Ошибка запуска сервера: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": f"Не удалось запустить сервер: {e}",
            }

    def stop_server(self, name: str = "default") -> Dict[str, Any]:
        """Остановка сервера по имени"""
        process = self.processes.get(name)
        if not process:
            return {
                "success": False,
                "message": f"Сервер '{name}' не найден",
            }

        try:
            if os.name == 'nt':
                # Windows: terminate process tree
                process.terminate()
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    process.kill()
            else:
                # Unix: terminate process group
                process.terminate()
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    process.kill()

            del self.processes[name]
            logger.info(f"Сервер '{name}' остановлен")

            return {
                "success": True,
                "message": f"Сервер '{name}' остановлен",
            }
        except Exception as e:
            logger.error(f"Ошибка остановки сервера: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": f"Не удалось остановить сервер: {e}",
            }

    def get_status(self, name: str = "default") -> Dict[str, Any]:
        """Получить статус сервера"""
        process = self.processes.get(name)
        if not process:
            return {
                "success": True,
                "running": False,
                "pid": None,
                "message": f"Сервер '{name}' не запущен",
            }

        return {
            "success": True,
            "running": process.poll() is None,
            "pid": process.pid,
            "exit_code": process.poll(),
            "message": f"Сервер '{name}' запущен (PID: {process.pid})",
        }

    def list_servers(self) -> Dict[str, Any]:
        """Список всех серверов"""
        servers = {}
        for name, process in self.processes.items():
            servers[name] = {
                "pid": process.pid,
                "running": process.poll() is None,
                "exit_code": process.poll(),
            }
        return {
            "success": True,
            "servers": servers,
            "count": len(servers),
        }


# Singleton
_preview_server_manager = PreviewServerManager()


def get_preview_server_manager() -> PreviewServerManager:
    """Получить singleton менеджер серверов"""
    return _preview_server_manager
