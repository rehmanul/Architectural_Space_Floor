
from app import db
from datetime import datetime
from sqlalchemy import Text, JSON
import uuid

class FloorPlan(db.Model):
    __tablename__ = 'floor_plans'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    project_id = db.Column(db.Integer, nullable=False)
    name = db.Column(db.String(255), nullable=False)
    original_file_name = db.Column(db.String(255), nullable=False)
    file_type = db.Column(db.String(50), nullable=False)  # 'dxf' or 'image'
    file_path = db.Column(Text, nullable=False)
    file_size = db.Column(db.Integer, nullable=False)
    width = db.Column(db.Float, nullable=False)
    height = db.Column(db.Float, nullable=False)
    scale = db.Column(db.Float, default=1.0, nullable=False)
    processed = db.Column(db.Boolean, default=False, nullable=False)
    processed_at = db.Column(db.DateTime)
    analysis_data = db.Column(JSON)  # Detected zones (walls, restricted areas, entrances)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    placements = db.relationship('IlotPlacement', backref='floor_plan', lazy=True, cascade='all, delete-orphan')

class IlotProfile(db.Model):
    __tablename__ = 'ilot_configurations'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    project_id = db.Column(db.Integer, nullable=False)
    name = db.Column(db.String(255), nullable=False)
    size_distribution = db.Column(JSON, nullable=False)  # Array of {minSize, maxSize, percentage}
    corridor_width = db.Column(db.Float, default=1.5, nullable=False)
    min_room_size = db.Column(db.Float, default=0.5, nullable=False)
    max_room_size = db.Column(db.Float, default=50.0, nullable=False)
    is_default = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    placements = db.relationship('IlotPlacement', backref='ilot_profile', lazy=True, foreign_keys='IlotPlacement.configuration_id')

class IlotPlacement(db.Model):
    __tablename__ = 'generated_layouts'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    floor_plan_id = db.Column(db.Integer, db.ForeignKey('floor_plans.id'), nullable=False)
    configuration_id = db.Column(db.Integer, db.ForeignKey('ilot_configurations.id'), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    total_ilots = db.Column(db.Integer, nullable=False)
    total_area = db.Column(db.Float, nullable=False)
    utilization_percentage = db.Column(db.Float, nullable=False)
    ilot_data = db.Column(JSON, nullable=False)  # Array of positioned ilots
    corridor_data = db.Column(JSON, nullable=False)  # Array of corridors
    optimization_score = db.Column(db.Float)  # ML-generated optimization score
    generation_time = db.Column(db.Float, nullable=False)  # Time taken to generate
    algorithm = db.Column(db.String(100), nullable=False)  # Algorithm used
    status = db.Column(db.String(50), default='completed', nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Legacy columns for backward compatibility
    placed_units = db.Column(JSON)  # Coordinates and properties of placed units
    corridors = db.Column(JSON)  # Generated corridor paths
    statistics = db.Column(JSON)  # Placement statistics (utilization, counts, etc.)
    error_message = db.Column(Text)

class ZoneAnnotation(db.Model):
    __tablename__ = 'zones'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    floor_plan_id = db.Column(db.Integer, db.ForeignKey('floor_plans.id'), nullable=False)
    type = db.Column(db.String(50), nullable=False)  # 'wall', 'restricted', 'entrance', 'exit'
    color = db.Column(db.String(20), nullable=False)  # Color code for visualization
    coordinates = db.Column(JSON)  # Polygon or line coordinates
    area = db.Column(db.Float)
    properties = db.Column(JSON)  # Additional zone properties
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# Add Project model to match the schema
class Project(db.Model):
    __tablename__ = 'projects'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.String(255), nullable=False)
    project_metadata = db.Column(JSON)
