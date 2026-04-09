const fs = require('fs');
const { Client } = require('pg');

const CONNECTION_STRING = "postgresql://neondb_owner:npg_QG2gCJsFKoS0@ep-plain-bird-ag65tco0.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require";

async function applySchema() {
    const client = new Client({
        connectionString: CONNECTION_STRING
    });

    console.log("Connecting to Neon Postgres...");
    await client.connect();

    try {
        console.log("Connected successfully. Reading schema file...");
        const schema = fs.readFileSync('migrations/postgres_full.sql', 'utf8');

        console.log("Executing schema...");
        await client.query(schema);

        console.log("✅ Schema applied successfully!");
    } catch (err) {
        console.error("❌ Error applying schema:", err);
    } finally {
        await client.end();
        console.log("Disconnected.");
    }
}

applySchema();
