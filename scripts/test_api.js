const url = "https://ai-mind.tanyamitina.workers.dev/mcp";
const apiKey = process.env.MIND_API_KEY || "DUMMY"; // Her local env should have it

async function run() {
    console.log("Sending direct API request to", url);
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                action: "mind_write",
                params: {
                    type: "observation",
                    entity_name: "TestEntity123",
                    observations: ["This is a test observation"],
                    context: "test",
                    salience: "active",
                    weight: "light"
                }
            })
        });

        const text = await response.text();
        console.log(`Status: ${response.status}`);
        console.log(`Response: ${text}`);
    } catch (e) {
        console.error("Fetch Error:", e);
    }
}
run();
