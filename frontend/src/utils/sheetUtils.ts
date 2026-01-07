/**
 * Utility functions for CSV import/export in Sheets
 */

/**
 * Read CSV file and parse into 2D array
 */
export const readCSV = async (file: File): Promise<string[][]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const rows = parseCSV(text);
        resolve(rows);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

/**
 * Parse CSV text into 2D array
 */
const parseCSV = (text: string): string[][] => {
  const rows: string[][] = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    if (line.trim()) {
      // Simple CSV parsing (handles basic cases)
      const cells = line.split(',').map(cell => cell.trim());
      rows.push(cells);
    }
  }
  
  return rows;
};

/**
 * Export 2D array to CSV Blob
 */
export const exportToCSV = (rows: string[][]): Blob => {
  const csvContent = rows
    .map(row => row.map(cell => escapeCSV(cell)).join(','))
    .join('\n');
  
  return new Blob([csvContent], { type: 'text/csv' });
};

/**
 * Escape CSV cell content
 */
const escapeCSV = (cell: string): string => {
  // If cell contains comma, quote, or newline, wrap in quotes
  if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
    return `"${cell.replace(/"/g, '""')}"`;
  }
  return cell;
};

/**
 * Download a blob as a file
 */
export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Convert 2D array to table string for AI prompts
 */
export const tableToString = (rows: string[][]): string => {
  if (rows.length === 0) return '';
  
  // Find max width for each column
  const colWidths: number[] = [];
  rows.forEach(row => {
    row.forEach((cell, i) => {
      colWidths[i] = Math.max(colWidths[i] || 0, cell.length);
    });
  });
  
  // Create formatted table
  return rows.map(row => 
    row.map((cell, i) => cell.padEnd(colWidths[i])).join(' | ')
  ).join('\n');
};

/**
 * Get a specific column from the table
 */
export const getColumn = (rows: string[][], columnIndex: number): string[] => {
  return rows.map(row => row[columnIndex] || '');
};

/**
 * Create empty rows
 */
export const createEmptyRows = (rowCount: number, colCount: number): string[][] => {
  return Array(rowCount).fill(null).map(() => Array(colCount).fill(''));
};

