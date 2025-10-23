# 🎯 Personalized BFSI Marketing Workflow - Complete Guide

## ✅ What's Been Configured

The workflow is now set up for **CSV-driven personalized marketing campaigns**!

### **How It Works:**

```
1. Upload CSV → 2. AI Personalizes → 3. Compliance Check → 4. WhatsApp Batch Send
   (3 customers)     (3 unique messages)   (validates each)      (3 WhatsApp messages)
```

---

## 📊 Workflow Configuration

### **AI Content Generator** (Node 3)
- **Purpose**: "Promote home loans to millennials"
- **Target Audience**: "Young professionals aged 25-35 looking for their first home"
- **Key Points**:
  - Low interest rates starting at 6.5% p.a.
  - Up to 90% LTV (Loan-to-Value)
  - Flexible tenure up to 30 years
  - Minimal documentation required
  - Quick approval in 48 hours
  - Special schemes for first-time home buyers
- **Tone**: Friendly
- **Personalization**:
  - `variableFields`: `['name', 'age', 'income', 'employment', 'city']`
  - `contextTemplate`: `"Customer: {{name}}, Age: {{age}}, Annual Income: ₹{{income}}, Occupation: {{employment}}, Location: {{city}}"`

### **What This Means:**
For each row in your CSV, the AI will:
1. Read customer details (name, age, income, job, city)
2. Create a personalized home loan promotion
3. Tailor the message based on their profile

---

## 📁 CSV File Format

### **Required Columns:**
```csv
customer_id,name,age,email,phone,income,employment,city
```

### **Sample Data** (saved at `/tmp/millennials_homeloan_campaign.csv`):
```csv
customer_id,name,age,email,phone,income,employment,city
1,Rahul Kumar,28,rahul.kumar@email.com,8610560986,800000,IT Professional,Bangalore
2,Priya Sharma,32,priya.sharma@email.com,9876543211,1200000,Senior Data Analyst,Mumbai
3,Amit Patel,27,amit.patel@email.com,9876543212,650000,Software Engineer,Pune
```

### **Column Descriptions:**
- `customer_id`: Unique identifier
- `name`: Customer's full name (used in personalization)
- `age`: Age in years (AI uses this for context)
- `email`: Email address
- `phone`: 10-digit phone number (WhatsApp recipient)
- `income`: Annual income in ₹ (AI tailors offer based on this)
- `employment`: Job title/occupation
- `city`: Location (for local relevance)

---

## 💬 Expected WhatsApp Messages

### **Message for Rahul Kumar (28, IT Professional, ₹8L income, Bangalore):**

```
Hi Rahul! 👋

As a 28-year-old IT Professional in Bangalore, now's the perfect time to invest in your dream home!

Our Home Loan for Young Professionals:
✓ Interest rates as low as 6.5% p.a.
✓ Up to 90% financing
✓ Flexible EMI plans up to 30 years
✓ Minimal paperwork
✓ Approval in just 48 hours

Special benefits for first-time homebuyers like you!

Reply with "INTERESTED" to connect with our loan specialist.

Subject to eligibility criteria. Terms and conditions apply.
```

### **Message for Priya Sharma (32, Senior Analyst, ₹12L income, Mumbai):**

```
Hello Priya! 👋

With your strong career as a Senior Data Analyst in Mumbai, you're in an excellent position to own your home!

Premium Home Loan Package:
✓ Competitive rates from 6.5% p.a.
✓ Finance up to 90% of property value
✓ Flexible repayment options
✓ Fast-track approval
✓ Exclusive offers for professionals

Your income profile qualifies you for our best rates!

Let's make your homeownership dream a reality.

Subject to eligibility criteria. Terms and conditions apply.
```

### **Message for Amit Patel (27, Software Engineer, ₹6.5L income, Pune):**

```
Hey Amit! 👋

Great news for Software Engineers in Pune looking to buy their first home!

Affordable Home Loan Solution:
✓ Starting at just 6.5% p.a.
✓ Up to 90% loan amount
✓ Long tenure options (up to 30 years)
✓ Simple documentation
✓ Quick 48-hour approval

First-time buyer? We have special schemes for you!

Reply "MORE INFO" to get started.

Subject to eligibility criteria. Terms and conditions apply.
```

---

## 🚀 How to Test

### **Step 1: Upload CSV**
1. Go to http://localhost:3000/workflows
2. Click "BFSI Marketing Campaign with Compliance"
3. Click **"Run"** button
4. **The UI will prompt you to upload a CSV file**
5. Upload `/tmp/millennials_homeloan_campaign.csv`

### **Step 2: Watch Execution**
- CSV Upload node: Reads 3 customers ✅
- AI Generator node: Creates 3 personalized messages ✅
- Compliance Checker: Validates each message ✅
- WhatsApp node: Sends 3 messages ✅

### **Step 3: Check Results**
- **Rahul's phone** (8610560986): Receives personalized message
- **Priya's phone** (9876543211): Receives her own unique message
- **Amit's phone** (9876543212): Receives his tailored message

---

## 🔍 What Makes Each Message Unique?

### **AI Considers:**
1. **Name**: Personal greeting ("Hi Rahul", "Hello Priya")
2. **Age**: Life stage relevance (27-32 = first home buyers)
3. **Income**: Loan amount suggestions, rate eligibility
4. **Job Title**: Professional status ("IT Professional", "Senior Analyst")
5. **City**: Local market context (Bangalore, Mumbai, Pune)

### **Example Differences:**

| Customer | Greeting Style | Income Context | Professional Context |
|----------|---------------|----------------|---------------------|
| Rahul (28, ₹8L) | Casual "Hi" | Standard rates | "IT Professional" mentioned |
| Priya (32, ₹12L) | Formal "Hello" | "Best rates" emphasis | "Premium Package" angle |
| Amit (27, ₹6.5L) | Friendly "Hey" | "Affordable" focus | "Simple docs" highlighted |

---

## 📋 Backend Logs (What to Expect)

```bash
[CSV] Uploading file: millennials_homeloan_campaign.csv
[CSV] Parsed 3 rows, 8 columns
[CSV] Detected columns: customer_id, name, age, email, phone, income, employment, city

[AI] Processing row 1/3: Rahul Kumar
[AI] Context: Customer: Rahul Kumar, Age: 28, Annual Income: ₹800000, Occupation: IT Professional, Location: Bangalore
[AI] Generated content (245 tokens)

[AI] Processing row 2/3: Priya Sharma
[AI] Context: Customer: Priya Sharma, Age: 32, Annual Income: ₹1200000, Occupation: Senior Data Analyst, Location: Mumbai
[AI] Generated content (238 tokens)

[AI] Processing row 3/3: Amit Patel
[AI] Context: Customer: Amit Patel, Age: 27, Annual Income: ₹650000, Occupation: Software Engineer, Location: Pune
[AI] Generated content (252 tokens)

[Compliance] Checking message 1/3... Risk Score: 12/100 ✅ PASSED
[Compliance] Checking message 2/3... Risk Score: 8/100 ✅ PASSED
[Compliance] Checking message 3/3... Risk Score: 15/100 ✅ PASSED

[WhatsApp] Sending to 8610560986... Message SID: SM...
[WhatsApp] Sending to 9876543211... Message SID: SM...
[WhatsApp] Sending to 9876543212... Message SID: SM...

✅ Workflow completed: 3/3 messages sent successfully
```

---

## 🎯 Customization Options

### **Want Different Content?**
Update the AI node configuration with your own:
- **Purpose**: "Promote personal loans", "Credit card offers", etc.
- **Key Points**: Your product benefits
- **Target Audience**: Your demographic

### **Want Different CSV Columns?**
Update:
- **variableFields**: Match your CSV column names
- **contextTemplate**: Use your column names with `{{column_name}}`

Example for credit cards:
```javascript
variableFields: ['name', 'credit_score', 'monthly_spend', 'preferred_category']
contextTemplate: 'Customer: {{name}}, Credit Score: {{credit_score}}, Monthly Spend: ₹{{monthly_spend}}, Preferred: {{preferred_category}}'
```

---

## ✅ Success Criteria

The workflow is working correctly if:

1. ✅ CSV uploaded successfully (3 rows read)
2. ✅ 3 different AI messages generated (check logs for personalization)
3. ✅ All 3 messages pass compliance (risk score < 50)
4. ✅ 3 WhatsApp messages sent to 3 different numbers
5. ✅ Each message mentions the customer's name
6. ✅ Content is relevant to each customer's profile

---

## 🐛 Troubleshooting

### Issue: "CSV columns not found"
**Solution**: Ensure CSV has exact column names: `name`, `age`, `income`, `employment`, `city`, `phone`

### Issue: "All messages are identical"
**Solution**: Check that `variableFields` and `contextTemplate` are configured in the AI node

### Issue: "Phone number not found"
**Solution**: Ensure CSV has a `phone` column and WhatsApp node uses `{{phone}}`

### Issue: "WhatsApp not received"
**Solution**:
- Join Twilio sandbox for each phone number
- OR use a verified number (8610560986 should work if you joined sandbox)

---

## 📊 Scaling Up

### **Testing**: 3 customers (current)
### **Small Campaign**: 50-100 customers
### **Large Campaign**: 1000+ customers

**Note**: Gemini free tier allows 60 requests/minute. For 1000 customers, execution will take ~17 minutes due to rate limiting.

---

## 🎉 Summary

**Before**: Single message to one number
**Now**: Personalized messages to multiple customers from CSV

**How to Use**:
1. Prepare CSV with customer data
2. Upload when running workflow
3. Each customer gets a unique, personalized message
4. AI uses their profile to tailor the content

**Next Steps**: Upload your own CSV and test! The sample file is ready at `/tmp/millennials_homeloan_campaign.csv`

