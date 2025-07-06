import { pgTable, serial, varchar, text, integer, real, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

// Projects table - stores floor plan projects
export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  metadata: jsonb('metadata'), // Additional project settings
});

// Floor plans table - stores uploaded floor plan files and their analysis
export const floorPlans = pgTable('floor_plans', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  originalFileName: varchar('original_file_name', { length: 255 }).notNull(),
  fileType: varchar('file_type', { length: 50 }).notNull(), // DXF, PDF, PNG, etc.
  filePath: text('file_path').notNull(),
  fileSize: integer('file_size').notNull(),
  width: real('width').notNull(),
  height: real('height').notNull(),
  scale: real('scale').default(1.0).notNull(),
  processed: boolean('processed').default(false).notNull(),
  processedAt: timestamp('processed_at'),
  analysisData: jsonb('analysis_data'), // Detected zones, walls, etc.
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Zones table - stores detected zones (walls, restricted areas, entrances)
export const zones = pgTable('zones', {
  id: serial('id').primaryKey(),
  floorPlanId: integer('floor_plan_id').notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'wall', 'restricted', 'entrance', 'exit'
  color: varchar('color', { length: 20 }).notNull(), // Color code for visualization
  coordinates: jsonb('coordinates').notNull(), // Array of coordinate points
  area: real('area'),
  properties: jsonb('properties'), // Additional zone properties
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Ilot configurations - stores user-defined room size distributions
export const ilotConfigurations = pgTable('ilot_configurations', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  sizeDistribution: jsonb('size_distribution').notNull(), // Array of {minSize, maxSize, percentage}
  corridorWidth: real('corridor_width').default(1.5).notNull(),
  minRoomSize: real('min_room_size').default(0.5).notNull(),
  maxRoomSize: real('max_room_size').default(50.0).notNull(),
  isDefault: boolean('is_default').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Generated layouts - stores algorithm results
export const generatedLayouts = pgTable('generated_layouts', {
  id: serial('id').primaryKey(),
  floorPlanId: integer('floor_plan_id').notNull(),
  configurationId: integer('configuration_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  totalIlots: integer('total_ilots').notNull(),
  totalArea: real('total_area').notNull(),
  utilizationPercentage: real('utilization_percentage').notNull(),
  ilotData: jsonb('ilot_data').notNull(), // Array of positioned ilots
  corridorData: jsonb('corridor_data').notNull(), // Array of corridors
  optimizationScore: real('optimization_score'), // ML-generated optimization score
  generationTime: real('generation_time').notNull(), // Time taken to generate
  algorithm: varchar('algorithm', { length: 100 }).notNull(), // Algorithm used
  status: varchar('status', { length: 50 }).default('completed').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Collaboration sessions - for real-time collaboration
export const collaborationSessions = pgTable('collaboration_sessions', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull(),
  sessionId: varchar('session_id', { length: 255 }).notNull().unique(),
  hostUserId: varchar('host_user_id', { length: 255 }).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  participantCount: integer('participant_count').default(1).notNull(),
  lastActivity: timestamp('last_activity').defaultNow().notNull(),
  settings: jsonb('settings'), // Collaboration settings
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Collaboration participants - tracks who's in each session
export const collaborationParticipants = pgTable('collaboration_participants', {
  id: serial('id').primaryKey(),
  sessionId: varchar('session_id', { length: 255 }).notNull(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  userName: varchar('user_name', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).default('viewer').notNull(), // 'host', 'editor', 'viewer'
  isActive: boolean('is_active').default(true).notNull(),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
  lastSeen: timestamp('last_seen').defaultNow().notNull(),
});

// Export history - tracks exported files
export const exportHistory = pgTable('export_history', {
  id: serial('id').primaryKey(),
  layoutId: integer('layout_id').notNull(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  exportType: varchar('export_type', { length: 50 }).notNull(), // 'pdf', 'png', 'dxf', '3d'
  fileName: varchar('file_name', { length: 255 }).notNull(),
  filePath: text('file_path').notNull(),
  fileSize: integer('file_size').notNull(),
  settings: jsonb('settings'), // Export settings
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Define relations
export const projectsRelations = relations(projects, ({ many }) => ({
  floorPlans: many(floorPlans),
  ilotConfigurations: many(ilotConfigurations),
  collaborationSessions: many(collaborationSessions),
}));

export const floorPlansRelations = relations(floorPlans, ({ one, many }) => ({
  project: one(projects, {
    fields: [floorPlans.projectId],
    references: [projects.id],
  }),
  zones: many(zones),
  generatedLayouts: many(generatedLayouts),
}));

export const zonesRelations = relations(zones, ({ one }) => ({
  floorPlan: one(floorPlans, {
    fields: [zones.floorPlanId],
    references: [floorPlans.id],
  }),
}));

export const ilotConfigurationsRelations = relations(ilotConfigurations, ({ one, many }) => ({
  project: one(projects, {
    fields: [ilotConfigurations.projectId],
    references: [projects.id],
  }),
  generatedLayouts: many(generatedLayouts),
}));

export const generatedLayoutsRelations = relations(generatedLayouts, ({ one, many }) => ({
  floorPlan: one(floorPlans, {
    fields: [generatedLayouts.floorPlanId],
    references: [floorPlans.id],
  }),
  configuration: one(ilotConfigurations, {
    fields: [generatedLayouts.configurationId],
    references: [ilotConfigurations.id],
  }),
  exports: many(exportHistory),
}));

export const collaborationSessionsRelations = relations(collaborationSessions, ({ one, many }) => ({
  project: one(projects, {
    fields: [collaborationSessions.projectId],
    references: [projects.id],
  }),
  participants: many(collaborationParticipants),
}));

export const collaborationParticipantsRelations = relations(collaborationParticipants, ({ one }) => ({
  session: one(collaborationSessions, {
    fields: [collaborationParticipants.sessionId],
    references: [collaborationSessions.sessionId],
  }),
}));

export const exportHistoryRelations = relations(exportHistory, ({ one }) => ({
  layout: one(generatedLayouts, {
    fields: [exportHistory.layoutId],
    references: [generatedLayouts.id],
  }),
}));

// Create Zod schemas for validation
export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFloorPlanSchema = createInsertSchema(floorPlans).omit({
  id: true,
  createdAt: true,
  processedAt: true,
});

export const insertZoneSchema = createInsertSchema(zones).omit({
  id: true,
  createdAt: true,
});

export const insertIlotConfigurationSchema = createInsertSchema(ilotConfigurations).omit({
  id: true,
  createdAt: true,
});

export const insertGeneratedLayoutSchema = createInsertSchema(generatedLayouts).omit({
  id: true,
  createdAt: true,
});

export const insertCollaborationSessionSchema = createInsertSchema(collaborationSessions).omit({
  id: true,
  createdAt: true,
  lastActivity: true,
});

export const insertCollaborationParticipantSchema = createInsertSchema(collaborationParticipants).omit({
  id: true,
  joinedAt: true,
  lastSeen: true,
});

export const insertExportHistorySchema = createInsertSchema(exportHistory).omit({
  id: true,
  createdAt: true,
});

// Types
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type FloorPlan = typeof floorPlans.$inferSelect;
export type InsertFloorPlan = z.infer<typeof insertFloorPlanSchema>;

export type Zone = typeof zones.$inferSelect;
export type InsertZone = z.infer<typeof insertZoneSchema>;

export type IlotConfiguration = typeof ilotConfigurations.$inferSelect;
export type InsertIlotConfiguration = z.infer<typeof insertIlotConfigurationSchema>;

export type GeneratedLayout = typeof generatedLayouts.$inferSelect;
export type InsertGeneratedLayout = z.infer<typeof insertGeneratedLayoutSchema>;

export type CollaborationSession = typeof collaborationSessions.$inferSelect;
export type InsertCollaborationSession = z.infer<typeof insertCollaborationSessionSchema>;

export type CollaborationParticipant = typeof collaborationParticipants.$inferSelect;
export type InsertCollaborationParticipant = z.infer<typeof insertCollaborationParticipantSchema>;

export type ExportHistory = typeof exportHistory.$inferSelect;
export type InsertExportHistory = z.infer<typeof insertExportHistorySchema>;