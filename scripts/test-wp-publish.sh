#!/bin/bash

# Test WordPress Publishing Endpoint
# Usage: ./scripts/test-wp-publish.sh

echo "=========================================="
echo "Testing WordPress Publishing"
echo "=========================================="
echo ""

# Check if example file exists
if [ ! -f "examples/test-wordpress-publish.json" ]; then
    echo "Error: examples/test-wordpress-publish.json not found"
    exit 1
fi

# Get the port (default to 3000)
PORT=${PORT:-3000}
URL="http://localhost:$PORT/api/test-wordpress-publish"

echo "Testing endpoint: $URL"
echo ""

# First, check the GET endpoint for info
echo "Fetching endpoint information..."
echo ""
curl -s "$URL" | jq '.'
echo ""
echo "=========================================="
echo ""

# Ask for confirmation
read -p "Do you want to publish a test blog to WordPress? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo "Publishing test blog..."
echo ""

# Post the test data
curl -X POST "$URL" \
  -H "Content-Type: application/json" \
  -d @examples/test-wordpress-publish.json \
  | jq '.'

echo ""
echo "=========================================="
echo "Test complete!"
echo "=========================================="
