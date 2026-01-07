#!/usr/bin/env python3
"""Verify backend can start without errors"""

import sys

try:
    print("🔍 Checking imports...")
    import fastapi
    import uvicorn
    import pydantic
    import aiofiles
    import httpx
    import requests
    print("✅ All dependencies imported successfully")
    
    print("\n🔍 Loading main application...")
    import main
    print("✅ Main application loaded successfully")
    
    print("\n🔍 Verifying endpoints...")
    routes = [route.path for route in main.app.routes]
    required_endpoints = [
        "/",
        "/models",
        "/run-model",
        "/tools/read_file",
        "/tools/write_file",
        "/tools/search",
        "/workspace/files"
    ]
    
    for endpoint in required_endpoints:
        if endpoint in routes:
            print(f"✅ {endpoint}")
        else:
            print(f"❌ {endpoint} - MISSING")
            sys.exit(1)
    
    print("\n🔍 Checking CORS configuration...")
    cors_middleware = None
    for middleware in main.app.user_middleware:
        if "CORSMiddleware" in str(middleware):
            cors_middleware = middleware
            break
    
    if cors_middleware:
        print("✅ CORS middleware configured")
    else:
        print("❌ CORS middleware not found")
        sys.exit(1)
    
    print("\n" + "="*50)
    print("✅ Backend verification complete!")
    print("="*50)
    print("\n🚀 Ready to start with:")
    print("   uvicorn main:app --reload --port 8000")
    print("\nAPI will be available at:")
    print("   http://localhost:8000")
    print("   http://localhost:8000/docs (Swagger UI)")
    
except ImportError as e:
    print(f"\n❌ Import error: {e}")
    print("\nRun: pip install -r requirements.txt")
    sys.exit(1)
except Exception as e:
    print(f"\n❌ Error: {e}")
    sys.exit(1)

