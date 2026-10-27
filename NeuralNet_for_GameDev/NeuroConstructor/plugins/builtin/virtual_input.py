"""
Virtual Input Plugin — плагин виртуального ввода (клавиатура + мышь).

Предоставляет:
- Виртуальную клавиатуру с полной раскладкой
- Виртуальную мышь (клики, перемещение, скролл)
- Лог событий ввода
- Интеграцию через MCP Protocol

Включает полнофункциональный UI с HTML/CSS/JS.
"""

PLUGIN_ID = "virtual_input"
PLUGIN_NAME = "Virtual Input Plugin"
PLUGIN_VERSION = "1.0.0"
PLUGIN_DESCRIPTION = "Виртуальная клавиатура и мышь: ввод текста, клики, перемещение курсора, скролл."
PLUGIN_AUTHOR = "NeuroConstructor"
PLUGIN_CATEGORY = "virtual_input"
HAS_UI_COMPONENT = True
UI_POSITION = "overlay"
SIDEBAR_ICON = "⌨️"
SIDEBAR_LABEL = "Виртуальный Ввод"
ENABLED_BY_DEFAULT = False  # Включаем по умолчанию выключенным
IS_BUILTIN = True

CAPABILITIES = [
    "open_keyboard",
    "close_keyboard",
    "send_key",
    "send_text",
    "mouse_click",
    "mouse_move",
    "mouse_scroll",
    "get_input_log",
    "clear_input_log",
]

# Зависит от MCP плагина для интеграции
DEPENDENCIES = "[]"


class VirtualInputPlugin:
    """Плагин виртуального ввода."""

    def __init__(self):
        self.enabled = True
        self.config = {
            "keyboard_layout": "qwerty",  # qwerty, azerty, qwertz
            "auto_capitalize": False,
            "show_virtual_cursor": True,
            "capture_global_input": False,
            "send_to_mcp": True,  # Отправлять события через MCP
            "event_log_size": 100,
        }
        self._input_log = []
        self._browser_process = None

    def on_enable(self):
        print(f"[Virtual Input Plugin] Enabled")
        return {"success": True}

    def on_disable(self):
        self.close_keyboard()
        self._input_log.clear()
        print("[Virtual Input Plugin] Disabled")

    def open_keyboard(self) -> dict:
        """Открывает виртуальную клавиатуру в браузере."""
        try:
            import subprocess
            import sys
            import os

            self.close_keyboard()

            # Генерируем HTML страницу
            html_content = self._generate_keyboard_html()

            # Сохраняем во временный файл
            temp_dir = os.path.join(os.path.dirname(__file__), '..', 'temp')
            os.makedirs(temp_dir, exist_ok=True)
            html_path = os.path.join(temp_dir, 'virtual_keyboard.html')

            with open(html_path, 'w', encoding='utf-8') as f:
                f.write(html_content)

            file_url = f"file://{os.path.abspath(html_path)}"

            # Открываем в браузере
            if sys.platform == "win32":
                self._browser_process = subprocess.Popen(
                    ['start', '', file_url],
                    shell=True,
                    creationflags=subprocess.CREATE_NEW_CONSOLE,
                )
            elif sys.platform == "darwin":
                self._browser_process = subprocess.Popen(['open', file_url])
            else:
                self._browser_process = subprocess.Popen(['xdg-open', file_url])

            return {
                "success": True,
                "message": "Virtual keyboard opened",
                "url": file_url,
                "pid": self._browser_process.pid,
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def close_keyboard(self) -> dict:
        """Закрывает виртуальную клавиатуру."""
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
        return {"success": True, "message": "Virtual keyboard closed"}

    def send_key(self, key: str) -> dict:
        """Отправляет нажатие клавиши."""
        from datetime import datetime
        event = {
            "type": "key_press",
            "key": key,
            "timestamp": datetime.now().isoformat(),
        }
        self._input_log.append(event)
        # Ограничиваем размер лога
        if len(self._input_log) > self.config["event_log_size"]:
            self._input_log = self._input_log[-self.config["event_log_size"]:]
        return {"success": True, "event": event}

    def send_text(self, text: str) -> dict:
        """Отправляет текстовый ввод."""
        from datetime import datetime
        event = {
            "type": "text_input",
            "text": text,
            "timestamp": datetime.now().isoformat(),
        }
        self._input_log.append(event)
        if len(self._input_log) > self.config["event_log_size"]:
            self._input_log = self._input_log[-self.config["event_log_size"]:]
        return {"success": True, "event": event}

    def mouse_click(self, button: str = "left", x: int = 0, y: int = 0) -> dict:
        """Отправляет клик мыши."""
        from datetime import datetime
        event = {
            "type": "mouse_click",
            "button": button,
            "x": x,
            "y": y,
            "timestamp": datetime.now().isoformat(),
        }
        self._input_log.append(event)
        return {"success": True, "event": event}

    def mouse_move(self, x: int, y: int) -> dict:
        """Отправляет перемещение мыши."""
        from datetime import datetime
        event = {
            "type": "mouse_move",
            "x": x,
            "y": y,
            "timestamp": datetime.now().isoformat(),
        }
        self._input_log.append(event)
        return {"success": True, "event": event}

    def mouse_scroll(self, delta: int) -> dict:
        """Отправляет прокрутку."""
        from datetime import datetime
        event = {
            "type": "mouse_scroll",
            "delta": delta,
            "timestamp": datetime.now().isoformat(),
        }
        self._input_log.append(event)
        return {"success": True, "event": event}

    def get_input_log(self) -> dict:
        """Возвращает лог событий ввода."""
        return {
            "success": True,
            "log": self._input_log,
            "total_events": len(self._input_log),
        }

    def clear_input_log(self) -> dict:
        """Очищает лог событий."""
        self._input_log.clear()
        return {"success": True, "message": "Input log cleared"}

    def _generate_keyboard_html(self) -> str:
        """Генерирует HTML страницу виртуальной клавиатуры."""
        return """<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Virtual Keyboard — NeuroConstructor</title>
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
            border-bottom: 1px solid #2a2a3e;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        header h1 { font-size: 18px; color: #7c6ff7; }
        header .status { font-size: 13px; color: #4caf50; display: flex; align-items: center; gap: 8px; }
        header .status::before { content: ''; width: 8px; height: 8px; background: #4caf50; border-radius: 50%; display: inline-block; }
        .container { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        .output-area {
            margin: 20px 24px 0;
            background: #121220;
            border: 1px solid #1e1e30;
            border-radius: 8px;
            padding: 16px;
            min-height: 80px;
            max-height: 120px;
            overflow-y: auto;
            font-family: 'Consolas', monospace;
            font-size: 14px;
            color: #e8e8e8;
            word-break: break-all;
        }
        .keyboard-wrapper {
            flex: 1;
            padding: 20px 24px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            justify-content: center;
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
        .key:hover { background: #2a2a4e; border-color: #7c6ff7; }
        .key:active, .key.pressed { background: #7c6ff7; border-color: #9d8fff; transform: scale(0.95); }
        .key.wide { min-width: 72px; font-size: 11px; }
        .key.extra-wide { min-width: 100px; font-size: 11px; }
        .bottom-panel {
            background: #1a1a2e;
            border-top: 1px solid #2a2a3e;
            padding: 16px 24px;
        }
        .log-title { font-size: 12px; color: #8888aa; margin-bottom: 8px; text-transform: uppercase; }
        .event-log {
            max-height: 100px;
            overflow-y: auto;
            font-family: 'Consolas', monospace;
            font-size: 11px;
            color: #8888aa;
        }
        .event-log .event { padding: 2px 0; border-bottom: 1px solid #0f0f1a; }
        .event-log .timestamp { color: #555; }
        .event-log .type { color: #7c6ff7; margin: 0 8px; }
        .event-log .value { color: #4caf50; }
        footer {
            background: #0f0f1a;
            padding: 8px 24px;
            font-size: 11px;
            color: #555;
            text-align: center;
            border-top: 1px solid #1a1a2e;
        }
    </style>
</head>
<body>
    <header>
        <h1>⌨️ Virtual Keyboard</h1>
        <div class="status">Active</div>
    </header>
    <div class="container">
        <div class="output-area" id="output"></div>
        <div class="keyboard-wrapper">
            <div id="keyboard"></div>
        </div>
    </div>
    <div class="bottom-panel">
        <div class="log-title">Event Log</div>
        <div class="event-log" id="eventLog">
            <div class="event"><span class="timestamp">[--:--:--]</span><span class="type">SYSTEM</span><span class="value">Keyboard initialized</span></div>
        </div>
    </div>
    <footer>Virtual Input Plugin — NeuroConstructor</footer>

    <script>
        const layout = [
            ['1','2','3','4','5','6','7','8','9','0','-','=','Backspace'],
            ['Tab','q','w','e','r','t','y','u','i','o','p','[',']','\\'],
            ['Caps','a','s','d','f','g','h','j','k','l',';',"'",'Enter'],
            ['Shift','z','x','c','v','b','n','m',',','.','/','Shift'],
            ['Ctrl','Win','Alt',' ','Alt','Win','Menu','Ctrl']
        ];

        const keyNames = {
            'Backspace':'⌫','Tab':'⇥','Caps':'⇪','Enter':'↵',
            'Shift':'⇧','Ctrl':'Ctrl','Win':'⊞','Alt':'Alt','Menu':'☰',' ':'SPACE'
        };

        let text = '';

        const kb = document.getElementById('keyboard');
        layout.forEach(row => {
            const rowEl = document.createElement('div');
            rowEl.className = 'keyboard-row';
            row.forEach(key => {
                const k = document.createElement('div');
                k.className = 'key';
                k.textContent = keyNames[key] || key;
                k.dataset.key = key;
                if (['Backspace','Tab','Caps','Enter','Shift','Ctrl','Alt'].includes(key)) k.classList.add('wide');
                if (key === ' ') { k.classList.add('extra-wide'); k.style.minWidth = '250px'; }
                k.addEventListener('mousedown', () => handlePress(key, true));
                k.addEventListener('mouseup', () => handlePress(key, false));
                rowEl.appendChild(k);
            });
            kb.appendChild(rowEl);
        });

        function handlePress(key, down) {
            const el = document.querySelector(`[data-key="${key}"]`);
            if (el) el.classList.toggle('pressed', down);
            const now = new Date().toLocaleTimeString();
            if (down) {
                if (key === 'Backspace') { text = text.slice(0, -1); }
                else if (key === 'Enter') { text += '\\n'; log('KEY', '\\n (Enter)'); }
                else if (key === 'Tab') { text += '    '; log('KEY', 'Tab'); }
                else if (['Caps','Shift','Ctrl','Alt','Win','Menu'].includes(key)) { log('MOD', key); }
                else if (key === ' ') { text += ' '; log('KEY', 'SPACE'); }
                else { text += key; log('KEY', key); }
            }
            document.getElementById('output').textContent = text || 'Type here...';
        }

        function log(type, value) {
            const log = document.getElementById('eventLog');
            const now = new Date().toLocaleTimeString();
            const el = document.createElement('div');
            el.className = 'event';
            el.innerHTML = `<span class="timestamp">[${now}]</span><span class="type">${type}</span><span class="value">${value}</span>`;
            log.appendChild(el);
            log.scrollTop = log.scrollHeight;
        }

        document.addEventListener('keydown', (e) => { e.preventDefault(); handlePress(e.key, true); });
        document.addEventListener('keyup', (e) => { handlePress(e.key, false); });
    </script>
</body>
</html>"""

    def get_ui_config(self):
        """Конфигурация для UI."""
        return {
            "keyboard_layout": self.config["keyboard_layout"],
            "auto_capitalize": self.config["auto_capitalize"],
            "show_virtual_cursor": self.config["show_virtual_cursor"],
            "capture_global_input": self.config["capture_global_input"],
            "event_log_size": self.config["event_log_size"],
        }

    def execute(self, context):
        """Главный метод вызова плагина."""
        method = context.config.get('method', 'get_ui_config')
        args = context.config.get('args', {})

        method_map = {
            'open_keyboard': lambda: self.open_keyboard(),
            'close_keyboard': lambda: self.close_keyboard(),
            'send_key': lambda: self.send_key(args.get('key', '')),
            'send_text': lambda: self.send_text(args.get('text', '')),
            'mouse_click': lambda: self.mouse_click(args.get('button', 'left'), args.get('x', 0), args.get('y', 0)),
            'mouse_move': lambda: self.mouse_move(args.get('x', 0), args.get('y', 0)),
            'mouse_scroll': lambda: self.mouse_scroll(args.get('delta', 0)),
            'get_input_log': lambda: self.get_input_log(),
            'clear_input_log': lambda: self.clear_input_log(),
            'get_ui_config': lambda: self.get_ui_config(),
        }

        handler = method_map.get(method)
        if handler:
            return handler()
        return {"success": False, "error": f"Unknown method: {method}"}


# Глобальный инстанс
from datetime import datetime
instance = VirtualInputPlugin()
