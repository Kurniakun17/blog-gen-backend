#!/bin/bash

# Test Assets Definer API
# This script tests the assets definer to ensure eesel internal assets are only inserted when appropriate

echo "========== Testing Assets Definer =========="
echo ""
echo "This test validates that:"
echo "1. eesel internal assets are ONLY inserted when eesel AI is the main subject"
echo "2. eesel internal assets are NOT inserted when eesel is mentioned in passing"
echo "3. Screenshots are inserted for all listicle items"
echo ""

curl -X POST http://localhost:3000/api/test-assets-definer \
  -H "Content-Type: application/json" \
  -d @../fixtures/test-assets-definer-payload.json \
  | jq '.'  

echo ""
echo "========== Test Complete =========="
