const { Client } = require("pg");

const CONNECTION_STRING = "postgresql://neondb_owner:npg_QG2gCJsFKoS0@ep-plain-bird-ag65tco0.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require";

async function run() {
    const client = new Client({ connectionString: CONNECTION_STRING });
    await client.connect();

    try {
        const tables = ['entities', 'observations', 'journals'];
        for (const t of tables) {
            console.log(`\n=== SCHEMA FOR ${t.toUpperCase()} ===`);
            const res = await client.query(`
                SELECT column_name, data_type, column_default, is_nullable
                FROM information_schema.columns
                WHERE table_name = '${t}'
                ORDER BY ordinal_position;
            `);
            res.rows.forEach(r => {
                console.log(`${r.column_name.padEnd(20)} | ${r.data_type.padEnd(15)} | Nullable: ${r.is_nullable} | Default: ${r.column_default || 'none'}`);
            });
        }
    } finally {
        await client.end();
    }
}
run();
