#!/usr/bin/env node

/**
 * Initialize First Super Admin Script
 * 
 * This script creates the first super admin in the Firestore admins collection.
 * 
 * Run this script from the project root:
 *   npm run init-super-admin
 *   OR
 *   node scripts/initialize-super-admin.cjs
 * 
 * Or with custom email/name:
 *   node scripts/initialize-super-admin.cjs --email=hari@laundryheap.com --name=Hari
 * 
 * Make sure you have Firebase credentials set up:
 *   - Set GOOGLE_APPLICATION_CREDENTIALS environment variable, OR
 *   - Place serviceAccountKey.json in the project root, OR
 *   - Use 'firebase login' and 'firebase use <project-id>'
 */

const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

// Initialize Firebase Admin
let projectId = process.env.GCLOUD_PROJECT || 
                process.env.GOOGLE_CLOUD_PROJECT ||
                process.env.FIREBASE_PROJECT_ID;

// Try to read from .firebaserc
if (!projectId) {
  try {
    const firebasercPath = path.join(__dirname, '..', '.firebaserc');
    if (fs.existsSync(firebasercPath)) {
      const firebasercContent = fs.readFileSync(firebasercPath, 'utf8');
      const firebaserc = JSON.parse(firebasercContent);
      projectId = firebaserc.projects?.default;
      if (projectId) {
        console.log(`✅ Found project ID from .firebaserc: ${projectId}`);
      }
    }
  } catch (e) {
    // Ignore - will try other methods
    console.log('Could not read .firebaserc:', e.message);
  }
}

// If still no project ID, try to get it from firebase.json or ask user
if (!projectId) {
  try {
    const firebaseJsonPath = path.join(__dirname, '../firebase.json');
    if (fs.existsSync(firebaseJsonPath)) {
      // firebase.json doesn't have project ID, but we can try to infer from environment
      console.log('⚠️  No project ID found. Trying to use default Firebase project...');
    }
  } catch (e) {
    // Ignore
  }
  
  if (!projectId) {
    console.error('❌ No Firebase project ID found.');
    console.error('\n💡 To fix this, run one of:');
    console.error('   1. firebase use <your-project-id>');
    console.error('   2. export GCLOUD_PROJECT=<your-project-id>');
    console.error('   3. Ensure .firebaserc exists in the project root\n');
    process.exit(1);
  }
}

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    // Option 1: Try to use service account file if available
    const serviceAccountPath = path.join(__dirname, '../serviceAccountKey.json');
    if (fs.existsSync(serviceAccountPath)) {
      try {
        const serviceAccount = require(serviceAccountPath);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: projectId || serviceAccount.project_id
        });
        console.log('✅ Using service account key file');
      } catch (e) {
        console.warn('⚠️  Could not load service account key, trying other methods...');
      }
    }
    
    // Option 2: Try environment variable
    if (!admin.apps.length && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      try {
        const serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: projectId || serviceAccount.project_id
        });
        console.log('✅ Using credentials from GOOGLE_APPLICATION_CREDENTIALS');
      } catch (e) {
        console.warn('⚠️  Could not load credentials from environment variable...');
      }
    }
    
    // Option 3: Fallback to Application Default Credentials (requires 'firebase login')
    if (!admin.apps.length) {
      if (projectId) {
        admin.initializeApp({
          projectId: projectId
        });
        console.log('✅ Using Application Default Credentials');
      } else {
        throw new Error('No project ID found. Please set GCLOUD_PROJECT or ensure .firebaserc exists.');
      }
    }
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin:', error.message);
    console.error('\n💡 To fix this:');
    console.error('   1. Run: firebase login');
    console.error('   2. Run: firebase use <your-project-id>');
    console.error('   3. Or set GOOGLE_APPLICATION_CREDENTIALS environment variable');
    console.error('   4. Or place serviceAccountKey.json in the project root\n');
    process.exit(1);
  }
}

const db = admin.firestore();

// Parse command line arguments
const args = process.argv.slice(2);
let email = 'hari@laundryheap.com';
let name = 'Hari';

args.forEach(arg => {
  if (arg.startsWith('--email=')) {
    email = arg.split('=')[1];
  } else if (arg.startsWith('--name=')) {
    name = arg.split('=')[1];
  }
});

async function initializeSuperAdmin() {
  try {
    console.log('🚀 Initializing super admin...');
    console.log(`Email: ${email}`);
    console.log(`Name: ${name}`);
    console.log(`Project: ${projectId}\n`);

    const normalizedEmail = email.toLowerCase().trim();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      throw new Error('Invalid email format');
    }

    // Check if any admins exist
    const adminsRef = db.collection('admins');
    const adminsSnapshot = await adminsRef.get();

    if (!adminsSnapshot.empty) {
      // Check if super_admin already exists
      const superAdminExists = adminsSnapshot.docs.some(
        (doc) => doc.data().role === 'super_admin'
      );
      
      if (superAdminExists) {
        const existingSuperAdmin = adminsSnapshot.docs.find(
          (doc) => doc.data().role === 'super_admin'
        );
        console.log('⚠️  A super admin already exists:');
        console.log(`   Email: ${existingSuperAdmin.id}`);
        console.log(`   Name: ${existingSuperAdmin.data().name}`);
        console.log(`   Role: ${existingSuperAdmin.data().role}\n`);
        
        // Check if it's the same email
        if (existingSuperAdmin.id === normalizedEmail) {
          console.log('✅ This email is already the super admin. No action needed.');
          return;
        } else {
          throw new Error('A super admin already exists. Cannot initialize another one.');
        }
      }
    }

    // Create the first super admin
    const adminRef = adminsRef.doc(normalizedEmail);
    await adminRef.set({
      email: normalizedEmail,
      name: name || normalizedEmail.split('@')[0],
      role: 'super_admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('✅ Super admin created successfully!');
    console.log(`\n   Email: ${normalizedEmail}`);
    console.log(`   Name: ${name || normalizedEmail.split('@')[0]}`);
    console.log(`   Role: super_admin\n`);
    console.log('You can now log in and access the admin panel with full permissions.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
initializeSuperAdmin();

