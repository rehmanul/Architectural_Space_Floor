
from flask import Blueprint, request, jsonify, send_file
from werkzeug.utils import secure_filename
import os
import uuid
import json
from datetime import datetime
from app import app, db
from models import FloorPlan, IlotProfile, IlotPlacement, ZoneAnnotation, Project
from file_processor import FileProcessor
import traceback

api = Blueprint('api', __name__, url_prefix='/api')

@api.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'timestamp': datetime.utcnow().isoformat()})

@api.route('/projects', methods=['GET', 'POST'])
def projects():
    """Get all projects or create a new one"""
    if request.method == 'GET':
        projects = Project.query.order_by(Project.created_at.desc()).all()
        return jsonify([{
            'id': p.id,
            'name': p.name,
            'description': p.description,
            'created_at': p.created_at.isoformat(),
            'updated_at': p.updated_at.isoformat(),
            'user_id': p.user_id,
            'metadata_info': p.metadata_info
        } for p in projects])
    
    elif request.method == 'POST':
        data = request.get_json()
        project = Project(
            name=data['name'],
            description=data.get('description', ''),
            user_id=data.get('user_id', 'default_user'),
            metadata_info=data.get('metadata_info', {})
        )
        db.session.add(project)
        db.session.commit()
        
        return jsonify({
            'id': project.id,
            'name': project.name,
            'description': project.description,
            'created_at': project.created_at.isoformat(),
            'user_id': project.user_id
        }), 201

@api.route('/projects/<int:project_id>', methods=['GET', 'PUT', 'DELETE'])
def project_detail(project_id):
    """Get, update, or delete a specific project"""
    project = Project.query.get_or_404(project_id)
    
    if request.method == 'GET':
        floor_plans = FloorPlan.query.filter_by(project_id=project_id).all()
        profiles = IlotProfile.query.filter_by(project_id=project_id).all()
        
        return jsonify({
            'id': project.id,
            'name': project.name,
            'description': project.description,
            'created_at': project.created_at.isoformat(),
            'floor_plans': [{
                'id': fp.id,
                'name': fp.name,
                'file_type': fp.file_type,
                'processed': fp.processed,
                'width': fp.width,
                'height': fp.height
            } for fp in floor_plans],
            'profiles': [{
                'id': p.id,
                'name': p.name,
                'corridor_width': p.corridor_width,
                'is_default': p.is_default
            } for p in profiles]
        })
    
    elif request.method == 'PUT':
        data = request.get_json()
        project.name = data.get('name', project.name)
        project.description = data.get('description', project.description)
        project.updated_at = datetime.utcnow()
        db.session.commit()
        return jsonify({'message': 'Project updated successfully'})
    
    elif request.method == 'DELETE':
        db.session.delete(project)
        db.session.commit()
        return jsonify({'message': 'Project deleted successfully'})

@api.route('/floor-plans', methods=['GET', 'POST'])
def floor_plans():
    """Get all floor plans or upload a new one"""
    if request.method == 'GET':
        plans = FloorPlan.query.order_by(FloorPlan.created_at.desc()).all()
        return jsonify([{
            'id': fp.id,
            'name': fp.name,
            'file_type': fp.file_type,
            'file_size': fp.file_size,
            'width': fp.width,
            'height': fp.height,
            'processed': fp.processed,
            'created_at': fp.created_at.isoformat(),
            'analysis_data': fp.analysis_data
        } for fp in plans])
    
    elif request.method == 'POST':
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'File type not supported'}), 400
        
        try:
            # Save file
            filename = secure_filename(file.filename)
            file_id = str(uuid.uuid4())
            file_ext = filename.rsplit('.', 1)[1].lower()
            new_filename = f"{file_id}.{file_ext}"
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], new_filename)
            file.save(file_path)
            
            # Process file
            processor = FileProcessor()
            processing_result = processor.process_file(file_path, 
                os.path.join(app.config['UPLOAD_FOLDER'], 'processed', file_id))
            
            # Determine file type
            detected_type = processor.detect_file_type(file_path)
            if detected_type == 'cad':
                file_type = 'cad'
            elif detected_type == 'pdf':
                file_type = 'pdf'
            elif detected_type == 'image':
                file_type = 'image'
            else:
                file_type = 'unknown'
            
            # Extract dimensions
            width = height = 100.0
            if processing_result['success'] and processing_result['data']:
                data = processing_result['data']
                if 'bounds' in data and data['bounds']:
                    bounds = data['bounds']
                    width = bounds['width']
                    height = bounds['height']
                elif 'width' in data:
                    width = data['width']
                    height = data['height']
            
            # Create floor plan record
            floor_plan = FloorPlan(
                project_id=request.form.get('project_id', 1),
                name=request.form.get('name', filename),
                original_file_name=filename,
                file_path=file_path,
                file_type=file_type,
                file_size=os.path.getsize(file_path),
                width=width,
                height=height,
                processed=processing_result['success'],
                processed_at=datetime.utcnow() if processing_result['success'] else None,
                analysis_data=processing_result['data'] if processing_result['success'] else None
            )
            
            db.session.add(floor_plan)
            db.session.commit()
            
            return jsonify({
                'id': floor_plan.id,
                'name': floor_plan.name,
                'file_type': floor_plan.file_type,
                'processed': floor_plan.processed,
                'processing_result': processing_result
            }), 201
            
        except Exception as e:
            return jsonify({'error': f'Processing failed: {str(e)}'}), 500

@api.route('/floor-plans/<int:plan_id>', methods=['GET', 'PUT', 'DELETE'])
def floor_plan_detail(plan_id):
    """Get, update, or delete a specific floor plan"""
    plan = FloorPlan.query.get_or_404(plan_id)
    
    if request.method == 'GET':
        zones = ZoneAnnotation.query.filter_by(floor_plan_id=plan_id).all()
        placements = IlotPlacement.query.filter_by(floor_plan_id=plan_id).all()
        
        return jsonify({
            'id': plan.id,
            'name': plan.name,
            'file_type': plan.file_type,
            'width': plan.width,
            'height': plan.height,
            'processed': plan.processed,
            'analysis_data': plan.analysis_data,
            'zones': [{
                'id': z.id,
                'type': z.type,
                'color': z.color,
                'coordinates': z.coordinates,
                'area': z.area,
                'properties': z.properties
            } for z in zones],
            'placements': [{
                'id': p.id,
                'name': p.name,
                'total_ilots': p.total_ilots,
                'utilization_percentage': p.utilization_percentage,
                'status': p.status,
                'created_at': p.created_at.isoformat()
            } for p in placements]
        })
    
    elif request.method == 'PUT':
        data = request.get_json()
        plan.name = data.get('name', plan.name)
        plan.scale = data.get('scale', plan.scale)
        db.session.commit()
        return jsonify({'message': 'Floor plan updated successfully'})
    
    elif request.method == 'DELETE':
        # Delete associated file
        if os.path.exists(plan.file_path):
            os.remove(plan.file_path)
        db.session.delete(plan)
        db.session.commit()
        return jsonify({'message': 'Floor plan deleted successfully'})

@api.route('/profiles', methods=['GET', 'POST'])
def ilot_profiles():
    """Get all profiles or create a new one"""
    if request.method == 'GET':
        profiles = IlotProfile.query.order_by(IlotProfile.created_at.desc()).all()
        return jsonify([{
            'id': p.id,
            'name': p.name,
            'size_distribution': p.size_distribution,
            'corridor_width': p.corridor_width,
            'min_room_size': p.min_room_size,
            'max_room_size': p.max_room_size,
            'is_default': p.is_default,
            'created_at': p.created_at.isoformat()
        } for p in profiles])
    
    elif request.method == 'POST':
        data = request.get_json()
        profile = IlotProfile(
            project_id=data.get('project_id', 1),
            name=data['name'],
            size_distribution=data.get('size_distribution', []),
            corridor_width=data.get('corridor_width', 1.5),
            min_room_size=data.get('min_room_size', 0.5),
            max_room_size=data.get('max_room_size', 50.0),
            is_default=data.get('is_default', False)
        )
        db.session.add(profile)
        db.session.commit()
        
        return jsonify({
            'id': profile.id,
            'name': profile.name,
            'corridor_width': profile.corridor_width,
            'is_default': profile.is_default
        }), 201

@api.route('/profiles/<int:profile_id>', methods=['GET', 'PUT', 'DELETE'])
def profile_detail(profile_id):
    """Get, update, or delete a specific profile"""
    profile = IlotProfile.query.get_or_404(profile_id)
    
    if request.method == 'GET':
        placements = IlotPlacement.query.filter_by(configuration_id=profile_id).all()
        
        return jsonify({
            'id': profile.id,
            'name': profile.name,
            'size_distribution': profile.size_distribution,
            'corridor_width': profile.corridor_width,
            'min_room_size': profile.min_room_size,
            'max_room_size': profile.max_room_size,
            'is_default': profile.is_default,
            'placements': [{
                'id': p.id,
                'name': p.name,
                'total_ilots': p.total_ilots,
                'utilization_percentage': p.utilization_percentage,
                'optimization_score': p.optimization_score,
                'created_at': p.created_at.isoformat()
            } for p in placements]
        })
    
    elif request.method == 'PUT':
        data = request.get_json()
        profile.name = data.get('name', profile.name)
        profile.size_distribution = data.get('size_distribution', profile.size_distribution)
        profile.corridor_width = data.get('corridor_width', profile.corridor_width)
        profile.min_room_size = data.get('min_room_size', profile.min_room_size)
        profile.max_room_size = data.get('max_room_size', profile.max_room_size)
        profile.is_default = data.get('is_default', profile.is_default)
        db.session.commit()
        return jsonify({'message': 'Profile updated successfully'})
    
    elif request.method == 'DELETE':
        db.session.delete(profile)
        db.session.commit()
        return jsonify({'message': 'Profile deleted successfully'})

@api.route('/zones', methods=['GET', 'POST'])
def zones():
    """Get all zones or create a new one"""
    if request.method == 'GET':
        floor_plan_id = request.args.get('floor_plan_id')
        if floor_plan_id:
            zones = ZoneAnnotation.query.filter_by(floor_plan_id=floor_plan_id).all()
        else:
            zones = ZoneAnnotation.query.all()
        
        return jsonify([{
            'id': z.id,
            'floor_plan_id': z.floor_plan_id,
            'type': z.type,
            'color': z.color,
            'coordinates': z.coordinates,
            'area': z.area,
            'properties': z.properties,
            'created_at': z.created_at.isoformat()
        } for z in zones])
    
    elif request.method == 'POST':
        data = request.get_json()
        zone = ZoneAnnotation(
            floor_plan_id=data['floor_plan_id'],
            type=data['type'],
            color=data['color'],
            coordinates=data['coordinates'],
            area=data.get('area'),
            properties=data.get('properties', {})
        )
        db.session.add(zone)
        db.session.commit()
        
        return jsonify({
            'id': zone.id,
            'type': zone.type,
            'color': zone.color,
            'coordinates': zone.coordinates
        }), 201

@api.route('/zones/<int:zone_id>', methods=['PUT', 'DELETE'])
def zone_detail(zone_id):
    """Update or delete a specific zone"""
    zone = ZoneAnnotation.query.get_or_404(zone_id)
    
    if request.method == 'PUT':
        data = request.get_json()
        zone.type = data.get('type', zone.type)
        zone.color = data.get('color', zone.color)
        zone.coordinates = data.get('coordinates', zone.coordinates)
        zone.area = data.get('area', zone.area)
        zone.properties = data.get('properties', zone.properties)
        db.session.commit()
        return jsonify({'message': 'Zone updated successfully'})
    
    elif request.method == 'DELETE':
        db.session.delete(zone)
        db.session.commit()
        return jsonify({'message': 'Zone deleted successfully'})

@api.route('/generate-layout', methods=['POST'])
def generate_layout():
    """Generate optimal layout using AI algorithms"""
    try:
        data = request.get_json()
        floor_plan_id = data['floor_plan_id']
        profile_id = data['profile_id']
        algorithm = data.get('algorithm', 'genetic')
        
        floor_plan = FloorPlan.query.get_or_404(floor_plan_id)
        profile = IlotProfile.query.get_or_404(profile_id)
        zones = ZoneAnnotation.query.filter_by(floor_plan_id=floor_plan_id).all()
        
        # Import the layout generator
        from layout_generator import LayoutGenerator
        
        generator = LayoutGenerator(floor_plan, profile, zones)
        start_time = datetime.utcnow()
        
        result = generator.generate_layout(algorithm=algorithm)
        
        generation_time = (datetime.utcnow() - start_time).total_seconds()
        
        # Create placement record
        placement = IlotPlacement(
            floor_plan_id=floor_plan_id,
            configuration_id=profile_id,
            name=data.get('name', f'Layout {datetime.utcnow().strftime("%Y%m%d_%H%M%S")}'),
            total_ilots=len(result['ilots']),
            total_area=sum(ilot['area'] for ilot in result['ilots']),
            utilization_percentage=result['utilization_percentage'],
            ilot_data=result['ilots'],
            corridor_data=result['corridors'],
            optimization_score=result.get('optimization_score', 0.75),
            generation_time=generation_time,
            algorithm=algorithm,
            status='completed'
        )
        
        db.session.add(placement)
        db.session.commit()
        
        return jsonify({
            'id': placement.id,
            'layout': {
                'ilots': result['ilots'],
                'corridors': result['corridors'],
                'utilization_percentage': result['utilization_percentage'],
                'optimization_score': result.get('optimization_score', 0.75),
                'generation_time': generation_time,
                'algorithm': algorithm
            }
        }), 201
        
    except Exception as e:
        app.logger.error(f"Layout generation error: {traceback.format_exc()}")
        return jsonify({'error': f'Layout generation failed: {str(e)}'}), 500

@api.route('/placements/<int:placement_id>', methods=['GET', 'PUT', 'DELETE'])
def placement_detail(placement_id):
    """Get, update, or delete a specific placement"""
    placement = IlotPlacement.query.get_or_404(placement_id)
    
    if request.method == 'GET':
        return jsonify({
            'id': placement.id,
            'name': placement.name,
            'floor_plan_id': placement.floor_plan_id,
            'configuration_id': placement.configuration_id,
            'total_ilots': placement.total_ilots,
            'total_area': placement.total_area,
            'utilization_percentage': placement.utilization_percentage,
            'ilot_data': placement.ilot_data,
            'corridor_data': placement.corridor_data,
            'optimization_score': placement.optimization_score,
            'generation_time': placement.generation_time,
            'algorithm': placement.algorithm,
            'status': placement.status,
            'created_at': placement.created_at.isoformat()
        })
    
    elif request.method == 'PUT':
        data = request.get_json()
        placement.name = data.get('name', placement.name)
        db.session.commit()
        return jsonify({'message': 'Placement updated successfully'})
    
    elif request.method == 'DELETE':
        db.session.delete(placement)
        db.session.commit()
        return jsonify({'message': 'Placement deleted successfully'})

def allowed_file(filename):
    """Check if file type is allowed"""
    processor = FileProcessor()
    extension = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
    return extension in processor.get_supported_formats()

# Register the blueprint
app.register_blueprint(api)
