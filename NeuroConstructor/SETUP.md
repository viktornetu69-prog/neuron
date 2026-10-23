# NeuroConstructor Setup Guide (Step-by-Step)

## 1. Directory Structure Check
Ensure your folder looks like this:
```
NeuroConstructor/
├── NeuroConstructor.Core/
│   ├── core/
│   │   ├── NeuroConstructor.proto
│   │   ├── engine.py
│   │   └── NeuroConstructor_pb2.py       <-- Will be generated
│   │   └── NeuroConstructor_pb2_grpc.py  <-- Will be generated
│   ├── requirements.txt
│   └── start_server.py
└── NeuroConstructor.UI/
    ├── NeuroConstructor.UI.csproj
    ├── App.xaml
    ├── MainWindow.xaml
    └── MainWindow.xaml.cs
```

## 2. Configure Python (Backend)
1.  Open terminal in `NeuroConstructor.Core`.
2.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
3.  Generate Python protobuf files:
    ```bash
    python -m grpc_tools.protoc -Icore --python_out=core --grpc_python_out=core core/NeuroConstructor.proto
    ```
    *(Note: Updated paths to put files inside `core/`)*

## 3. Configure C# (Frontend)
1.  Open terminal in `NeuroConstructor.UI`.
2.  Ensure `NeuroConstructor.proto` is accessible. Since the `.csproj` points to `..\NeuroConstructor.Core\core\`, it should be fine.
3.  Build the project:
    ```bash
    dotnet build
    ```

## 4. Run
1.  **Terminal 1 (Backend):**
    ```bash
    cd NeuroConstructor.Core
    python start_server.py
    ```
2.  **Terminal 2 (Frontend):**
    ```bash
    cd NeuroConstructor.UI
    dotnet run
    ```

Now try sending a message!
