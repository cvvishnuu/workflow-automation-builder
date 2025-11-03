#!/bin/bash

# Test BFSI Campaign Generation with Different Variations
# This script tests multiple scenarios to ensure robustness

API_KEY="086f4da0deb4dd7d3df354e5d3b4e6f7b08c5f25ac585ba65a6e7c99744aae40"
WORKFLOW_ID="workflow_bfsi_marketing_template"
API_URL="http://localhost:3001/api/v1"

echo "======================================"
echo "BFSI Campaign Generation - Test Suite"
echo "======================================"
echo ""

# Test 1: Different prompt - Investment focus
echo "Test 1: Investment-focused campaign for high net-worth customers"
echo "--------------------------------------"

CUSTOMER_DATA_1='[
  {
    "customerId": "CUST009",
    "firstName": "Suresh",
    "lastName": "Nair",
    "email": "suresh.nair@email.com",
    "phone": "+91-9876543218",
    "age": 50,
    "accountType": "Premium",
    "balance": 1200000,
    "creditScore": 820,
    "city": "Mumbai",
    "state": "Maharashtra",
    "country": "India",
    "productInterest": "investment",
    "lastInteractionDate": "2024-01-16",
    "preferredChannel": "email"
  }
]'

RESPONSE=$(curl -s -X POST "$API_URL/public/agents/$WORKFLOW_ID/execute" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d "{
    \"input\": {
      \"csvData\": $CUSTOMER_DATA_1,
      \"prompt\": \"Create an exclusive investment opportunity message highlighting wealth management services for high net-worth individuals\",
      \"targetAudience\": \"High net-worth individuals aged 45-60\",
      \"tone\": \"sophisticated and personalized\"
    },
    \"description\": \"Test Investment Campaign\"
  }")

EXECUTION_ID_1=$(echo "$RESPONSE" | jq -r '.executionId')
echo "✅ Test 1 Started - Execution ID: $EXECUTION_ID_1"
echo ""
sleep 2

# Test 2: Different prompt - Loan campaign
echo "Test 2: Home loan campaign for middle-aged professionals"
echo "--------------------------------------"

CUSTOMER_DATA_2='[
  {
    "customerId": "CUST007",
    "firstName": "Rahul",
    "lastName": "Desai",
    "email": "rahul.desai@email.com",
    "phone": "+91-9876543216",
    "age": 38,
    "accountType": "Current",
    "balance": 320000,
    "creditScore": 740,
    "city": "Pune",
    "state": "Maharashtra",
    "country": "India",
    "productInterest": "loan",
    "lastInteractionDate": "2024-01-17",
    "preferredChannel": "email"
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

RESPONSE=$(curl -s -X POST "$API_URL/public/agents/$WORKFLOW_ID/execute" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d "{
    \"input\": {
      \"csvData\": $CUSTOMER_DATA_2,
      \"prompt\": \"Generate a home loan offer message emphasizing low interest rates and easy approval for pre-qualified customers\",
      \"targetAudience\": \"Working professionals aged 35-45 looking to buy homes\",
      \"tone\": \"friendly and reassuring\"
    },
    \"description\": \"Test Home Loan Campaign\"
  }")

EXECUTION_ID_2=$(echo "$RESPONSE" | jq -r '.executionId')
echo "✅ Test 2 Started - Execution ID: $EXECUTION_ID_2"
echo ""
sleep 2

# Test 3: Different prompt - Insurance campaign
echo "Test 3: Insurance protection campaign for young families"
echo "--------------------------------------"

CUSTOMER_DATA_3='[
  {
    "customerId": "CUST004",
    "firstName": "Sneha",
    "lastName": "Reddy",
    "email": "sneha.reddy@email.com",
    "phone": "+91-9876543213",
    "age": 31,
    "accountType": "Salary",
    "balance": 180000,
    "creditScore": 690,
    "city": "Hyderabad",
    "state": "Telangana",
    "country": "India",
    "productInterest": "insurance",
    "lastInteractionDate": "2024-01-22",
    "preferredChannel": "sms"
  },
  {
    "customerId": "CUST010",
    "firstName": "Deepa",
    "lastName": "Joshi",
    "email": "deepa.joshi@email.com",
    "phone": "+91-9876543219",
    "age": 29,
    "accountType": "Savings",
    "balance": 145000,
    "creditScore": 680,
    "city": "Jaipur",
    "state": "Rajasthan",
    "country": "India",
    "productInterest": "insurance",
    "lastInteractionDate": "2024-01-24",
    "preferredChannel": "sms"
  }
]'

RESPONSE=$(curl -s -X POST "$API_URL/public/agents/$WORKFLOW_ID/execute" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d "{
    \"input\": {
      \"csvData\": $CUSTOMER_DATA_3,
      \"prompt\": \"Create a comprehensive insurance protection message highlighting family security and life coverage benefits\",
      \"targetAudience\": \"Young professionals aged 28-35 with families\",
      \"tone\": \"caring and protective\"
    },
    \"description\": \"Test Insurance Campaign\"
  }")

EXECUTION_ID_3=$(echo "$RESPONSE" | jq -r '.executionId')
echo "✅ Test 3 Started - Execution ID: $EXECUTION_ID_3"
echo ""

# Wait for executions to complete
echo "Waiting for campaigns to generate content..."
sleep 20

# Check results
echo ""
echo "======================================"
echo "Test Results Summary"
echo "======================================"
echo ""

echo "Test 1 - Investment Campaign:"
STATUS_1=$(curl -s "$API_URL/public/executions/$EXECUTION_ID_1/status" -H "Authorization: Bearer $API_KEY" | jq -r '.status')
echo "  Status: $STATUS_1"
if [ "$STATUS_1" == "pending_approval" ]; then
  ROWS_1=$(curl -s "$API_URL/public/executions/$EXECUTION_ID_1/pending-approval" -H "Authorization: Bearer $API_KEY" | jq '.approvalData.rows | length')
  echo "  ✅ Generated content for $ROWS_1 customer(s)"
else
  echo "  ❌ Status: $STATUS_1"
fi
echo ""

echo "Test 2 - Home Loan Campaign:"
STATUS_2=$(curl -s "$API_URL/public/executions/$EXECUTION_ID_2/status" -H "Authorization: Bearer $API_KEY" | jq -r '.status')
echo "  Status: $STATUS_2"
if [ "$STATUS_2" == "pending_approval" ]; then
  ROWS_2=$(curl -s "$API_URL/public/executions/$EXECUTION_ID_2/pending-approval" -H "Authorization: Bearer $API_KEY" | jq '.approvalData.rows | length')
  echo "  ✅ Generated content for $ROWS_2 customer(s)"
else
  echo "  ❌ Status: $STATUS_2"
fi
echo ""

echo "Test 3 - Insurance Campaign:"
STATUS_3=$(curl -s "$API_URL/public/executions/$EXECUTION_ID_3/status" -H "Authorization: Bearer $API_KEY" | jq -r '.status')
echo "  Status: $STATUS_3"
if [ "$STATUS_3" == "pending_approval" ]; then
  ROWS_3=$(curl -s "$API_URL/public/executions/$EXECUTION_ID_3/pending-approval" -H "Authorization: Bearer $API_KEY" | jq '.approvalData.rows | length')
  echo "  ✅ Generated content for $ROWS_3 customer(s)"
else
  echo "  ❌ Status: $STATUS_3"
fi
echo ""

echo "======================================"
echo "All Tests Completed!"
echo "======================================"
