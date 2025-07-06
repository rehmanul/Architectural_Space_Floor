from app import db
from datetime import datetime
from sqlalchemy import Text, JSON
import uuid

class FloorPlan(db.Model):
    __tablename__ = 'floor_plans'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(255), nullable=False)
    filename = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    file_type = db.Column(db.String(10), nullable=False)  # 'dxf' or 'image'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Parsed data
    zones_data = db.Column(JSON)  # Detected zones (walls, restricted areas, entrances)
    dimensions = db.Column(JSON)  # Floor plan dimensions and scale
    
    # Relationships
    placements = db.relationship('IlotPlacement', backref='floor_plan', lazy=True, cascade='all, delete-orphan')

class IlotProfile(db.Model):
    __tablename__ = 'ilot_profiles'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
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
    __tablename__ = 'ilot_placements'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    floor_plan_id = db.Column(db.String(36), db.ForeignKey('floor_plans.id'), nullable=False)
    ilot_profile_id = db.Column(db.String(36), db.ForeignKey('ilot_profiles.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Placement results
    placed_units = db.Column(JSON)  # Coordinates and properties of placed units
    corridors = db.Column(JSON)  # Generated corridor paths
    statistics = db.Column(JSON)  # Placement statistics (utilization, counts, etc.)
    
    # Status
    status = db.Column(db.String(20), default='pending')  # pending, processing, completed, failed
    error_message = db.Column(Text)

class ZoneAnnotation(db.Model):
    __tablename__ = 'zone_annotations'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    floor_plan_id = db.Column(db.String(36), db.ForeignKey('floor_plans.id'), nullable=False)
    zone_type = db.Column(db.String(50), nullable=False)  # 'wall', 'restricted', 'entrance', 'exit'
    coordinates = db.Column(JSON)  # Polygon or line coordinates
    properties = db.Column(JSON)  # Additional zone properties
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
