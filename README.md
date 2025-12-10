# Laundryheap Driver Onboarding

A React-based driver onboarding application for Laundryheap with Firebase backend integration and Fountain webhook support.

## Architecture Overview

This application follows a complete workflow:

1. **Fountain Webhook** → Receives applicant data from Fountain ATS
2. **Driver Login** → Driver logs in with email and phone verification
3. **Onboarding Flow** → Driver completes onboarding steps
4. **Report Generation** → Comprehensive report created upon completion

## Features

- **Fountain Integration** - Webhook receives and stores applicant data
- **Phone Verification** - Verifies driver against Fountain data (no OTP required)
- **Complete Onboarding Flow** - Step-by-step driver information collection
- **Firestore Database** - Real-time data persistence
- **Report Generation** - Automated report creation with acknowledgements
- **Form Validation** - Client-side validation with sanitization
- **Responsive Design** - Mobile-first responsive layout with Tailwind CSS
- **Progress Tracking** - Step-by-step progress saving

## Browser Support

This application is tested and supported on the following browsers:

### ✅ Fully Supported Browsers

- **Google Chrome** (version 90 and above) - Recommended
- **Mozilla Firefox** (version 88 and above)
- **Microsoft Edge** (version 90 and above)
- **Safari** (version 14 and above) - macOS and iOS
- **Opera** (version 76 and above)

### ⚠️ Limited Support / Known Issues

- **Brave Browser** - May experience issues due to privacy shields blocking Firebase and third-party services
  - **Solution**: Disable Brave Shields for this application
    - Click the Brave Shields icon in the address bar
    - Toggle "Shields" to "Down" for this site
    - Refresh the page
  - **Alternative**: Use Chrome, Firefox, Edge, or Safari for optimal experience

### ❌ Unsupported Browsers

- Internet Explorer 11 and below
- Legacy browsers without ES2020 support
- Browsers without JavaScript enabled

### Browser Requirements

- JavaScript must be enabled
- Cookies and LocalStorage must be enabled (required for Firebase authentication)
- Third-party cookies may be required for Firebase services
- Modern ES2020+ JavaScript support

### Troubleshooting Browser Issues

If you experience issues with the application:

1. **Clear browser cache and cookies** for this site
2. **Disable browser extensions** that may interfere (ad blockers, privacy tools)
3. **Check browser console** for error messages (F12 → Console tab)
4. **Ensure JavaScript is enabled** in browser settings
5. **Try a different supported browser** if issues persist

For Brave Browser specifically:
- Disable Brave Shields for the application domain
- Allow third-party cookies for Firebase services
- Disable aggressive privacy settings that may block Firebase requests

## Setup Instructions

### 1. Firebase Configuration

1. **Create a Firebase Project:**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project or use existing one
   - Enable Authentication and Firestore Database

2. **Configure Authentication:**
   - Go to Authentication > Sign-in method
   - Enable Email/Password provider (for demo purposes)

3. **Configure Firestore:**
   - Go to Firestore Database
   - Create a Firestore database in production mode
   - Set up security rules (see below)

4. **Get Firebase Configuration:**
   - Go to Project Settings > General
   - Scroll down to "Your apps" section
   - Add a web app or use existing one
   - Copy the configuration values

5. **Create Environment Variables:**
   Create a `.env` file in the root directory with your Firebase config:

   ```env
   # Firebase Configuration
   VITE_FIREBASE_API_KEY=your_api_key_here
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id

   # EmailJS Configuration (for OTP emails)
   VITE_EMAILJS_SERVICE_ID=your_emailjs_service_id
   VITE_EMAILJS_TEMPLATE_ID=your_emailjs_template_id
   VITE_EMAILJS_PUBLIC_KEY=your_emailjs_public_key
   ```

### 2. Firebase Functions Setup

1. **Install Firebase CLI:**
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

2. **Install Functions Dependencies:**
   ```bash
   cd functions
   npm install
   cd ..
   ```

3. **Deploy Functions:**
   ```bash
   firebase deploy --only functions
   ```

4. **Configure Fountain Webhook:**
   - Webhook URL: `https://us-central1-driver-onboarding-lh.cloudfunctions.net/fountainWebhook`
   - Configure in Fountain Dashboard → Settings → Webhooks
   - Set trigger stage (e.g., "Application Approved")
   - Method: POST
   - Content-Type: application/json

5. **Test Webhook:**
   ```bash
   ./test-webhook.sh test@example.com "+353123456789" "Test Driver"
   ```

### 3. Firestore Security Rules

Create the following security rules in your Firestore database:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Drivers collection - only authenticated users can access their own data
    match /drivers/{email} {
      allow read, write: if request.auth != null &&
        request.auth.token.email == email;
    }

    // Availability collection
    match /availability/{email} {
      allow read, write: if request.auth != null &&
        request.auth.token.email == email;
    }

    // Verification collection
    match /verification/{email} {
      allow read, write: if request.auth != null &&
        request.auth.token.email == email;
    }
  }
}
```

### 4. Installation and Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Database Structure

The application uses the following Firestore collections:

### 1. `fountain_applicants` Collection
Stores applicant data received from Fountain webhooks.

**Document ID:** Email address (normalized to lowercase)

```javascript
{
  email: "driver@example.com",
  phone: "+353123456789",
  name: "John Doe",
  applicantId: "FOUNTAIN_ABC123",
  stage: "ready_for_onboarding",
  status: "active",
  city: "Dublin",
  fountainData: { /* Complete webhook payload */ },
  createdAt: timestamp,
  updatedAt: timestamp,
  webhookReceivedAt: "2024-01-15T10:30:00Z",
  isActive: true
}
```

### 2. `drivers` Collection
Stores driver information and onboarding progress.

```javascript
{
  email: "driver@example.com",
  name: "John Doe",
  phone: "+353123456789",
  city: "Dublin",
  smokingStatus: "non-smoker",
  hasPhysicalDifficulties: false,
  onboardingStatus: "completed",
  
  // Acknowledgements
  cancellationPolicyAcknowledged: true,
  cancellationPolicyAcknowledgedAt: "2024-01-15T11:00:00Z",
  feeStructureAcknowledged: true,
  feeStructureAcknowledgedAt: "2024-01-15T11:05:00Z",
  
  // Progress tracking
  progress_personal_details: { /* step data */ },
  progress_liabilities: { confirmed: true, confirmedAt: "..." },
  progress_availability: { /* step data */ },
  progress_verification: { /* step data */ },
  
  createdAt: timestamp,
  updatedAt: timestamp,
  completedAt: timestamp,
  reportId: "REPORT_..."
}
```

### 3. `availability` Collection
```javascript
{
  email: "driver@example.com",
  availability: {
    Mondays: { noon: true, evening: false },
    Tuesdays: { noon: false, evening: true },
    // ... other days
  },
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### 4. `verification` Collection
```javascript
{
  email: "driver@example.com",
  vehicle: "Toyota Camry 2020",
  licensePlate: "12-D-1234",
  address: "123 Main St, Dublin",
  city: "Dublin",
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### 5. `reports` Collection
Comprehensive onboarding reports generated upon completion.

**Document ID:** Auto-generated report ID

```javascript
{
  reportId: "REPORT_1234567890_driver_example_com",
  email: "driver@example.com",
  generatedAt: timestamp,
  generatedDate: "2024-01-15T12:00:00Z",
  personalInfo: { name, email, phone, city },
  verificationDetails: { vehicle, licensePlate, address, city },
  availability: { /* weekly availability */ },
  acknowledgements: {
    liabilities: true,
    liabilitiesDate: "...",
    cancellationPolicy: true,
    cancellationPolicyDate: "...",
    feeStructure: true,
    feeStructureDate: "..."
  },
  healthAndSafety: {
    smokingStatus: "non-smoker",
    hasPhysicalDifficulties: false
  },
  onboardingStatus: {
    status: "completed",
    completedAt: timestamp,
    startedAt: timestamp
  }
}
```

## Complete Workflow

### 1. Fountain Webhook (Backend)
- Fountain sends webhook when applicant reaches specific stage
- Cloud Function receives applicant data (email, phone, name, etc.)
- Data stored in `fountain_applicants` collection
- Webhook URL: `https://us-central1-driver-onboarding-lh.cloudfunctions.net/fountainWebhook`

### 2. Driver Authentication (Frontend)
- Driver enters email on Welcome page
- System checks if email exists in `fountain_applicants` collection
- If found, driver enters phone number on Verify page
- System verifies phone matches Fountain data using `verifyApplicant` Cloud Function
- Upon successful verification, driver is authenticated

### 3. Onboarding Flow (Frontend)
1. **Welcome** - Email input
2. **Phone Verification** - Phone number verification against Fountain data
3. **Confirm Details** - Name, phone, city selection
4. **Introduction** - Company overview
5. **About** - Company information
6. **Onboarding Stages** - Process explanation
7. **Role** - Driver responsibilities
8. **Availability** - Weekly availability selection (with grid)
9. **Intro Complete** - Midpoint confirmation
10. **Liabilities** - Policy acknowledgment with checkbox
11. **Smoking/Fitness Check** - Health status confirmation
12. **Blocks Classification** - Route information
13. **Cancellation Policy** - 48-hour policy acknowledgment
14. **Fee Structure** - Payment structure acknowledgment
15. **Completion** - Thank you page

### 4. Report Generation (Backend)
- Upon onboarding completion, `generateOnboardingReport` Cloud Function is called
- Collects all driver data from multiple collections
- Creates comprehensive report with acknowledgements
- Stores report in `reports` collection
- Report ID saved in driver's record

## Features Implemented

✅ **Fountain Webhook Integration** - Receives and stores applicant data
✅ **Phone Verification** - Verifies driver against Fountain data (no OTP)
✅ **Firebase Cloud Functions** - Backend webhook and callable functions
✅ **Firestore Integration** - Real-time data persistence across 5 collections
✅ **Form Validation** - Client-side validation with sanitization
✅ **Error Handling** - Comprehensive error management
✅ **Progress Tracking** - Step-by-step progress saving
✅ **Acknowledgement Tracking** - Tracks policy acknowledgements with timestamps
✅ **Report Generation** - Automated comprehensive report creation
✅ **Responsive Design** - Mobile-first responsive layout
✅ **Loading States** - User feedback during operations
✅ **Security Rules** - Proper Firestore security rules

## Testing

### Test Fountain Webhook

Use the provided test script to simulate a Fountain webhook:

```bash
# Test with default values
./test-webhook.sh

# Test with custom values
./test-webhook.sh "driver@test.com" "+353987654321" "Jane Smith"
```

### Test Complete Flow

1. **Send Webhook:**
   ```bash
   ./test-webhook.sh your-email@example.com "+353123456789" "Your Name"
   ```

2. **Login to Web App:**
   - Open http://localhost:5173 (or your deployed URL)
   - Enter: `your-email@example.com`
   - Click Continue

3. **Verify Phone:**
   - Enter: `+353123456789`
   - Click Continue

4. **Complete Onboarding:**
   - Fill in all steps
   - Complete until the end

5. **Check Results:**
   - Firebase Console → Firestore → Check collections:
     - `fountain_applicants` - Webhook data
     - `drivers` - Driver profile with progress
     - `availability` - Weekly availability
     - `verification` - Vehicle details
     - `reports` - Generated report

### Local Development with Firebase Emulators

```bash
# Start Firebase emulators
firebase emulators:start

# In another terminal, start the web app
npm run dev

# Test webhook locally
./test-webhook.sh
# (Make sure to update WEBHOOK_URL in script to use localhost)
```

## Development Notes

- Uses Firebase v9+ modular SDK with Cloud Functions
- Authentication uses phone verification against Fountain data (no OTP/email needed)
- All form data is validated and sanitized before saving
- Progress is saved at each step for recovery
- Error messages are user-friendly and specific
- Acknowledgements are tracked with timestamps
- Reports are generated automatically upon completion
- Phone numbers are normalized for flexible matching

## Troubleshooting

### Common Issues

1. **Firebase Connection Issues:**
   - Verify Firebase configuration in `.env`
   - Check Firebase project settings
   - Ensure Firestore is enabled

2. **Authentication Problems:**
   - Check authentication provider settings
   - Verify security rules allow access
   - Check browser console for errors

3. **EmailJS Issues:**
   - Verify EmailJS configuration
   - Check email service setup
   - Test email template

4. **Build Issues:**
   - Clear node_modules and reinstall
   - Check for environment variable issues
   - Verify all dependencies are installed

## Production Deployment

1. **Environment Variables:** Ensure all production environment variables are set
2. **Security Rules:** Update Firestore security rules for production
3. **Authentication:** Configure proper authentication providers
4. **Email Service:** Set up production email service
5. **Build:** Run `npm run build` and deploy the dist folder

## License

This project is proprietary to Laundryheap.
