using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using NeuroConstructor.UI.Services;

namespace NeuroConstructor.UI
{
    public partial class MainWindow : Window
    {
        private readonly NeuroGrpcClient _grpcClient;
        private readonly ChatService _chatService;
        private readonly CancellationTokenSource _cts = new();

        private string _teacherModelPath = string.Empty;
        private string _studentModelPath = string.Empty;

        public MainWindow()
        {
            InitializeComponent();

            _grpcClient = new NeuroGrpcClient();
            _chatService = new ChatService();

            Loaded += async (sender, e) =>
            {
                _chatService.Initialize(this);
                InitializeChatDisplay();
                await RefreshStatusAsync();
            };

            Closed += (sender, e) => _cts.Cancel();

            SendButton.Click += SendButton_Click;
            ClearButton.Click += ClearButton_Click;
            LoadTeacherButton.Click += LoadTeacherButton_Click;
            CreateStudentButton.Click += CreateStudentButton_Click;
            ConvertModelButton.Click += ConvertModelButton_Click;
            ValidateModelButton.Click += ValidateModelButton_Click;
            ListTemplatesButton.Click += ListTemplatesButton_Click;
            GetTemplateButton.Click += GetTemplateButton_Click;
            CreateDatasetButton.Click += CreateDatasetButton_Click;
            AddExampleButton.Click += AddExampleButton_Click;
            ListExamplesButton.Click += ListExamplesButton_Click;
            ValidateDatasetButton.Click += ValidateDatasetButton_Click;
            ExportDatasetButton.Click += ExportDatasetButton_Click;
        }

        private void InitializeChatDisplay()
        {
            ChatHistoryBox.ItemsSource = _chatService.Messages;
        }

        private async Task RefreshStatusAsync()
        {
            try
            {
                var status = await _grpcClient.GetStatusAsync(
                    new NeuroConstructor.StatusRequest(), _cts.Token);
                AddSystemMessage(status.ModelLoaded
                    ? $"Core connected. Model loaded: {status.ModelPath}"
                    : "Core connected. No model loaded.");
            }
            catch (Exception ex)
            {
                AddSystemMessage($"Cannot reach the core server: {ex.Message}", isError: true);
            }
        }

        private async void SendButton_Click(object sender, RoutedEventArgs e)
        {
            string message = MessageInput.Text?.Trim() ?? string.Empty;
            if (string.IsNullOrEmpty(message)) return;

            _chatService.AddMessage(new ChatMessage
            {
                Sender = "User",
                Text = message,
                Timestamp = DateTime.Now
            });
            MessageInput.Clear();

            try
            {
                var response = await _grpcClient.ChatAsync(message, null, _cts.Token);
                _chatService.AddMessage(new ChatMessage
                {
                    Sender = "AI",
                    Text = response.Message,
                    Timestamp = DateTime.Now,
                    IsError = response.IsError,
                    ErrorDetail = response.ErrorDetail
                });
            }
            catch (Exception ex)
            {
                _chatService.AddMessage(new ChatMessage
                {
                    Sender = "AI",
                    Text = $"Request failed: {ex.Message}",
                    Timestamp = DateTime.Now,
                    IsError = true,
                    ErrorDetail = ex.ToString()
                });
            }
        }

        private void ClearButton_Click(object sender, RoutedEventArgs e)
        {
            _chatService.ClearMessages();
        }

        private async void LoadTeacherButton_Click(object sender, RoutedEventArgs e)
        {
            var path = PromptForPath(
                "Select the teacher model",
                "GGUF (*.gguf)|*.gguf|PyTorch (*.pt;*.pth;*.safetensors)|*.pt;*.pth;*.safetensors|All files (*.*)|*.*");
            if (string.IsNullOrWhiteSpace(path)) return;

            await RunStage2Operation(
                "Load teacher",
                () => _grpcClient.LoadTeacherModelAsync(
                    new NeuroConstructor.TeacherModelRequest { ModelPath = path }, _cts.Token),
                response =>
                {
                    _teacherModelPath = path;
                    return $"Status: {response.Status}. Quality score: {response.QualityScore:F2}";
                });
        }

        private async void CreateStudentButton_Click(object sender, RoutedEventArgs e)
        {
            if (string.IsNullOrWhiteSpace(_teacherModelPath))
            {
                AddSystemMessage("Load a teacher model first.", isError: true);
                return;
            }

            await RunStage2Operation(
                "Create student",
                () => _grpcClient.CreateStudentModelAsync(
                    new NeuroConstructor.CreateStudentRequest { TeacherModelPath = _teacherModelPath }, _cts.Token),
                response => $"Status: {response.Status}. Compression applied: {response.CompressionApplied}");
        }

        private async void ConvertModelButton_Click(object sender, RoutedEventArgs e)
        {
            if (string.IsNullOrWhiteSpace(_teacherModelPath))
            {
                AddSystemMessage("Load a teacher model first.", isError: true);
                return;
            }

            var studentPath = Path.Combine(
                Path.GetDirectoryName(_teacherModelPath) ?? ".",
                "student_converted.gguf");

            await RunStage2Operation(
                "Convert model",
                () => _grpcClient.ConvertModelAsync(
                    new NeuroConstructor.ConvertRequest
                    {
                        TeacherPath = _teacherModelPath,
                        StudentPath = studentPath
                    }, _cts.Token),
                response =>
                {
                    _studentModelPath = studentPath;
                    return $"Status: {response.Status}. Compression ratio: {response.CompressionRatio:F2}. Quality: {response.QualityScore:F2}";
                });
        }

        private async void ValidateModelButton_Click(object sender, RoutedEventArgs e)
        {
            if (string.IsNullOrWhiteSpace(_teacherModelPath))
            {
                AddSystemMessage("Load a teacher model first.", isError: true);
                return;
            }

            await RunStage2Operation(
                "Validate model",
                () => _grpcClient.ValidateModelAsync(
                    new NeuroConstructor.ValidateRequest
                    {
                        TeacherModel = _teacherModelPath,
                        StudentModel = _studentModelPath
                    }, _cts.Token),
                response => $"Valid: {response.IsValid}. Quality: {response.QualityScore:F2}. Compatibility: {response.CompatibilityScore:F2}");
        }

        private async Task RunStage2Operation<T>(
            string operationName,
            Func<Task<T>> call,
            Func<T, string> format)
        {
            AddSystemMessage($"{operationName}...");
            try
            {
                var response = await call();
                AddSystemMessage($"{operationName}: {format(response)}");
            }
            catch (Exception ex)
            {
                AddSystemMessage($"{operationName} failed: {ex.Message}", isError: true);
            }
        }

        private void AddSystemMessage(string text, bool isError = false)
        {
            _chatService.AddMessage(new ChatMessage
            {
                Sender = "System",
                Text = text,
                Timestamp = DateTime.Now,
                IsError = isError
            });
        }

        private string PromptForPath(string title, string filter)
        {
            var dialog = new Microsoft.Win32.OpenFileDialog
            {
                Title = title,
                Filter = filter,
                CheckFileExists = true
            };
            return dialog.ShowDialog(this) == true ? dialog.FileName : string.Empty;
        }

        public void AddChatMessage(string sender, string message, DateTime timestamp)
        {
            _chatService.AddMessage(new ChatMessage
            {
                Sender = sender,
                Text = message,
                Timestamp = timestamp
            });
        }

        public void ClearChat()
        {
            _chatService.ClearMessages();
        }

        private async void ListTemplatesButton_Click(object sender, System.Windows.RoutedEventArgs e)
        {
            try
            {
                var response = await _grpcClient.ListTemplatesAsync(new NeuroConstructor.ListTemplatesRequest(), _cts.Token);
                AddSystemMessage("Templates: " + string.Join(", ", response.Templates.Select(t => t.Name)));
            }
            catch (Exception ex)
            {
                AddSystemMessage("Failed to list templates: " + ex.Message, isError: true);
            }
        }

        private async void GetTemplateButton_Click(object sender, System.Windows.RoutedEventArgs e)
        {
            try
            {
                var request = new NeuroConstructor.GetTemplateRequest { Name = "simple_chat" };
                var response = await _grpcClient.GetTemplateAsync(request, _cts.Token);
                AddSystemMessage($"Template: {response.Name}, Kind: {response.Kind}, Count: {response.Count}");
            }
            catch (Exception ex)
            {
                AddSystemMessage("Failed to get template: " + ex.Message, isError: true);
            }
        }

        private async void CreateDatasetButton_Click(object sender, System.Windows.RoutedEventArgs e)
        {
            try
            {
                var request = new NeuroConstructor.CreateDatasetRequest
                {
                    TemplateName = "simple_chat",
                    Count = 5,
                    Params = { { "test", "value" } } // Use collection initializer syntax
                };
                var response = await _grpcClient.CreateDatasetAsync(request, _cts.Token);
                AddSystemMessage($"Dataset created: {response.DatasetId}, Manifest: {response.ManifestPath}");
            }
            catch (Exception ex)
            {
                AddSystemMessage("Failed to create dataset: " + ex.Message, isError: true);
            }
        }

        private async void AddExampleButton_Click(object sender, System.Windows.RoutedEventArgs e)
        {
            try
            {
                var request = new NeuroConstructor.AddExampleRequest
                {
                    DatasetId = "_test_dataset",
                    Prompt = "Test prompt",
                    Expected = "Test expected"
                };
                var response = await _grpcClient.AddExampleAsync(request, _cts.Token);
                AddSystemMessage($"Example added: {response.Id}");
            }
            catch (Exception ex)
            {
                AddSystemMessage("Failed to add example: " + ex.Message, isError: true);
            }
        }

        private async void ListExamplesButton_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                var request = new NeuroConstructor.ListExamplesRequest
                {
                    DatasetId = "_test_dataset",
                    Offset = 0,
                    Limit = 10
                };
                var response = await _grpcClient.ListExamplesAsync(request, _cts.Token);
                AddSystemMessage($"Found {response.Total} examples");
                foreach (var ex in response.Examples.Take(3))
                {
                    AddSystemMessage($"  - {ex.Id}: {ex.Prompt.Substring(0, Math.Min(50, ex.Prompt.Length))}");
                }
            }
            catch (Exception ex)
            {
                AddSystemMessage("Failed to list examples: " + ex.Message, isError: true);
            }
        }

        private async void ValidateDatasetButton_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                var request = new NeuroConstructor.ValidateDatasetRequest
                {
                    DatasetId = "_test_dataset"
                };
                var response = await _grpcClient.ValidateDatasetAsync(request, _cts.Token);
                AddSystemMessage($"Dataset valid: {response.Valid}, Errors: {string.Join(", ", response.Errors)}");
            }
            catch (Exception ex)
            {
                AddSystemMessage("Failed to validate dataset: " + ex.Message, isError: true);
            }
        }

        private async void ExportDatasetButton_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                var dialog = new Microsoft.Win32.SaveFileDialog
                {
                    Title = "Export Dataset",
                    Filter = "|*.zip|All Files|*.*",
                    CheckPathExists = true
                };
                if (dialog.ShowDialog(this) == true)
                {
                    var request = new NeuroConstructor.ExportDatasetRequest
                    {
                        DatasetId = "_test_dataset",
                        Path = dialog.FileName
                    };
                    var response = await _grpcClient.ExportDatasetAsync(request, _cts.Token);
                    AddSystemMessage($"Dataset exported to: {dialog.FileName}");
                }
            }
            catch (Exception ex)
            {
                AddSystemMessage("Failed to export dataset: " + ex.Message, isError: true);
            }
        }
    }
}
