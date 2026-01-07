export const VersionsPanel = () => {
  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <h3 className="font-semibold text-gray-900 text-sm">Document Versions</h3>
        <p className="text-xs text-gray-500 mt-1">
          Coming soon
        </p>
      </div>

      {/* Placeholder content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center text-gray-400">
          <div className="text-6xl mb-4">🕐</div>
          <div className="text-lg font-semibold mb-2">Versions Coming Soon</div>
          <div className="text-sm max-w-xs">
            This feature will show document versions and revision history in a future update.
          </div>
          <div className="mt-6 text-xs text-gray-500">
            Features planned:
          </div>
          <ul className="text-xs text-gray-500 mt-2 space-y-1">
            <li>• Auto-save snapshots</li>
            <li>• Manual version creation</li>
            <li>• Compare versions</li>
            <li>• Restore previous versions</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

