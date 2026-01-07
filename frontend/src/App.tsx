import { useAppState } from './store/appState';
import { Sidebar } from './components/Sidebar';
import { ChatPanel } from './components/ChatPanel';
import { CodePanel } from './components/CodePanel';
import { DocumentsTab } from './components/DocumentsTab';
import { SheetsTab } from './components/sheets/SheetsTab';
import { ToolsTab } from './components/tools/ToolsTab';
import { WorkspacePanel } from './components/WorkspacePanel';
import { Toaster } from 'react-hot-toast';

function App() {
  // Phase 1: Use global app state to prevent tab resets
  const activeTab = useAppState((state) => state.activeTab);

  const renderMainPanel = () => {
    switch (activeTab) {
      case 'chat':
        return <ChatPanel />;
      case 'code':
        return <CodePanel />;
      case 'documents':
        return <DocumentsTab />;
      case 'sheets':
        return <SheetsTab />;
      case 'tools':
        return <ToolsTab />;
      case 'workspace':
        return <WorkspacePanel />;
      default:
        return <ChatPanel />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <Sidebar />
      <div className="flex-1 overflow-hidden">
        {renderMainPanel()}
      </div>
    </div>
  );
}

export default App;
