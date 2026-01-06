const fs = require('fs');
const path = require('path');

async function executeSqlFile() {
  try {
    console.log('Reading SQL file...');
    const sqlFile = path.join(__dirname, 'APPLY_PUSH_NOTIFICATION_SYSTEM.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    const supabaseUrl = 'https://jtmmeumzjcldqukpqcfi.supabase.co';
    const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0bW1ldW16amNsZHF1a3BxY2ZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzMyNTc1NSwiZXhwIjoyMDc4OTAxNzU1fQ.V1_E3zWDCGcI04WTrhJC5GfpV8kJBGx9_-g6C8-lQVU';

    console.log('Executing SQL via Supabase REST API...');
    
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    console.log('✅ SQL executed successfully! Database triggers have been applied.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    
    // Try alternative method using pg-connection-string and direct pg client
    console.log('\n Trying alternative method with connection string...');
    executeWithConnectionString();
  }
}

async function executeWithConnectionString() {
  try {
    const { Client } = require('pg');
    const sql = fs.readFileSync(path.join(__dirname, 'APPLY_PUSH_NOTIFICATION_SYSTEM.sql'), 'utf8');
    
    // Direct database URL
    const connectionString = 'postgresql://postgres:9OkN2kZsIoAjVSAP@db.jtmmeumzjcldqukpqcfi.supabase.co:5432/postgres';
    
    const client = new Client({
      connectionString,
      ssl: {
        rejectUnauthorized: false
      }
    });

    console.log('Connecting to database with connection string...');
    await client.connect();
    console.log('Connected successfully!');

    console.log('Executing SQL...');
    await client.query(sql);
    console.log('✅ SQL executed successfully! Database triggers have been applied.');

    await client.end();
  } catch (error) {
    console.error('❌ Alternative method also failed:', error.message);
    process.exit(1);
  }
}

executeSqlFile();
