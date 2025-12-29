import asyncio
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from .config import settings
from .models import init_db
from .routers import sonos, library, streaming, playlists


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    print(f"Starting Sonos Controller...")
    print(f"  Music path: {settings.music_path}")
    print(f"  Data path: {settings.data_path}")
    print(f"  Stream URL: {settings.stream_base_url}")

    # Initialize database
    await init_db()

    # Start background indexing if enabled
    if settings.index_on_startup:
        from .library import start_background_index
        asyncio.create_task(start_background_index())

    yield

    # Shutdown
    print("Shutting down Sonos Controller...")


app = FastAPI(
    title="Sonos Controller",
    description="Web-based Sonos controller with local music library",
    version="1.0.0",
    lifespan=lifespan,
)

# Include API routers
app.include_router(sonos.router, prefix="/api/sonos", tags=["sonos"])
app.include_router(library.router, prefix="/api/library", tags=["library"])
app.include_router(streaming.router, prefix="/stream", tags=["streaming"])
app.include_router(playlists.router, prefix="/api/playlists", tags=["playlists"])


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "stream_url": settings.stream_base_url}


# Serve static frontend files
frontend_path = Path(__file__).parent.parent.parent / "frontend" / "dist"
if frontend_path.exists():
    app.mount("/assets", StaticFiles(directory=frontend_path / "assets"), name="assets")

    @app.get("/{path:path}")
    async def serve_frontend(path: str):
        """Serve the React frontend for any non-API route."""
        file_path = frontend_path / path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(frontend_path / "index.html")
