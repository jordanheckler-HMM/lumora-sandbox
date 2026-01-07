/**
 * LUMORA Sheets - Read-Only CSV Data Viewer
 * 
 * Simple, stable CSV file viewer with AI-powered data operations.
 * NO cell editing. NO formulas. NO complex spreadsheet features.
 * This is a read-only AI data console.
 */

import { useState, useRef, useEffect } from 'react';
import { useAppState } from '../../store/appState';
import { parseCSV } from '../../api';
import { SheetToolbar } from './SheetToolbar';
import { SheetAIBar } from './SheetAIBar';
import { RightSidebar } from '../documents/RightSidebar';
import type { SidebarTab } from '../documents/RightSidebar';
import { registerGlobalHandler, unregisterGlobalHandler } from '../../utils/globalHandlers';

export const SheetsTab = () => {
  // Phase 1 Integration: Use global app state for sheet data persistence
  const { selectedModel, sheetState, setSheetState, sidebarState, setSidebarState } = useAppState();
  
  // UI state only (not data)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if sheet has data loaded
  const hasData = sheetState.columns.length > 0 && sheetState.rows.length > 0;

  // Extract sidebar state for sheets
  const sidebarOpen = sidebarState.sheetsTabOpen;
  const sidebarTab = sidebarState.sheetSidebarTab as SidebarTab;

  const setSidebarOpen = (open: boolean) => {
    setSidebarState({ sheetsTabOpen: open });
  };

  const setSidebarTab = (tab: SidebarTab) => {
    setSidebarState({ sheetSidebarTab: tab });
  };

  const handleToggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleOpenSidebar = (tab: SidebarTab = 'ai') => {
    setSidebarTab(tab);
    setSidebarOpen(true);
  };
  
  // Register global handler for sheet sidebar
  useEffect(() => {
    registerGlobalHandler('documentSidebar', () => handleOpenSidebar('ai'));
    return () => unregisterGlobalHandler('documentSidebar');
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await parseCSV(file);
      
      // Validate data structure
      if (!data.columns || !Array.isArray(data.columns) || data.columns.length === 0) {
        setError('Invalid CSV: No columns found');
        return;
      }

      if (!data.rows || !Array.isArray(data.rows)) {
        setError('Invalid CSV: No rows found');
        return;
      }

      // Validate row consistency
      const columnCount = data.columns.length;
      const invalidRows = data.rows.filter(row => row.length !== columnCount);
      if (invalidRows.length > 0) {
        console.warn(`Warning: ${invalidRows.length} rows have inconsistent column counts`);
        // Normalize rows by padding or truncating
        data.rows = data.rows.map(row => {
          if (row.length < columnCount) {
            return [...row, ...Array(columnCount - row.length).fill('')];
          }
          return row.slice(0, columnCount);
        });
      }
      
      // Update global state - data persists across tab switches
      setSheetState({
        name: data.filename,
        columns: data.columns,
        rows: data.rows,
        isModified: false,
      });
    } catch (err: any) {
      console.error('Error parsing CSV:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to parse CSV file');
    } finally {
      setLoading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleNewSheet = () => {
    if (hasData && window.confirm('Clear current data and upload a new file?')) {
      setSheetState({
        name: '',
        columns: [],
        rows: [],
        isModified: false,
      });
      setError(null);
    }
  };

  const handleOpenSheet = () => {
    fileInputRef.current?.click();
  };

  const handleSaveSheet = () => {
    if (!hasData) return;

    // Convert back to CSV format
    const csvContent = [
      sheetState.columns.join(','),
      ...sheetState.rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = sheetState.name || 'data.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Mark as saved
    setSheetState({ isModified: false });
  };

  // Convert sheet data to 2D array format for AI actions
  const currentRows = sheetState.rows;

  return (
    <div className="flex h-full bg-gray-50 relative">
      {/* Main sheet area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Toolbar */}
        <SheetToolbar
          sheetName={sheetState.name || 'No file loaded'}
          onNameChange={() => {}} // Read-only, no name changes
          onNewSheet={handleNewSheet}
          onOpenSheet={handleOpenSheet}
          onSaveSheet={handleSaveSheet}
          onToggleSidebar={handleToggleSidebar}
          sidebarOpen={sidebarOpen}
        />

        {/* AI Bar - only show if data is loaded */}
        {hasData && (
          <SheetAIBar
            currentModel={selectedModel}
            rows={currentRows}
          />
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin text-4xl mb-4">⚙️</div>
                <div className="text-lg text-gray-600">Parsing CSV file...</div>
              </div>
            </div>
          ) : error ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="text-6xl mb-4">⚠️</div>
                <div className="text-xl font-semibold text-red-600 mb-2">Error</div>
                <div className="text-gray-700">{error}</div>
                <button
                  onClick={handleOpenSheet}
                  className="mt-4 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : !hasData ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="text-6xl mb-4">📊</div>
                <div className="text-2xl font-semibold text-gray-800 mb-2">
                  Upload a CSV File
                </div>
                <div className="text-gray-600 mb-6">
                  Load CSV data to view and analyze with AI
                </div>
                <button
                  onClick={handleOpenSheet}
                  className="px-6 py-3 bg-purple-600 text-white text-lg rounded-lg hover:bg-purple-700 transition-colors shadow-md"
                >
                  📁 Choose CSV File
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4">
              {/* File Info */}
              <div className="mb-4 bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500">File</div>
                    <div className="text-lg font-semibold text-gray-800">
                      {sheetState.name}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Dimensions</div>
                    <div className="text-lg font-semibold text-gray-800">
                      {sheetState.rows.length} rows × {sheetState.columns.length} columns
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Table */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-100 border-r border-gray-200">
                        #
                      </th>
                      {sheetState.columns.map((column, idx) => (
                        <th
                          key={idx}
                          className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-200"
                        >
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sheetState.rows.map((row, rowIdx) => (
                      <tr
                        key={rowIdx}
                        className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                      >
                        <td className="px-3 py-2 text-xs text-gray-500 font-medium bg-gray-100 border-r border-gray-200">
                          {rowIdx + 1}
                        </td>
                        {row.map((cell, cellIdx) => (
                          <td
                            key={cellIdx}
                            className="px-4 py-2 text-sm text-gray-900 border-r border-gray-200 whitespace-nowrap"
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar */}
      <RightSidebar
        editor={null}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        initialTab={sidebarTab}
      />
    </div>
  );
};
