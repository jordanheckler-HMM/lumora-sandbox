import { useState, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import { exportToTxt, exportToMd, exportToRtf, exportToDocx, downloadBlob } from '../utils/documentUtils';
import toast from 'react-hot-toast';

interface DocumentToolbarProps {
  editor: Editor | null;
  documentTitle: string;
  onTitleChange: (title: string) => void;
  onNewDocument: () => void;
  onOpenDocument: () => void;
  onSaveDocument: () => void;
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
}

export const DocumentToolbar = ({
  editor,
  documentTitle,
  onTitleChange,
  onNewDocument,
  onOpenDocument,
  onSaveDocument,
  onToggleSidebar,
  sidebarOpen = false,
}: DocumentToolbarProps) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const handleExport = async (format: 'txt' | 'md' | 'rtf' | 'docx') => {
    if (!editor) return;

    const content = editor.getText();
    const filename = `${documentTitle || 'Untitled'}.${format}`;

    let blob: Blob;

    try {
      switch (format) {
        case 'txt':
          blob = exportToTxt(content);
          break;
        case 'md':
          blob = exportToMd(content);
          break;
        case 'rtf':
          blob = exportToRtf(content);
          break;
        case 'docx':
          blob = await exportToDocx(content);
          break;
      }

      downloadBlob(blob, filename);
      setShowExportMenu(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.error(`Failed to export as ${format.toUpperCase()}`);
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      {/* Left-aligned buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onNewDocument}
          className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
          title="New Document"
        >
          📄 New
        </button>
        <button
          onClick={onOpenDocument}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          title="Open Document"
        >
          📂 Open
        </button>
        <button
          onClick={onSaveDocument}
          className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          title="Save Document"
        >
          💾 Save
        </button>
        
        {/* Export dropdown */}
        <div className="relative" ref={exportMenuRef}>
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            title="Export As..."
          >
            📤 Export As... ▼
          </button>
          
          {showExportMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-10 min-w-[150px]">
              <button
                onClick={() => handleExport('txt')}
                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors"
              >
                .txt (Plain Text)
              </button>
              <button
                onClick={() => handleExport('md')}
                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors"
              >
                .md (Markdown)
              </button>
              <button
                onClick={() => handleExport('rtf')}
                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors"
              >
                .rtf (Rich Text)
              </button>
              <button
                onClick={() => handleExport('docx')}
                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors"
              >
                .docx (Word)
              </button>
            </div>
          )}
        </div>
        
        {/* AI Panel toggle */}
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className={`px-3 py-1.5 text-sm rounded transition-colors ${
              sidebarOpen
                ? 'bg-purple-600 text-white'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
            title="Toggle AI Panel"
          >
            {sidebarOpen ? '✕ Close Panel' : '🤖 AI Panel'}
          </button>
        )}
      </div>

      {/* Right-aligned: Document title */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-semibold text-gray-500">Title:</label>
        <input
          type="text"
          value={documentTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="Untitled Document"
        />
      </div>
    </div>
  );
};

