#!/bin/bash
cd "$(dirname "$0")"

# Kill any existing instance
pkill -f "node server.js" 2>/dev/null
sleep 0.5

# Start server in background
node server.js &
SERVER_PID=$!

# Wait for qr.png to be generated then display it
for i in {1..20}; do
  if [ -f "qr.png" ]; then
    sleep 0.3
    # Show QR popup — user scans this with phone
    eog qr.png 2>/dev/null || feh qr.png 2>/dev/null || xdg-open qr.png 2>/dev/null &
    notify-send "LocalBeam" "Scan the QR code with your phone!" --icon=network-wireless 2>/dev/null
    break
  fi
  sleep 0.3
done

# Keep terminal alive so server keeps running
wait $SERVER_PID
