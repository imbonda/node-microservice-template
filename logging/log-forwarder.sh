#!/bin/sh

log() {
  local msg="$1"
  local timestamp="$(date +'%Y-%m-%d %H:%M:%S').$(date +'%s' | cut -c1-3)"
  echo "[$timestamp] $msg"
}

if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS/BSD stat command
  get_mtime() { stat -f %m "$1"; }
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  # Linux stat command
  get_mtime() { stat --format %Y "$1"; }
else
  # BusyBox stat (Alpine, Docker) with -c
  get_mtime() { stat -c %Y "$1"; }
fi

# Ensure all required environment variables are set.
if [ -z "$LOG_DIR" ]; then
  log "ERROR: LOG_DIR environment variable is not set."
  exit 1
fi

if [ -z "$NEW_RELIC_LICENSE_KEY" ]; then
  log "ERROR: NEW_RELIC_LICENSE_KEY environment variable is not set."
  exit 1
fi

if [ -z "$NEW_RELIC_API_URL" ]; then
  log "ERROR: NEW_RELIC_API_URL environment variable is not set."
  exit 1
fi

if [ -z "$LOG_FILE_PATTERN" ]; then
  log "ERROR: LOG_FILE_PATTERN environment variable is not set."
  exit 1
fi

LOG_DIR="$LOG_DIR"
NEW_RELIC_LICENSE_KEY="$NEW_RELIC_LICENSE_KEY"
NEW_RELIC_API_URL="$NEW_RELIC_API_URL"
LOG_FILE_PATTERN="$LOG_FILE_PATTERN"

READY_FILE_SECONDS_THRESHOLD=1

SLEEP_INTERVAL=5

# Function to forward a single log file to New Relic.
forward_logs() {
  local log_file="$1"
  log "Forwarding log file: $log_file"

  # Send log file to New Relic
  local res=$(
    curl -s -X POST "$NEW_RELIC_API_URL" \
    -H "Content-Type: application/json" \
    -H "Api-Key: $NEW_RELIC_LICENSE_KEY" \
    -d @"$log_file"
  )
  log "$res\n"

  # Check if the curl command was successful.
  if [ $? -eq 0 ]; then
    log "Log file successfully forwarded: $log_file"
    # Remove the log file after forwarding.
    rm -f "$log_file"
    log "Log file removed: $log_file"
  else
    log "Failed to forward log file: $log_file"
  fi
}

# Function to forward all log files older than the threshold.
forward_all_logs() {
  find "$LOG_DIR" -type f -name "$LOG_FILE_PATTERN" | while read log_file; do
    if [[ -f "$log_file" ]]; then
      # Check if the file is older than the constant threshold time (in seconds)
      if [[ $(get_mtime "$log_file") -lt $(($(date +%s) - $READY_FILE_SECONDS_THRESHOLD)) ]]; then
        forward_logs "$log_file"
      fi
    fi
  done
}

# Function to clean up and forward any remaining logs before shutting down.
cleanup() {
  log "Received termination signal. Cleaning up..."
  # Forward any remaining log files
  forward_all_logs
  log "Cleanup complete. Exiting..."
  exit 0
}

# Trap termination signals (SIGTERM, SIGINT) and call cleanup function.
trap cleanup SIGTERM SIGINT

# Main loop to monitor the log directory
while true; do
  # Find and forward all log files that match the pattern and are ready to be sent.
  forward_all_logs
  # Instead of blocking with sleep, use sleep in the background and wait.
  sleep $SLEEP_INTERVAL &
  wait $!
done
