# Initialize Required Collections

This guide explains how to create the missing Firestore collections that are required by the application.

## Missing Collections

Based on your current active collections, you need to create:

1. **`fountain_applicants`** - Stores applicant data from Fountain webhooks
2. **`onboarding`** - Tracks onboarding progress for each driver
3. **`verification`** - Stores phone verification status for drivers

## Method 1: Using Cloud Function (Recommended)

After deploying the functions, you can call the initialization function:

### From Browser Console (when logged in as admin):
```javascript
import { httpsCallable } from 'firebase/functions';
import { functions } from './lib/firebase';

const initializeCollections = httpsCallable(functions, 'initializeCollections');
const result = await initializeCollections();
console.log(result.data);
```

### From Admin Dashboard:
The function is already integrated into `adminServices.initializeCollections()`. You can add a button in the admin dashboard to call this.

### Using Firebase CLI:
```bash
firebase functions:shell
# Then call:
initializeCollections()
```

## Method 2: Using the Script Directly

If you have Firebase credentials set up:

```bash
cd functions
node utils/initialize-collections.js
```

Or with Firebase CLI authentication:
```bash
firebase login
cd functions
node utils/initialize-collections.js
```

## Method 3: Manual Creation (Simplest)

You can also create these collections manually in the Firebase Console:

1. Go to: https://console.firebase.google.com/project/driver-onboarding-lh/firestore/data
2. Click "Start collection" for each missing collection:
   - `fountain_applicants`
   - `onboarding`
   - `verification`
3. Add a temporary document (you can delete it later)
   - Document ID: `_temp`
   - Field: `_created` = `true`

The collections will be created automatically when the first real document is written, but creating them manually ensures they exist immediately.

## Clean Up Placeholders

If you used the initialization script, it creates placeholder documents. You can clean them up:

### Using Cloud Function:
```javascript
const cleanupPlaceholders = httpsCallable(functions, 'cleanupPlaceholders');
const result = await cleanupPlaceholders();
```

### Using Script:
```javascript
const { cleanupPlaceholders } = require('./utils/initialize-collections');
await cleanupPlaceholders();
```

Or manually delete the `_placeholder` documents from each collection in the Firebase Console.

## What Gets Created

The initialization script creates placeholder documents with:
- Document ID: `_placeholder`
- Fields:
  - `_initialized`: `true`
  - `_note`: Explanation of the placeholder
  - `createdAt`: Server timestamp

These placeholders can be safely deleted once you verify the collections exist.

## Verification

After initialization, verify the collections exist:
1. Check Firebase Console
2. Or use the `listCollections` function to see all collections

