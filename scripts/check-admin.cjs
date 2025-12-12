const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

let projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
if (!projectId) {
  try {
    const firebasercPath = path.join(__dirname, '..', '.firebaserc');
    const firebasercContent = fs.readFileSync(firebasercPath, 'utf8');
    const firebaserc = JSON.parse(firebasercContent);
    projectId = firebaserc.projects?.default;
  } catch (e) {}
}

if (!admin.apps.length) {
  admin.initializeApp({ projectId: projectId });
}

const db = admin.firestore();

async function checkAdmin() {
  try {
    const email = 'hari@laundryheap.com';
    const adminRef = db.collection('admins').doc(email);
    const adminDoc = await adminRef.get();
    
    console.log('Checking admin:', email);
    console.log('Document exists?', adminDoc.exists);
    
    if (adminDoc.exists) {
      console.log('\n✅ Admin document found:');
      console.log(JSON.stringify(adminDoc.data(), null, 2));
    } else {
      console.log('\n❌ Admin document does not exist in Firestore');
      console.log('Please run: npm run init-super-admin');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkAdmin();
