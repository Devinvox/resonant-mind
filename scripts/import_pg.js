const fs = require('fs');
const { Client } = require('pg');

const CONNECTION_STRING = "postgresql://neondb_owner:npg_QG2gCJsFKoS0@ep-plain-bird-ag65tco0.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require";

// Properly ordered to respect Postgres Foreign Key constraints since Neon DB
// restricts standard roles from disabling constraints via session_replication_role.
const tables = [
    // Level 0: No foreign keys
    "entities", "threads", "context_entries", "relational_state",
    "identity", "journals", "subconscious", "relations",
    "tensions", "vault_chunks", "session_chunks", "notes",
    "consolidation_groups",

    // Level 1: References entities or notes
    "observations", "note_sits",

    // Level 2: References observations
    "observation_versions", "images", "co_surfacing",
    "observation_sits", "daemon_proposals", "orphan_observations"
];

async function importData() {
    const client = new Client({ connectionString: CONNECTION_STRING });
    await client.connect();
    console.log("Connected to Neon DB for import.");

    try {
        for (const table of tables) {
            const filepath = `d1_export/${table}.json`;
            if (!fs.existsSync(filepath)) {
                console.log(`⚠️ Skipping ${table} - file not found.`);
                continue;
            }

            const raw = fs.readFileSync(filepath, 'utf8');
            let data;
            try {
                data = JSON.parse(raw);
            } catch (e) {
                console.log(`❌ Failed to parse JSON for ${table}: ${e.message}`);
                continue;
            }

            // D1 export wraps the data in an array of results depending on wrangler version
            // Sometimes it's `[ { ...row... } ]` and sometimes `[ { results: [...] } ]`
            let rows = Array.isArray(data) ? data : (data.results || []);

            // Wrangler 3 sometimes outputs an array of queries: `[ { results: [...] } ]`
            if (rows.length > 0 && rows[0].results) {
                rows = rows[0].results;
            }

            if (!Array.isArray(rows)) {
                console.log(`❌ Unrecognized JSON format for ${table}`);
                continue;
            }

            if (rows.length === 0) {
                console.log(`⏭️ Table ${table} is empty, skipping.`);
                continue;
            }

            console.log(`Importing ${table} (${rows.length} rows)...`);

            // Map legacy D1 columns to newer RM Postgres schema columns
            const columnMismatches = {
                'tensions': { 'visits': 'sit_count' },
                'co_surfacing': { 'co_count': 'count', 'last_co_surfaced': 'last_seen' },
                'observation_sits': { 'sat_at': 'created_at' },
                'note_sits': { 'sat_at': 'created_at' }
            };
            const dropLegacyColumns = {
                'tensions': ['last_visited'],
                'co_surfacing': ['id', 'first_co_surfaced', 'relation_proposed', 'relation_created'],
                'images': ['last_viewed_at']
            };

            const tableMapping = columnMismatches[table] || {};
            const tableDrops = dropLegacyColumns[table] || [];

            // Assume homogeneous rows: keys of the first object dictate the columns
            // Apply drops first, then maps
            let rawColumns = Object.keys(rows[0]);
            let columns = rawColumns
                .filter(col => !tableDrops.includes(col))
                .map(col => tableMapping[col] || col);

            // Execute in chunks
            const chunkSize = 100;
            for (let i = 0; i < rows.length; i += chunkSize) {
                const chunk = rows.slice(i, i + chunkSize);

                const valuesStringArray = [];
                const flatValues = [];
                let paramCounter = 1;

                for (const row of chunk) {
                    const rowTokens = [];
                    for (const originalCol of rawColumns) {
                        if (tableDrops.includes(originalCol)) continue; // skip dropped columns

                        rowTokens.push(`$${paramCounter++}`);
                        // Handle D1 specific stringified timestamps mismatch when inserted to dates
                        let val = row[originalCol];
                        if (val === '') {
                            val = null;
                        }

                        flatValues.push(val);
                    }
                    valuesStringArray.push(`(${rowTokens.join(', ')})`);
                }

                const query = `
                    INSERT INTO ${table} (${columns.join(', ')}) 
                    VALUES ${valuesStringArray.join(', ')}
                    ON CONFLICT DO NOTHING
                `;

                await client.query(query, flatValues);
            }

            console.log(`✅ Finished ${table}.`);

            // Update sequences for tables with autoincrement ID
            if (columns.includes('id') && typeof rows[0].id === 'number') {
                try {
                    await client.query(`SELECT setval(pg_get_serial_sequence('${table}', 'id'), coalesce(max(id), 1), max(id) IS NOT null) FROM ${table};`);
                } catch (seqErr) {
                    // Ignore sequence update errors on tables without sequences
                }
            }
        }

    } catch (e) {
        console.error("Critical import error:", e);
    } finally {
        await client.end();
        console.log("Import process completed and connection closed.");
    }
}

importData();
