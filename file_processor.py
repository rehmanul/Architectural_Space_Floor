
import os
import json
import logging
from typing import Dict, List, Tuple, Optional, Any
from PIL import Image, ImageOps, ImageDraw
import magic
from datetime import datetime

# Optional imports for different file formats
try:
    import ezdxf
    from ezdxf.addons import drawing
    from ezdxf.addons.drawing import RenderContext, Frontend
    from ezdxf.addons.drawing.matplotlib import MatplotlibBackend
    DXF_AVAILABLE = True
except ImportError:
    DXF_AVAILABLE = False
    logging.warning("ezdxf not available - DXF support disabled")

try:
    import fitz  # PyMuPDF
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False
    logging.warning("PyMuPDF not available - PDF support disabled")

try:
    import cv2
    import numpy as np
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False
    logging.warning("OpenCV not available - advanced image processing disabled")

class FileProcessor:
    """Comprehensive file processor for DWG, DXF, PDF, JPG, PNG formats"""
    
    SUPPORTED_FORMATS = {
        'dxf': 'AutoCAD DXF',
        'dwg': 'AutoCAD DWG', 
        'pdf': 'PDF Document',
        'jpg': 'JPEG Image',
        'jpeg': 'JPEG Image',
        'png': 'PNG Image',
        'gif': 'GIF Image',
        'bmp': 'Bitmap Image',
        'tiff': 'TIFF Image',
        'tif': 'TIFF Image'
    }
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def detect_file_type(self, file_path: str) -> str:
        """Detect file type using python-magic for accurate detection"""
        try:
            mime = magic.from_file(file_path, mime=True)
            extension = os.path.splitext(file_path)[1].lower().lstrip('.')
            
            # Map MIME types to our format categories
            if mime.startswith('image/'):
                return 'image'
            elif mime == 'application/pdf':
                return 'pdf'
            elif extension in ['dxf', 'dwg']:
                return 'cad'
            else:
                return 'unknown'
        except Exception as e:
            self.logger.warning(f"Could not detect file type: {e}")
            # Fallback to extension
            extension = os.path.splitext(file_path)[1].lower().lstrip('.')
            if extension in ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'tif']:
                return 'image'
            elif extension == 'pdf':
                return 'pdf'
            elif extension in ['dxf', 'dwg']:
                return 'cad'
            return 'unknown'
    
    def process_file(self, file_path: str, output_dir: str = None) -> Dict[str, Any]:
        """Process any supported file format and extract relevant data"""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
        
        file_type = self.detect_file_type(file_path)
        file_ext = os.path.splitext(file_path)[1].lower().lstrip('.')
        
        result = {
            'file_path': file_path,
            'file_type': file_type,
            'file_extension': file_ext,
            'file_size': os.path.getsize(file_path),
            'processed_at': datetime.utcnow().isoformat(),
            'success': False,
            'error': None,
            'data': {}
        }
        
        try:
            if file_type == 'cad':
                if file_ext == 'dxf':
                    result['data'] = self.process_dxf(file_path, output_dir)
                elif file_ext == 'dwg':
                    result['data'] = self.process_dwg(file_path, output_dir)
            elif file_type == 'pdf':
                result['data'] = self.process_pdf(file_path, output_dir)
            elif file_type == 'image':
                result['data'] = self.process_image(file_path, output_dir)
            else:
                raise ValueError(f"Unsupported file type: {file_type}")
            
            result['success'] = True
            
        except Exception as e:
            result['error'] = str(e)
            self.logger.error(f"Error processing file {file_path}: {e}")
        
        return result
    
    def process_dxf(self, file_path: str, output_dir: str = None) -> Dict[str, Any]:
        """Process DXF files and extract geometric data"""
        if not DXF_AVAILABLE:
            raise ImportError("ezdxf package required for DXF processing")
        
        try:
            doc = ezdxf.readfile(file_path)
            msp = doc.modelspace()
            
            # Extract basic information
            data = {
                'format': 'DXF',
                'version': doc.dxfversion,
                'units': doc.header.get('$INSUNITS', 1),
                'layers': [],
                'entities': [],
                'bounds': None,
                'analysis': {}
            }
            
            # Extract layers
            for layer in doc.layers:
                data['layers'].append({
                    'name': layer.dxf.name,
                    'color': layer.dxf.color,
                    'linetype': layer.dxf.linetype,
                    'frozen': layer.is_frozen(),
                    'locked': layer.is_locked()
                })
            
            # Extract entities and analyze geometry
            walls = []
            lines = []
            polylines = []
            circles = []
            texts = []
            
            min_x = min_y = float('inf')
            max_x = max_y = float('-inf')
            
            for entity in msp:
                entity_data = {
                    'type': entity.dxftype(),
                    'layer': entity.dxf.layer,
                    'color': entity.dxf.color if hasattr(entity.dxf, 'color') else None
                }
                
                # Extract coordinates based on entity type
                if entity.dxftype() == 'LINE':
                    start = entity.dxf.start
                    end = entity.dxf.end
                    entity_data['start'] = [start.x, start.y]
                    entity_data['end'] = [end.x, end.y]
                    lines.append(entity_data)
                    
                    # Update bounds
                    min_x = min(min_x, start.x, end.x)
                    max_x = max(max_x, start.x, end.x)
                    min_y = min(min_y, start.y, end.y)
                    max_y = max(max_y, start.y, end.y)
                    
                elif entity.dxftype() == 'LWPOLYLINE':
                    points = []
                    for point in entity.get_points():
                        points.append([point[0], point[1]])
                        min_x = min(min_x, point[0])
                        max_x = max(max_x, point[0])
                        min_y = min(min_y, point[1])
                        max_y = max(max_y, point[1])
                    entity_data['points'] = points
                    entity_data['closed'] = entity.closed
                    polylines.append(entity_data)
                    
                elif entity.dxftype() == 'CIRCLE':
                    center = entity.dxf.center
                    radius = entity.dxf.radius
                    entity_data['center'] = [center.x, center.y]
                    entity_data['radius'] = radius
                    circles.append(entity_data)
                    
                    # Update bounds
                    min_x = min(min_x, center.x - radius)
                    max_x = max(max_x, center.x + radius)
                    min_y = min(min_y, center.y - radius)
                    max_y = max(max_y, center.y + radius)
                    
                elif entity.dxftype() == 'TEXT':
                    text_data = {
                        'text': entity.dxf.text,
                        'position': [entity.dxf.insert.x, entity.dxf.insert.y],
                        'height': entity.dxf.height,
                        'rotation': entity.dxf.rotation
                    }
                    entity_data.update(text_data)
                    texts.append(entity_data)
                
                data['entities'].append(entity_data)
            
            # Set bounds
            if min_x != float('inf'):
                data['bounds'] = {
                    'min_x': min_x, 'max_x': max_x,
                    'min_y': min_y, 'max_y': max_y,
                    'width': max_x - min_x,
                    'height': max_y - min_y
                }
            
            # Analysis data
            data['analysis'] = {
                'total_entities': len(data['entities']),
                'lines': len(lines),
                'polylines': len(polylines),
                'circles': len(circles),
                'texts': len(texts),
                'potential_walls': self._identify_walls(lines + polylines),
                'potential_rooms': self._identify_rooms(polylines)
            }
            
            # Generate preview image if output directory provided
            if output_dir:
                preview_path = self._generate_dxf_preview(doc, output_dir)
                data['preview_image'] = preview_path
            
            return data
            
        except Exception as e:
            raise Exception(f"DXF processing error: {e}")
    
    def process_dwg(self, file_path: str, output_dir: str = None) -> Dict[str, Any]:
        """Process DWG files - requires conversion to DXF first"""
        # DWG files require special handling since they're binary format
        # For now, we'll return basic file info and suggest conversion
        return {
            'format': 'DWG',
            'note': 'DWG files require conversion to DXF format for processing',
            'suggestion': 'Please convert to DXF format using AutoCAD or FreeCAD',
            'file_size': os.path.getsize(file_path),
            'conversion_needed': True
        }
    
    def process_pdf(self, file_path: str, output_dir: str = None) -> Dict[str, Any]:
        """Process PDF files and extract floor plan images"""
        if not PDF_AVAILABLE:
            raise ImportError("PyMuPDF package required for PDF processing")
        
        try:
            doc = fitz.open(file_path)
            
            data = {
                'format': 'PDF',
                'page_count': len(doc),
                'pages': [],
                'extracted_images': [],
                'text_content': []
            }
            
            for page_num in range(len(doc)):
                page = doc[page_num]
                
                # Extract page information
                page_data = {
                    'page_number': page_num + 1,
                    'width': page.rect.width,
                    'height': page.rect.height,
                    'rotation': page.rotation
                }
                
                # Extract text
                text = page.get_text()
                if text.strip():
                    data['text_content'].append({
                        'page': page_num + 1,
                        'text': text
                    })
                
                # Convert page to image
                if output_dir:
                    os.makedirs(output_dir, exist_ok=True)
                    
                    # Render page as image
                    mat = fitz.Matrix(2.0, 2.0)  # 2x zoom for better quality
                    pix = page.get_pixmap(matrix=mat)
                    
                    image_filename = f"page_{page_num + 1}.png"
                    image_path = os.path.join(output_dir, image_filename)
                    pix.save(image_path)
                    
                    # Process the extracted image
                    image_data = self.process_image(image_path)
                    page_data['extracted_image'] = image_path
                    page_data['image_analysis'] = image_data
                    
                    data['extracted_images'].append(image_path)
                
                data['pages'].append(page_data)
            
            doc.close()
            return data
            
        except Exception as e:
            raise Exception(f"PDF processing error: {e}")
    
    def process_image(self, file_path: str, output_dir: str = None) -> Dict[str, Any]:
        """Process image files and extract floor plan features"""
        try:
            # Open and analyze image
            image = Image.open(file_path)
            
            data = {
                'format': 'Image',
                'mode': image.mode,
                'size': image.size,
                'width': image.width,
                'height': image.height,
                'has_transparency': 'transparency' in image.info or 'A' in image.mode,
                'analysis': {}
            }
            
            # Convert to RGB if necessary
            if image.mode in ('RGBA', 'LA', 'P'):
                rgb_image = Image.new('RGB', image.size, (255, 255, 255))
                if image.mode == 'P':
                    image = image.convert('RGBA')
                rgb_image.paste(image, mask=image.split()[-1] if 'A' in image.mode else None)
                image = rgb_image
            
            # Basic image analysis
            data['analysis'] = self._analyze_floor_plan_image(image)
            
            # Advanced processing if OpenCV is available
            if CV2_AVAILABLE:
                cv_data = self._advanced_image_analysis(file_path)
                data['analysis'].update(cv_data)
            
            # Generate processed outputs
            if output_dir:
                os.makedirs(output_dir, exist_ok=True)
                
                # Save processed versions
                processed_data = self._generate_image_outputs(image, output_dir)
                data.update(processed_data)
            
            return data
            
        except Exception as e:
            raise Exception(f"Image processing error: {e}")
    
    def _analyze_floor_plan_image(self, image: Image.Image) -> Dict[str, Any]:
        """Basic floor plan analysis using PIL"""
        # Convert to grayscale for analysis
        gray = image.convert('L')
        
        # Get pixel data
        pixels = list(gray.getdata())
        
        # Basic statistics
        total_pixels = len(pixels)
        dark_pixels = sum(1 for p in pixels if p < 128)
        light_pixels = total_pixels - dark_pixels
        
        return {
            'total_pixels': total_pixels,
            'dark_pixel_ratio': dark_pixels / total_pixels,
            'light_pixel_ratio': light_pixels / total_pixels,
            'average_brightness': sum(pixels) / total_pixels,
            'estimated_wall_coverage': dark_pixels / total_pixels
        }
    
    def _advanced_image_analysis(self, file_path: str) -> Dict[str, Any]:
        """Advanced analysis using OpenCV"""
        if not CV2_AVAILABLE:
            return {}
        
        try:
            # Read image
            img = cv2.imread(file_path)
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            # Edge detection
            edges = cv2.Canny(gray, 50, 150, apertureSize=3)
            
            # Line detection using Hough transform
            lines = cv2.HoughLines(edges, 1, np.pi/180, threshold=100)
            
            # Contour detection
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            # Analyze detected features
            horizontal_lines = 0
            vertical_lines = 0
            
            if lines is not None:
                for line in lines:
                    rho, theta = line[0]
                    # Check if line is horizontal or vertical
                    if abs(theta) < np.pi/4 or abs(theta - np.pi) < np.pi/4:
                        horizontal_lines += 1
                    elif abs(theta - np.pi/2) < np.pi/4:
                        vertical_lines += 1
            
            return {
                'detected_lines': len(lines) if lines is not None else 0,
                'horizontal_lines': horizontal_lines,
                'vertical_lines': vertical_lines,
                'detected_contours': len(contours),
                'potential_rooms': len([c for c in contours if cv2.contourArea(c) > 1000]),
                'edge_density': np.sum(edges > 0) / edges.size
            }
            
        except Exception as e:
            self.logger.warning(f"Advanced image analysis failed: {e}")
            return {}
    
    def _identify_walls(self, entities: List[Dict]) -> List[Dict]:
        """Identify potential walls from line entities"""
        walls = []
        for entity in entities:
            if entity['type'] in ['LINE', 'LWPOLYLINE']:
                # Simple heuristic: long straight lines might be walls
                if entity['type'] == 'LINE':
                    start = entity['start']
                    end = entity['end']
                    length = ((end[0] - start[0])**2 + (end[1] - start[1])**2)**0.5
                    if length > 10:  # Arbitrary threshold
                        walls.append({
                            'type': 'wall',
                            'start': start,
                            'end': end,
                            'length': length,
                            'layer': entity.get('layer', 'unknown')
                        })
        return walls
    
    def _identify_rooms(self, polylines: List[Dict]) -> List[Dict]:
        """Identify potential rooms from closed polylines"""
        rooms = []
        for entity in polylines:
            if entity.get('closed', False) and len(entity.get('points', [])) > 3:
                # Calculate area (simple polygon area calculation)
                points = entity['points']
                area = 0
                for i in range(len(points)):
                    j = (i + 1) % len(points)
                    area += points[i][0] * points[j][1]
                    area -= points[j][0] * points[i][1]
                area = abs(area) / 2
                
                if area > 100:  # Minimum room area threshold
                    rooms.append({
                        'type': 'room',
                        'points': points,
                        'area': area,
                        'layer': entity.get('layer', 'unknown')
                    })
        return rooms
    
    def _generate_dxf_preview(self, doc, output_dir: str) -> str:
        """Generate preview image from DXF document"""
        if not DXF_AVAILABLE:
            return None
        
        try:
            import matplotlib.pyplot as plt
            
            # Create matplotlib backend
            fig = plt.figure(figsize=(12, 8))
            ax = fig.add_axes([0, 0, 1, 1])
            ctx = RenderContext(doc)
            out = MatplotlibBackend(ax)
            Frontend(ctx, out).draw_layout(doc.modelspace(), finalize=True)
            
            # Save preview
            preview_path = os.path.join(output_dir, 'dxf_preview.png')
            fig.savefig(preview_path, dpi=150, bbox_inches='tight')
            plt.close(fig)
            
            return preview_path
            
        except Exception as e:
            self.logger.warning(f"Could not generate DXF preview: {e}")
            return None
    
    def _generate_image_outputs(self, image: Image.Image, output_dir: str) -> Dict[str, str]:
        """Generate various processed versions of the image"""
        outputs = {}
        
        try:
            # Thumbnail
            thumbnail = image.copy()
            thumbnail.thumbnail((400, 400), Image.Resampling.LANCZOS)
            thumb_path = os.path.join(output_dir, 'thumbnail.png')
            thumbnail.save(thumb_path)
            outputs['thumbnail'] = thumb_path
            
            # Grayscale version
            gray = image.convert('L')
            gray_path = os.path.join(output_dir, 'grayscale.png')
            gray.save(gray_path)
            outputs['grayscale'] = gray_path
            
            # High contrast version for better wall detection
            contrast = ImageOps.autocontrast(gray, cutoff=2)
            contrast_path = os.path.join(output_dir, 'high_contrast.png')
            contrast.save(contrast_path)
            outputs['high_contrast'] = contrast_path
            
        except Exception as e:
            self.logger.warning(f"Could not generate image outputs: {e}")
        
        return outputs
    
    def get_supported_formats(self) -> Dict[str, str]:
        """Get list of supported file formats"""
        return self.SUPPORTED_FORMATS.copy()
    
    def is_supported(self, file_path: str) -> bool:
        """Check if file format is supported"""
        extension = os.path.splitext(file_path)[1].lower().lstrip('.')
        return extension in self.SUPPORTED_FORMATS
