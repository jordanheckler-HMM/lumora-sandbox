# Sheets Tab Rebuild - Read-Only CSV Viewer

## 🎯 Objective
Rebuild the Sheets tab into a clean, stable, **read-only** CSV data viewer with AI-powered analysis capabilities.

---

## ✅ What Was Changed

### 1. Backend Changes

**File: `backend/requirements.txt`**
- ✅ Added `pandas>=2.2.0` for robust CSV parsing

**File: `backend/main.py`**
- ✅ Added imports: `UploadFile`, `File`, `pandas`, `io`
- ✅ Added new endpoint: `POST /sheets/parse-csv`
  - Accepts CSV file upload
  - Uses pandas to parse CSV data
  - Returns structured JSON: `{ columns, rows, filename, row_count, column_count }`
  - Handles errors: empty files, parsing errors, NaN values

**Endpoint Details:**
```python
@app.post("/sheets/parse-csv")
async def parse_csv(file: UploadFile = File(...)):
    # Reads uploaded CSV file
    # Parses with pandas
    # Returns { filename, columns, rows, row_count, column_count }
```

---

### 2. Frontend API Changes

**File: `frontend/src/api.ts`**
- ✅ Added `CSVData` interface:
  ```typescript
  export interface CSVData {
    filename: string;
    columns: string[];
    rows: string[][];
    row_count: number;
    column_count: number;
  }
  ```
- ✅ Added `parseCSV()` function:
  - Uploads CSV file to backend
  - Returns parsed data structure
  - Uses `multipart/form-data` for file upload

---

### 3. Complete Sheets Tab Rewrite

**File: `frontend/src/components/sheets/SheetsTab.tsx`**

**Removed:**
- ❌ `react-data-grid` dependency and imports
- ❌ Complex editable grid logic
- ❌ `rowKeyGetter`, `onRowsChange` handlers
- ❌ Column/row manipulation (add/delete)
- ❌ Cell editing functionality
- ❌ Global Zustand sheet state
- ❌ CSV file reading on frontend

**Added:**
- ✅ Simple, clean component structure
- ✅ File upload via `<input type="file">`
- ✅ Backend CSV parsing via API
- ✅ Read-only HTML `<table>` display
- ✅ Local component state (not global)
- ✅ Loading and error states
- ✅ Empty state with upload prompt
- ✅ File information display
- ✅ CSV download/export
- ✅ Clean, modern UI with Tailwind

**Component Structure:**
```
SheetsTab
  ├── File input (hidden)
  ├── SheetToolbar (file actions)
  ├── SheetAIBar (AI operations) - only shown when data loaded
  ├── Main Content
  │   ├── Loading state
  │   ├── Error state
  │   ├── Empty state (upload prompt)
  │   └── Data view (when loaded)
  │       ├── File info card
  │       └── HTML table (read-only)
  └── RightSidebar (AI panel)
```

**Key Features:**

1. **File Upload**
   - Click "Choose CSV File" button
   - Select .csv file from disk
   - File is uploaded to backend for parsing
   - Pandas parses and validates the CSV
   - Data is displayed in read-only table

2. **Read-Only Display**
   - Simple HTML `<table>` element
   - Sticky header row
   - Row numbers in first column
   - Alternating row colors
   - No cell editing capabilities
   - Scrollable viewport

3. **File Actions** (via SheetToolbar)
   - **New Sheet**: Clear current data, upload new file
   - **Open Sheet**: Upload CSV file
   - **Save Sheet**: Download current data as CSV
   - **Toggle Sidebar**: Show/hide AI panel

4. **AI Actions** (via SheetAIBar)
   - All existing AI buttons continue to work
   - Sends current table data to backend
   - Receives AI-modified table
   - **Non-destructive**: Results go to AI sidebar only
   - User manually applies changes if desired

5. **States**
   - **Loading**: Shows spinner while parsing
   - **Error**: Shows error message with retry button
   - **Empty**: Shows upload prompt
   - **Loaded**: Shows file info + data table

---

## 🚫 What Was NOT Changed

### Unchanged Components
- ✅ `SheetToolbar.tsx` - Still used for file actions
- ✅ `SheetAIBar.tsx` - Still used for AI operations
- ✅ `RightSidebar.tsx` - Still used for AI responses
- ✅ All other tabs: Chat, Documents, Code, Workspace, Tools

### Unchanged Utilities
- ✅ `frontend/src/utils/sheetUtils.ts` - Still used by AI actions:
  - `tableToString()` - Formats table for AI prompts
  - `getColumn()` - Extracts column for AI analysis

### Unchanged Features
- ✅ AI-powered data analysis
- ✅ Sidebar state management
- ✅ Model selection
- ✅ Tab navigation

---

## 📊 Technical Architecture

### Data Flow: CSV Upload
```
User selects CSV file
  ↓
FileReader creates File object
  ↓
Frontend: parseCSV(file)
  ↓
POST /sheets/parse-csv with FormData
  ↓
Backend: pandas.read_csv()
  ↓
Backend: Convert DataFrame to JSON
  ↓
Frontend: Receives { columns, rows, ... }
  ↓
setState with CSV data
  ↓
Render HTML table
```

### Data Flow: AI Actions
```
User clicks AI button (e.g., "Summarize")
  ↓
SheetAIBar formats table data
  ↓
Sends to /run-model with prompt
  ↓
AI generates response
  ↓
Response added to sidebar
  ↓
User manually applies if desired
```

### State Management
- **Local State** (not global Zustand):
  - `csvData: CSVData | null` - Current CSV data
  - `loading: boolean` - Upload/parse in progress
  - `error: string | null` - Error message if any

- **Global State** (Zustand):
  - `sidebarState.sheetsTabOpen` - Sidebar open/closed
  - `sidebarState.sheetSidebarTab` - Active sidebar tab
  - `selectedModel` - Currently selected AI model

---

## 🎨 UI/UX Improvements

### Before
- ❌ Complex editable grid
- ❌ Confusing cell editing
- ❌ Non-functional interactions
- ❌ State management issues

### After
- ✅ Clean, simple table display
- ✅ Clear upload flow
- ✅ Informative empty state
- ✅ File information displayed
- ✅ Row/column counts shown
- ✅ Responsive design
- ✅ Professional appearance

---

## 🔧 How to Use

### 1. Upload CSV File
1. Navigate to Sheets tab
2. Click "📁 Choose CSV File" button
3. Select a .csv file from your computer
4. File is automatically uploaded and parsed
5. Data appears in the table

### 2. View Data
- Scroll horizontally/vertically to view all data
- Row numbers shown in first column
- Column headers are sticky (stay visible when scrolling)
- No editing - read-only display

### 3. Use AI Features
- Click AI action buttons (Summarize, Clean data, etc.)
- AI processes the table data
- Results appear in right sidebar
- Manually review and apply if desired

### 4. Export Data
- Click "💾 Save" in toolbar
- Current data downloads as CSV
- Filename preserved from upload

---

## ✅ Build Verification

**Build Status:**
```
✓ 173 modules transformed
✓ Built in 1.74s
✓ No TypeScript errors
✓ No linter errors
```

**Files Impacted:**
- `backend/requirements.txt` - Added pandas
- `backend/main.py` - Added CSV endpoint
- `frontend/src/api.ts` - Added parseCSV function
- `frontend/src/components/sheets/SheetsTab.tsx` - Complete rewrite

**Files NOT Changed:**
- `frontend/src/components/sheets/SheetToolbar.tsx` ✓
- `frontend/src/components/sheets/SheetAIBar.tsx` ✓
- `frontend/src/components/documents/RightSidebar.tsx` ✓
- `frontend/src/utils/sheetUtils.ts` ✓
- All other tabs and components ✓

---

## 🎯 Summary

### What This Is Now
- ✅ **Read-only CSV data viewer**
- ✅ **AI-powered data console**
- ✅ **Simple and stable**
- ✅ **Backend-parsed CSV** (pandas)
- ✅ **Clean, modern UI**

### What This Is NOT
- ❌ **NOT a spreadsheet editor**
- ❌ **NOT a formula engine**
- ❌ **NOT an Excel replacement**
- ❌ **NOT editable**

### Key Principles
1. **Simplicity** - Plain HTML table, no complex grid libraries
2. **Stability** - Backend parsing, robust error handling
3. **Read-only** - No cell editing, no data manipulation
4. **AI-powered** - Smart data analysis and transformations
5. **User control** - Non-destructive AI actions

---

## 🚀 Status

**Phase Complete:** ✅ **SHEETS TAB REBUILT AS READ-ONLY CSV VIEWER**

The Sheets tab is now a clean, stable, read-only CSV data viewer with AI-powered analysis capabilities. All complex editing features have been removed. The implementation is simple, robust, and focused on data viewing and AI-assisted analysis.

