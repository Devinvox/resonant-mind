const { Client } = require("pg");

const CONNECTION_STRING = "postgresql://neondb_owner:npg_QG2gCJsFKoS0@ep-plain-bird-ag65tco0.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require";

async function run() {
    const client = new Client({ connectionString: CONNECTION_STRING });
    await client.connect();

    try {
        const tables = ['entities', 'observations', 'journals', 'images'];
        for (const t of tables) {
            try {
                const res = await client.query(`SELECT max(id) as mx FROM ${t}`);
                const maxId = res.rows[0].mx;

                const seq = await client.query(`SELECT pg_get_serial_sequence('${t}', 'id') as seqname`);
                const seqname = seq.rows[0].seqname;

                const curr = await client.query(`SELECT last_value FROM ${seqname}`);
                console.log(`Table ${t}: max_id=${maxId}, seq_last_value=${curr.rows[0].last_value}`);
            } catch (e) {
                console.log(`Table ${t} error: ${e.message}`);
            }
        }
    } finally {
        await client.end();
    }
}
run();
