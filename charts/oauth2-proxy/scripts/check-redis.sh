#!/bin/sh

RETRY_INTERVAL=5  # Interval between retries in seconds
elapsed=0  # Elapsed time

check_redis() {
    host=$1
    port=$2
    while [ $elapsed -lt $TOTAL_RETRY_TIME ]; do
        echo "Checking Redis at $host:$port... Elapsed time: ${elapsed}s"
        if nc -z -w1 $TIMEOUT $host $port > /dev/null 2>&1; then
            echo "Redis is up at $host:$port!"
            return 0
        else
            echo "Redis is down at $host:$port. Retrying in $RETRY_INTERVAL seconds."
            sleep $RETRY_INTERVAL
            elapsed=$((elapsed + RETRY_INTERVAL))
        fi
    done
    echo "Failed to connect to Redis at $host:$port after $TOTAL_RETRY_TIME seconds."
    return 1
}

# For parsing and checking connections
parse_and_check() {
    url=$1
    clean_url=${url#redis://}
    host=$(echo $clean_url | cut -d':' -f1)
    port=$(echo $clean_url | cut -d':' -f2)
    check_redis $host $port
}

# Main
if [ -n "$OAUTH2_PROXY_REDIS_CLUSTER_CONNECTION_URLS" ]; then
    echo "Checking Redis in cluster mode..."
    echo "$OAUTH2_PROXY_REDIS_CLUSTER_CONNECTION_URLS" | tr ',' '\n' | while read -r addr; do
        parse_and_check $addr || exit 1
    done
elif [ -n "$OAUTH2_PROXY_REDIS_SENTINEL_CONNECTION_URLS" ]; then
    echo "Checking Redis in sentinel mode..."
    echo "$OAUTH2_PROXY_REDIS_SENTINEL_CONNECTION_URLS" | tr ',' '\n' | while read -r addr; do
        parse_and_check $addr || exit 1
    done
elif [ -n "$OAUTH2_PROXY_REDIS_CONNECTION_URL" ]; then
    echo "Checking standalone Redis..."
    parse_and_check "$OAUTH2_PROXY_REDIS_CONNECTION_URL" || exit 1
else
    echo "Redis configuration not specified."
    exit 1
fi

echo "Redis check completed."
