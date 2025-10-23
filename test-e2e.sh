#!/bin/bash

# E2E Test Script for Workflow Automation Platform
# Tests authentication flow and workflow creation

set -e  # Exit on any error

echo "================================="
echo "E2E Test Suite"
echo "================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test configuration
API_URL="http://localhost:3001/api/v1"
FRONTEND_URL="http://localhost:3000"

echo "📋 Test Configuration:"
echo "  - Backend API: $API_URL"
echo "  - Frontend: $FRONTEND_URL"
echo ""

# Function to print test results
test_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASSED${NC}: $2"
    else
        echo -e "${RED}✗ FAILED${NC}: $2"
        exit 1
    fi
}

# Test 1: Check backend server is running
echo "Test 1: Backend Server Health"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $API_URL/workflows -H "Authorization: Bearer test" || echo "000")
if [ "$HTTP_CODE" == "401" ]; then
    test_result 0 "Backend is running and auth guard is active"
else
    test_result 1 "Backend not responding correctly (HTTP $HTTP_CODE)"
fi
echo ""

# Test 2: Check frontend server is running
echo "Test 2: Frontend Server Health"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $FRONTEND_URL || echo "000")
if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "304" ] || [ "$HTTP_CODE" == "307" ]; then
    test_result 0 "Frontend is running (HTTP $HTTP_CODE)"
else
    test_result 1 "Frontend not responding (HTTP $HTTP_CODE)"
fi
echo ""

# Test 3: Unauthenticated request should fail
echo "Test 3: Unauthenticated Request Protection"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $API_URL/workflows || echo "000")
if [ "$HTTP_CODE" == "401" ]; then
    test_result 0 "Unauthenticated requests are properly blocked"
else
    test_result 1 "Authentication guard not working (HTTP $HTTP_CODE)"
fi
echo ""

# Test 4: Invalid token should fail
echo "Test 4: Invalid Token Rejection"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $API_URL/workflows -H "Authorization: Bearer invalid_token" || echo "000")
if [ "$HTTP_CODE" == "401" ]; then
    test_result 0 "Invalid tokens are properly rejected"
else
    test_result 1 "Invalid token not rejected (HTTP $HTTP_CODE)"
fi
echo ""

# Test 5: BFSI Templates endpoint (requires auth)
echo "Test 5: BFSI Templates Endpoint"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $API_URL/bfsi/templates || echo "000")
if [ "$HTTP_CODE" == "401" ]; then
    test_result 0 "BFSI templates endpoint requires authentication"
else
    test_result 1 "BFSI templates endpoint auth not working (HTTP $HTTP_CODE)"
fi
echo ""

echo "================================="
echo -e "${GREEN}All automated tests passed!${NC}"
echo "================================="
echo ""

echo -e "${YELLOW}📝 Manual Testing Required:${NC}"
echo ""
echo "1. Authentication Flow:"
echo "   - Go to $FRONTEND_URL"
echo "   - Click 'Sign In' or 'Sign Up'"
echo "   - Complete Clerk authentication with: cvishnuu01@gmail.com"
echo "   - Verify successful redirect to dashboard"
echo ""

echo "2. Workflow Creation:"
echo "   - After signing in, try to create a new workflow"
echo "   - Verify that the workflow is saved successfully"
echo "   - Check that no 500 errors occur"
echo ""

echo "3. CSV Upload (BFSI Feature):"
echo "   - Navigate to BFSI features"
echo "   - Upload a CSV file"
echo "   - Verify file is encrypted and stored"
echo ""

echo "4. AI Content Generation:"
echo "   - Create a workflow with AI content generator node"
echo "   - Configure with test data"
echo "   - Execute workflow and verify Gemini API integration"
echo ""

echo "================================="
echo "Please complete the manual tests above and report any issues."
echo "================================="
