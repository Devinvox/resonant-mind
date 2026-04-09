const { GoogleGenAI } = require("@google/genai");
const { Client } = require("pg");

const CONNECTION_STRING = "postgresql://neondb_owner:npg_QG2gCJsFKoS0@ep-plain-bird-ag65tco0.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("❌ GEMINI_API_KEY environment variable is required.");
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });
const MODEL = "gemini-embedding-001";
const DIMENSIONS = 768;

function l2Normalize(vec) {
    const magnitude = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
    return magnitude > 0 ? vec.map(v => v / magnitude) : vec;
}

async function getEmbedding(text) {
    const response = await ai.models.embedContent({
        model: MODEL,
        contents: text,
        config: { outputDimensionality: DIMENSIONS },
    });
    return l2Normalize(response.embeddings[0].values);
}

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
    const client = new Client({ connectionString: CONNECTION_STRING });
    await client.connect();
    console.log(`Connected to Neon DB. Generating embeddings using ${MODEL}...`);

    try {
        console.log("Fetching Entities, Observations, and Journals...");
        const resEntities = await client.query("SELECT * FROM entities");
        const resObs = await client.query(`
            SELECT o.*, e.name as entity_name 
            FROM observations o 
            JOIN entities e ON o.entity_id = e.id 
            WHERE o.archived_at IS NULL
        `);
        const resJournals = await client.query("SELECT * FROM journals");

        const itemsToVectorize = [];

        resEntities.rows.forEach(e => itemsToVectorize.push({
            id: `entity-${e.id}`, type: 'entity', source_id: e.id,
            content: `${e.name} (${e.entity_type} in ${e.primary_context})`
        }));
        resObs.rows.forEach(o => itemsToVectorize.push({
            id: `obs-${o.entity_id}-${o.id}`, type: 'observation', source_id: o.id,
            content: `${o.entity_name}: ${o.content}`
        }));
        resJournals.rows.forEach(j => itemsToVectorize.push({
            id: `journal-${j.id}`, type: 'journal', source_id: j.id,
            content: j.content
        }));

        console.log(`Total items to embed: ${itemsToVectorize.length}. Filtering already embedded...`);

        // Find existing to avoid hitting quota if script restarts
        const existingRes = await client.query("SELECT id FROM embeddings");
        const existingIds = new Set(existingRes.rows.map(r => r.id));

        const remainingItems = itemsToVectorize.filter(item => !existingIds.has(item.id));

        console.log(`Remaining to embed: ${remainingItems.length} (Skipped ${existingIds.size})`);

        let count = 0;
        for (const item of remainingItems) {
            try {
                const vectorValues = await getEmbedding(item.content);
                const vectorString = `[${vectorValues.join(',')}]`;

                await client.query(
                    `INSERT INTO embeddings (id, source_type, source_id, embedding, content) 
                     VALUES ($1, $2, $3, $4, $5)`,
                    [item.id, item.type, item.source_id, vectorString, item.content]
                );

                count++;
                if (count % 25 === 0) {
                    process.stdout.write(`\rProgress: ${count} / ${remainingItems.length}`);
                }

                // Generous delay to avoid Google's spike rate limits
                await delay(400);

            } catch (embedError) {
                console.error(`\n❌ Failed to embed item ${item.id}:`, embedError.message);
                if (embedError.message.includes("429")) {
                    console.log("\nRate limit hit! Pausing for 30 seconds before resuming...");
                    await delay(30000);
                } else {
                    console.log("\nRetrying in 5 seconds...");
                    await delay(5000);
                }
            }
        }

        console.log(`\n✅ Revectorization complete. Generated ${count} new embeddings.`);
    } catch (err) {
        console.error("Critical error during revectorization:", err);
    } finally {
        await client.end();
    }
}

run();
