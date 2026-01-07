"""
LUMORA Tools Router
Safe, read-only AI-powered workspace analysis tools
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import os
from pathlib import Path
import httpx
import aiofiles

router = APIRouter()

OLLAMA_BASE_URL = os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434')

# Pydantic models
class ToolRunRequest(BaseModel):
    toolName: str
    workspacePath: str
    activeSheetData: Optional[Dict[str, Any]] = None
    model: str

# Tool implementations

async def run_ollama_model(model: str, prompt: str) -> str:
    """Call Ollama API to run model"""
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": model,
                    "prompt": prompt,
                    "stream": False
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                return data.get("response", "")
            else:
                return f"Error: Model returned status {response.status_code}"
    except Exception as e:
        return f"Error calling model: {str(e)}"

def scan_workspace_structure(workspace_path: str, max_depth: int = 4) -> Dict[str, Any]:
    """Scan workspace directory structure (safe, read-only)"""
    ignore_dirs = {'.git', 'node_modules', '__pycache__', 'venv', '.venv', 'dist', 'build', '.next'}
    
    # Add limits to prevent DoS
    MAX_FILES = 10000
    MAX_DIRS = 1000
    
    structure = {
        'directories': [],
        'files': [],
        'total_files': 0,
        'total_dirs': 0,
        'truncated': False
    }
    
    try:
        workspace = Path(workspace_path)
        if not workspace.exists():
            return structure
        
        # Track inodes to detect symlink loops
        seen_inodes = set()
        
        for root, dirs, files in os.walk(workspace, followlinks=False):
            # Check for limits
            if structure['total_files'] >= MAX_FILES or structure['total_dirs'] >= MAX_DIRS:
                structure['truncated'] = True
                break
            
            # Detect symlink loops by inode
            try:
                inode = os.stat(root).st_ino
                if inode in seen_inodes:
                    continue
                seen_inodes.add(inode)
            except (OSError, PermissionError):
                continue
            
            # Filter ignored directories
            dirs[:] = [d for d in dirs if d not in ignore_dirs]
            
            # Calculate depth
            depth = len(Path(root).relative_to(workspace).parts)
            if depth >= max_depth:
                dirs.clear()
                continue
            
            rel_root = str(Path(root).relative_to(workspace))
            if rel_root != '.':
                if structure['total_dirs'] < MAX_DIRS:
                    structure['directories'].append(rel_root)
                    structure['total_dirs'] += 1
            
            for file in files:
                if structure['total_files'] < MAX_FILES:
                    file_path = os.path.join(rel_root, file) if rel_root != '.' else file
                    structure['files'].append(file_path)
                    structure['total_files'] += 1
        
        return structure
    except Exception as e:
        print(f"Error scanning workspace: {e}")
        return structure

async def tool_summarize_workspace(workspace_path: str, model: str) -> str:
    """Tool: Summarize workspace structure"""
    structure = scan_workspace_structure(workspace_path)
    
    # Build readable structure
    dirs_text = "\n".join(f"  📁 {d}" for d in sorted(structure['directories'][:50]))
    files_text = "\n".join(f"  📄 {f}" for f in sorted(structure['files'][:100]))
    
    prompt = f"""You are an AI workspace analyst. Summarize the following project structure in clear bullet points.

WORKSPACE STRUCTURE:

Directories ({structure['total_dirs']} total):
{dirs_text}

Files ({structure['total_files']} total, showing first 100):
{files_text}

Analyze and provide:
1. Main project type and purpose (based on structure)
2. Key directories and their likely roles
3. Frontend/Backend boundaries (if applicable)
4. Frameworks or technologies identified
5. Overall project organization assessment

Be concise and insightful."""
    
    return await run_ollama_model(model, prompt)

async def tool_list_files(workspace_path: str, model: str) -> str:
    """Tool: List all files with organization"""
    structure = scan_workspace_structure(workspace_path, max_depth=6)
    
    # Group files by extension
    by_extension: Dict[str, List[str]] = {}
    for file_path in structure['files']:
        ext = Path(file_path).suffix or 'no-extension'
        if ext not in by_extension:
            by_extension[ext] = []
        by_extension[ext].append(file_path)
    
    # Build organized list
    organized_list = []
    for ext in sorted(by_extension.keys()):
        files = by_extension[ext]
        organized_list.append(f"\n{ext} files ({len(files)}):")
        for f in sorted(files)[:50]:  # Limit per type
            organized_list.append(f"  - {f}")
    
    files_summary = "\n".join(organized_list)
    
    prompt = f"""You are an AI file system analyst. The following files were found in the workspace:

TOTAL FILES: {structure['total_files']}
TOTAL DIRECTORIES: {structure['total_dirs']}

FILES BY TYPE:
{files_summary}

Provide a concise summary:
1. What types of files dominate?
2. Are there any missing important files (e.g., README, config files)?
3. Is the project well-organized?
4. Any observations about file naming or structure?"""
    
    return await run_ollama_model(model, prompt)

async def tool_scan_todos(workspace_path: str, model: str) -> str:
    """Tool: Scan for TODO and FIXME comments"""
    code_extensions = {'.ts', '.tsx', '.js', '.jsx', '.py', '.md', '.txt'}
    ignore_dirs = {'.git', 'node_modules', '__pycache__', 'venv', '.venv', 'dist', 'build', '.next'}
    
    todos = []
    
    try:
        workspace = Path(workspace_path)
        for root, dirs, files in os.walk(workspace):
            dirs[:] = [d for d in dirs if d not in ignore_dirs]
            
            for file in files:
                if Path(file).suffix not in code_extensions:
                    continue
                
                file_path = Path(root) / file
                try:
                    async with aiofiles.open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        lines = await f.readlines()
                        for i, line in enumerate(lines, 1):
                            line_lower = line.lower()
                            if 'todo' in line_lower or 'fixme' in line_lower:
                                rel_path = file_path.relative_to(workspace)
                                todos.append({
                                    'file': str(rel_path),
                                    'line': i,
                                    'text': line.strip()
                                })
                except Exception:
                    continue
    except Exception as e:
        return f"Error scanning for TODOs: {str(e)}"
    
    if not todos:
        return "No TODO or FIXME comments found in the workspace."
    
    # Format TODOs
    todos_text = "\n".join([
        f"{todo['file']}:{todo['line']}\n  {todo['text']}"
        for todo in todos[:50]  # Limit to 50
    ])
    
    prompt = f"""You are an AI code auditor. The following TODO/FIXME comments were found in the codebase:

TOTAL FOUND: {len(todos)}

TODOS AND FIXMES (showing first 50):
{todos_text}

Analyze and provide:
1. Group by priority (critical, important, nice-to-have)
2. Group by file or module
3. Suggest which TODOs should be addressed first
4. Any patterns or concerns in the TODOs?"""
    
    return await run_ollama_model(model, prompt)

async def tool_analyze_codebase(workspace_path: str, model: str) -> str:
    """Tool: Analyze codebase architecture"""
    code_extensions = {'.ts', '.tsx', '.js', '.jsx', '.py'}
    ignore_dirs = {'.git', 'node_modules', '__pycache__', 'venv', '.venv', 'dist', 'build', '.next'}
    
    files_analyzed = []
    
    try:
        workspace = Path(workspace_path)
        for root, dirs, files in os.walk(workspace):
            dirs[:] = [d for d in dirs if d not in ignore_dirs]
            
            for file in files:
                if Path(file).suffix not in code_extensions:
                    continue
                
                file_path = Path(root) / file
                try:
                    async with aiofiles.open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = await f.read()
                        # Take first 2KB or 50 lines
                        lines = content.split('\n')[:50]
                        preview = '\n'.join(lines)[:2000]
                        
                        rel_path = file_path.relative_to(workspace)
                        files_analyzed.append({
                            'file': str(rel_path),
                            'preview': preview
                        })
                        
                        if len(files_analyzed) >= 20:  # Limit to 20 files
                            break
                except Exception:
                    continue
            
            if len(files_analyzed) >= 20:
                break
    except Exception as e:
        return f"Error analyzing codebase: {str(e)}"
    
    if not files_analyzed:
        return "No code files found to analyze."
    
    # Build analysis prompt
    files_summary = "\n\n---\n\n".join([
        f"FILE: {item['file']}\n{item['preview']}"
        for item in files_analyzed
    ])
    
    prompt = f"""You are an AI software architect. Analyze the following code snippets from this project:

TOTAL CODE FILES ANALYZED: {len(files_analyzed)}

CODE SAMPLES:
{files_summary}

Provide a detailed analysis:
1. What is the overall architecture pattern?
2. What frameworks and libraries are being used?
3. Code quality observations
4. Are there any anti-patterns or concerns?
5. Suggestions for improvement
6. Is the code well-structured?"""
    
    return await run_ollama_model(model, prompt)

async def tool_generate_readme(workspace_path: str, model: str) -> str:
    """Tool: Generate README.md draft"""
    structure = scan_workspace_structure(workspace_path)
    
    # Get package.json or requirements.txt if exists
    package_info = ""
    try:
        package_json = Path(workspace_path) / "package.json"
        if package_json.exists():
            async with aiofiles.open(package_json, 'r') as f:
                package_info += f"\npackage.json found\n{await f.read()}\n"
    except:
        pass
    
    try:
        requirements = Path(workspace_path) / "requirements.txt"
        if requirements.exists():
            async with aiofiles.open(requirements, 'r') as f:
                package_info += f"\nrequirements.txt found\n{await f.read()}\n"
    except:
        pass
    
    dirs_text = "\n".join(f"  {d}" for d in sorted(structure['directories'][:30]))
    
    prompt = f"""You are a technical documentation expert. Generate a professional README.md file for this project.

PROJECT STRUCTURE:
{structure['total_dirs']} directories, {structure['total_files']} files

Key directories:
{dirs_text}

{package_info}

Generate a complete README.md with:
1. # Project Title (infer from structure)
2. ## Description (what the project does)
3. ## Features (key capabilities)
4. ## Installation (setup instructions)
5. ## Usage (how to run)
6. ## Project Structure (explain key folders)
7. ## Technologies Used
8. ## License (suggest MIT or appropriate)

Write in Markdown format. Be professional and clear."""
    
    return await run_ollama_model(model, prompt)

async def tool_summarize_csv(active_sheet_data: Dict[str, Any], model: str) -> str:
    """Tool: Summarize active CSV/sheet data"""
    if not active_sheet_data:
        return "No active sheet data provided."
    
    columns = active_sheet_data.get('columns', [])
    rows = active_sheet_data.get('rows', [])
    name = active_sheet_data.get('name', 'Unknown')
    
    if not columns or not rows:
        return "Sheet data is empty or invalid."
    
    # Build data summary
    sample_rows = rows[:10]  # First 10 rows
    sample_text = "\n".join([
        "  " + " | ".join(str(cell) for cell in row)
        for row in sample_rows
    ])
    
    prompt = f"""You are a data analyst. Summarize the following dataset:

DATASET: {name}
COLUMNS: {len(columns)}
ROWS: {len(rows)}

Column names:
{", ".join(columns)}

Sample data (first 10 rows):
{sample_text}

Provide:
1. What type of data is this?
2. What insights can you draw?
3. Any data quality observations?
4. Suggested analyses or visualizations
5. Key patterns or trends visible"""
    
    return await run_ollama_model(model, prompt)

# Main tool router endpoint
@router.post("/run")
async def run_tool(request: ToolRunRequest):
    """Run a workspace analysis tool"""
    try:
        tool_name = request.toolName
        workspace_path = request.workspacePath
        model = request.model
        
        if not model:
            raise HTTPException(status_code=400, detail="Model is required")
        
        # Route to appropriate tool
        if tool_name == "summarize_workspace":
            result = await tool_summarize_workspace(workspace_path, model)
        elif tool_name == "list_files":
            result = await tool_list_files(workspace_path, model)
        elif tool_name == "scan_todos":
            result = await tool_scan_todos(workspace_path, model)
        elif tool_name == "analyze_codebase":
            result = await tool_analyze_codebase(workspace_path, model)
        elif tool_name == "generate_readme":
            result = await tool_generate_readme(workspace_path, model)
        elif tool_name == "summarize_csv":
            result = await tool_summarize_csv(request.activeSheetData or {}, model)
        else:
            raise HTTPException(status_code=400, detail=f"Unknown tool: {tool_name}")
        
        return {
            "success": True,
            "tool": tool_name,
            "result": result
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Tool execution failed: {str(e)}")

