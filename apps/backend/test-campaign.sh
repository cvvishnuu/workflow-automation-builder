#!/bin/bash

# Test BFSI Campaign Generation
# This script triggers a campaign execution to test the CSV upload flow

API_KEY="086f4da0deb4dd7d3df354e5d3b4e6f7b08c5f25ac585ba65a6e7c99744aae40"
WORKFLOW_ID="workflow_bfsi_marketing_template"
API_URL="http://localhost:3001/api/v1"

# Sample customer data - first 3 customers only for testing
CUSTOMER_DATA='[
  {
    "customerId": "CUST001",
    "firstName": "Rajesh",
    "lastName": "Kumar",
    "email": "rajesh.kumar@email.com",
    "phone": "+91-9876543210",
    "age": 35,
    "accountType": "Savings",
    "balance": 125000,
    "creditScore": 750,
    "city": "Mumbai",
    "state": "Maharashtra",
    "country": "India",
    "productInterest": "credit-card",
    "lastInteractionDate": "2024-01-15",
    "preferredChannel": "email"
  },
  {
    "customerId": "CUST002",
    "firstName": "Priya",
    "lastName": "Sharma",
    "email": "priya.sharma@email.com",
    "phone": "+91-9876543211",
    "age": 28,
    "accountType": "Current",
    "balance": 250000,
    "creditScore": 720,
    "city": "Delhi",
    "state": "Delhi",
    "country": "India",
    "productInterest": "investment",
    "lastInteractionDate": "2024-01-20",
    "preferredChannel": "whatsapp"
  },
  {
    "customerId": "CUST003",
    "firstName": "Amit",
    "lastName": "Patel",
    "email": "amit.patel@email.com",
    "phone": "+91-9876543212",
    "age": 42,
    "accountType": "Savings",
    "balance": 500000,
    "creditScore": 780,
    "city": "Ahmedabad",
    "state": "Gujarat",
    "country": "India",
    "productInterest": "loan",
    "lastInteractionDate": "2024-01-18",
    "preferredChannel": "email"
  }
]'

echo "Starting BFSI Campaign Generation Test..."
echo "API URL: $API_URL"
echo "Workflow ID: $WORKFLOW_ID"
echo ""

# Make API request
RESPONSE=$(curl -s -X POST "$API_URL/public/agents/$WORKFLOW_ID/execute" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d "{
    \"input\": {
      \"csvData\": $CUSTOMER_DATA,
      \"prompt\": \"Generate a personalized offer for each customer based on their product interest\",
      \"targetAudience\": \"Young professionals aged 25-35\",
      \"tone\": \"professional\"
    },
    \"description\": \"Test BFSI Campaign\"
  }")

echo "Response:"
echo "$RESPONSE" | jq '.'

# Extract execution ID
EXECUTION_ID=$(echo "$RESPONSE" | jq -r '.executionId')

if [ "$EXECUTION_ID" != "null" ] && [ ! -z "$EXECUTION_ID" ]; then
  echo ""
  echo "✅ Campaign started successfully!"
  echo "Execution ID: $EXECUTION_ID"
  echo ""
  echo "Monitor execution at:"
  echo "  Status: $API_URL/public/executions/$EXECUTION_ID/status"
  echo "  Results: $API_URL/public/executions/$EXECUTION_ID/results"
else
  echo ""
  echo "❌ Failed to start campaign"
fi
