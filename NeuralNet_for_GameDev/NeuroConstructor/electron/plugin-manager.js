/**
 * Plugin Manager - Управление плагинами с hot-reload
 * 
 * Плагин может быть:
 * 1. Python файл (.py) в директории backend/plugins/
 * 2. JavaScript модуль (для будущего расширения)
 * 
 * Hot-reload работает через:
 * - FS Watch для отслеживания изменений
 * - importlib.reload() для Python модулей
 * - IPC событие для обновления React UI
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class PluginManager {
  constructor() {
    this.plugins = new Map();
    this.pluginDir = path.join(__dirname, '..', 'backend', 'plugins');
    this.watcher = null;
    this.isInitialized = false;
    
    // Создаём директорию плагинов если нет
    if (!fs.existsSync(this.pluginDir)) {
      fs.mkdirSync(this.pluginDir, { recursive: true });
    }
  }

  /**
   * Инициализация и запуск watcher
   */
  async initialize() {
    if (this.isInitialized) return;

    // Загружаем существующие плагины
    await this.scanPlugins();

    // Запускаем FS Watch для hot-reload
    this.startWatcher();
    this.isInitialized = true;
    
    console.log('PluginManager initialized');
  }

  /**
   * Запуск FS Watch для отслеживания изменений
   */
  startWatcher() {
    if (this.watcher) {
      this.watcher.close();
    }

    this.watcher = fs.watch(this.pluginDir, { recursive: true }, (eventType, filename) => {
      if (filename && filename.endsWith('.py')) {
        console.log(`Plugin file changed: ${filename}`);
        this.reloadPluginByName(filename.replace('.py', ''));
      }
    });
  }

  /**
   * Сканирование директории и загрузка плагинов
   */
  async scanPlugins() {
    try {
      const files = fs.readdirSync(this.pluginDir);
      const pyFiles = files.filter(f => f.endsWith('.py') && !f.startsWith('__'));

      for (const file of pyFiles) {
        const pluginName = file.replace('.py', '');
        const pluginPath = path.join(this.pluginDir, file);
        await this.loadPlugin(pluginPath, pluginName);
      }
    } catch (error) {
      console.error('Error scanning plugins:', error);
    }
  }

  /**
   * Загрузка плагина через Python subprocess
   * @param {string} pluginPath - Путь к файлу плагина
   * @param {string} pluginName - Имя плагина
   */
  async loadPlugin(pluginPath, pluginName) {
    try {
      // Создаём Python скрипт для загрузки плагина
      const loaderScript = `
import sys
import importlib.util
import json

plugin_path = "${pluginPath}"
spec = importlib.util.spec_from_file_location("${pluginName}", plugin_path)
module = importlib.util.module_from_spec(spec)
sys.modules["${pluginName}"] = module
spec.loader.exec_module(module)

# Получаем metadata плагина
metadata = {
    "name": getattr(module, "PLUGIN_NAME", "${pluginName}"),
    "version": getattr(module, "PLUGIN_VERSION", "1.0.0"),
    "description": getattr(module, "PLUGIN_DESCRIPTION", ""),
    "type": getattr(module, "PLUGIN_TYPE", "default"),
    "has_ui": getattr(module, "HAS_UI_COMPONENT", False),
    "capabilities": getattr(module, "CAPABILITIES", []),
}

print(json.dumps(metadata))
`;

      const pythonPath = process.env.PYTHON_PATH || 'python';
      const child = spawn(pythonPath, ['-c', loaderScript], {
        timeout: 5000,
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      return new Promise((resolve, reject) => {
        child.on('close', (code) => {
          if (code === 0 && stdout) {
            try {
              const metadata = JSON.parse(stdout.trim());
              this.plugins.set(pluginName, {
                path: pluginPath,
                name: metadata.name,
                version: metadata.version,
                description: metadata.description,
                type: metadata.type,
                hasUI: metadata.has_ui,
                capabilities: metadata.capabilities,
                module: null, // Не сохраняем в Node.js
                lastModified: fs.statSync(pluginPath).mtime,
              });
              console.log(`✅ Plugin loaded: ${metadata.name}`);
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
   * Ручная регистрация плагина (из React)
   */
  async registerPlugin(pluginData) {
    try {
      // Создаём Python файл плагина
      const pluginCode = this.generatePluginCode(pluginData);
      const pluginPath = path.join(this.pluginDir, `${pluginData.id}.py`);
      
      fs.writeFileSync(pluginPath, pluginCode);
      
      // Загружаем плагин
      const metadata = await this.loadPlugin(pluginPath, pluginData.id);
      
      if (metadata) {
        // Отправляем событие обновления UI
        this.notifyUI();
        return { success: true, metadata };
      }
      
      return { success: false, error: 'Failed to load plugin' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Генерация кода Python плагина
   */
  generatePluginCode(pluginData) {
    return `
"""
${pluginData.description || 'Auto-generated plugin'}
"""

PLUGIN_NAME = "${pluginData.name || pluginData.id}"
PLUGIN_VERSION = "${pluginData.version || '1.0.0'}"
PLUGIN_DESCRIPTION = "${pluginData.description || ''}"
PLUGIN_TYPE = "${pluginData.type || 'default'}"
HAS_UI_COMPONENT = ${pluginData.hasUI ? 'True' : 'False'}
CAPABILITIES = ${JSON.stringify(pluginData.capabilities || [])}

class ${pluginData.id.charAt(0).toUpperCase() + pluginData.id.slice(1)}Plugin:
    """Plugin implementation"""
    
    def __init__(self):
        self.enabled = True
        self.config = {}
    
    def execute(self, data):
        """Main execution method"""
        # TODO: Implement plugin logic
        return {
            "status": "ok",
            "message": f"Plugin {PLUGIN_NAME} executed",
            "data": data
        }

def get_plugin_info():
    """Return plugin metadata"""
    return {{
        "name": PLUGIN_NAME,
        "version": PLUGIN_VERSION,
        "description": PLUGIN_DESCRIPTION,
        "type": PLUGIN_TYPE,
        "capabilities": CAPABILITIES
    }}

# Auto-instantiate
instance = ${pluginData.id.charAt(0).toUpperCase() + pluginData.id.slice(1)}Plugin()
`;
  }

  /**
   * Перезагрузка плагина
   */
  async reloadPlugin(pluginPath) {
    const pluginName = path.basename(pluginPath, '.py');
    return await this.reloadPluginByName(pluginName);
  }

  async reloadPluginByName(pluginName) {
    const pluginPath = path.join(this.pluginDir, `${pluginName}.py`);
    if (!fs.existsSync(pluginPath)) return;

    const metadata = await this.loadPlugin(pluginPath, pluginName);
    if (metadata) {
      this.notifyUI();
    }
  }

  /**
   * Удаление плагина
   */
  async removePlugin(pluginId) {
    const pluginPath = path.join(this.pluginDir, `${pluginId}.py`);
    if (fs.existsSync(pluginPath)) {
      fs.unlinkSync(pluginPath);
      this.plugins.delete(pluginId);
      this.notifyUI();
      return { success: true };
    }
    return { success: false, error: 'Plugin not found' };
  }

  /**
   * Получение списка плагинов
   */
  getPlugins() {
    return Array.from(this.plugins.values());
  }

  /**
   * Уведомление UI об обновлении
   */
  notifyUI() {
    // В реальном приложении здесь будет отправка события через IPC
    console.log('Plugin list updated');
  }
}

module.exports = PluginManager;
