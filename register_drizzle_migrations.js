const { Client } = require('pg');
const fs = require('fs');
const crypto = require('crypto');
require('dotenv').config({ path: '.env' });

function calculateHash(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  await client.connect();
  console.log('Connected to DB');

  try {
    // 1. Create schema and table in the 'drizzle' schema
    await client.query(`CREATE SCHEMA IF NOT EXISTS "drizzle";`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
        "id" SERIAL PRIMARY KEY,
        "hash" text NOT NULL,
        "created_at" bigint
      );
    `);
    console.log('Created drizzle.__drizzle_migrations table');

    // 2. Clear existing rows in the schema table
    await client.query('DELETE FROM drizzle.__drizzle_migrations;');

    // 3. Compute hashes
    const hash0 = calculateHash('./drizzle/0000_happy_echo.sql');
    const hash1 = calculateHash('./drizzle/0001_flimsy_shinobi_shaw.sql');
    
    console.log('0000 Hash:', hash0);
    console.log('0001 Hash:', hash1);

    // 4. Insert records
    await client.query(`
      INSERT INTO drizzle.__drizzle_migrations (id, hash, created_at)
      VALUES (1, $1, $2), (2, $3, $4);
    `, [hash0, 1781110700923, hash1, 1781760895149]);
    console.log('Inserted migration records into drizzle.__drizzle_migrations successfully!');

    // 5. Clean up public.__drizzle_migrations
    await client.query('DROP TABLE IF EXISTS "public"."__drizzle_migrations";');
    console.log('Dropped public.__drizzle_migrations');

  } catch (err) {
    console.error('Error inserting migrations:', err);
  } finally {
    await client.end();
  }
}

run();
