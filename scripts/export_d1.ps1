$tables = @(
    "entities", "observations", "observation_versions", "relations", 
    "threads", "context_entries", "relational_state", "identity", 
    "journals", "images", "subconscious", "tensions", "co_surfacing",
    "vault_chunks", "session_chunks", "notes", "note_sits",
    "observation_sits", "consolidation_groups"
)

Write-Host "Creating export directory..."
New-Item -ItemType Directory -Force -Path "d1_export"

foreach ($table in $tables) {
    Write-Host "Exporting table: $table"
    
    # We dump it directly to a JSON file using the --json flag
    $command = "SELECT * FROM $table"
    npx wrangler d1 execute ai-mind --remote --command "$command" --json > "d1_export/$table.json"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Successfully exported $table" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to export $table" -ForegroundColor Red
    }
}

Write-Host "All specified tables processed. (Daemon proposals & orphan observations were intentionally skipped to reset logs)"
