import { 
  projects, floorPlans, zones, ilotConfigurations, generatedLayouts, 
  collaborationSessions, collaborationParticipants, exportHistory,
  type Project, type InsertProject,
  type FloorPlan, type InsertFloorPlan,
  type Zone, type InsertZone,
  type IlotConfiguration, type InsertIlotConfiguration,
  type GeneratedLayout, type InsertGeneratedLayout,
  type CollaborationSession, type InsertCollaborationSession,
  type CollaborationParticipant, type InsertCollaborationParticipant,
  type ExportHistory, type InsertExportHistory
} from "../shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // Projects
  getProjects(userId: string): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, updates: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;

  // Floor Plans
  getFloorPlans(projectId: number): Promise<FloorPlan[]>;
  getFloorPlan(id: number): Promise<FloorPlan | undefined>;
  createFloorPlan(floorPlan: InsertFloorPlan): Promise<FloorPlan>;
  updateFloorPlan(id: number, updates: Partial<InsertFloorPlan>): Promise<FloorPlan | undefined>;
  deleteFloorPlan(id: number): Promise<boolean>;

  // Zones
  getZones(floorPlanId: number): Promise<Zone[]>;
  getZone(id: number): Promise<Zone | undefined>;
  createZone(zone: InsertZone): Promise<Zone>;
  updateZone(id: number, updates: Partial<InsertZone>): Promise<Zone | undefined>;
  deleteZone(id: number): Promise<boolean>;
  deleteZonesByFloorPlan(floorPlanId: number): Promise<boolean>;

  // Ilot Configurations
  getIlotConfigurations(projectId: number): Promise<IlotConfiguration[]>;
  getIlotConfiguration(id: number): Promise<IlotConfiguration | undefined>;
  createIlotConfiguration(config: InsertIlotConfiguration): Promise<IlotConfiguration>;
  updateIlotConfiguration(id: number, updates: Partial<InsertIlotConfiguration>): Promise<IlotConfiguration | undefined>;
  deleteIlotConfiguration(id: number): Promise<boolean>;

  // Generated Layouts
  getGeneratedLayouts(floorPlanId: number): Promise<GeneratedLayout[]>;
  getGeneratedLayout(id: number): Promise<GeneratedLayout | undefined>;
  createGeneratedLayout(layout: InsertGeneratedLayout): Promise<GeneratedLayout>;
  updateGeneratedLayout(id: number, updates: Partial<InsertGeneratedLayout>): Promise<GeneratedLayout | undefined>;
  deleteGeneratedLayout(id: number): Promise<boolean>;

  // Collaboration Sessions
  getCollaborationSessions(projectId: number): Promise<CollaborationSession[]>;
  getCollaborationSession(sessionId: string): Promise<CollaborationSession | undefined>;
  createCollaborationSession(session: InsertCollaborationSession): Promise<CollaborationSession>;
  updateCollaborationSession(sessionId: string, updates: Partial<InsertCollaborationSession>): Promise<CollaborationSession | undefined>;
  deleteCollaborationSession(sessionId: string): Promise<boolean>;

  // Collaboration Participants
  getCollaborationParticipants(sessionId: string): Promise<CollaborationParticipant[]>;
  addCollaborationParticipant(participant: InsertCollaborationParticipant): Promise<CollaborationParticipant>;
  updateCollaborationParticipant(id: number, updates: Partial<InsertCollaborationParticipant>): Promise<CollaborationParticipant | undefined>;
  removeCollaborationParticipant(sessionId: string, userId: string): Promise<boolean>;

  // Export History
  getExportHistory(layoutId: number): Promise<ExportHistory[]>;
  createExportHistory(exportData: InsertExportHistory): Promise<ExportHistory>;
}

export class DatabaseStorage implements IStorage {
  // Projects
  async getProjects(userId: string): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.userId, userId)).orderBy(desc(projects.updatedAt));
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db.insert(projects).values({
      ...project,
      updatedAt: new Date()
    }).returning();
    return newProject;
  }

  async updateProject(id: number, updates: Partial<InsertProject>): Promise<Project | undefined> {
    const [updatedProject] = await db.update(projects)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return updatedProject || undefined;
  }

  async deleteProject(id: number): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.id, id));
    return result.rowCount > 0;
  }

  // Floor Plans
  async getFloorPlans(projectId: number): Promise<FloorPlan[]> {
    return await db.select().from(floorPlans).where(eq(floorPlans.projectId, projectId)).orderBy(desc(floorPlans.createdAt));
  }

  async getFloorPlan(id: number): Promise<FloorPlan | undefined> {
    const [floorPlan] = await db.select().from(floorPlans).where(eq(floorPlans.id, id));
    return floorPlan || undefined;
  }

  async createFloorPlan(floorPlan: InsertFloorPlan): Promise<FloorPlan> {
    const [newFloorPlan] = await db.insert(floorPlans).values(floorPlan).returning();
    return newFloorPlan;
  }

  async updateFloorPlan(id: number, updates: Partial<InsertFloorPlan>): Promise<FloorPlan | undefined> {
    const [updatedFloorPlan] = await db.update(floorPlans)
      .set(updates)
      .where(eq(floorPlans.id, id))
      .returning();
    return updatedFloorPlan || undefined;
  }

  async deleteFloorPlan(id: number): Promise<boolean> {
    const result = await db.delete(floorPlans).where(eq(floorPlans.id, id));
    return result.rowCount > 0;
  }

  // Zones
  async getZones(floorPlanId: number): Promise<Zone[]> {
    return await db.select().from(zones).where(eq(zones.floorPlanId, floorPlanId)).orderBy(desc(zones.createdAt));
  }

  async getZone(id: number): Promise<Zone | undefined> {
    const [zone] = await db.select().from(zones).where(eq(zones.id, id));
    return zone || undefined;
  }

  async createZone(zone: InsertZone): Promise<Zone> {
    const [newZone] = await db.insert(zones).values(zone).returning();
    return newZone;
  }

  async updateZone(id: number, updates: Partial<InsertZone>): Promise<Zone | undefined> {
    const [updatedZone] = await db.update(zones)
      .set(updates)
      .where(eq(zones.id, id))
      .returning();
    return updatedZone || undefined;
  }

  async deleteZone(id: number): Promise<boolean> {
    const result = await db.delete(zones).where(eq(zones.id, id));
    return result.rowCount > 0;
  }

  async deleteZonesByFloorPlan(floorPlanId: number): Promise<boolean> {
    const result = await db.delete(zones).where(eq(zones.floorPlanId, floorPlanId));
    return result.rowCount >= 0;
  }

  // Ilot Configurations
  async getIlotConfigurations(projectId: number): Promise<IlotConfiguration[]> {
    return await db.select().from(ilotConfigurations).where(eq(ilotConfigurations.projectId, projectId)).orderBy(desc(ilotConfigurations.createdAt));
  }

  async getIlotConfiguration(id: number): Promise<IlotConfiguration | undefined> {
    const [config] = await db.select().from(ilotConfigurations).where(eq(ilotConfigurations.id, id));
    return config || undefined;
  }

  async createIlotConfiguration(config: InsertIlotConfiguration): Promise<IlotConfiguration> {
    const [newConfig] = await db.insert(ilotConfigurations).values(config).returning();
    return newConfig;
  }

  async updateIlotConfiguration(id: number, updates: Partial<InsertIlotConfiguration>): Promise<IlotConfiguration | undefined> {
    const [updatedConfig] = await db.update(ilotConfigurations)
      .set(updates)
      .where(eq(ilotConfigurations.id, id))
      .returning();
    return updatedConfig || undefined;
  }

  async deleteIlotConfiguration(id: number): Promise<boolean> {
    const result = await db.delete(ilotConfigurations).where(eq(ilotConfigurations.id, id));
    return result.rowCount > 0;
  }

  // Generated Layouts
  async getGeneratedLayouts(floorPlanId: number): Promise<GeneratedLayout[]> {
    return await db.select().from(generatedLayouts).where(eq(generatedLayouts.floorPlanId, floorPlanId)).orderBy(desc(generatedLayouts.createdAt));
  }

  async getGeneratedLayout(id: number): Promise<GeneratedLayout | undefined> {
    const [layout] = await db.select().from(generatedLayouts).where(eq(generatedLayouts.id, id));
    return layout || undefined;
  }

  async createGeneratedLayout(layout: InsertGeneratedLayout): Promise<GeneratedLayout> {
    const [newLayout] = await db.insert(generatedLayouts).values(layout).returning();
    return newLayout;
  }

  async updateGeneratedLayout(id: number, updates: Partial<InsertGeneratedLayout>): Promise<GeneratedLayout | undefined> {
    const [updatedLayout] = await db.update(generatedLayouts)
      .set(updates)
      .where(eq(generatedLayouts.id, id))
      .returning();
    return updatedLayout || undefined;
  }

  async deleteGeneratedLayout(id: number): Promise<boolean> {
    const result = await db.delete(generatedLayouts).where(eq(generatedLayouts.id, id));
    return result.rowCount > 0;
  }

  // Collaboration Sessions
  async getCollaborationSessions(projectId: number): Promise<CollaborationSession[]> {
    return await db.select().from(collaborationSessions).where(eq(collaborationSessions.projectId, projectId)).orderBy(desc(collaborationSessions.lastActivity));
  }

  async getCollaborationSession(sessionId: string): Promise<CollaborationSession | undefined> {
    const [session] = await db.select().from(collaborationSessions).where(eq(collaborationSessions.sessionId, sessionId));
    return session || undefined;
  }

  async createCollaborationSession(session: InsertCollaborationSession): Promise<CollaborationSession> {
    const [newSession] = await db.insert(collaborationSessions).values(session).returning();
    return newSession;
  }

  async updateCollaborationSession(sessionId: string, updates: Partial<InsertCollaborationSession>): Promise<CollaborationSession | undefined> {
    const [updatedSession] = await db.update(collaborationSessions)
      .set({ ...updates, lastActivity: new Date() })
      .where(eq(collaborationSessions.sessionId, sessionId))
      .returning();
    return updatedSession || undefined;
  }

  async deleteCollaborationSession(sessionId: string): Promise<boolean> {
    const result = await db.delete(collaborationSessions).where(eq(collaborationSessions.sessionId, sessionId));
    return result.rowCount > 0;
  }

  // Collaboration Participants
  async getCollaborationParticipants(sessionId: string): Promise<CollaborationParticipant[]> {
    return await db.select().from(collaborationParticipants).where(eq(collaborationParticipants.sessionId, sessionId)).orderBy(desc(collaborationParticipants.joinedAt));
  }

  async addCollaborationParticipant(participant: InsertCollaborationParticipant): Promise<CollaborationParticipant> {
    const [newParticipant] = await db.insert(collaborationParticipants).values(participant).returning();
    return newParticipant;
  }

  async updateCollaborationParticipant(id: number, updates: Partial<InsertCollaborationParticipant>): Promise<CollaborationParticipant | undefined> {
    const [updatedParticipant] = await db.update(collaborationParticipants)
      .set({ ...updates, lastSeen: new Date() })
      .where(eq(collaborationParticipants.id, id))
      .returning();
    return updatedParticipant || undefined;
  }

  async removeCollaborationParticipant(sessionId: string, userId: string): Promise<boolean> {
    const result = await db.delete(collaborationParticipants)
      .where(and(
        eq(collaborationParticipants.sessionId, sessionId),
        eq(collaborationParticipants.userId, userId)
      ));
    return result.rowCount > 0;
  }

  // Export History
  async getExportHistory(layoutId: number): Promise<ExportHistory[]> {
    return await db.select().from(exportHistory).where(eq(exportHistory.layoutId, layoutId)).orderBy(desc(exportHistory.createdAt));
  }

  async createExportHistory(exportData: InsertExportHistory): Promise<ExportHistory> {
    const [newExport] = await db.insert(exportHistory).values(exportData).returning();
    return newExport;
  }
}

export const storage = new DatabaseStorage();