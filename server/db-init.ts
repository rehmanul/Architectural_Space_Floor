import { sql } from 'drizzle-orm';
import { db } from './db';
import * as schema from '../shared/schema';

export async function initializeDatabase() {
  try {
    console.log('🔧 Initializing database tables...');

    // Create tables using raw SQL since drizzle-kit push is having issues
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        metadata JSONB
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS floor_plans (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        original_file_name VARCHAR(255) NOT NULL,
        file_type VARCHAR(50) NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        width REAL NOT NULL,
        height REAL NOT NULL,
        scale REAL DEFAULT 1.0 NOT NULL,
        processed BOOLEAN DEFAULT false NOT NULL,
        processed_at TIMESTAMP,
        analysis_data JSONB,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS zones (
        id SERIAL PRIMARY KEY,
        floor_plan_id INTEGER NOT NULL REFERENCES floor_plans(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        color VARCHAR(20) NOT NULL,
        coordinates JSONB NOT NULL,
        area REAL,
        properties JSONB,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ilot_configurations (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        size_distribution JSONB NOT NULL,
        corridor_width REAL DEFAULT 1.5 NOT NULL,
        min_room_size REAL DEFAULT 0.5 NOT NULL,
        max_room_size REAL DEFAULT 50.0 NOT NULL,
        is_default BOOLEAN DEFAULT false NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS generated_layouts (
        id SERIAL PRIMARY KEY,
        floor_plan_id INTEGER NOT NULL REFERENCES floor_plans(id) ON DELETE CASCADE,
        configuration_id INTEGER NOT NULL REFERENCES ilot_configurations(id),
        name VARCHAR(255) NOT NULL,
        total_ilots INTEGER NOT NULL,
        total_area REAL NOT NULL,
        utilization_percentage REAL NOT NULL,
        ilot_data JSONB NOT NULL,
        corridor_data JSONB NOT NULL,
        optimization_score REAL,
        generation_time REAL NOT NULL,
        algorithm VARCHAR(100) NOT NULL,
        status VARCHAR(50) DEFAULT 'completed' NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS collaboration_sessions (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        session_id VARCHAR(255) NOT NULL UNIQUE,
        host_user_id VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT true NOT NULL,
        participant_count INTEGER DEFAULT 1 NOT NULL,
        last_activity TIMESTAMP DEFAULT NOW() NOT NULL,
        settings JSONB,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS collaboration_participants (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        user_name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'viewer' NOT NULL,
        is_active BOOLEAN DEFAULT true NOT NULL,
        joined_at TIMESTAMP DEFAULT NOW() NOT NULL,
        last_seen TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS export_history (
        id SERIAL PRIMARY KEY,
        layout_id INTEGER NOT NULL REFERENCES generated_layouts(id) ON DELETE CASCADE,
        user_id VARCHAR(255) NOT NULL,
        export_type VARCHAR(50) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        settings JSONB,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Create indexes for better performance
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_floor_plans_project_id ON floor_plans(project_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_zones_floor_plan_id ON zones(floor_plan_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_generated_layouts_floor_plan_id ON generated_layouts(floor_plan_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_project_id ON collaboration_sessions(project_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_collaboration_participants_session_id ON collaboration_participants(session_id);`);

    console.log('✅ Database tables initialized successfully!');
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    return false;
  }
}

// Initialize database on module load if in production
if (process.env.NODE_ENV === 'production' || process.env.INIT_DB === 'true') {
  initializeDatabase().catch(console.error);
}