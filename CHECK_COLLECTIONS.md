# How to Check Collections in Firestore Database

## Quick Methods

### Method 1: Firebase Console (Easiest - No Code Required)
1. Go to: https://console.firebase.google.com/project/driver-onboarding-lh/firestore/data
2. All collections will be listed in the left sidebar
3. Click on any collection to see its documents

### Method 2: Using the Cloud Function (After Deployment)
I've created a `listCollections` callable function that you can use:

**Option A: From Admin Dashboard**
- The function is already integrated into `adminServices.listCollections()`
- You can add a button in the admin dashboard to call this

**Option B: Using Firebase CLI**
```bash
# After deploying functions
firebase functions:shell
# Then call:
listCollections()
```

**Option C: From Browser Console (when logged in as admin)**
```javascript
import { httpsCallable } from 'firebase/functions';
import { functions } from './lib/firebase';

const listCollections = httpsCallable(functions, 'listCollections');
const result = await listCollections();
console.log(result.data);
```

### Method 3: Using the Script (Requires Authentication)
If you have Firebase credentials set up:

```bash
cd functions
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json node utils/list-collections.js
```

Or authenticate with Firebase CLI first:
```bash
firebase login
# Then the script should work
```

## What I've Created

1. **Cloud Function**: `functions/utils/list-collections-function.js`
   - Callable function that lists all collections with document counts
   - Only accessible by admins
   - Already added to `functions/index.js`

2. **Standalone Script**: `functions/utils/list-collections.js`
   - Can be run directly with Node.js
   - Requires Firebase Admin SDK credentials

3. **Admin Service Method**: Added `adminServices.listCollections()` 
   - Can be called from the admin dashboard
   - Uses the cloud function

## Next Steps

The easiest way right now is to:
1. **Use Firebase Console** - Just visit the link above
2. **Or deploy the function** and call it from your admin dashboard

Would you like me to add a UI button in the admin dashboard to display the collections?

