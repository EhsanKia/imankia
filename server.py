import os
import sys
import json
import io
import urllib.parse
import http.server
import socketserver
from PIL import Image

# Ensure working directory is the script's directory
os.chdir(os.path.dirname(os.path.abspath(__file__)))

PORT = 8000
PROJECTS_DIR = 'projects'
STATIC_DIR = 'static'
IMG_DIR = os.path.join(STATIC_DIR, 'img')

# Create necessary folders
os.makedirs(PROJECTS_DIR, exist_ok=True)
os.makedirs(os.path.join(PROJECTS_DIR, 'deleted'), exist_ok=True)
os.makedirs(STATIC_DIR, exist_ok=True)
for size in ['a', 'b', 'c', 'm', 's']:
    os.makedirs(os.path.join(IMG_DIR, size), exist_ok=True)


def compile_data():
    """Scans projects/ directory and compiles static/arts_en.json and static/arts_fr.json"""
    print("Compiling project static JSON files...")
    en_projects = {}
    fr_projects = {}
    
    if os.path.exists(PROJECTS_DIR):
        for filename in os.listdir(PROJECTS_DIR):
            path = os.path.join(PROJECTS_DIR, filename)
            if os.path.isdir(path):
                continue
            if filename.endswith('.en'):
                proj_id_str = filename[:-3]
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        en_projects[proj_id_str] = json.load(f)
                except Exception as e:
                    print(f"Error reading {filename}: {e}")
            elif filename.endswith('.fr'):
                proj_id_str = filename[:-3]
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        fr_projects[proj_id_str] = json.load(f)
                except Exception as e:
                    print(f"Error reading {filename}: {e}")
                    
    all_keys = set(en_projects.keys()) | set(fr_projects.keys())
    compiled_en = []
    compiled_fr = []
    
    for key in all_keys:
        en_data = en_projects.get(key)
        fr_data = fr_projects.get(key)
        
        # Fallbacks
        if not en_data and fr_data:
            en_data = fr_data.copy()
            en_data['title'] = fr_data.get('title', '')
        if not fr_data and en_data:
            fr_data = en_data.copy()
            fr_data['title'] = en_data.get('title', '')
            
        if en_data:
            compiled_en.append(en_data)
        if fr_data:
            compiled_fr.append(fr_data)
            
    # Sorting key: order ascending, then id descending
    def get_sort_key(proj):
        order = proj.get('order')
        if order is None:
            try:
                order = int(proj.get('id', 999999))
            except:
                order = 999999
        else:
            try:
                order = int(order)
            except:
                order = 999999
        try:
            pid = int(proj.get('id', 0))
        except:
            pid = 0
        return (order, -pid)
        
    compiled_en_sorted = sorted(compiled_en, key=get_sort_key)
    compiled_fr_sorted = sorted(compiled_fr, key=get_sort_key)
    
    with open(os.path.join(STATIC_DIR, 'arts_en.json'), 'w', encoding='utf-8') as f:
        json.dump(compiled_en_sorted, f, ensure_ascii=False, indent=2)
        
    with open(os.path.join(STATIC_DIR, 'arts_fr.json'), 'w', encoding='utf-8') as f:
        json.dump(compiled_fr_sorted, f, ensure_ascii=False, indent=2)
        
    print(f"Compilation finished. Compiled {len(compiled_en_sorted)} English and {len(compiled_fr_sorted)} French projects.")


def get_all_projects_admin():
    """Reads projects/ and returns aggregated EN and FR versions for the admin editor"""
    projects = {}
    for filename in os.listdir(PROJECTS_DIR):
        path = os.path.join(PROJECTS_DIR, filename)
        if os.path.isdir(path):
            continue
        parts = filename.split('.')
        if len(parts) != 2:
            continue
        proj_id_str, lang = parts[0], parts[1]
        if lang not in ['en', 'fr']:
            continue
            
        try:
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except Exception as e:
            print(f"Error loading {filename}: {e}")
            continue
            
        proj_id = data.get('id')
        if proj_id is None:
            try:
                proj_id = int(proj_id_str)
            except:
                continue
                
        if proj_id not in projects:
            projects[proj_id] = {
                'id': proj_id,
                'image': data.get('image', ''),
                'order': data.get('order', proj_id),
                'en': {'title': '', 'summary': '', 'body': ''},
                'fr': {'title': '', 'summary': '', 'body': ''}
            }
            
        if data.get('image'):
            projects[proj_id]['image'] = data['image']
        if 'order' in data:
            projects[proj_id]['order'] = data['order']
            
        projects[proj_id][lang] = {
            'title': data.get('title', ''),
            'summary': data.get('summary', ''),
            'body': data.get('body', '')
        }
        
    result = list(projects.values())
    result.sort(key=lambda x: (x.get('order', 999999), -x.get('id', 0)))
    return result


def get_images():
    """Returns sorted image filenames based on modification time"""
    s_dir = os.path.join(IMG_DIR, 's')
    if not os.path.exists(s_dir):
        return []
    imgs = os.listdir(s_dir)
    modified_time = lambda f: os.path.getmtime(os.path.join(s_dir, f))
    return sorted(imgs, key=modified_time, reverse=True)


def _save_image(img, path, width=None, height=None, crop=False, quality=90):
    """Processes, resizes, and crops an image using PIL"""
    old_width, old_height = img.size
    current_ratio = old_width / old_height
    
    if width and height:
        if crop:
            target_ratio = width / height
            if target_ratio < current_ratio:
                new_width = int(width * old_height / height)
                x = (old_width - new_width) // 2
                img = img.crop((x, 0, x + new_width, old_height))
            elif target_ratio > current_ratio:
                new_height = int(height * old_width / width)
                y = (old_height - new_height) // 2
                img = img.crop((0, y, old_width, y + new_height))
        else:
            new_width = int(height * current_ratio)
            new_height = int(width / current_ratio)
            if new_width > width:
                height = new_height
            elif new_height > height:
                width = new_width
    elif width:
        height = int(width / current_ratio)
    elif height:
        width = int(height * current_ratio)
        
    if width and height:
        # Check image mode and convert if saving as JPEG
        if img.mode in ('RGBA', 'LA') and path.lower().endswith(('.jpg', '.jpeg')):
            # paste onto white background
            background = Image.new("RGB", img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[3]) # 3 is alpha
            img = background
        img = img.resize((width, height), Image.Resampling.LANCZOS)
        
    with open(path, 'wb') as fp:
        img.save(fp, quality=quality, optimize=True)


def save_image_bytes(filename, content):
    """Saves and resizes uploaded image data into various size categories"""
    try:
        img = Image.open(io.BytesIO(content))
        
        # Save Big size
        b_path = os.path.join(IMG_DIR, 'b', filename)
        _save_image(img, b_path)
        
        # Save Small size (200x200 quality=70)
        s_path = os.path.join(IMG_DIR, 's', filename)
        _save_image(img, s_path, width=200, height=200, quality=70)
        
        # Save Grid Album size (360x280 cropped quality=70)
        a_path = os.path.join(IMG_DIR, 'a', filename)
        _save_image(img, a_path, width=360, height=280, crop=True, quality=70)
        
        # Save Medium size (700 width quality=80)
        m_path = os.path.join(IMG_DIR, 'm', filename)
        _save_image(img, m_path, width=700, quality=80)
        
        # Save Cover size (1280x600 cropped quality=90)
        c_path = os.path.join(IMG_DIR, 'c', filename)
        _save_image(img, c_path, width=1280, height=600, crop=True, quality=90)
        
        return True
    except Exception as e:
        print(f"Error processing image {filename}: {e}")
        return False


def delete_image(filename):
    """Removes the image file from all size directories"""
    success = False
    for size in ['a', 'b', 'c', 'm', 's']:
        path = os.path.join(IMG_DIR, size, filename)
        if os.path.exists(path):
            try:
                os.remove(path)
                success = True
            except Exception as e:
                print(f"Error deleting {path}: {e}")
    return success


def parse_multipart(rfile, headers):
    """Parses multipart/form-data in a secure, modern way without standard cgi module"""
    content_type = headers.get('Content-Type', '')
    if not content_type.startswith('multipart/form-data'):
        return {}
        
    boundary_idx = content_type.find('boundary=')
    if boundary_idx == -1:
        return {}
    boundary = content_type[boundary_idx + 9:].strip()
    if boundary.startswith('"') and boundary.endswith('"'):
        boundary = boundary[1:-1]
        
    boundary = b'--' + boundary.encode('utf-8')
    content_length = int(headers.get('Content-Length', 0))
    raw_data = rfile.read(content_length)
    
    parts = raw_data.split(boundary)
    files = {}
    
    for part in parts:
        if not part or part == b'\r\n' or part == b'--\r\n' or part == b'--':
            continue
        header_end = part.find(b'\r\n\r\n')
        if header_end == -1:
            continue
        part_headers_raw = part[2:header_end]
        part_content = part[header_end + 4 : -2] # strip leading \r\n\r\n and trailing \r\n
        
        headers_dict = {}
        for line in part_headers_raw.split(b'\r\n'):
            line_str = line.decode('utf-8', errors='ignore')
            if ':' in line_str:
                k, v = line_str.split(':', 1)
                headers_dict[k.strip().lower()] = v.strip()
                
        disp = headers_dict.get('content-disposition', '')
        if 'filename=' in disp:
            # Extract filename
            fn_idx = disp.find('filename=')
            filename = disp[fn_idx + 9:].strip()
            if filename.startswith('"') and filename.endswith('"'):
                filename = filename[1:-1]
            filename = os.path.basename(filename)
            if filename:
                files[filename] = part_content
                
    return files


class PortfolioHTTPHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Prevent caching for dev APIs
        if self.path.startswith('/cmd/'):
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
        super().end_headers()

    def do_GET(self):
        if not self.path.startswith('/cmd/'):
            super().do_GET()
            return
            
        if self.path == '/cmd/get_arts':
            self.send_json(get_all_projects_admin())
        elif self.path == '/cmd/get_images':
            self.send_json(get_images())
        else:
            self.send_error(404, "API command not found")

    def do_POST(self):
        if not self.path.startswith('/cmd/'):
            self.send_error(405, "Method not allowed")
            return
            
        content_type = self.headers.get('Content-Type', '')
        
        if self.path == '/cmd/save_art':
            content_len = int(self.headers.get('Content-Length', 0))
            data = json.loads(self.rfile.read(content_len).decode('utf-8'))
            
            proj_id = data.get('id')
            if proj_id is None:
                self.send_json({'success': False, 'message': 'Missing project ID'})
                return
                
            # Format ID to 4-digit string
            id_str = f"{int(proj_id):04d}"
            
            # Save English version if provided
            if 'en' in data:
                en_file = os.path.join(PROJECTS_DIR, f"{id_str}.en")
                en_data = {
                    'id': int(proj_id),
                    'image': data.get('image', ''),
                    'order': data.get('order', proj_id),
                    'title': data['en'].get('title', ''),
                    'summary': data['en'].get('summary', ''),
                    'body': data['en'].get('body', '')
                }
                with open(en_file, 'w', encoding='utf-8') as f:
                    json.dump(en_data, f, ensure_ascii=False, indent=2)
                    
            # Save French version if provided
            if 'fr' in data:
                fr_file = os.path.join(PROJECTS_DIR, f"{id_str}.fr")
                fr_data = {
                    'id': int(proj_id),
                    'image': data.get('image', ''),
                    'order': data.get('order', proj_id),
                    'title': data['fr'].get('title', ''),
                    'summary': data['fr'].get('summary', ''),
                    'body': data['fr'].get('body', '')
                }
                with open(fr_file, 'w', encoding='utf-8') as f:
                    json.dump(fr_data, f, ensure_ascii=False, indent=2)
                    
            # Recompile static JSON files
            compile_data()
            self.send_json({'success': True, 'message': 'Project saved successfully'})
            
        elif self.path == '/cmd/delete_art':
            content_len = int(self.headers.get('Content-Length', 0))
            data = json.loads(self.rfile.read(content_len).decode('utf-8'))
            
            proj_id = data.get('id')
            if proj_id is None:
                self.send_json({'success': False, 'message': 'Missing project ID'})
                return
                
            id_str = f"{int(proj_id):04d}"
            random_hash = os.urandom(8).hex()
            
            deleted = False
            for ext in ['.en', '.fr']:
                old_path = os.path.join(PROJECTS_DIR, f"{id_str}{ext}")
                if os.path.exists(old_path):
                    new_path = os.path.join(PROJECTS_DIR, 'deleted', f"{id_str}_{random_hash}{ext}")
                    os.rename(old_path, new_path)
                    deleted = True
                    
            if deleted:
                compile_data()
                self.send_json({'success': True, 'message': 'Project deleted successfully'})
            else:
                self.send_json({'success': False, 'message': 'Project files not found'})
                
        elif self.path == '/cmd/save_image':
            files = parse_multipart(self.rfile, self.headers)
            if not files:
                self.send_json({'success': False, 'message': 'No image files uploaded'})
                return
                
            uploaded_count = 0
            for filename, content in files.items():
                if save_image_bytes(filename, content):
                    uploaded_count += 1
                    
            self.send_json({
                'success': True, 
                'message': f'Successfully uploaded and processed {uploaded_count} image(s)'
            })
            
        elif self.path == '/cmd/delete_image':
            content_len = int(self.headers.get('Content-Length', 0))
            data = json.loads(self.rfile.read(content_len).decode('utf-8'))
            
            filename = data.get('image')
            if not filename:
                self.send_json({'success': False, 'message': 'No image specified'})
                return
                
            if delete_image(filename):
                self.send_json({'success': True, 'message': f'Image {filename} deleted successfully'})
            else:
                self.send_json({'success': False, 'message': 'Image not found or delete failed'})
                
        else:
            self.send_error(404, "API command not found")

    def send_json(self, data):
        output = json.dumps(data, ensure_ascii=False)
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(output.encode('utf-8'))


# Run initial compilation on start
compile_data()

if __name__ == '__main__':
    # Allow port reuse on restart
    socketserver.TCPServer.allow_reuse_address = True
    try:
        with socketserver.TCPServer(('', PORT), PortfolioHTTPHandler) as httpd:
            print(f"Server successfully started. Open your browser at http://localhost:{PORT}")
            print("Press Ctrl+C to stop.")
            httpd.serve_forever()
    except KeyboardInterrupt:
        print('\nStopping server.')
        sys.exit(0)
    except Exception as e:
        print(f"Error starting server: {e}")
        sys.exit(1)
