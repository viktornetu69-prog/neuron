# -*- coding: utf-8 -*-
"""
NeuroConstructor REST API Server
"""

import sys
import os
import logging
from contextlib import asynccontextmanager
from typing import List, Dict, Any, Optional

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "NeuroConstructor.Core", "core"))

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from engine_rest import RESTEngine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ChatRequest(BaseModel):
    message: str
    history: Optional[list] = []

class ChatResponse(BaseModel):
    message: str
    is_error: bool = False
    error_detail: str = ""

class StatusResponse(BaseModel):
    model_loaded: bool = False
    model_path: Optional[str] = None
    gpu_layers: int = 0
    server_status: str = "running"
    components: Dict[str, str] = {}

class LoadTeacherRequest(BaseModel):
    model_path: str

class LoadTeacherResponse(BaseModel):
    status: str
    model_info: str = ""
    quality_score: float = 0.0
    error_message: str = ""

class CreateStudentRequest(BaseModel):
    teacher_model_path: str

class StudentArchitectureRequest(BaseModel):
    model_family: str = "qwen3"
    hidden_size: int = 768
    num_layers: int = 12
    num_heads: int = 12
    num_kv_heads: int = 12
    vocab_size: int = 32000
    max_position_embeddings: int = 2048
    rope_theta: float = 10000.0
    head_dim: int = 64

class CreateStudentResponse(BaseModel):
    status: str
    student_model_info: str = ""
    compression_applied: bool = False
    error_message: str = ""

class ConvertRequest(BaseModel):
    teacher_path: str
    student_path: str

class ConvertResponse(BaseModel):
    status: str
    conversion_results: str = ""
    compression_ratio: float = 0.0
    quality_score: float = 0.0
    error_message: str = ""

class ValidateRequest(BaseModel):
    teacher_model: str
    student_model: str

class ValidateResponse(BaseModel):
    is_valid: bool = False
    validation_results: str = ""
    quality_score: float = 0.0
    compatibility_score: float = 0.0
    error_message: str = ""

class Stage6AIRequest(BaseModel):
    metrics: Dict[str, float] = {}

class Stage6AIResponse(BaseModel):
    predicted_performance: float = 0.0
    status: str = ""
    recommendations: List[str] = []
    ml_version: str = ""

class Stage6ForecastRequest(BaseModel):
    forecast_horizon: int = 5

class Stage6ForecastResponse(BaseModel):
    predicted_loads: List[float] = []
    status: str = ""
    forecast_timestamp: str = ""

class Stage6AutoFixRequest(BaseModel):
    error_type: str = ""
    error_data: str = ""

class Stage6AutoFixResponse(BaseModel):
    status: str = ""
    fixes_applied: List[str] = []
    timestamp: str = ""

class Stage6SelfLearnRequest(BaseModel):
    results: List[Dict[str, Any]] = []

class Stage6SelfLearnResponse(BaseModel):
    success: bool = False
    timestamp: str = ""
    stats: Dict[str, Any] = {}

class Stage6FullCycleRequest(BaseModel):
    metrics: Dict[str, float] = {}

class Stage6FullCycleResponse(BaseModel):
    success: bool = False
    timestamp: str = ""
    ai: Optional[Stage6AIResponse] = None
    forecast: Optional[Stage6ForecastResponse] = None
    auto_fix: Optional[Stage6AutoFixResponse] = None
    self_learning: Optional[Stage6SelfLearnResponse] = None

class ModelFileInfo(BaseModel):
    filename: str
    path: str
    size: int
    modified: str

class ModelListResponse(BaseModel):
    status: str
    files: List[ModelFileInfo] = []

server_state = {
    "engine": None,
    "model_loaded": False,
    "model_path": None,
    "model_info": None,
}

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("REST API starting...")
    try:
        server_state["engine"] = RESTEngine()
        server_state["model_loaded"] = False
        server_state["model_path"] = None
        logger.info("Engine initialized")
    except Exception as e:
        logger.error(f"Failed to initialize engine: {e}")
    yield
    logger.info("REST API shutting down...")

app = FastAPI(title="NeuroConstructor API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "model_loaded": server_state["model_loaded"],
        "model_path": server_state["model_path"],
    }

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    if not server_state["engine"]:
        raise HTTPException(status_code=503, detail="Engine not initialized")
    try:
        response = server_state["engine"].chat(request.message, request.history)
        return ChatResponse(message=response, is_error=False)
    except Exception as e:
        logger.error(f"Chat error: {e}")
        return ChatResponse(message=str(e), is_error=True)

@app.get("/api/status", response_model=StatusResponse)
async def get_status():
    components = {
        "model_loader": "ready",
        "model_converter": "ready",
        "quality_assurance": "ready",
        "dataset_processor": "ready",
        "inference": "ready",
        "stage6": "ready",
    }
    return StatusResponse(
        model_loaded=server_state["model_loaded"],
        model_path=server_state["model_path"],
        server_status="running",
        components=components,
    )

@app.post("/api/models/teacher", response_model=LoadTeacherResponse)
async def load_teacher_model(request: LoadTeacherRequest):
    if not server_state["engine"]:
        raise HTTPException(status_code=503, detail="Engine not initialized")
    try:
        result = server_state["engine"].load_teacher_model(request.model_path)
        server_state["model_loaded"] = True
        server_state["model_path"] = request.model_path
        return LoadTeacherResponse(
            status=result.get("status", "loaded"),
            model_info=result.get("info", ""),
            quality_score=result.get("quality_score", 0.0),
        )
    except Exception as e:
        logger.error(f"Load teacher error: {e}")
        return LoadTeacherResponse(status="error", error_message=str(e))

@app.post("/api/models/student", response_model=CreateStudentResponse)
async def create_student_model(request: CreateStudentRequest):
    if not server_state["engine"]:
        raise HTTPException(status_code=503, detail="Engine not initialized")
    try:
        result = server_state["engine"].create_student_model(request.teacher_model_path)
        return CreateStudentResponse(
            status=result.get("status", "created"),
            student_model_info=result.get("student_model_info", ""),
            compression_applied=result.get("compression_applied", False),
        )
    except Exception as e:
        logger.error(f"Create student error: {e}")
        return CreateStudentResponse(status="error", error_message=str(e))

@app.post("/api/models/student/scratch", response_model=CreateStudentResponse)
async def create_student_from_scratch(request: StudentArchitectureRequest):
    """Создать Student модель с нуля по параметрам архитектуры"""
    if not server_state["engine"]:
        raise HTTPException(status_code=503, detail="Engine not initialized")
    try:
        # Генерируем JSON конфиг Student архитектуры
        import json
        import os
        from datetime import datetime
        
        student_config = {
            "architecture": {
                "model_family": request.model_family,
                "hidden_size": request.hidden_size,
                "num_layers": request.num_layers,
                "num_heads": request.num_heads,
                "num_kv_heads": request.num_kv_heads,
                "vocab_size": request.vocab_size,
                "max_position_embeddings": request.max_position_embeddings,
                "rope_theta": request.rope_theta,
                "head_dim": request.head_dim,
            },
            "created_at": datetime.now().isoformat(),
            "type": "student_template",
        }
        
        # Сохраняем конфиг
        student_dir = "models/student"
        os.makedirs(student_dir, exist_ok=True)
        
        filename = f"{request.model_family}_student_{request.hidden_size}x{request.num_layers}_{int(datetime.now().timestamp())}.json"
        filepath = os.path.join(student_dir, filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(student_config, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Student model created from scratch: {filepath}")
        
        return CreateStudentResponse(
            status="created",
            student_model_info=f"Student {request.model_family} created: {request.hidden_size}h x {request.num_layers}L x {request.num_heads}H",
            compression_applied=False,
        )
    except Exception as e:
        logger.error(f"Create student from scratch error: {e}")
        return CreateStudentResponse(status="error", error_message=str(e))

@app.post("/api/models/convert", response_model=ConvertResponse)
async def convert_model(request: ConvertRequest):
    if not server_state["engine"]:
        raise HTTPException(status_code=503, detail="Engine not initialized")
    try:
        result = server_state["engine"].convert_model(request.teacher_path, request.student_path)
        return ConvertResponse(
            status=result.get("status", "converted"),
            conversion_results=result.get("results", ""),
            compression_ratio=result.get("compression_ratio", 0.0),
            quality_score=result.get("quality_score", 0.0),
        )
    except Exception as e:
        logger.error(f"Convert error: {e}")
        return ConvertResponse(status="error", error_message=str(e))

@app.post("/api/models/validate", response_model=ValidateResponse)
async def validate_model(request: ValidateRequest):
    if not server_state["engine"]:
        raise HTTPException(status_code=503, detail="Engine not initialized")
    try:
        result = server_state["engine"].validate_model(request.teacher_model, request.student_model)
        return ValidateResponse(
            is_valid=result.get("is_valid", False),
            quality_score=result.get("quality_score", 0.0),
            compatibility_score=result.get("compatibility_score", 0.0),
        )
    except Exception as e:
        logger.error(f"Validate error: {e}")
        return ValidateResponse(error_message=str(e))

@app.post("/api/stage6/ai", response_model=Stage6AIResponse)
async def stage6_ai(request: Stage6AIRequest):
    if not server_state["engine"]:
        raise HTTPException(status_code=503, detail="Engine not initialized")
    try:
        result = server_state["engine"].stage6_ai(request.metrics)
        return Stage6AIResponse(**result)
    except Exception as e:
        logger.error(f"Stage6 AI error: {e}")
        return Stage6AIResponse(status="error")

@app.post("/api/stage6/forecast", response_model=Stage6ForecastResponse)
async def stage6_forecast(request: Stage6ForecastRequest):
    if not server_state["engine"]:
        raise HTTPException(status_code=503, detail="Engine not initialized")
    try:
        result = server_state["engine"].stage6_forecast(request.forecast_horizon)
        return Stage6ForecastResponse(**result)
    except Exception as e:
        logger.error(f"Stage6 Forecast error: {e}")
        return Stage6ForecastResponse(status="error")

@app.post("/api/stage6/auto-fix", response_model=Stage6AutoFixResponse)
async def stage6_auto_fix(request: Stage6AutoFixRequest):
    if not server_state["engine"]:
        raise HTTPException(status_code=503, detail="Engine not initialized")
    try:
        result = server_state["engine"].stage6_auto_fix(request.error_type, request.error_data)
        return Stage6AutoFixResponse(**result)
    except Exception as e:
        logger.error(f"Stage6 AutoFix error: {e}")
        return Stage6AutoFixResponse(status="error")

@app.post("/api/stage6/self-learning", response_model=Stage6SelfLearnResponse)
async def stage6_self_learning(request: Stage6SelfLearnRequest):
    if not server_state["engine"]:
        raise HTTPException(status_code=503, detail="Engine not initialized")
    try:
        result = server_state["engine"].stage6_self_learn(request.results)
        return Stage6SelfLearnResponse(**result)
    except Exception as e:
        logger.error(f"Stage6 SelfLearning error: {e}")
        return Stage6SelfLearnResponse(status="error")

@app.post("/api/stage6/full-cycle", response_model=Stage6FullCycleResponse)
async def stage6_full_cycle(request: Stage6FullCycleRequest):
    if not server_state["engine"]:
        raise HTTPException(status_code=503, detail="Engine not initialized")
    try:
        result = server_state["engine"].stage6_full_cycle(request.metrics)
        return Stage6FullCycleResponse(**result)
    except Exception as e:
        logger.error(f"Stage6 FullCycle error: {e}")
        return Stage6FullCycleResponse(success=False)

@app.get("/api/datasets/templates")
async def list_templates():
    if not server_state["engine"]:
        raise HTTPException(status_code=503, detail="Engine not initialized")
    try:
        result = server_state["engine"].list_templates()
        return {"templates": result.get("templates", [])}
    except Exception as e:
        logger.error(f"List templates error: {e}")
        return {"templates": []}

@app.post("/api/datasets/create")
async def create_dataset(template_name: str = "default", count: int = 10):
    if not server_state["engine"]:
        raise HTTPException(status_code=503, detail="Engine not initialized")
    try:
        result = server_state["engine"].create_dataset(template_name, count)
        return result
    except Exception as e:
        logger.error(f"Create dataset error: {e}")
        return {"error": str(e)}

@app.post("/api/datasets/analyze")
async def analyze_dataset(request: Dict[str, str]):
    """Анализ датасета (Stage 3)"""
    if not server_state["engine"]:
        raise HTTPException(status_code=503, detail="Engine not initialized")
    try:
        dataset_path = request.get("dataset_path", "")
        result = server_state["engine"].analyze_dataset(dataset_path)
        return result
    except Exception as e:
        logger.error(f"Analyze dataset error: {e}")
        return {"success": False, "error": str(e)}

@app.get("/api/datasets/preview")
async def get_dataset_preview(path: str, rows: int = 5):
    """Предварительный просмотр датасета (Stage 3)"""
    if not server_state["engine"]:
        raise HTTPException(status_code=503, detail="Engine not initialized")
    try:
        result = server_state["engine"].get_dataset_preview(path, rows)
        return result
    except Exception as e:
        logger.error(f"Dataset preview error: {e}")
        return {"rows": [], "error": str(e)}

@app.post("/api/datasets/activations")
async def analyze_activations(request: Dict[str, Any]):
    """Анализ активаций нейронной сети (Stage 3)"""
    if not server_state["engine"]:
        raise HTTPException(status_code=503, detail="Engine not initialized")
    try:
        dataset_id = request.get("dataset_id", "")
        model_path = request.get("model_path", "")
        layer_names = request.get("layer_names", [])
        result = server_state["engine"].analyze_activations(dataset_id, model_path, layer_names)
        return result
    except Exception as e:
        logger.error(f"Activations analysis error: {e}")
        return {"success": False, "error": str(e)}

# ============================================
# Model file management endpoints
# ============================================

@app.get("/api/models/list")
async def list_model_files(directory: str = "teacher"):
    """Получить список файлов в директории моделей"""
    if not server_state["engine"]:
        raise HTTPException(status_code=503, detail="Engine not initialized")
    try:
        result = server_state["engine"].list_model_files(directory)
        return result
    except Exception as e:
        logger.error(f"List models error: {e}")
        return {"status": "error", "files": []}

@app.post("/api/models/upload")
async def upload_model(file: UploadFile = File(...), directory: str = "teacher"):
    """Загрузка модели в директорию"""
    if not server_state["engine"]:
        raise HTTPException(status_code=503, detail="Engine not initialized")
    try:
        file_data = await file.read()
        result = server_state["engine"].upload_model(
            file_data=file_data,
            filename=file.filename,
            directory=directory,
        )
        return result
    except Exception as e:
        logger.error(f"Upload error: {e}")
        return {"status": "error", "error_message": str(e)}

@app.get("/api/models/teacher")
async def get_teacher_models():
    """Получить список Teacher моделей"""
    if not server_state["engine"]:
        raise HTTPException(status_code=503, detail="Engine not initialized")
    try:
        result = server_state["engine"].list_model_files("teacher")
        return {"models": result.get("files", [])}
    except Exception as e:
        logger.error(f"Get teacher models error: {e}")
        return {"models": []}

@app.get("/api/models/student")
async def get_student_models():
    """Получить список Student моделей"""
    if not server_state["engine"]:
        raise HTTPException(status_code=503, detail="Engine not initialized")
    try:
        result = server_state["engine"].list_model_files("student")
        return {"models": result.get("files", [])}
    except Exception as e:
        logger.error(f"Get student models error: {e}")
        return {"models": []}

@app.get("/api/models/teacher/{filename}")
async def analyze_teacher_model(filename: str):
    """Анализ архитектуры Teacher модели"""
    if not server_state["engine"]:
        raise HTTPException(status_code=503, detail="Engine not initialized")
    try:
        result = server_state["engine"].analyze_teacher_model(filename)
        return result
    except Exception as e:
        logger.error(f"Analyze teacher error: {e}")
        return {"status": "error", "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
