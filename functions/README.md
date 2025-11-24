# Firebase Cloud Functions - Laundryheap Driver Onboarding

This directory contains Firebase Cloud Functions for handling Fountain webhook integration and backend services.

## Functions Overview

### 1. `fountainWebhook` (HTTP Function)
**URL:** `https://us-central1-driver-onboarding-lh.cloudfunctions.net/fountainWebhook`

Receives webhook data from Fountain when an applicant reaches a specific stage.

**Method:** POST
**Payload:** Fountain webhook JSON data

**Expected Fountain Fields:**
```json
{
  "email": "driver@example.com",
  "phone": "+353123456789",
  "name": "John Doe",
  "applicant_id": "ABC123",
  "stage": "ready_for_onboarding",
  "status": "active",
  "city": "Dublin"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Applicant data received and stored successfully",
  "email": "driver@example.com",
  "applicantId": "ABC123"
}
```

### 2. `verifyApplicant` (Callable Function)
Verifies if an email and phone number match in the Fountain applicant data.

**Usage:**
```javascript
const verifyApplicant = httpsCallable(functions, 'verifyApplicant');
const result = await verifyApplicant({ 
  email: 'driver@example.com', 
  phone: '+353123456789' 
});
```

**Response:**
```json
{
  "isValid": true,
  "message": "Applicant verified successfully",
  "applicant": {
    "email": "driver@example.com",
    "name": "John Doe",
    "applicantId": "ABC123"
  }
}
```

### 3. `generateOnboardingReport` (Callable Function)
Generates a comprehensive report when a driver completes onboarding.

**Usage:**
```javascript
const generateReport = httpsCallable(functions, 'generateOnboardingReport');
const result = await generateReport();
```

**Response:**
```json
{
  "success": true,
  "reportId": "REPORT_1234567890_driver_example_com",
  "message": "Onboarding report generated successfully"
}
```

### 4. `getFountainApplicant` (Callable Function)
Retrieves Fountain applicant data for the authenticated user.

**Usage:**
```javascript
const getApplicant = httpsCallable(functions, 'getFountainApplicant');
const result = await getApplicant();
```

## Setup Instructions

### 1. Install Dependencies
```bash
cd functions
npm install
```

### 2. Set up Firebase CLI
```bash
npm install -g firebase-tools
firebase login
```

### 3. Deploy Functions
```bash
# From the project root
firebase deploy --only functions

# Or deploy a specific function
firebase deploy --only functions:fountainWebhook
```

### 4. Test Locally
```bash
# Start Firebase emulators
firebase emulators:start

# The webhook will be available at:
# http://localhost:5001/driver-onboarding-lh/us-central1/fountainWebhook
```

## Firestore Collections Created

### `fountain_applicants` Collection
Stores data received from Fountain webhooks.

**Document ID:** Email address (normalized)

**Structure:**
```javascript
{
  email: "driver@example.com",
  phone: "+353123456789",
  name: "John Doe",
  applicantId: "ABC123",
  stage: "ready_for_onboarding",
  status: "active",
  city: "Dublin",
  fountainData: { /* Complete webhook payload */ },
  createdAt: Timestamp,
  updatedAt: Timestamp,
  webhookReceivedAt: "2024-01-15T10:30:00Z",
  isActive: true
}
```

### `reports` Collection
Stores generated onboarding reports.

**Document ID:** Auto-generated report ID

**Structure:**
```javascript
{
  reportId: "REPORT_1234567890_driver_example_com",
  email: "driver@example.com",
  generatedAt: Timestamp,
  personalInfo: { /* Driver personal details */ },
  verificationDetails: { /* Vehicle and address info */ },
  availability: { /* Weekly availability */ },
  acknowledgements: { /* Policy acknowledgements */ },
  healthAndSafety: { /* Health status */ },
  onboardingStatus: { /* Completion status */ }
}
```

## Configuring Fountain Webhook

1. **Log in to Fountain Dashboard**
2. **Navigate to Settings > Webhooks**
3. **Add New Webhook:**
   - **URL:** `https://us-central1-driver-onboarding-lh.cloudfunctions.net/fountainWebhook`
   - **Trigger:** Select the stage that should trigger the webhook (e.g., "Application Approved" or custom stage)
   - **Method:** POST
   - **Content-Type:** application/json

4. **Test the Webhook:**
   - Use Fountain's test feature to send a test payload
   - Check Firebase Console > Functions > Logs to verify receipt

## Testing the Webhook

### Using cURL:
```bash
curl -X POST \
  https://us-central1-driver-onboarding-lh.cloudfunctions.net/fountainWebhook \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "phone": "+353123456789",
    "name": "Test Driver",
    "applicant_id": "TEST123",
    "stage": "ready_for_onboarding",
    "status": "active",
    "city": "Dublin"
  }'
```

### Expected Response:
```json
{
  "success": true,
  "message": "Applicant data received and stored successfully",
  "email": "test@example.com",
  "applicantId": "TEST123"
}
```

## Monitoring and Logs

### View Function Logs:
```bash
# Real-time logs
firebase functions:log --only fountainWebhook

# Or view in Firebase Console
# https://console.firebase.google.com/project/driver-onboarding-lh/functions/logs
```

### Common Issues:

1. **CORS Errors:**
   - CORS is enabled in the function
   - Check if request includes proper headers

2. **Authentication Errors:**
   - Ensure Firebase project is properly configured
   - Check that callable functions are invoked with authenticated context

3. **Missing Data:**
   - Verify Fountain webhook payload structure
   - Check function logs for data parsing issues

## Security Considerations

1. **Webhook Security:**
   - Consider implementing webhook signature verification
   - Fountain may provide signature headers for verification

2. **Data Validation:**
   - All incoming data is validated before storage
   - Email addresses are normalized

3. **Access Control:**
   - Firestore security rules restrict access
   - Only authenticated users can read their own data
   - Only Cloud Functions can write to sensitive collections

## Development Notes

- Functions use Node.js 18
- All timestamps use Firebase server timestamps
- Phone numbers are normalized for comparison
- Email addresses are stored in lowercase
- Complete webhook payload is preserved in `fountainData` field

