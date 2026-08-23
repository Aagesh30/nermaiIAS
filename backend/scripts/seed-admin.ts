import { db } from '../infrastructure/firebase';
import bcrypt from 'bcrypt';

export async function seedSuperAdmin() {
  try {
    const adminRef = db.collection('admin_users');
    const snapshot = await adminRef.where('role', '==', 'super_admin').limit(1).get();
    if (snapshot.empty) {
      console.log('⏳ No super_admin found in Firestore. Seeding default super_admin...');
      const passwordHash = await bcrypt.hash('nermaiadmin@unistrix', 12);
      await adminRef.doc('super_admin_root').set({
        username: 'admin@nermai.com',
        email: 'admin@nermai.com',
        name: 'Super Admin',
        role: 'super_admin',
        passwordHash: passwordHash,
        tenantId: 'default_tenant',
        isDeleted: false,
        createdAt: new Date().toISOString()
      });
      console.log('✅ Default super_admin seeded successfully in Firestore.');
    } else {
      console.log('ℹ️ Super admin already exists in Firestore. Seeding skipped.');
    }

    const devSnapshot = await adminRef.where('role', '==', 'developer').limit(1).get();
    if (devSnapshot.empty) {
      console.log('⏳ No developer found in Firestore. Seeding default developer...');
      const devPasswordHash = await bcrypt.hash('Unistrix@24252630', 12);
      await adminRef.doc('developer_root').set({
        username: 'developer@unistrix',
        email: 'developer@unistrix',
        name: 'Unistrix Developer',
        role: 'developer',
        passwordHash: devPasswordHash,
        tenantId: 'default_tenant',
        isDeleted: false,
        createdAt: new Date().toISOString()
      });
      console.log('✅ Default developer seeded successfully in Firestore.');
    }

    const staffRef = db.collection('staff');
    const staffDoc = await staffRef.doc('super_admin_root').get();
    if (!staffDoc.exists) {
      console.log('⏳ Seeding super admin into staff directory...');
      await staffRef.doc('super_admin_root').set({
        id: 'super_admin_root',
        employeeId: 'EMP-000001',
        firstName: 'Super',
        lastName: 'Admin',
        dateOfBirth: '',
        gender: '',
        bloodGroup: '',
        email: 'admin@nermai.com',
        phone: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        designation: 'Administrator',
        department: 'Management',
        qualification: '',
        experienceYears: '',
        salary: '',
        joiningDate: new Date().toISOString().split('T')[0],
        photoUrl: '',
        emergencyContact: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system',
        role: 'super_admin',
        customPermissions: {},
        isDeleted: false,
        deletedAt: null
      });
      console.log('✅ Super admin seeded into staff directory successfully.');
    }
  } catch (error) {
    console.error('❌ Failed to seed default super_admin:', error);
  }
}
