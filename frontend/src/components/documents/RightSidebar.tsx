import { useState, useEffect } from 'react';
import type { Editor } from '@tiptap/react';
import { AIPanel } from './AIPanel';
import { OutlinePanel } from './OutlinePanel';
import { VersionsPanel } from './VersionsPanel';

interface RightSidebarProps {
  editor: Editor | null;
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'ai' | 'outline' | 'versions';
}

export type SidebarTab = 'ai' | 'outline' | 'versions';

export const RightSidebar = ({ editor, isOpen, onClose, initialTab = 'ai' }: RightSidebarProps) => {
  const [activeTab, setActiveTab] = useState<SidebarTab>(initialTab);

  // Update active tab when initialTab changes
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const renderPanel = () => {
    switch (activeTab) {
      case 'ai':
        return <AIPanel editor={editor} />;
      case 'outline':
        return <OutlinePanel editor={editor} />;
      case 'versions':
        return <VersionsPanel />;
      default:
        return <AIPanel editor={editor} />;
    }
  };

  return (
    <div
      className={`fixed top-0 right-0 h-screen bg-white border-l border-gray-200 shadow-xl transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
      style={{ width: '350px', zIndex: 40 }}
    >
      {/* Header with tabs */}
      <div className="h-full flex flex-col">
        {/* Tab bar */}
        <div className="bg-gray-50 border-b border-gray-200 px-2 py-2 flex items-center justify-between">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('ai')}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                activeTab === 'ai'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              🤖 AI Assistant
            </button>
            <button
              onClick={() => setActiveTab('outline')}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                activeTab === 'outline'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              📑 Outline
            </button>
            <button
              onClick={() => setActiveTab('versions')}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                activeTab === 'versions'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              🕐 Versions
            </button>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-1"
            title="Close sidebar"
          >
            ✕
          </button>
        </div>

        {/* Panel content */}
        <div className="flex-1 overflow-hidden">
          {renderPanel()}
        </div>
      </div>
    </div>
  );
};

