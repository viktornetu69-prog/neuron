using System;
using System.IO;
using System.Linq;
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

            SidebarChatButton.Tag = "Chat";
            SidebarModelButton.Tag = "Model";
            SidebarDatasetButton.Tag = "Dataset";
            SidebarSettingsButton.Tag = "Settings";
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

        private void Sidebar_Click(object sender, RoutedEventArgs e)
        {
            if (sender is Button button)
            {
                var tag = button.Tag?.ToString();
                if (tag == "Chat")
                {
                    // Nothing to do, chat is the default view
                }
                else
                {
                    AddSystemMessage($"View: {tag}");
                }
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

            Task.Run(async () =>
            {
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
            });
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
    }
}
