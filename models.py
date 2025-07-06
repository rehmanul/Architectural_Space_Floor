
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
    description = db.Column(Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Configuration data
    unit_types = db.Column(JSON)  # List of unit types with percentages and size ranges
    spacing_requirements = db.Column(JSON)  # Minimum spacing between units
    corridor_width = db.Column(db.Float, default=2.0)  # Corridor width in meters
    
    # Relationships
    placements = db.relationship('IlotPlacement', backref='ilot_profile', lazy=True)

class IlotPlacement(db.Model):
    __tablename__ = 'generated_layouts'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    floor_plan_id = db.Column(db.Integer, db.ForeignKey('floor_plans.id'), nullable=False)
    ilot_profile_id = db.Column(db.Integer, db.ForeignKey('ilot_configurations.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Placement results
    placed_units = db.Column(JSON)  # Coordinates and properties of placed units
    corridors = db.Column(JSON)  # Generated corridor paths
    statistics = db.Column(JSON)  # Placement statistics (utilization, counts, etc.)
    
    # Status
    status = db.Column(db.String(20), default='pending')  # pending, processing, completed, failed
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
    metadata = db.Column(JSON)
