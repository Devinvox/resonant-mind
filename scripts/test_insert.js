const { Client } = require("pg");

const CONNECTION_STRING = "postgresql://neondb_owner:npg_QG2gCJsFKoS0@ep-plain-bird-ag65tco0.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require";

async function run() {
    const client = new Client({ connectionString: CONNECTION_STRING });
    await client.connect();

    try {
        console.log("Testing Entity Insertion...");
        const entRes = await client.query(
            `INSERT INTO entities (name, entity_type, primary_context) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING id`,
            ['Test Entity ' + Date.now(), 'concept', 'default']
        );
        console.log("Entity inserted, result:", entRes.rows);

        const entityId = entRes.rows.length > 0 ? entRes.rows[0].id : 1;

        console.log("Testing Observation Insertion...");
        const obsRes = await client.query(
            `INSERT INTO observations (entity_id, content, salience, emotion, weight, certainty, source, context) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
            [entityId, 'Test observation data', 'active', null, 'medium', 'believed', 'conversation', 'default']
        );
        console.log("Observation inserted, result:", obsRes.rows);

    } catch (e) {
        console.error("❌ Postgres Execution Error:", e);
    } finally {
        await client.end();
    }
}
run();
