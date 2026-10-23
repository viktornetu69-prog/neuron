import os
import time
import json
from typing import Dict, Any


import NeuroConstructor_pb2 as pb
import NeuroConstructor_pb2_grpc as pb_grpc

# Stage 2 Imports
from core.model_loader import ModelLoader
from core.model_converter import ModelConverter
from core.quality_assurance import QualityAssurance
from core.stage6_unified_plugin import Stage6UnifiedPlugin

# All runtime artefacts live next to the Core project so that the server behaves
# the same regardless of the current working directory.
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, "models")
STUDENT_TEMPLATE_PATH = os.path.join(MODELS_DIR, "student_template.json")
CONVERTED_MODEL_PATH = os.path.join(MODELS_DIR, "student_converted.gguf")

# Stage 3: Dataset storage
DATASETS_DIR = os.path.join(BASE_DIR, "datasets")

# Stage 6: Unified plugin for AI, Forecast, AutoFix, SelfLearning
STAGE6_PLUGIN = Stage6UnifiedPlugin({})


class NeuroServiceImplementation(pb_grpc.NeuroServiceServicer):

    def __init__(self):
        self.model_loaded = False
        self.model_path = ""
        self.model_loader = ModelLoader()
        self.model_converter = ModelConverter()
        self.quality_assurance = QualityAssurance()
        self.stage6 = STAGE6_PLUGIN
        
        # Stage 2: Model management state
        self.teacher_model_info = None
        self.student_model_info = None
        self.conversion_results = None

    def Chat(self, request, context):
        """
        Receives a chat request and returns a response.
        In MVP phase, this simply echoes the message.
        """
        last_user_msg = request.message or ""
        for msg in request.history:
            if msg.role == "user":
                last_user_msg = msg.content

        response_message = f"UI says: {last_user_msg}. Core is ready for integration."

        return pb.ChatResponse(
            message=response_message,
            is_error=False
        )

    def GetStatus(self, request, context):
        """Returns the current status of the core."""
        return pb.StatusResponse(
            model_loaded=self.model_loaded,
            model_path=self.model_path,
            gpu_layers=0
        )
    
    # ===== Stage 2: Teacher-Student Model Management =====
    


    # ===== Stage 3: Dataset Service =====

    def ListTemplates(self, request, context):
        templates = [
            {"name": "simple_chat", "kind": "text", "categories": ["chat", "instruction"],
             "count": 3, "description": "Simple chat templates"},
            {"name": "code_examples", "kind": "text", "categories": ["code", "tutorial"],
             "count": 2, "description": "Code examples"},
            {"name": "qa_pairs", "kind": "text", "categories": ["qa", "educational"],
             "count": 2, "description": "Question-answer pairs"},
        ]
        pb_template_list = []
        for t in templates:
            pb_template_list.append(pb.Template(name=t["name"], kind=t["kind"],
                categories=t["categories"], count=t["count"], description=t["description"]))
        return pb.ListTemplatesResponse(templates=pb_template_list)

    def GetTemplate(self, request, context):
        resp = self.ListTemplates(pb.ListTemplatesRequest(), context)
        for t in resp.templates:
            if t.name == request.name:
                return t
        context.set_code(grpc.StatusCode.NOT_FOUND)
        context.set_details("Template not found")
        return pb.Template()

    def CreateDataset(self, request, context):
        dataset_id = str(uuid.uuid4())[:8]
        dataset_dir = os.path.join(DATASETS_DIR, dataset_id)
        os.makedirs(dataset_dir, exist_ok=True)
        manifest = {
            "dataset_id": dataset_id,
            "template_name": request.template_name,
            "kind": "text",
            "categories": [],
            "count": request.count,
            "params": dict(request.params) if request.params else {},
            "created_at": datetime.now().isoformat(),
            "status": "ready"
        }
        manifest_path = os.path.join(dataset_dir, "manifest.json")
        with open(manifest_path, 'w') as f:
            json.dump(manifest, f, indent=2)
        for i in range(max(0, request.count)):
            ex = {
                "id": dataset_id + "_ex_" + str(i).zfill(4),
                "prompt": "Prompt " + str(i+1) + " for " + request.template_name,
                "expected": "Expected " + str(i+1),
                "kind": "text",
                "metadata": dict(request.params) if request.params else {}
            }
            ex_path = os.path.join(dataset_dir, "example_" + str(i).zfill(4) + ".json")
            with open(ex_path, 'w') as f:
                json.dump(ex, f, indent=2)
        return pb.CreateDatasetResponse(dataset_id=dataset_id, manifest_path=manifest_path)

    def AddExample(self, request, context):
        dataset_dir = os.path.join(DATASETS_DIR, request.dataset_id)
        if not os.path.exists(dataset_dir):
            context.set_code(grpc.StatusCode.NOT_FOUND)
            context.set_details("Dataset not found")
            return pb.Example()
        files = [f for f in os.listdir(dataset_dir) if f.startswith('example_') and f.endswith('.json')]
        next_idx = len(files)
        ex = {
            "id": request.dataset_id + "_ex_" + str(next_idx).zfill(4),
            "prompt": request.prompt,
            "expected": request.expected,
            "kind": "text",
            "metadata": {}
        }
        ex_path = os.path.join(dataset_dir, "example_" + str(next_idx).zfill(4) + ".json")
        with open(ex_path, 'w') as f:
            json.dump(ex, f, indent=2)
        return pb.Example(id=ex["id"], prompt=ex["prompt"], expected=ex["expected"], kind=ex["kind"], metadata=ex["metadata"])

    def ListExamples(self, request, context):
        dataset_dir = os.path.join(DATASETS_DIR, request.dataset_id)
        if not os.path.exists(dataset_dir):
            context.set_code(grpc.StatusCode.NOT_FOUND)
            context.set_details("Dataset not found")
            return pb.ListExamplesResponse()
        examples = []
        for fname in sorted(os.listdir(dataset_dir)):
            if not (fname.startswith('example_') and fname.endswith('.json')):
                continue
            with open(os.path.join(dataset_dir, fname), 'r') as f:
                ex = json.load(f)
                examples.append(pb.Example(id=ex["id"], prompt=ex["prompt"], expected=ex["expected"], kind=ex["kind"], metadata=ex.get("metadata", {})))
        total = len(examples)
        start = min(request.offset, total)
        end = min(start + request.limit, total)
        return pb.ListExamplesResponse(examples=examples[start:end], total=total)

    def ValidateDataset(self, request, context):
        dataset_dir = os.path.join(DATASETS_DIR, request.dataset_id)
        if not os.path.exists(dataset_dir):
            context.set_code(grpc.StatusCode.NOT_FOUND)
            context.set_details("Dataset not found")
            return pb.ValidateDatasetResponse(valid=False, errors=["Dataset not found"])
        manifest_path = os.path.join(dataset_dir, "manifest.json")
        if not os.path.exists(manifest_path):
            return pb.ValidateDatasetResponse(valid=False, errors=["Manifest not found"])
        with open(manifest_path, 'r') as f:
            manifest = json.load(f)
        errors = []
        if manifest.get("status") != "ready":
            errors.append("Dataset not ready")
        example_files = [f for f in os.listdir(dataset_dir) if f.startswith('example_') and f.endswith('.json')]
        expected_count = manifest.get("count", 0)
        if len(example_files) != expected_count:
            errors.append("Example count mismatch")
        return pb.ValidateDatasetResponse(valid=len(errors) == 0, errors=errors)

    def ExportDataset(self, request, context):
        dataset_dir = os.path.join(DATASETS_DIR, request.dataset_id)
        if not os.path.exists(dataset_dir):
            context.set_code(grpc.StatusCode.NOT_FOUND)
            context.set_details("Dataset not found")
            return pb.ExportDatasetResponse()
        export_path = request.path
        os.makedirs(export_path, exist_ok=True)
        import shutil
        dest_dir = os.path.join(export_path, request.dataset_id)
        if os.path.exists(dest_dir):
            shutil.rmtree(dest_dir)
        shutil.copytree(dataset_dir, dest_dir)
        return pb.ExportDatasetResponse(export_path=dest_dir, exported_count=len([f for f in os.listdir(dataset_dir) if f.endswith('.json')]))
    def LoadTeacherModel(self, request, context):
        """
        Stage 2: Loads a teacher model for conversion to student.
        
        Args:
            request: TeacherModelRequest with model_path
            
        Returns:
            TeacherModelResponse with model info and validation
        """
        teacher_path = request.model_path
        response = pb.TeacherModelResponse(
            status="success",
            model_info="",
            quality_score=0.0,
            error_message=""
        )
        
        try:
            teacher_model_info = self.model_loader.load_teacher_model(teacher_path)
            response.status = "success" if teacher_model_info.get("loaded", False) else "error"
            response.model_info = str(teacher_model_info)
            response.quality_score = 0.9 if teacher_model_info.get("loaded", False) else 0.0
            
            if teacher_model_info.get("loaded", False):
                self.teacher_model_info = teacher_model_info
                self.model_loaded = True
                self.model_path = teacher_path
            
        except Exception as e:
            response.status = "error"
            response.error_message = str(e)
            response.quality_score = 0.0
        
        return response
    
    def CreateStudentModel(self, request, context):
        """
        Stage 2: Creates a student model from teacher model architecture.
        
        Args:
            request: CreateStudentRequest with teacher_model_path
            
        Returns:
            CreateStudentResponse with student model info
        """
        teacher_path = request.teacher_model_path
        response = pb.CreateStudentResponse(
            status="success",
            student_model_info="",
            compression_applied=False,
            error_message=""
        )
        
        try:
            # Load teacher model
            teacher_model = self.model_loader.load_teacher_model(teacher_path)
            if not teacher_model.get("loaded", False):
                response.status = "error"
                response.error_message = "Teacher model not loaded successfully"
                return response
            
            # Create student template
            student_template = self.model_loader.create_student_template(
                template_path=STUDENT_TEMPLATE_PATH,
                teacher_model=teacher_model
            )
            
            if student_template.get("status") != "success":
                response.status = "error"
                response.error_message = student_template.get("error", "Failed to create student template")
                return response
            
            response.status = "success"
            response.student_model_info = str(student_template)
            response.compression_applied = True
            
            # Store student info
            self.student_model_info = student_template
            
        except Exception as e:
            response.status = "error"
            response.error_message = str(e)
            response.compression_applied = False
        
        return response
    
    def ConvertModel(self, request, context):
        """
        Stage 2: Converts teacher model to optimized student model.
        
        Args:
            request: ConvertRequest with teacher_path and student_path
            
        Returns:
            ConvertResponse with conversion results
        """
        teacher_path = request.teacher_path
        student_path = request.student_path
        response = pb.ConvertResponse(
            status="success",
            conversion_results="",
            compression_ratio=0.0,
            quality_score=0.0,
            error_message=""
        )
        
        try:
            # Perform conversion
            conversion_result = self.model_converter.convert_teacher_to_student(teacher_path, student_path)
            
            if conversion_result.get("status") == "success":
                response.status = "success"
                response.conversion_results = str(conversion_result)
                response.compression_ratio = conversion_result.get("compression_ratio", 0.0)
                response.quality_score = conversion_result.get("quality_score", 0.0)
                
                # Update state
                self.conversion_results = conversion_result
                self.model_loaded = True
                self.model_path = student_path
                self.student_model_info = conversion_result.get("model_info", {})
            
            else:
                response.status = "error"
                response.error_message = conversion_result.get("error", "Conversion failed")
            
        except Exception as e:
            response.status = "error"
            response.error_message = str(e)
        
        return response
    
    def ValidateModel(self, request, context):
        """
        Stage 2: Validates model quality and compatibility.
        
        Args:
            request: ValidateRequest with teacher_model and student_model
            
        Returns:
            ValidateResponse with validation results
        """
        teacher_path = request.teacher_model
        student_path = request.student_model
        response = pb.ValidateResponse(
            is_valid=True,
            validation_results="",
            quality_score=0.0,
            compatibility_score=0.0,
            error_message=""
        )
        
        try:
            # Load teacher and student models
            teacher_model = self.model_loader.load_teacher_model(teacher_path)

            # Fall back to the template created by CreateStudentModel when the
            # caller does not supply an existing path.
            student_source = student_path
            if not student_source or not os.path.exists(student_source):
                if os.path.exists(STUDENT_TEMPLATE_PATH):
                    student_source = STUDENT_TEMPLATE_PATH

            student_model = self.model_loader.load_student_template(student_source)
            
            # Run full validation
            validation_results = self.quality_assurance.run_full_validation(teacher_model, student_model)
            
            response.is_valid = validation_results.get("overall_valid", True)
            response.validation_results = str(validation_results)
            response.quality_score = validation_results.get("teacher", {}).get("quality_score", 0.0)
            response.compatibility_score = validation_results.get("compatibility", 0.0)
            
        except Exception as e:
            response.is_valid = False
            response.error_message = str(e)
            response.quality_score = 0.0
            response.compatibility_score = 0.0
        
        return response
    
    # ===== Stage 6: Advanced Functions - AI, Forecast, AutoFix, SelfLearning =====

    def Stage6AI(self, request, context):
        """
        Stage 6: AI-powered performance prediction.

        Args:
            request: Stage6AIRequest with metrics map (cpu_usage, memory_usage, etc.)

        Returns:
            Stage6AIResponse with prediction, status and recommendations
        """
        metrics = {k: float(v) for k, v in dict(request.metrics).items()}
        result = self.stage6.ai.predict_performance(metrics)

        return pb.Stage6AIResponse(
            predicted_performance=float(result.get("predicted_performance") or 0.0),
            status=str(result.get("status") or "unknown"),
            recommendations=list(result.get("recommendations") or []),
            ml_version=str(result.get("ml_version") or ""),
        )

    def Stage6Forecast(self, request, context):
        """
        Stage 6: Load forecasting for the requested horizon.

        Args:
            request: Stage6ForecastRequest with forecast_horizon (minutes)

        Returns:
            Stage6ForecastResponse with predicted loads and forecast timestamp
        """
        horizon = int(request.forecast_horizon) if request.forecast_horizon else 30
        forecast = self.stage6.forecast.predict_load(horizon)

        predicted_loads = [
            float(forecast.get("predicted_cpu") or 0.0),
            float(forecast.get("predicted_memory") or 0.0),
            float(forecast.get("predicted_disk") or 0.0),
            float(forecast.get("predicted_network") or 0.0),
        ]

        return pb.Stage6ForecastResponse(
            predicted_loads=predicted_loads,
            status="success",
            forecast_timestamp=str(forecast.get("forecast_time") or time.time()),
        )

    def Stage6AutoFix(self, request, context):
        """
        Stage 6: Automatic error detection and fixing.

        Args:
            request: Stage6AutoFixRequest with error_type and error_data

        Returns:
            Stage6AutoFixResponse with status and applied fixes
        """
        error_data: Dict[str, Any] = {"type": request.error_type or "unknown"}
        if request.error_data:
            try:
                parsed = json.loads(request.error_data)
                if isinstance(parsed, dict):
                    error_data = parsed
            except (ValueError, TypeError):
                pass

        fix_result = self.stage6.auto_fix.detect_and_fix_errors(error_data)

        return pb.Stage6AutoFixResponse(
            status=str(fix_result.get("status") or "pending"),
            fixes_applied=[str(f) for f in (fix_result.get("fixes_applied") or [])],
            timestamp=str(fix_result.get("timestamp") or time.time()),
        )

    def Stage6SelfLearn(self, request, context):
        """
        Stage 6: Self-learning from collected execution results.

        Args:
            request: Stage6SelfLearnRequest with collected Example results

        Returns:
            Stage6SelfLearnResponse with learning status and stats
        """
        results = []
        for ex in request.results:
            results.append({
                "success": True,
                "example_id": ex.id,
                "prompt": ex.prompt,
                "expected": ex.expected,
                "kind": ex.kind,
            })

        learned = self.stage6.self_learning.learn_from_results(results)
        stats = self.stage6.self_learning.get_learning_stats()

        stats_msg = pb.SelfLearningStats(
            is_trained=bool(stats.get("is_trained") if stats.get("is_trained") is not None else learned),
            learning_rate=float(stats.get("learning_rate") or 0.0),
            min_confidence=float(stats.get("min_confidence") or 0.0),
            performance=str(stats.get("performance") or "unknown"),
            optimization_level=str(stats.get("optimization_level") or "unknown"),
        )

        return pb.Stage6SelfLearnResponse(
            success=learned,
            timestamp=str(time.time()),
            stats=stats_msg,
        )

    def Stage6FullCycle(self, request, context):
        """
        Stage 6: Full unified cycle - AI prediction -> Forecast -> AutoFix -> SelfLearning.

        Args:
            request: Stage6FullCycleRequest with current metrics

        Returns:
            Stage6FullCycleResponse with all Stage 6 component results
        """
        cycle = self.stage6.execute({
            "action": "full_cycle",
            "data": {
                "metrics": {k: float(v) for k, v in dict(request.metrics).items()},
            },
        })

        ai_result = cycle.get("ai") or {}
        forecast_result = cycle.get("forecast") or {}
        auto_fix_result = cycle.get("auto_fix") or {}
        self_learn_result = cycle.get("self_learning") or {}

        ai_response = pb.Stage6AIResponse(
            predicted_performance=float(ai_result.get("predicted_performance") or 0.0),
            status=str(ai_result.get("status") or "unknown"),
            recommendations=list(ai_result.get("recommendations") or []),
            ml_version=str(ai_result.get("ml_version") or ""),
        )

        forecast_time = forecast_result.get("forecast_time") or time.time()
        forecast_response = pb.Stage6ForecastResponse(
            predicted_loads=[
                float(forecast_result.get("predicted_cpu") or 0.0),
                float(forecast_result.get("predicted_memory") or 0.0),
                float(forecast_result.get("predicted_disk") or 0.0),
                float(forecast_result.get("predicted_network") or 0.0),
            ],
            status="success",
            forecast_timestamp=str(forecast_time),
        )

        auto_fix_response = pb.Stage6AutoFixResponse(
            status=str(auto_fix_result.get("status") or "pending"),
            fixes_applied=[str(f) for f in (auto_fix_result.get("fixes_applied") or [])],
            timestamp=str(auto_fix_result.get("timestamp") or time.time()),
        )

        if isinstance(self_learn_result, bool):
            self_learn_success = self_learn_result
        else:
            self_learn_success = bool(self_learn_result.get("success") or True) if isinstance(self_learn_result, dict) else True
        self_learn_stats = self.stage6.self_learning.get_learning_stats()
        self_learn_response = pb.Stage6SelfLearnResponse(
            success=self_learn_success,
            timestamp=str(time.time()),
            stats=pb.SelfLearningStats(
                is_trained=bool(self_learn_stats.get("is_trained") if self_learn_stats.get("is_trained") is not None else self_learn_success),
                learning_rate=float(self_learn_stats.get("learning_rate") or 0.0),
                min_confidence=float(self_learn_stats.get("min_confidence") or 0.0),
                performance=str(self_learn_stats.get("performance") or "unknown"),
                optimization_level=str(self_learn_stats.get("optimization_level") or "unknown"),
            ),
        )

        return pb.Stage6FullCycleResponse(
            success=bool(cycle.get("success", True)),
            timestamp=str(time.time()),
            ai=ai_response,
            forecast=forecast_response,
            auto_fix=auto_fix_response,
            self_learning=self_learn_response,
        )
