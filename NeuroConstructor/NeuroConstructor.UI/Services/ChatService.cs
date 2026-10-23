using System;
using System.Collections.ObjectModel;
using System.Threading;

namespace NeuroConstructor.UI.Services
{
    /// <summary>
    /// Service that manages chat messages and UI interaction.
    /// </summary>
    public class ChatService
    {
        private readonly ObservableCollection<ChatMessage> _messages = new();
        private MainWindow? _mainWindow;
        private readonly object _lock = new();

        public ObservableCollection<ChatMessage> Messages => _messages;

        public void Initialize(MainWindow mainWindow)
        {
            _mainWindow = mainWindow;
        }

        public void AddMessage(ChatMessage message)
        {
            lock (_lock)
            {
                _messages.Add(message);
            }

            // Auto-scroll to bottom
            if (_mainWindow != null && _mainWindow.ChatHistoryBox != null)
            {
                _mainWindow.ChatHistoryBox.ScrollIntoView(_messages[^1]);
            }
        }

        public void ClearMessages()
        {
            lock (_lock)
            {
                _messages.Clear();
            }
        }
    }
}
