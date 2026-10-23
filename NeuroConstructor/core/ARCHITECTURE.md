# 🏗️ ARCHITECTURE - NeuroConstructor

```mermaid
graph TB
    subgraph C# UI [C# WPF UI]
        MW[MainWindow]
        ModW[ModelWindow]
        VizW[VizWindow]
    end
    
    subgraph gRPC [gRPC localhost:50051]
        NS[NeuroService]
        MS[ModelService]
        DS[DatasetService]
        AS[AgentService]
    end
    
    subgraph Python [Python Core]
        Engine[engine.py]
        Plugin[plugin_system.py]
        Testing[testing/]
        AI[ai_plugin.py]
        AutoFix[auto_fix_engine.py]
    end
    
    subgraph Storage [Storage]
        Models[models/]
        Datasets[datasets/]
        Reports[reports/]
    end
    
    MW --> NS
    NS --> Engine
    Engine --> Plugin
    Plugin --> AI
    AI --> AutoFix
    Engine --> Storage
```

## 📋 Protocol Definitions

### Service: NeuroService
- `Chat` → echo + history
- `GetStatus` → model_loaded, model_path, gpu_layers
- `ListModels` → список загруженных моделей

### Service: DatasetService (NEW - Stage 5+)
- `ListTemplates`, `CreateDataset`

### Service: ModelService (Stage 4-5)
- `CreateEmptyGGUF`, `SaveModel`, `Prune`, `ExportModel`

### Plugin System
- `PluginCategory` (10 типов)
- `PluginStatus` (6 статусов)
- `PluginInterface` → `execute()`
- `PluginManager` → `register()`, `execute()`, `cleanup()`

## 🔧 Recent Changes (Stage 5-6)

| File | Change | Status |
|---|---|---|
| `plugin_system.py` | Полная реализация плагиновой системы | ✅ Complete |
| `ai_plugin.py` | AI Prediction Plugin (Stage 6) | ✅ Created |
| `auto_fix_engine.py` | AutoFix Engine (Stage 6) | ✅ Created |
| `testing/*.py` | 3 файла тестовой инфраструктуры | ✅ Created |
| `PROJECT_STATUS_REPORT.md` | Обновлён с 🚀 Перспективами | ✅ Updated |
