from flask import Flask, render_template, request, send_file, jsonify
import os
import cv2
import numpy as np
from PIL import Image
import torch
from realesrgan import RealESRGANer
from basicsr.archs.rrdbnet_arch import RRDBNet
import io
import base64
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs('models', exist_ok=True)

class ImageUpscaler:
    def __init__(self):
        self.upsampler = None
        self.model_loaded = False
        self.init_model()

    def download_model(self):
        import urllib.request
        model_url = 'https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth'
        model_path = 'models/RealESRGAN_x4plus.pth'
        if not os.path.exists(model_path):
            print("Downloading Real-ESRGAN model...")
            urllib.request.urlretrieve(model_url, model_path)
            print("Model downloaded.")
        return model_path

    def init_model(self):
        try:
            print("Initializing model...")
            model_path = self.download_model()
            model = RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64, num_block=23, num_grow_ch=32, scale=4)
            self.upsampler = RealESRGANer(
                scale=4,
                model_path=model_path,
                model=model,
                tile=0,
                tile_pad=10,
                pre_pad=0,
                half=False
            )
            self.model_loaded = True
        except Exception as e:
            print(f"Model init error: {e}")
            self.model_loaded = False

    def upscale_image(self, image_path, target_width, target_height):
        try:
            img = cv2.imread(image_path, cv2.IMREAD_COLOR)
            if img is None:
                raise ValueError("Invalid image")

            original_h, original_w = img.shape[:2]
            scale_x = target_width / original_w
            scale_y = target_height / original_h
            max_scale = max(scale_x, scale_y)

            if self.model_loaded and self.upsampler:
                outscale = max(max_scale, 1.0)
                print(f"Running Real-ESRGAN enhancement at scale {outscale:.2f}")
                output, _ = self.upsampler.enhance(img, outscale=outscale)
            else:
                print("Fallback to traditional upscale")
                output = cv2.resize(img, (target_width, target_height), interpolation=cv2.INTER_CUBIC)

            output = cv2.resize(output, (target_width, target_height), interpolation=cv2.INTER_LANCZOS4)
            return output

        except Exception as e:
            print(f"Error in upscale: {e}")
            img = cv2.imread(image_path)
            return cv2.resize(img, (target_width, target_height), interpolation=cv2.INTER_LANCZOS4)

upscaler = ImageUpscaler()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'Empty filename'}), 400

    filename = secure_filename(file.filename)
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)

    img = cv2.imread(filepath)
    height, width = img.shape[:2]
    _, buffer = cv2.imencode('.jpg', img)
    img_base64 = base64.b64encode(buffer).decode('utf-8')

    return jsonify({
        'success': True,
        'filename': filename,
        'width': width,
        'height': height,
        'preview': f'data:image/jpeg;base64,{img_base64}'
    })

@app.route('/process', methods=['POST'])
def process_image():
    data = request.get_json()
    filename = data.get('filename')
    width = int(data.get('width'))
    height = int(data.get('height'))

    if not filename:
        return jsonify({'error': 'Filename missing'}), 400

    input_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    try:
        result = upscaler.upscale_image(input_path, width, height)
        _, buffer = cv2.imencode('.jpg', result)
        img_base64 = base64.b64encode(buffer).decode('utf-8')

        output_filename = f'upscaled_{filename}'
        output_path = os.path.join(app.config['UPLOAD_FOLDER'], output_filename)
        cv2.imwrite(output_path, result)

        return jsonify({
            'success': True,
            'preview': f'data:image/jpeg;base64,{img_base64}',
            'output_filename': output_filename
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/download/<filename>')
def download_file(filename):
    return send_file(os.path.join(app.config['UPLOAD_FOLDER'], filename), as_attachment=True)

if __name__ == '__main__':
    app.run(debug=True)
