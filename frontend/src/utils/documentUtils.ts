import { Document, Packer, Paragraph, TextRun } from 'docx';

/**
 * Export document to plain text
 */
export const exportToTxt = (content: string): Blob => {
  return new Blob([content], { type: 'text/plain' });
};

/**
 * Export document to Markdown
 */
export const exportToMd = (content: string): Blob => {
  return new Blob([content], { type: 'text/markdown' });
};

/**
 * Export document to RTF (basic implementation)
 */
export const exportToRtf = (content: string): Blob => {
  // Basic RTF header
  const rtfHeader = '{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}}';
  const rtfFooter = '}';
  
  // Escape special RTF characters
  const escapeRtf = (text: string) => {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/\{/g, '\\{')
      .replace(/\}/g, '\\}')
      .replace(/\n/g, '\\par\n');
  };
  
  const rtfContent = `${rtfHeader}\n${escapeRtf(content)}\n${rtfFooter}`;
  return new Blob([rtfContent], { type: 'application/rtf' });
};

/**
 * Export document to DOCX
 */
export const exportToDocx = async (content: string): Promise<Blob> => {
  // Split content into paragraphs
  const paragraphs = content.split('\n').map(line => 
    new Paragraph({
      children: [new TextRun(line || ' ')],
    })
  );

  const doc = new Document({
    sections: [{
      properties: {},
      children: paragraphs,
    }],
  });

  const blob = await Packer.toBlob(doc);
  return blob;
};

/**
 * Read plain text file
 */
export const readTxt = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string || '');
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

/**
 * Read Markdown file
 */
export const readMd = async (file: File): Promise<string> => {
  return readTxt(file); // Markdown is plain text
};

/**
 * Read RTF file (basic stripping)
 */
export const readRtf = async (file: File): Promise<string> => {
  const content = await readTxt(file);
  
  // Basic RTF stripping - remove RTF commands
  let text = content
    .replace(/\{\\rtf1[^}]*\}/g, '')  // Remove RTF header
    .replace(/\{\\fonttbl[^}]*\}/g, '') // Remove font table
    .replace(/\{\\colortbl[^}]*\}/g, '') // Remove color table
    .replace(/\\par\b/g, '\n')  // Replace paragraph markers
    .replace(/\\\w+\b\s?/g, '') // Remove RTF commands
    .replace(/[{}]/g, '') // Remove braces
    .trim();
  
  return text;
};

/**
 * Read DOCX file
 * Note: This requires a library like mammoth.js for proper parsing
 * For now, we'll just reject DOCX until we add proper support
 */
export const readDocx = async (_file: File): Promise<string> => {
  // For basic implementation, we'll need mammoth or similar
  // For now, return a placeholder
  throw new Error('DOCX import requires mammoth.js - please use .txt or .md for now');
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

