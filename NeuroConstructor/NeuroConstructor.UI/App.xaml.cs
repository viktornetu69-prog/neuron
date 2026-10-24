using System;
using System.Windows;
using System.Windows.Threading;

namespace NeuroConstructor.UI
{
    public partial class App : Application
    {
        private void App_DispatcherUnhandledException(object sender, DispatcherUnhandledExceptionEventArgs e)
        {
            MessageBox.Show(
                $"ERROR: {e.Exception.Message}\n\n" +
                $"Inner: {e.Exception.InnerException?.Message}\n\n" +
                $"Stack: {e.Exception.InnerException?.StackTrace}",
                "Unhandled Exception",
                MessageBoxButton.OK,
                MessageBoxImage.Error);
            e.Handled = true;
        }
    }
}
