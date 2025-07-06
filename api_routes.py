
from flask import jsonify, request
from app import app
from file_processor import FileProcessor
import os

@app.route('/api/supported-formats')
def get_supported_formats():
    """Get list of supported file formats"""
    processor = FileProcessor()
    return jsonify({
        'formats': processor.get_supported_formats(),
        'categories': {
            'CAD': ['dxf', 'dwg'],
            'PDF': ['pdf'],
            'Images': ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'tif']
        }
    })

@app.route('/api/file-info/<int:floor_plan_id>')
def get_file_info(floor_plan_id):
    """Get detailed information about a processed file"""
    from models import FloorPlan
    
    floor_plan = FloorPlan.query.get_or_404(floor_plan_id)
    
    return jsonify({
        'id': floor_plan.id,
        'name': floor_plan.name,
        'original_filename': floor_plan.original_file_name,
        'file_type': floor_plan.file_type,
        'file_size': floor_plan.file_size,
        'dimensions': {
            'width': floor_plan.width,
            'height': floor_plan.height
        },
        'processed': floor_plan.processed,
        'processed_at': floor_plan.processed_at.isoformat() if floor_plan.processed_at else None,
        'analysis_data': floor_plan.analysis_data,
        'scale': floor_plan.scale
    })

@app.route('/api/reprocess-file/<int:floor_plan_id>', methods=['POST'])
def reprocess_file(floor_plan_id):
    """Reprocess a file with updated settings"""
    from models import FloorPlan
    from routes import process_uploaded_file
    from datetime import datetime
    
    floor_plan = FloorPlan.query.get_or_404(floor_plan_id)
    
    if not os.path.exists(floor_plan.file_path):
        return jsonify({'error': 'Original file not found'}), 404
    
    try:
        # Reprocess the file
        processing_result = process_uploaded_file(floor_plan.file_path, floor_plan.original_file_name)
        
        # Update the record
        floor_plan.width = processing_result['width']
        floor_plan.height = processing_result['height']
        floor_plan.processed = processing_result['processed']
        floor_plan.processed_at = datetime.utcnow() if processing_result['processed'] else None
        floor_plan.analysis_data = processing_result['analysis_data']
        
        from app import db
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'File reprocessed successfully',
            'data': processing_result
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
