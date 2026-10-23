# NeuroConstructor: MVP (Stage 1)

This is the first stage of the NeuroConstructor project.
**Goal:** Establish communication between C# UI and Python Core.

## Prerequisites
1.  **Visual Studio 2022** (with .NET 8.0 and WPF).
2.  **Python 3.10+**.
3.  **Git**.

## Setup Instructions

### 1. Backend (Python)
Navigate to the Core folder:
```bash
cd NeuroConstructor.Core
cd core
pip install grpcio-tools protobuf
python -m grpc_tools.protoc -I./core --python_out=./core --grpc_python_out=./core ./core/NeuroConstructor.proto
```
*Note: If running in Windows PowerShell, use separate commands due to shell limitations.*

### 2. Frontend (C#)
Open `NeuroConstructor.UI.csproj` in Visual Studio.
1.  Restore NuGet packages.
2.  Build the solution.

### 3. Running the Application
1.  **Start Python Server:**
    Run `start_server.py` in a terminal. It should say "Starting Python Core server...".
2.  **Start UI:**
    Run the C# project in Visual Studio (F5).

## Current Status

✅ **Completed**:
- Project structure setup
- Basic gRPC service implementation in `engine.py`
- Updated import paths in Python files
- Updated C# project configuration

🔄 **In Progress**:
- Protobuf file generation (environment limitation)
- C# UI compilation and testing

## Implementation Plan

**Stage 1: Basic gRPC connection**
- [x] Set up project structure
- [x] Implement basic gRPC service
- [ ] Test gRPC connection between Python and C#

**Stage 2: Student-teacher architecture**
- Implement model loading and conversion
- Add student-teacher pipeline
- Implement model compression

**Stage 3: Dataset processing and activation analysis**
- Add activation analysis
- Implement visualization features
- Add dataset processing capabilities

**Stage 4: Advanced features**
- Agent swarm task management
- Plugin system
- Web search integration

## Expected Behavior
- UI connects to port 50051.
- Typing a message and pressing "Send" sends it to Python.
- Python echoes the message back with metadata about the core's capabilities.

## Key Features Implemented

### Python Core
- `engine.py`: gRPC service implementation with Chat and GetStatus methods
- `start_server.py`: gRPC server starter
- Basic error handling and logging

### C# UI
- `MainWindow.xaml`: Simple chat interface with history and input area
- `MainWindow.xaml.cs`: gRPC client implementation
- Error handling and user feedback

## Notes
- Due to environment limitations, protobuf file generation may need to be done manually
- The C# UI references the protobuf definition to generate client code automatically
- All imports and dependencies have been updated to work with the current project structure

## Next Steps
1. Resolve protobuf file generation
2. Test gRPC connection
3. Complete UI compilation
4. Add user authentication and model management features
