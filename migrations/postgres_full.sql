-- Resonant Mind - Consolidated Postgres Schema (v3.1.0)
-- Integrates upstream base with local migrations and structural fixes.

CREATE EXTENSION IF NOT EXISTS vector;

-- Entities
CREATE TABLE entities (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    primary_context TEXT NOT NULL DEFAULT 'default',
    salience TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(name, primary_context)
);

-- Observations (Includes v3.1 temporal validity and superseding logic)
CREATE TABLE observations (
    id SERIAL PRIMARY KEY,
    entity_id INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    salience TEXT DEFAULT 'active',
    emotion TEXT,
    weight TEXT DEFAULT 'medium',
    certainty TEXT DEFAULT 'believed',
    source TEXT DEFAULT 'conversation',
    source_date TEXT,
    context TEXT DEFAULT 'default',
    charge TEXT,
    charge_note TEXT,
    sit_count INTEGER DEFAULT 0,
    novelty_score REAL DEFAULT 1.0,
    last_surfaced_at TIMESTAMPTZ,
    surface_count INTEGER DEFAULT 0,
    archived_at TIMESTAMPTZ,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    -- Additional fields from migrations + Mind Cloud legacy
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMPTZ,
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    superseded_by INTEGER,
    supersedes INTEGER,
    last_sat_at TIMESTAMPTZ,
    resolution_note TEXT,
    resolved_at TIMESTAMPTZ,
    linked_observation_id INTEGER
);

-- Observation version history
CREATE TABLE observation_versions (
    id SERIAL PRIMARY KEY,
    observation_id INTEGER NOT NULL REFERENCES observations(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    weight TEXT,
    emotion TEXT,
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Relations 
CREATE TABLE relations (
    id SERIAL PRIMARY KEY,
    from_entity TEXT NOT NULL,
    to_entity TEXT NOT NULL,
    relation_type TEXT NOT NULL,
    from_context TEXT DEFAULT 'default',
    to_context TEXT DEFAULT 'default',
    store_in TEXT DEFAULT 'default',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Threads
CREATE TABLE threads (
    id TEXT PRIMARY KEY,
    thread_type TEXT NOT NULL,
    content TEXT NOT NULL,
    context TEXT,
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'active',
    source TEXT DEFAULT 'self',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolution TEXT
);

-- Context layer
CREATE TABLE context_entries (
    id TEXT PRIMARY KEY,
    scope TEXT NOT NULL,
    content TEXT NOT NULL,
    links TEXT DEFAULT '[]',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Relational state
CREATE TABLE relational_state (
    id SERIAL PRIMARY KEY,
    person TEXT NOT NULL,
    feeling TEXT NOT NULL,
    intensity TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Identity graph
CREATE TABLE identity (
    id SERIAL PRIMARY KEY,
    section TEXT NOT NULL,
    content TEXT NOT NULL,
    weight REAL DEFAULT 0.7,
    connections TEXT DEFAULT '[]',
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Journals (Includes journal_type from 0002 migration)
CREATE TABLE journals (
    id SERIAL PRIMARY KEY,
    entry_date TEXT,
    content TEXT NOT NULL,
    tags TEXT DEFAULT '[]',
    emotion TEXT,
    journal_type TEXT DEFAULT 'reflection',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Images (Includes metrics from old migrations)
CREATE TABLE images (
    id SERIAL PRIMARY KEY,
    path TEXT NOT NULL,
    description TEXT NOT NULL,
    context TEXT,
    emotion TEXT,
    weight TEXT DEFAULT 'medium',
    entity_id INTEGER REFERENCES entities(id),
    observation_id INTEGER REFERENCES observations(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    charge TEXT,
    novelty_score REAL DEFAULT 1.0,
    view_count INTEGER DEFAULT 0,
    last_surfaced_at TIMESTAMPTZ,
    surface_count INTEGER DEFAULT 0,
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMPTZ
);

-- Subconscious state
CREATE TABLE subconscious (
    id INTEGER PRIMARY KEY,
    state_type TEXT NOT NULL,
    data TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daemon proposals (Aligned to v3.1 code expectation)
CREATE TABLE daemon_proposals (
    id SERIAL PRIMARY KEY,
    proposal_type TEXT NOT NULL,
    from_entity_id INTEGER,
    to_entity_id INTEGER,
    from_obs_id INTEGER,
    to_obs_id INTEGER,
    reason TEXT NOT NULL,
    confidence REAL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tensions 
CREATE TABLE tensions (
    id TEXT PRIMARY KEY,
    pole_a TEXT NOT NULL,
    pole_b TEXT NOT NULL,
    context TEXT,
    sit_count INTEGER DEFAULT 0,
    sit_notes TEXT DEFAULT '[]',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolution TEXT
);

-- Co-surfacing tracking
CREATE TABLE co_surfacing (
    obs_a_id INTEGER NOT NULL REFERENCES observations(id),
    obs_b_id INTEGER NOT NULL REFERENCES observations(id),
    count INTEGER DEFAULT 1,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (obs_a_id, obs_b_id)
);

-- Additional components from local base
CREATE TABLE orphan_observations (
    id SERIAL PRIMARY KEY,
    observation_id INTEGER NOT NULL REFERENCES observations(id),
    reason TEXT NOT NULL,
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'pending'
);

CREATE TABLE vault_chunks (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    context TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE session_chunks (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    context TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notes (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    emotion TEXT,
    context TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE note_sits (
    id SERIAL PRIMARY KEY,
    note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    sit_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE observation_sits (
    id SERIAL PRIMARY KEY,
    observation_id INTEGER NOT NULL REFERENCES observations(id) ON DELETE CASCADE,
    sit_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE consolidation_groups (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    context TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vector embeddings
CREATE TABLE embeddings (
    id TEXT PRIMARY KEY,
    source_type TEXT NOT NULL,
    source_id INTEGER NOT NULL,
    embedding vector(768),
    content TEXT,
    metadata JSONB DEFAULT '{}'
);

-- Indexes
CREATE INDEX idx_entities_context ON entities(primary_context);
CREATE INDEX idx_entities_name ON entities(name);
CREATE INDEX idx_entities_salience ON entities(salience);
CREATE INDEX idx_observations_entity ON observations(entity_id);
CREATE INDEX idx_observations_context ON observations(context);
CREATE INDEX idx_observations_charge ON observations(charge);
CREATE INDEX idx_observations_weight ON observations(weight);
CREATE INDEX idx_observations_archived ON observations(archived_at);
CREATE INDEX idx_observations_surfaced ON observations(last_surfaced_at);
CREATE INDEX idx_threads_status ON threads(status);
CREATE INDEX idx_context_scope ON context_entries(scope);
CREATE INDEX idx_relational_person ON relational_state(person);
CREATE INDEX idx_identity_section ON identity(section);
CREATE INDEX idx_journals_date ON journals(entry_date);
CREATE INDEX idx_images_entity ON images(entity_id);
CREATE INDEX idx_daemon_proposals_status ON daemon_proposals(status);
CREATE INDEX idx_tensions_status ON tensions(status);
CREATE INDEX idx_embeddings_source ON embeddings(source_type, source_id);

CREATE INDEX idx_embeddings_vector ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
