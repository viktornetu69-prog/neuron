/**
 * Plugin Manager v2 — Управление плагинами с hot-reload
 * Интеграция с новой плагинной системой (plugin_registry.py)
 * 
 * Плагин может быть:
 * 1. Python файл (.py) в директории plugins/builtin/ или plugins/custom/
 * 2. Управляется через backend plugin registry
 * 
 * Hot-reload работает через:
 * - FS Watch для отслеживания изменений
 * - IPC события для обновления React UI
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class PluginManager {
  constructor() {
    this.plugins = new Map();
    
    // Директория встроенных плагинов
    this.builtinDir = path.join(__dirname, '..', 'plugins', 'builtin');
    // Директория пользовательских плагинов
    this.customDir = path.join(__dirname, '..', 'plugins', 'custom');
    
    this.watcher = null;
    this.isInitialized = false;

    // Создаём директории если нет
    [this.builtinDir, this.customDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Инициализация и запуск watcher
   */
  async initialize() {
    if (this.isInitialized) return;

    // Сканируем оба каталога
    await this.scanPlugins(this.builtinDir, true);
    await this.scanPlugins(this.customDir, false);

    // Запускаем FS Watch для hot-reload
    this.startWatcher();
    this.isInitialized = true;

    console.log('PluginManager v2 initialized');
    console.log(`  Builtin plugins: ${this.builtinDir}`);
    console.log(`  Custom plugins: ${this.customDir}`);
  }

  /**
   * Запуск FS Watch для отслеживания изменений
   */
  startWatcher() {
    if (this.watcher) {
      this.watcher.close();
    }

    // Смотрим за custom plugins (builtin меняются редко)
    this.watcher = fs.watch(this.customDir, { recursive: true }, (eventType, filename) => {
      if (filename && filename.endsWith('.py') && !filename.startsWith('_')) {
        const pluginName = filename.replace('.py', '');
        console.log(`Plugin file changed: ${filename}`);
        this.reloadPluginByName(pluginName);
      }
    });
  }

  /**
   * Сканирование директории и загрузка плагинов
   */
  async scanPlugins(directory, isBuiltin) {
    try {
      const files = fs.readdirSync(directory);
      const pyFiles = files.filter(f => f.endsWith('.py') && !f.startsWith('__') && !f.startsWith('.'));

      for (const file of pyFiles) {
        const pluginName = file.replace('.py', '');
        const pluginPath = path.join(directory, file);
        await this.loadPlugin(pluginPath, pluginName, isBuiltin);
      }
    } catch (error) {
      console.error(`Error scanning ${directory}:`, error);
    }
  }

  /**
   * Загрузка плагина через Python subprocess
   */
  async loadPlugin(pluginPath, pluginName, isBuiltin = false) {
    try {
      const loaderScript = `
import sys
import importlib.util
import json

plugin_path = "${pluginPath}"
spec = importlib.util.spec_from_file_location("${pluginName}", plugin_path)
module = importlib.util.module_from_spec(spec)
sys.modules["${pluginName}"] = module
spec.loader.exec_module(module)

# Извлекаем метаданные плагина
metadata = {
    "id": getattr(module, "PLUGIN_ID", "${pluginName}"),
    "name": getattr(module, "PLUGIN_NAME", "${pluginName}"),
    "version": getattr(module, "PLUGIN_VERSION", "1.0.0"),
    "description": getattr(module, "PLUGIN_DESCRIPTION", ""),
    "category": getattr(module, "PLUGIN_CATEGORY", "utility"),
    "has_ui": getattr(module, "HAS_UI_COMPONENT", False),
    "ui_position": getattr(module, "UI_POSITION", "main_panel"),
    "sidebar_icon": getattr(module, "SIDEBAR_ICON", "🔌"),
    "sidebar_label": getattr(module, "SIDEBAR_LABEL", getattr(module, "PLUGIN_NAME", "${pluginName}")),
    "is_builtin": ${isBuiltin},
    "enabled_by_default": getattr(module, "ENABLED_BY_DEFAULT", True),
    "capabilities": getattr(module, "CAPABILITIES", []),
    "dependencies": getattr(module, "DEPENDENCIES", "[]"),
}

print(json.dumps(metadata))
`;

      const pythonPath = process.env.PYTHON_PATH || 'python';
      const child = spawn(pythonPath, ['-c', loaderScript], {
        timeout: 5000,
        cwd: path.join(__dirname, '..', 'core'),
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => { stdout += data.toString(); });
      child.stderr.on('data', (data) => { stderr += data.toString(); });

      return new Promise((resolve) => {
        child.on('close', (code) => {
          if (code === 0 && stdout) {
            try {
              const metadata = JSON.parse(stdout.trim());
              const pluginId = metadata.id || pluginName;
              
              this.plugins.set(pluginId, {
                path: pluginPath,
                id: pluginId,
                name: metadata.name,
                version: metadata.version,
                description: metadata.description,
                category: metadata.category,
                hasUI: metadata.has_ui,
                uiPosition: metadata.ui_position,
                sidebarIcon: metadata.sidebar_icon,
                sidebarLabel: metadata.sidebar_label,
                isBuiltin: metadata.is_builtin,
                enabledByDefault: metadata.enabled_by_default,
                capabilities: metadata.capabilities,
                dependencies: metadata.dependencies,
                lastModified: fs.statSync(pluginPath).mtime,
              });
              console.log(`✅ Plugin loaded: ${metadata.name} (builtin: ${metadata.is_builtin})`);
              resolve(metadata);
            } catch (e) {
              console.error('Error parsing plugin metadata:', e);
              resolve(null);
            }
          } else {
            console.error(`Failed to load plugin ${pluginName}: ${stderr}`);
            resolve(null);
          }
        });

        child.on('error', (error) => {
          console.error(`Error running plugin loader: ${error.message}`);
          resolve(null);
        });
      });
    } catch (error) {
      console.error(`Error loading plugin ${pluginName}:`, error);
      return null;
    }
  }

  /**
   * Получение списка всех плагинов
   */
  getPlugins() {
    const result = [];
    for (const [id, plugin] of this.plugins.entries()) {
      result.push({
        id: plugin.id,
        name: plugin.name,
        version: plugin.version,
        description: plugin.description,
        category: plugin.category,
        capabilities: plugin.capabilities,
        has_ui: plugin.hasUI,
        ui_position: plugin.uiPosition,
        sidebar_icon: plugin.sidebarIcon,
        sidebar_label: plugin.sidebarLabel,
        is_builtin: plugin.isBuiltin,
        enabled: plugin.enabledByDefault,
        file_path: plugin.path,
        dependencies: plugin.dependencies,
      });
    }
    return result;
  }

  /**
   * Переключение состояния плагина (вкл/выкл)
   * Реальная логика выполняется через Python backend
   */
  async togglePlugin(pluginId) {
    return {
      success: true,
      message: `Plugin ${pluginId} toggled (state managed by backend)`,
      pluginId,
    };
  }

  /**
   * Перезагрузка плагина
   */
  async reloadPluginByName(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;

    // Проверяем, изменился ли файл
    try {
      const newModified = fs.statSync(plugin.path).mtime;
      if (newModified.getTime() === plugin.lastModified.getTime()) return;
    } catch (e) {
      return;
    }

    // Перезагружаем
    this.plugins.delete(pluginId);
    await this.loadPlugin(plugin.path, pluginId, plugin.isBuiltin);
    this.notifyUI();
  }

  /**
   * Уведомление UI об обновлении
   */
  notifyUI() {
    // Отправляем событие через IPC
    if (typeof ipcRenderer !== 'undefined') {
      ipcRenderer.send('plugin-list-updated');
    }
    console.log('Plugin list updated');
  }

  /**
   * Создание пользовательского плагина
   */
  async createPlugin(pluginData) {
    try {
      const pluginCode = this.generatePluginCode(pluginData);
      const pluginPath = path.join(this.customDir, `${pluginData.id}.py`);

      fs.writeFileSync(pluginPath, pluginCode);

      // Загружаем плагин
      await this.loadPlugin(pluginPath, pluginData.id, false);
      this.notifyUI();

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Генерация кода Python плагина
   */
  generatePluginCode(pluginData) {
    return `"""
${pluginData.description || 'Custom plugin'}
"""

PLUGIN_ID = "${pluginData.id}"
PLUGIN_NAME = "${pluginData.name || pluginData.id}"
PLUGIN_VERSION = "${pluginData.version || '1.0.0'}"
PLUGIN_DESCRIPTION = "${pluginData.description || ''}"
PLUGIN_CATEGORY = "${pluginData.category || 'utility'}"
HAS_UI_COMPONENT = ${pluginData.hasUI ? 'True' : 'False'}
UI_POSITION = "${pluginData.uiPosition || 'main_panel'}"
SIDEBAR_ICON = "${pluginData.sidebarIcon || '🔌'}"
SIDEBAR_LABEL = "${pluginData.sidebarLabel || pluginData.name}"
ENABLED_BY_DEFAULT = ${pluginData.enabled !== false}
IS_BUILTIN = False
CAPABILITIES = ${JSON.stringify(pluginData.capabilities || [])}
DEPENDENCIES = ${JSON.stringify(pluginData.dependencies || [])}


class ${pluginData.id.charAt(0).toUpperCase() + pluginData.id.slice(1)}Plugin:
    """Custom plugin implementation"""

    def __init__(self):
        self.enabled = True
        self.config = {}

    def on_enable(self):
        return {"success": True}

    def on_disable(self):
        pass

    def get_ui_config(self):
        return {"status": "ok", "plugin_id": "${pluginData.id}"}

    def execute(self, context):
        method = context.config.get('method', 'get_ui_config')
        args = context.config.get('args', {})
        return {"success": True, "method": method, "args": args}


# Global instance
instance = ${pluginData.id.charAt(0).toUpperCase() + pluginData.id.slice(1)}Plugin()
`;
  }

  /**
   * Удаление пользовательского плагина
   */
  async removePlugin(pluginId) {
    const pluginPath = path.join(this.customDir, `${pluginId}.py`);
    if (fs.existsSync(pluginPath)) {
      fs.unlinkSync(pluginPath);
      this.plugins.delete(pluginId);
      this.notifyUI();
      return { success: true };
    }
    return { success: false, error: 'Plugin not found' };
  }
}

module.exports = PluginManager;
