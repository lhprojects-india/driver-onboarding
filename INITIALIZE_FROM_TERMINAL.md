# Initialize Collections from Terminal

## Quick Setup (One-time)

You need to set up application default credentials first. Run this command in your terminal:

```bash
gcloud auth application-default login
```

This will open a browser window for you to authenticate. Once done, you can run:

```bash
cd functions
node utils/init-collections-simple.js
```

## Alternative: Use Firebase Console (Easiest)

If you prefer not to set up credentials, you can create the collections manually:

1. Go to: https://console.firebase.google.com/project/driver-onboarding-lh/firestore/data
2. For each collection, click "Start collection":
   - `fountain_applicants`
   - `onboarding`  
   - `verification`
3. Add a temporary document (ID: `_temp`, field: `_created` = `true`)
4. Delete the temp document after verifying the collection exists

## Alternative: Deploy and Use Cloud Function

After deploying functions:

```bash
firebase deploy --only functions:initializeCollections
firebase functions:shell
# Then call:
initializeCollections()
```

