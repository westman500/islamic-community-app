const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function executeSqlFile() {
  const client = new Client({
    host: 'aws-0-eu-central-1.pooler.supabase.com',
    port: 6543,
    user: 'postgres.jtmmeumzjcldqukpqcfi',
    password: '9OkN2kZsIoAjVSAP',
    database: 'postgres',
    ssl: false
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully!');

    const sqlFile = path.join(__dirname, 'APPLY_PUSH_NOTIFICATION_SYSTEM.sql');
    console.log(`Reading SQL file: ${sqlFile}`);
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('Executing SQL...');
    await client.query(sql);
    console.log('✅ SQL executed successfully! Database triggers have been applied.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

executeSqlFile();
