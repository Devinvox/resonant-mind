const { execSync } = require('child_process');
const fs = require('fs');

const tables = [
    "entities", "observations", "observation_versions", "relations",
    "threads", "context_entries", "relational_state", "identity",
    "journals", "images", "subconscious", "tensions", "co_surfacing",
    "vault_chunks", "session_chunks", "notes", "note_sits",
    "observation_sits", "consolidation_groups"
];

if (!fs.existsSync('d1_export')) {
    fs.mkdirSync('d1_export');
}

for (const table of tables) {
    console.log(`Exporting table: ${table}...`);
    try {
        const cmd = `npx wrangler d1 execute ai-mind --remote --command "SELECT * FROM ${table}" --json`;
        const output = execSync(cmd, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });

        // Strip wrangler UI texts if any, extract just the JSON
        // D1 execute usually outputs an array of results on the first line or might have some logs
        let jsonStr = output;

        // Sometimes wrangler adds update notices, we locate the actual JSON array bracket
        const jsonStart = output.indexOf('[');
        const jsonEnd = output.lastIndexOf(']') + 1;
        if (jsonStart !== -1 && jsonEnd !== 0) {
            jsonStr = output.slice(jsonStart, jsonEnd);
        }

        fs.writeFileSync(`d1_export/${table}.json`, jsonStr, 'utf8');
        console.log(`✅ Successfully exported ${table}`);
    } catch (e) {
        console.error(`❌ Failed to export ${table}`);
        console.error("Error output:", e.stderr || e.message);
    }
}
