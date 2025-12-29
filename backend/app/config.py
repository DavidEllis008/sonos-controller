import os
import socket
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    music_path: str = "/music"
    data_path: str = "/data"
    host_ip: str = "auto"
    port: int = 8000

    # Database
    database_url: str = ""

    # Indexing
    index_on_startup: bool = True

    class Config:
        env_file = ".env"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

        # Set database URL based on data path
        if not self.database_url:
            self.database_url = f"sqlite+aiosqlite:///{self.data_path}/library.db"

        # Auto-detect host IP if needed
        if self.host_ip == "auto":
            self.host_ip = self._detect_host_ip()

    def _detect_host_ip(self) -> str:
        """Detect the host IP address for Sonos to reach this server."""
        try:
            # Create a socket to determine the outgoing IP
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except Exception:
            return "127.0.0.1"

    @property
    def stream_base_url(self) -> str:
        """Base URL for streaming music files to Sonos."""
        return f"http://{self.host_ip}:{self.port}"


settings = Settings()
