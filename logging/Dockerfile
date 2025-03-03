# Use a base image that includes curl (alpine for simplicity)
FROM alpine:3.15

# Install curl
RUN apk --no-cache add curl

# Copy the log-forwarder.sh script into the container
COPY logging/log-forwarder.sh /usr/local/bin/log-forwarder.sh

# Make the script executable
RUN chmod +x /usr/local/bin/log-forwarder.sh

# Start the log-forwarder script when the container runs
CMD ["sh", "/usr/local/bin/log-forwarder.sh"]
