import { storage } from '../storage';
import type { Project, IlotConfiguration } from '../../shared/schema';

export async function createSampleData(userId: string): Promise<void> {
  try {
    console.log('📊 Creating sample data for new users...');

    // Check if user already has projects
    const existingProjects = await storage.getProjects(userId);
    if (existingProjects.length > 0) {
      console.log('User already has projects, skipping sample data creation');
      return;
    }

    // Create a sample project
    const sampleProject = await storage.createProject({
      name: 'Hotel Floor Plan Example',
      description: 'Sample hotel floor plan project with pre-configured room distributions',
      userId,
      metadata: {
        type: 'hotel',
        floors: 5,
        roomCapacity: 100,
        created: new Date().toISOString()
      }
    });

    // Create sample ilot configurations
    const configurations = [
      {
        name: 'Budget Hotel Layout',
        projectId: sampleProject.id,
        sizeDistribution: [
          { minSize: 8, maxSize: 12, percentage: 40 },
          { minSize: 12, maxSize: 16, percentage: 35 },
          { minSize: 16, maxSize: 20, percentage: 20 },
          { minSize: 20, maxSize: 25, percentage: 5 }
        ],
        corridorWidth: 1.5,
        minRoomSize: 8,
        maxRoomSize: 25,
        isDefault: true
      },
      {
        name: 'Luxury Hotel Layout',
        projectId: sampleProject.id,
        sizeDistribution: [
          { minSize: 20, maxSize: 30, percentage: 30 },
          { minSize: 30, maxSize: 40, percentage: 40 },
          { minSize: 40, maxSize: 60, percentage: 25 },
          { minSize: 60, maxSize: 100, percentage: 5 }
        ],
        corridorWidth: 2.5,
        minRoomSize: 20,
        maxRoomSize: 100,
        isDefault: false
      },
      {
        name: 'Mixed Use Layout',
        projectId: sampleProject.id,
        sizeDistribution: [
          { minSize: 5, maxSize: 10, percentage: 20 },
          { minSize: 10, maxSize: 20, percentage: 30 },
          { minSize: 20, maxSize: 35, percentage: 30 },
          { minSize: 35, maxSize: 50, percentage: 20 }
        ],
        corridorWidth: 2.0,
        minRoomSize: 5,
        maxRoomSize: 50,
        isDefault: false
      }
    ];

    for (const config of configurations) {
      await storage.createIlotConfiguration(config);
    }

    console.log('✅ Sample data created successfully');
  } catch (error) {
    console.error('Error creating sample data:', error);
  }
}