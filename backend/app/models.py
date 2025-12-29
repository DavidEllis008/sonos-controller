from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, Text, ForeignKey
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base, relationship

from .config import settings

Base = declarative_base()


class Track(Base):
    """A music track in the library."""

    __tablename__ = "tracks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    file_path = Column(String, unique=True, nullable=False, index=True)

    # Metadata
    title = Column(String, nullable=False, index=True)
    artist = Column(String, index=True)
    album = Column(String, index=True)
    album_artist = Column(String)
    track_number = Column(Integer)
    disc_number = Column(Integer)
    duration = Column(Float)  # Duration in seconds
    year = Column(Integer)
    genre = Column(String)

    # Album art
    has_embedded_art = Column(Boolean, default=False)
    has_folder_art = Column(Boolean, default=False)
    folder_art_path = Column(String)  # Relative path to folder art

    # File info
    file_size = Column(Integer)
    file_format = Column(String)  # mp3, m4a, wav
    last_modified = Column(DateTime)

    # Indexing metadata
    indexed_at = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<Track {self.artist} - {self.title}>"


class Playlist(Base):
    """A user-created or imported playlist."""

    __tablename__ = "playlists"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False, index=True)
    file_path = Column(String)  # Path to M3U file if saved/imported
    is_user_created = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship to tracks
    entries = relationship("PlaylistEntry", back_populates="playlist", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Playlist {self.name}>"


class PlaylistEntry(Base):
    """An entry in a playlist."""

    __tablename__ = "playlist_entries"

    id = Column(Integer, primary_key=True, autoincrement=True)
    playlist_id = Column(Integer, ForeignKey("playlists.id"), nullable=False)
    track_id = Column(Integer, ForeignKey("tracks.id"), nullable=True)
    track_path = Column(String)  # Original path from M3U (for unresolved tracks)
    position = Column(Integer, nullable=False)

    playlist = relationship("Playlist", back_populates="entries")
    track = relationship("Track")


class IndexStatus(Base):
    """Tracks the status of library indexing."""

    __tablename__ = "index_status"

    id = Column(Integer, primary_key=True, autoincrement=True)
    status = Column(String, default="idle")  # idle, running, completed, error
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    total_files = Column(Integer, default=0)
    processed_files = Column(Integer, default=0)
    error_message = Column(Text)


# Database engine and session
engine = create_async_engine(settings.database_url, echo=False)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def init_db():
    """Initialize the database, creating tables if they don't exist."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_session() -> AsyncSession:
    """Get a database session."""
    async with async_session() as session:
        yield session
