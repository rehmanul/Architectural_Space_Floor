from flask import render_template, request, redirect, url_for, flash, jsonify
from werkzeug.utils import secure_filename
import os
import uuid
from datetime import datetime
from app import app, db
from models import FloorPlan, IlotProfile, IlotPlacement, ZoneAnnotation, Project
from file_processor import FileProcessor

@app.route('/')
def index():
    """Home page showing recent floor plans and profiles"""
    recent_plans = FloorPlan.query.order_by(FloorPlan.created_at.desc()).limit(5).all()
    recent_profiles = IlotProfile.query.order_by(IlotProfile.created_at.desc()).limit(5).all()
    return render_template('index.html', recent_plans=recent_plans, recent_profiles=recent_profiles)

@app.route('/floor-plans')
def floor_plans():
    """List all floor plans"""
    plans = FloorPlan.query.order_by(FloorPlan.created_at.desc()).all()
    return render_template('floor_plans.html', plans=plans)

@app.route('/floor-plans/upload', methods=['GET', 'POST'])
def upload_floor_plan():
    """Upload a new floor plan"""
    if request.method == 'POST':
        if 'file' not in request.files:
            flash('No file selected', 'error')
            return redirect(request.url)
        
        file = request.files['file']
        if file.filename == '':
            flash('No file selected', 'error')
            return redirect(request.url)
        
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            file_id = str(uuid.uuid4())
            file_ext = filename.rsplit('.', 1)[1].lower()
            new_filename = f"{file_id}.{file_ext}"
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], new_filename)
            
            file.save(file_path)
            
            # Process the uploaded file
            try:
                processing_result = process_uploaded_file(file_path, filename)
                
                # Determine file type category
                processor = FileProcessor()
                detected_type = processor.detect_file_type(file_path)
                
                if detected_type == 'cad':
                    file_type = 'cad'
                elif detected_type == 'pdf':
                    file_type = 'pdf'
                elif detected_type == 'image':
                    file_type = 'image'
                else:
                    file_type = 'unknown'
                
                # Create floor plan record
                floor_plan = FloorPlan(
                    project_id=1,  # Default project for now
                    name=request.form.get('name', filename),
                    original_file_name=filename,
                    file_path=file_path,
                    file_type=file_type,
                    file_size=os.path.getsize(file_path),
                    width=processing_result['width'],
                    height=processing_result['height'],
                    processed=processing_result['processed'],
                    processed_at=datetime.utcnow() if processing_result['processed'] else None,
                    analysis_data=processing_result['analysis_data']
                )
                
                if processing_result['error']:
                    flash(f'File uploaded but processing had issues: {processing_result["error"]}', 'warning')
                
            except Exception as e:
                # Create basic record even if processing fails
                floor_plan = FloorPlan(
                    project_id=1,
                    name=request.form.get('name', filename),
                    original_file_name=filename,
                    file_path=file_path,
                    file_type='unknown',
                    file_size=os.path.getsize(file_path),
                    width=100.0,
                    height=100.0,
                    processed=False
                )
                flash(f'File uploaded but could not be processed: {str(e)}', 'warning')
            
            db.session.add(floor_plan)
            db.session.commit()
            
            flash('Floor plan uploaded successfully!', 'success')
            return redirect(url_for('view_floor_plan', id=floor_plan.id))
        else:
            flash('Invalid file type. Please upload DXF or image files.', 'error')
    
    return render_template('upload_floor_plan.html')

@app.route('/floor-plans/<id>')
def view_floor_plan(id):
    """View a specific floor plan"""
    plan = FloorPlan.query.get_or_404(id)
    placements = IlotPlacement.query.filter_by(floor_plan_id=id).order_by(IlotPlacement.created_at.desc()).all()
    return render_template('view_floor_plan.html', plan=plan, placements=placements)

@app.route('/profiles')
def ilot_profiles():
    """List all ilot profiles"""
    profiles = IlotProfile.query.order_by(IlotProfile.created_at.desc()).all()
    return render_template('ilot_profiles.html', profiles=profiles)

@app.route('/profiles/new', methods=['GET', 'POST'])
def create_profile():
    """Create a new ilot profile"""
    if request.method == 'POST':
        profile = IlotProfile(
            project_id=1,  # Default project for now
            name=request.form['name'],
            size_distribution=[],  # Default empty size distribution
            corridor_width=float(request.form.get('corridor_width', 1.5))
        )
        
        db.session.add(profile)
        db.session.commit()
        
        flash('Profile created successfully!', 'success')
        return redirect(url_for('view_profile', id=profile.id))
    
    return render_template('create_profile.html')

@app.route('/profiles/<id>')
def view_profile(id):
    """View a specific ilot profile"""
    profile = IlotProfile.query.get_or_404(id)
    placements = IlotPlacement.query.filter_by(configuration_id=id).order_by(IlotPlacement.created_at.desc()).all()
    return render_template('view_profile.html', profile=profile, placements=placements)

@app.route('/placements')
def placements():
    """List all placements"""
    all_placements = IlotPlacement.query.order_by(IlotPlacement.created_at.desc()).all()
    return render_template('placements.html', placements=all_placements)

@app.route('/placements/new', methods=['GET', 'POST'])
def create_placement():
    """Create a new placement"""
    if request.method == 'POST':
        placement = IlotPlacement(
            floor_plan_id=request.form['floor_plan_id'],
            configuration_id=request.form['configuration_id'],
            name=request.form.get('name', f'Layout {datetime.utcnow().strftime("%Y%m%d_%H%M%S")}'),
            total_ilots=0,
            total_area=0.0,
            utilization_percentage=0.0,
            ilot_data=[],
            corridor_data=[],
            generation_time=0.0,
            algorithm='Manual Creation'
        )
        
        db.session.add(placement)
        db.session.commit()
        
        # TODO: Trigger placement algorithm here
        
        flash('Placement created successfully!', 'success')
        return redirect(url_for('view_placement', id=placement.id))
    
    floor_plans = FloorPlan.query.all()
    profiles = IlotProfile.query.all()
    return render_template('create_placement.html', floor_plans=floor_plans, profiles=profiles)

@app.route('/placements/<id>')
def view_placement(id):
    """View a specific placement"""
    placement = IlotPlacement.query.get_or_404(id)
    return render_template('view_placement.html', placement=placement)

def allowed_file(filename):
    """Check if the uploaded file type is allowed"""
    processor = FileProcessor()
    extension = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
    return extension in processor.get_supported_formats()

def process_uploaded_file(file_path: str, filename: str) -> dict:
    """Process uploaded file and extract relevant data"""
    processor = FileProcessor()
    
    # Create output directory for processed files
    file_id = os.path.splitext(os.path.basename(file_path))[0]
    output_dir = os.path.join(app.config['UPLOAD_FOLDER'], 'processed', file_id)
    os.makedirs(output_dir, exist_ok=True)
    
    # Process the file
    result = processor.process_file(file_path, output_dir)
    
    # Extract dimensions and other metadata
    width = height = 100.0  # Default values
    
    if result['success'] and result['data']:
        data = result['data']
        
        # Extract dimensions based on file type
        if result['file_type'] == 'cad' and 'bounds' in data and data['bounds']:
            bounds = data['bounds']
            width = bounds['width']
            height = bounds['height']
        elif result['file_type'] == 'image' and 'width' in data:
            width = data['width']
            height = data['height']
        elif result['file_type'] == 'pdf' and data['pages']:
            # Use first page dimensions
            first_page = data['pages'][0]
            width = first_page['width']
            height = first_page['height']
    
    return {
        'width': width,
        'height': height,
        'analysis_data': result['data'] if result['success'] else None,
        'processed': result['success'],
        'error': result.get('error')
    }

@app.errorhandler(404)
def not_found_error(error):
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return render_template('500.html'), 500