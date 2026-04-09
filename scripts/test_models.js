const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("GEMINI_API_KEY is missing");
    process.exit(1);
}

fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
    .then(r => r.json())
    .then(data => {
        if (!data.models) {
            console.error("Error fetching models:", data);
            return;
        }
        const embeddings = data.models
            .filter(m => m.supportedGenerationMethods.includes('embedContent'))
            .map(m => m.name);
        console.log("Доступні моделі для вектеризації:", embeddings);
    })
    .catch(console.error);
