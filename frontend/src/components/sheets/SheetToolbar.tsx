import { useRef } from 'react';

interface SheetToolbarProps {
  sheetName: string;
  onNameChange: (name: string) => void;
  onNewSheet: () => void;
  onOpenSheet: () => void;
  onSaveSheet: () => void;
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
}

export const SheetToolbar = ({
  sheetName,
  onNameChange,
  onNewSheet,
  onOpenSheet,
  onSaveSheet,
  onToggleSidebar,
  sidebarOpen = false,
}: SheetToolbarProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) {
            onOpenSheet();
          }
        }}
      />

      {/* Left-aligned buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onNewSheet}
          className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
          title="New Sheet"
        >
          📊 New
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          title="Open CSV"
        >
          📂 Open
        </button>
        <button
          onClick={onSaveSheet}
          className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          title="Save as CSV"
        >
          💾 Save
        </button>
        
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

      {/* Right-aligned: Sheet name */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-semibold text-gray-500">Sheet:</label>
        <input
          type="text"
          value={sheetName}
          onChange={(e) => onNameChange(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="Untitled Sheet"
        />
      </div>
    </div>
  );
};

