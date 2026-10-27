"""
MCP Plugin — Model Context Protocol Plugin.

Позволяет NeuroConstructor взаимодействовать с внешними системами
через Model Context Protocol (MCP):
- Blender (3D моделирование)
- Game Engines (Unity, Unreal)
- Веб-браузеры
- Любые MCP-совместимые инструменты

Также управляет виртуальным вводом (клавиатура + мышь) через браузер.
"""

PLUGIN_ID = "mcp"
PLUGIN_NAME = "MCP Plugin"
PLUGIN_VERSION = "1.0.0"
PLUGIN_DESCRIPTION = "Model Context Protocol: интеграция с внешними системами (Blender, Game Engines, браузеры, виртуальный ввод)."
PLUGIN_AUTHOR = "NeuroConstructor"
PLUGIN_CATEGORY = "mcp"
HAS_UI_COMPONENT = True
UI_POSITION = "main_panel"
SIDEBAR_ICON = "🔗"
SIDEBAR_LABEL = "MCP Подключение"
ENABLED_BY_DEFAULT = True
IS_BUILTIN = True

CAPABILITIES = [
    "connect_mcp_server",
    "disconnect_mcp_server",
    "list_mcp_tools",
    "call_mcp_tool",
    "list_mcp_resources",
    "read_mcp_resource",
    "open_browser",
    "close_browser",
    "get_browser_status",
]

# MCP Plugin не зависит от других плагинов
DEPENDENCIES = "[]"


class MCPPlugin:
    """Плагин Model Context Protocol для интеграции с внешними системами."""

    def __init__(self):
        self.enabled = True
        self.config = {
            "servers": {
                "default": {
                    "url": "http://localhost:3001",
                    "name": "Default MCP Server",
                }
            },
            "browser": {
                "default_url": "http://localhost:8080/virtual-input",
                "width": 800,
                "height": 600,
            },
        }
        self._servers = {}
        self._browser_window = None
        self._browser_process = None

    def on_enable(self):
        print(f"[MCP Plugin] Enabled")
        return {"success": True}

    def on_disable(self):
        self.disconnect_all()
        self.close_browser()
        print("[MCP Plugin] Disabled")

    # =================================================================
    # MCP Server Management
    # =================================================================

    def connect_mcp_server(self, url: str = None, name: str = None) -> dict:
        """Подключается к MCP серверу."""
        url = url or self.config["servers"]["default"]["url"]
        name = name or "Default MCP Server"

        try:
            import requests
            
            # Пробуем ping сервера
            response = requests.get(f"{url}/health", timeout=5)
            if response.status_code != 200:
                # Пробуем стандартный MCP endpoint
                response = requests.get(url, timeout=5)

            self._servers[name] = {
                "url": url,
                "name": name,
                "connected": True,
                "connected_at": datetime.now().isoformat(),
            }

            return {
                "success": True,
                "message": f"Connected to {name} at {url}",
                "server": self._servers[name],
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to connect: {e}",
                "server": {"url": url, "name": name, "connected": False},
            }

    def disconnect_mcp_server(self, name: str) -> dict:
        """Отключается от MCP сервера."""
        if name in self._servers:
            self._servers[name]["connected"] = False
            del self._servers[name]
            return {"success": True, "message": f"Disconnected from {name}"}
        return {"success": False, "error": f"Server not found: {name}"}

    def disconnect_all(self):
        """Отключает все серверы."""
        for name in list(self._servers.keys()):
            self.disconnect_mcp_server(name)

    def list_mcp_tools(self, server_name: str = None) -> dict:
        """Возвращает список доступных MCP инструментов."""
        server_name = server_name or list(self._servers.keys())[0] if self._servers else None
        
        if not server_name or server_name not in self._servers:
            return {
                "success": False,
                "error": "No connected server",
                "tools": [],
            }

        server = self._servers[server_name]
        try:
            import requests
            
            response = requests.get(f"{server['url']}/tools", timeout=10)
            if response.status_code == 200:
                tools = response.json().get("tools", [])
                return {"success": True, "tools": tools, "server": server_name}
            
            # Fallback: возвращаем стандартные инструменты
            return {
                "success": True,
                "tools": self._get_builtin_tools(),
                "server": server_name,
                "note": "Using builtin tools (remote MCP not available)",
            }
        except Exception as e:
            return {
                "success": True,
                "tools": self._get_builtin_tools(),
                "server": server_name,
                "note": f"Remote error ({e}), using builtin tools",
            }

    def call_mcp_tool(self, server_name: str, tool_name: str, arguments: dict = None) -> dict:
        """Вызывает MCP инструмент на сервере."""
        server_name = server_name or list(self._servers.keys())[0] if self._servers else None
        
        if not server_name or server_name not in self._servers:
            return {"success": False, "error": "No connected server"}

        server = self._servers[server_name]
        arguments = arguments or {}

        try:
            import requests
            
            response = requests.post(
                f"{server['url']}/call",
                json={
                    "tool": tool_name,
                    "arguments": arguments,
                },
                timeout=30,
            )
            response.raise_for_status()
            return {
                "success": True,
                "result": response.json(),
                "tool": tool_name,
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "tool": tool_name,
            }

    def list_mcp_resources(self, server_name: str = None) -> dict:
        """Возвращает список MCP ресурсов."""
        server_name = server_name or list(self._servers.keys())[0] if self._servers else None
        
        if not server_name:
            return {"success": False, "error": "No connected server", "resources": []}

        server = self._servers[server_name]
        try:
            import requests
            response = requests.get(f"{server['url']}/resources", timeout=10)
            if response.status_code == 200:
                return {"success": True, "resources": response.json().get("resources", []), "server": server_name}
        except Exception:
            pass

        return {
            "success": True,
            "resources": [],
            "server": server_name,
            "note": "No resources available",
        }

    def read_mcp_resource(self, server_name: str, uri: str) -> dict:
        """Читает MCP ресурс."""
        server_name = server_name or list(self._servers.keys())[0] if self._servers else None

        if not server_name or server_name not in self._servers:
            return {"success": False, "error": "No connected server"}

        server = self._servers[server_name]
        try:
            import requests
            response = requests.get(f"{server['url']}/resource/{uri}", timeout=10)
            if response.status_code == 200:
                return {"success": True, "data": response.json(), "uri": uri}
        except Exception as e:
            return {"success": False, "error": str(e)}

        return {"success": False, "error": f"Failed to read resource: {uri}"}

    # =================================================================
    # Browser Management (Virtual Input)
    # =================================================================

    def open_browser(self, url: str = None, width: int = None, height: int = None) -> dict:
        """
        Открывает браузер с указанным URL.
        
        Используется для открытия:
        - Virtual Keyboard & Mouse UI
        - MCP Tool UI
        - Любые веб-инструменты
        """
        url = url or self.config["browser"]["default_url"]
        width = width or self.config["browser"]["width"]
        height = height or self.config["browser"]["height"]

        try:
            import subprocess
            import sys

            # Закрываем предыдущее окно если есть
            self.close_browser()

            if sys.platform == "win32":
                # Windows: открываем через start
                self._browser_process = subprocess.Popen(
                    ['start', '', url],
                    shell=True,
                    creationflags=subprocess.CREATE_NEW_CONSOLE,
                )
            elif sys.platform == "darwin":
                # macOS
                self._browser_process = subprocess.Popen(
                    ['open', url],
                )
            else:
                # Linux
                self._browser_process = subprocess.Popen(
                    ['xdg-open', url],
                )

            self._browser_window = {
                "url": url,
                "width": width,
                "height": height,
                "opened_at": datetime.now().isoformat(),
                "pid": self._browser_process.pid,
            }

            return {
                "success": True,
                "message": f"Browser opened: {url}",
                "browser": self._browser_window,
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
            }

    def close_browser(self) -> dict:
        """Закрывает браузер."""
        if self._browser_process:
            try:
                self._browser_process.terminate()
                self._browser_process.wait(timeout=3)
            except Exception:
                try:
                    self._browser_process.kill()
                except Exception:
                    pass
            self._browser_process = None

        self._browser_window = None
        return {"success": True, "message": "Browser closed"}

    def get_browser_status(self) -> dict:
        """Возвращает статус браузера."""
        if self._browser_window:
            # Проверяем жив ли процесс
            if self._browser_process and self._browser_process.poll() is not None:
                return {
                    "success": True,
                    "browser_open": False,
                    "message": "Browser process terminated",
                }
            return {
                "success": True,
                "browser_open": True,
                "browser": self._browser_window,
            }
        return {
            "success": True,
            "browser_open": False,
            "message": "No browser open",
        }

    def open_virtual_input(self) -> dict:
        """
        Открывает браузер с Virtual Keyboard & Mouse UI.
        
        Это основной метод для теста: MCP Plugin -> открыть браузер 
        с виртуальной клавиатурой и мышью.
        """
        # Сначала пытаемся открыть локальный сервер с Virtual Input UI
        try:
            # Создаём встроенный Virtual Input UI если нет внешнего сервера
            url = self._prepare_virtual_input_page()
            return self.open_browser(url)
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to open virtual input: {e}",
            }

    def _prepare_virtual_input_page(self) -> str:
        """
        Подготавливает страницу Virtual Input UI.
        
        Создаёт HTML страницу с виртуальной клавиатурой и мышью,
        и открывает её в браузере.
        """
        import os
        
        # Создаём Virtual Input HTML страницу
        virtual_input_html = self._generate_virtual_input_html()
        
        # Сохраняем во временный файл
        import tempfile
        temp_dir = os.path.join(os.path.dirname(__file__), '..', 'temp')
        os.makedirs(temp_dir, exist_ok=True)
        html_path = os.path.join(temp_dir, 'virtual_input.html')
        
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(virtual_input_html)
        
        # Открываем через file:// URL
        file_url = f"file://{os.path.abspath(html_path)}"
        return file_url

    def _generate_virtual_input_html(self) -> str:
        """Генерирует HTML страницу для виртуальной клавиатуры и мыши."""
        return """<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Virtual Keyboard & Mouse — NeuroConstructor MCP</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #0f0f1a;
            color: #e8e8e8;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }
        header {
            background: #1a1a2e;
            padding: 16px 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #2a2a3e;
        }
        header h1 {
            font-size: 18px;
            color: #7c6ff7;
        }
        header .status {
            font-size: 13px;
            color: #4caf50;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        header .status::before {
            content: '';
            width: 8px;
            height: 8px;
            background: #4caf50;
            border-radius: 50%;
            display: inline-block;
        }
        .container {
            flex: 1;
            display: flex;
            overflow: hidden;
        }
        .keyboard-panel {
            flex: 1;
            padding: 20px;
            overflow-y: auto;
        }
        .mouse-panel {
            width: 300px;
            padding: 20px;
            border-left: 1px solid #1a1a2e;
            overflow-y: auto;
        }
        .panel-title {
            font-size: 14px;
            color: #8888aa;
            margin-bottom: 16px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .keyboard-row {
            display: flex;
            gap: 4px;
            margin-bottom: 4px;
            justify-content: center;
        }
        .key {
            min-width: 44px;
            height: 44px;
            background: #1a1a2e;
            border: 1px solid #2a2a3e;
            border-radius: 6px;
            color: #e8e8e8;
            font-size: 13px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.15s;
            user-select: none;
        }
        .key:hover {
            background: #2a2a4e;
            border-color: #7c6ff7;
        }
        .key:active, .key.pressed {
            background: #7c6ff7;
            border-color: #9d8fff;
            transform: scale(0.95);
        }
        .key.wide { min-width: 72px; font-size: 11px; }
        .key.extra-wide { min-width: 100px; font-size: 11px; }
        .output-area {
            margin-top: 20px;
            background: #121220;
            border: 1px solid #1e1e30;
            border-radius: 8px;
            padding: 16px;
            min-height: 120px;
            max-height: 200px;
            overflow-y: auto;
            font-family: 'Consolas', monospace;
            font-size: 13px;
            color: #8888aa;
            word-break: break-all;
        }
        .mouse-controls {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .mouse-btn {
            height: 50px;
            background: #1a1a2e;
            border: 1px solid #2a2a3e;
            border-radius: 8px;
            color: #e8e8e8;
            font-size: 13px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: all 0.15s;
        }
        .mouse-btn:hover {
            background: #2a2a4e;
            border-color: #7c6ff7;
        }
        .mouse-btn:active {
            background: #7c6ff7;
        }
        .mouse-btn.primary { border-color: #4caf50; }
        .mouse-btn.secondary { border-color: #2196f3; }
        .mouse-btn.scroll { border-color: #ff9800; }
        .coordinate-display {
            background: #121220;
            border: 1px solid #1e1e30;
            border-radius: 8px;
            padding: 16px;
        }
        .coordinate-display .coords {
            font-family: 'Consolas', monospace;
            font-size: 16px;
            color: #7c6ff7;
        }
        .slider-group {
            margin-top: 16px;
        }
        .slider-group label {
            display: block;
            font-size: 12px;
            color: #8888aa;
            margin-bottom: 8px;
        }
        .slider-group input[type="range"] {
            width: 100%;
            accent-color: #7c6ff7;
        }
        .event-log {
            margin-top: 16px;
            background: #121220;
            border: 1px solid #1e1e30;
            border-radius: 8px;
            padding: 12px;
            max-height: 150px;
            overflow-y: auto;
            font-family: 'Consolas', monospace;
            font-size: 11px;
            color: #8888aa;
        }
        .event-log .event {
            padding: 4px 0;
            border-bottom: 1px solid #1a1a2e;
        }
        .event-log .event:last-child { border-bottom: none; }
        .event-log .timestamp { color: #555; }
        .event-log .type { color: #7c6ff7; margin: 0 8px; }
        .event-log .value { color: #4caf50; }
        footer {
            background: #1a1a2e;
            padding: 8px 24px;
            font-size: 11px;
            color: #555;
            text-align: center;
            border-top: 1px solid #2a2a3e;
        }
    </style>
</head>
<body>
    <header>
        <h1>🖱️ ⌨️ Virtual Input — NeuroConstructor</h1>
        <div class="status">Connected</div>
    </header>
    <div class="container">
        <div class="keyboard-panel">
            <div class="panel-title">Virtual Keyboard</div>
            <div id="keyboard"></div>
            <div class="output-area" id="output"></div>
        </div>
        <div class="mouse-panel">
            <div class="panel-title">Mouse Controls</div>
            <div class="coordinate-display">
                <div>Position: <span class="coords" id="mouseCoords">X: 0, Y: 0</span></div>
            </div>
            <div class="mouse-controls">
                <button class="mouse-btn primary" onclick="mouseClick('left')">
                    🖱️ Left Click
                </button>
                <button class="mouse-btn secondary" onclick="mouseClick('right')">
                    🖱️ Right Click
                </button>
                <button class="mouse-btn" onclick="mouseClick('middle')">
                    🖱️ Middle Click
                </button>
                <div class="slider-group">
                    <label>Scroll Delta: <span id="scrollValue">0</span></label>
                    <input type="range" min="-100" max="100" value="0" id="scrollSlider" oninput="updateScroll()">
                </div>
                <button class="mouse-btn scroll" onclick="sendScroll()">
                    📜 Send Scroll
                </button>
            </div>
            <div class="event-log" id="eventLog">
                <div class="event">
                    <span class="timestamp">[--:--:--]</span>
                    <span class="type">SYSTEM</span>
                    <span class="value">Virtual Input initialized</span>
                </div>
            </div>
        </div>
    </div>
    <footer>
        MCP Plugin — Virtual Input Interface | NeuroConstructor Neural Network Toolkit
    </footer>

    <script>
        const keyboardLayout = [
            ['1','2','3','4','5','6','7','8','9','0','-','=','Backspace'],
            ['Tab','q','w','e','r','t','y','u','i','o','p','[',']','\\'],
            ['Caps','a','s','d','f','g','h','j','k','l',';',"'",'Enter'],
            ['Shift','z','x','c','v','b','n','m',',','.','/','Shift'],
            ['Ctrl','Win','Alt',' ','Alt','Win','Menu','Ctrl']
        ];

        const keyNames = {
            'Backspace': '⌫', 'Tab': '⇥', 'Caps': '⇪', 'Enter': '↵',
            'Shift': '⇧', 'Ctrl': 'Ctrl', 'Win': '⊞', 'Alt': 'Alt',
            'Menu': '☰', ' ': 'SPACE'
        };

        let output = '';

        // Build keyboard
        const keyboardEl = document.getElementById('keyboard');
        keyboardLayout.forEach(row => {
            const rowEl = document.createElement('div');
            rowEl.className = 'keyboard-row';
            row.forEach(key => {
                const keyEl = document.createElement('div');
                keyEl.className = 'key';
                keyEl.textContent = keyNames[key] || key;
                keyEl.dataset.key = key;
                
                if (['Backspace','Tab','Caps','Enter','Shift','Ctrl','Alt'].includes(key)) {
                    keyEl.classList.add('wide');
                }
                if (key === ' ') {
                    keyEl.classList.add('extra-wide');
                    keyEl.style.minWidth = '250px';
                }

                keyEl.addEventListener('mousedown', () => handleKeyPress(key, true));
                keyEl.addEventListener('mouseup', () => handleKeyPress(key, false));
                
                rowEl.appendChild(keyEl);
            });
            keyboardEl.appendChild(rowEl);
        });

        function handleKeyPress(key, pressed) {
            const keyEl = document.querySelector(`[data-key="${key}"]`);
            if (keyEl) {
                keyEl.classList.toggle('pressed', pressed);
            }

            const now = new Date().toLocaleTimeString();
            
            if (pressed) {
                if (key === 'Backspace') {
                    output = output.slice(0, -1);
                } else if (key === 'Enter') {
                    output += '\\n';
                    logEvent('KEY', `\\n (Enter)`);
                } else if (key === 'Tab') {
                    output += '    ';
                    logEvent('KEY', 'Tab');
                } else if (key === 'Caps' || key === 'Shift' || key === 'Ctrl' || key === 'Alt' || key === 'Win' || key === 'Menu') {
                    logEvent('MODIFIER', key);
                } else if (key === ' ') {
                    output += ' ';
                    logEvent('KEY', 'SPACE');
                } else {
                    output += key;
                    logEvent('KEY', key);
                }
            }

            document.getElementById('output').textContent = output || 'Press keys to type...';
        }

        function mouseClick(button) {
            const now = new Date().toLocaleTimeString();
            const coords = document.getElementById('mouseCoords').textContent;
            logEvent('MOUSE', `${button} click [${coords}]`);
        }

        function updateScroll() {
            document.getElementById('scrollValue').textContent = document.getElementById('scrollSlider').value;
        }

        function sendScroll() {
            const delta = document.getElementById('scrollSlider').value;
            logEvent('SCROLL', `Delta: ${delta}`);
        }

        function logEvent(type, value) {
            const log = document.getElementById('eventLog');
            const now = new Date().toLocaleTimeString();
            const eventEl = document.createElement('div');
            eventEl.className = 'event';
            eventEl.innerHTML = `<span class="timestamp">[${now}]</span><span class="type">${type}</span><span class="value">${value}</span>`;
            log.appendChild(eventEl);
            log.scrollTop = log.scrollHeight;
        }

        // Track real mouse position in the mouse panel
        const mousePanel = document.querySelector('.mouse-panel');
        mousePanel.addEventListener('mousemove', (e) => {
            const rect = mousePanel.getBoundingClientRect();
            const x = Math.round(e.clientX - rect.left);
            const y = Math.round(e.clientY - rect.top);
            document.getElementById('mouseCoords').textContent = `X: ${x}, Y: ${y}`;
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            e.preventDefault();
            handleKeyPress(e.key, true);
        });
        document.addEventListener('keyup', (e) => {
            handleKeyPress(e.key, false);
        });
    </script>
</body>
</html>"""

    def get_ui_config(self):
        """Конфигурация для UI."""
        return {
            "servers": list(self._servers.keys()),
            "browser_status": self.get_browser_status(),
            "builtin_tools": self._get_builtin_tools(),
            "virtual_input_url": self.config["browser"]["default_url"],
        }

    def _get_builtin_tools(self) -> list:
        """Возвращает встроенные инструменты MCP."""
        return [
            {
                "name": "open_browser",
                "description": "Открыть веб-браузер с URL",
                "parameters": {
                    "url": {"type": "string", "description": "URL для открытия"},
                    "width": {"type": "integer", "description": "Ширина окна"},
                    "height": {"type": "integer", "description": "Высота окна"},
                },
            },
            {
                "name": "close_browser",
                "description": "Закрыть браузер",
                "parameters": {},
            },
            {
                "name": "virtual_input",
                "description": "Открыть виртуальную клавиатуру и мышь",
                "parameters": {},
            },
            {
                "name": "get_browser_status",
                "description": "Получить статус браузера",
                "parameters": {},
            },
            {
                "name": "send_keyboard_input",
                "description": "Отправить ввод с виртуальной клавиатуры",
                "parameters": {
                    "text": {"type": "string", "description": "Текст для отправки"},
                    "keys": {"type": "array", "description": "Массив клавиш"},
                },
            },
            {
                "name": "send_mouse_click",
                "description": "Отправить клик мыши",
                "parameters": {
                    "button": {"type": "string", "enum": ["left", "right", "middle"]},
                    "x": {"type": "integer"},
                    "y": {"type": "integer"},
                },
            },
            {
                "name": "send_mouse_move",
                "description": "Переместить курсор мыши",
                "parameters": {
                    "x": {"type": "integer", "description": "X координата"},
                    "y": {"type": "integer", "description": "Y координата"},
                },
            },
            {
                "name": "send_mouse_scroll",
                "description": "Отправить прокрутку",
                "parameters": {
                    "delta": {"type": "integer", "description": "Дельта прокрутки"},
                },
            },
        ]

    def execute(self, context):
        """Главный метод вызова плагина."""
        method = context.config.get('method', 'get_ui_config')
        args = context.config.get('args', {})

        method_map = {
            'connect_mcp_server': lambda: self.connect_mcp_server(args.get('url'), args.get('name')),
            'disconnect_mcp_server': lambda: self.disconnect_mcp_server(args.get('name', '')),
            'list_mcp_tools': lambda: self.list_mcp_tools(args.get('server_name')),
            'call_mcp_tool': lambda: self.call_mcp_tool(args.get('server_name', ''), args.get('tool_name', ''), args.get('arguments', {})),
            'open_browser': lambda: self.open_browser(args.get('url'), args.get('width'), args.get('height')),
            'close_browser': lambda: self.close_browser(),
            'get_browser_status': lambda: self.get_browser_status(),
            'open_virtual_input': lambda: self.open_virtual_input(),
            'get_ui_config': lambda: self.get_ui_config(),
        }

        handler = method_map.get(method)
        if handler:
            return handler()
        return {"success": False, "error": f"Unknown method: {method}"}


# Глобальный инстанс
from datetime import datetime
import os
instance = MCPPlugin()
