# AI Image Upscaler (Flask + Real-ESRGAN)

A web application that allows users to **enhance and upscale images** without losing quality — powered by AI (Real-ESRGAN).  
This version supports resizing in **pixels or inches (DPI)** and improves image quality **even if dimensions are unchanged**.

---

## Features

- Drag & drop image upload
- Resize in **pixels or inches (with DPI control)**
- AI enhancement via Real-ESRGAN
- Zoom & compare original vs enhanced image
- Download final output
- Dark/light theme toggle
- Works even when image size stays the same

---

## Setup Instructions

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/ai-image-upscaler.git
cd ai-image-upscaler
```

### 2. Create virtual environment
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Install dependencies (compatible versions)
```bash
pip install numpy==1.24.4
pip install torch==2.0.1 torchvision==0.15.2
pip install realesrgan basicsr opencv-python Flask pillow
```

> **Important**: Do NOT use NumPy 2.x — it will break Real-ESRGAN.

### 4. Download Real-ESRGAN model
The app will automatically download the `RealESRGAN_x4plus.pth` model into the `models/` directory when it runs the first time.

---

## Run the App

```bash
python app.py
```

Visit `http://127.0.0.1:5000` in your browser.

---

## Project Structure

```
├── app.py                   # Flask backend
├── models/
│   └── RealESRGAN_x4plus.pth (downloaded automatically)
├── static/
│   ├── css/style.css        # App styles
│   ├── js/main.js           # Frontend logic
│   └── uploads/             # Uploaded + enhanced images
├── templates/
│   └── index.html           # Main UI page
└── README.md
```

---

## Tiling for Large Images

If processing large images causes memory errors, tiling is enabled by default (`tile=256`) to safely split the image into smaller chunks. You can adjust the value in `app.py` if needed:

```python
self.upsampler = RealESRGANer(..., tile=256, ...)
```

---

## Example Use Cases

- Print-quality image enhancement
- E-commerce product photo upscaling
- Archival photo restoration
- AI art sharpening

---

## 📖 License

MIT License. Free to use and modify.
