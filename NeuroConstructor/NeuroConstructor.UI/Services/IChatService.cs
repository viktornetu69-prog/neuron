namespace NeuroConstructor.UI.Services
{
    public interface IChatService
    {
        void AddMessage(ChatMessage message);
        void ClearMessages();
    }
}
