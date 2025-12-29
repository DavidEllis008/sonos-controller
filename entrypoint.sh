#!/bin/bash
set -e

# Create log directory for supervisor
mkdir -p /var/log/supervisor

# Auto-detect host IP if set to 'auto'
if [ "$HOST_IP" = "auto" ]; then
    # Try to get the IP that would be used to reach the local network
    # This finds the default route interface and gets its IP
    DETECTED_IP=$(ip route get 1.1.1.1 2>/dev/null | grep -oP 'src \K\S+' || hostname -I | awk '{print $1}')
    if [ -n "$DETECTED_IP" ]; then
        export HOST_IP="$DETECTED_IP"
        echo "Auto-detected HOST_IP: $HOST_IP"
    else
        echo "Warning: Could not auto-detect HOST_IP, using localhost"
        export HOST_IP="127.0.0.1"
    fi
fi

# Ensure data directory exists and is writable
mkdir -p "$DATA_PATH"

# Initialize database if it doesn't exist
if [ ! -f "$DATA_PATH/library.db" ]; then
    echo "Initializing database..."
fi

echo "Starting Sonos Controller..."
echo "  Music path: $MUSIC_PATH"
echo "  Data path: $DATA_PATH"
echo "  Host IP: $HOST_IP"
echo "  Web UI: http://$HOST_IP:8000"

exec "$@"
