#!/bin/bash

GEMINI_API_KEY=$(cat .env | grep GEMINI_API_KEY | cut -d '=' -f2)

echo "🔍 Testing Gemini API..."
echo "API Key: ${GEMINI_API_KEY:0:20}..."
echo ""

# List available models
echo "📋 Listing available models..."
curl -s "https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}" | jq '.models[] | {name: .name, displayName: .displayName}'

echo ""
echo "🧪 Testing gemini-1.5-flash with simple prompt..."
curl -s "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}" \
  -H 'Content-Type: application/json' \
  -d '{
    "contents": [{
      "parts":[{"text": "Say hello in one sentence"}]
    }],
    "safetySettings": [
      {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
      {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
      {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
      {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"}
    ]
  }' | jq '.'

echo ""
echo "✅ Test complete"
