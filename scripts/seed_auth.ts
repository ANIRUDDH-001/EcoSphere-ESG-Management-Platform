import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing URL or Service Role Key. Skipping auth seed.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const users = [
  { email: 'admin@ecosphere.test', password: 'password123', name: 'Admin User' },
  { email: 'manager@ecosphere.test', password: 'password123', name: 'Manager User' },
  { email: 'employee@ecosphere.test', password: 'password123', name: 'Employee User' },
  { email: 'emp2@ecosphere.test', password: 'password123', name: 'Extra Employee 1' },
  { email: 'emp3@ecosphere.test', password: 'password123', name: 'Extra Employee 2' },
];

async function run() {
  console.log('--- Seeding Auth Users ---');
  for (const u of users) {
    const { data: existing, error: getErr } = await supabase.auth.admin.listUsers();
    if (getErr) {
      console.error('Failed to list users', getErr);
      process.exit(1);
    }
    const found = existing.users.find(x => x.email === u.email);
    let userId = found?.id;

    if (!found) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { full_name: u.name }
      });
      if (error) {
        console.error(`Failed to create ${u.email}:`, error);
        process.exit(1);
      }
      userId = data.user.id;
      console.log(`Created user: ${u.email} (ID: ${userId})`);
    } else {
      console.log(`User exists: ${u.email} (ID: ${userId})`);
    }
    
    // Update profile with name since auth.users metadata doesn't automatically sync to profile full_name without a trigger modification
    await supabase.from('profiles').update({ full_name: u.name }).eq('id', userId);
  }
  console.log('--- Auth Seeding Complete ---');
}

run();
