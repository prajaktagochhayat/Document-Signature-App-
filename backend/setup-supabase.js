import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucketName = process.env.SUPABASE_BUCKET_NAME || 'pdfs';

async function setupSupabase() {
  console.log('⚡ Starting Supabase setup checklist...');

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not configured in your backend/.env file.');
    console.log('Please open your backend/.env file and fill in those values, then run this script again.');
    process.exit(1);
  }

  console.log(`🔗 Connecting to Supabase at: ${supabaseUrl}`);
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });

  // 1. Verify Storage Buckets
  console.log(`\n📦 Initializing storage bucket: "${bucketName}"...`);
  try {
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) throw listError;

    const exists = buckets.some(b => b.name === bucketName);
    if (exists) {
      console.log(`✅ Bucket "${bucketName}" already exists.`);
    } else {
      console.log(`➕ Creating public bucket "${bucketName}"...`);
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 52428800 // 50MB
      });
      if (createError) throw createError;
      console.log(`✅ Bucket "${bucketName}" created successfully!`);
    }
  } catch (err) {
    console.error('❌ Storage setup failed:', err.message || err);
  }

  // 2. Schema check / Table query verification
  console.log('\n📊 Verifying database tables connection...');
  const tables = ['users', 'documents', 'signatures', 'audit_logs'];
  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select('count').limit(1);
      if (error) {
        if (error.code === '42P01') {
          console.log(`⚠️  Table "${table}" does not exist yet. Please run the SQL queries in Supabase SQL Editor.`);
        } else {
          throw error;
        }
      } else {
        console.log(`✅ Table "${table}" is accessible.`);
      }
    } catch (err) {
      console.error(`❌ Table "${table}" connection test failed:`, err.message || err);
    }
  }

  console.log('\n🏁 Supabase checklist complete!');
}

setupSupabase();
