class ImageUpscaler {
    constructor() {
        this.currentZoom = 1;
        this.currentFilename = '';
        this.outputFilename = '';
        this.originalWidth = 0;
        this.originalHeight = 0;
        this.currentDPI = 300;

        this.dom = {
            uploadArea: document.getElementById('upload-area'),
            fileInput: document.getElementById('file-input'),
            processBtn: document.getElementById('process-btn'),
            zoomIn: document.getElementById('zoom-in'),
            zoomOut: document.getElementById('zoom-out'),
            resetZoom: document.getElementById('reset-zoom'),
            downloadBtn: document.getElementById('download-btn'),
            themeToggle: document.getElementById('theme-toggle'),
            originalImg: document.getElementById('original-image'),
            enhancedImg: document.getElementById('enhanced-image'),
            zoomLevel: document.getElementById('zoom-level'),
            controlsSection: document.getElementById('controls-section'),
            previewSection: document.getElementById('preview-section'),
            loading: document.getElementById('loading'),
            widthInput: document.getElementById('width-input'),
            heightInput: document.getElementById('height-input'),
            dpiInput: document.getElementById('dpi-input'),
            widthUnit: document.getElementById('width-unit'),
            heightUnit: document.getElementById('height-unit'),
            unitRadios: document.querySelectorAll('input[name="units"]'),
            dpiControl: document.getElementById('dpi-control'),
        };

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupTheme();
        this.setupUnitsToggle();
    }

    setupEventListeners() {
        const d = this.dom;

        d.uploadArea.addEventListener('click', () => d.fileInput.click());
        d.uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        d.uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        d.fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        d.processBtn.addEventListener('click', this.processImage.bind(this));
        d.zoomIn.addEventListener('click', () => this.zoom(1.2));
        d.zoomOut.addEventListener('click', () => this.zoom(0.8));
        d.resetZoom.addEventListener('click', () => this.resetZoom());
        d.downloadBtn.addEventListener('click', this.downloadImage.bind(this));
        d.themeToggle.addEventListener('click', this.toggleTheme.bind(this));
    }

    setupUnitsToggle() {
        const d = this.dom;

        d.unitRadios.forEach(radio => {
            radio.addEventListener('change', e => {
                const unit = e.target.value;
                if (unit === 'inches') {
                    d.dpiControl.style.display = 'block';
                    d.widthUnit.textContent = 'in';
                    d.heightUnit.textContent = 'in';
                    this.convertToInches();
                } else {
                    d.dpiControl.style.display = 'none';
                    d.widthUnit.textContent = 'px';
                    d.heightUnit.textContent = 'px';
                    this.convertToPixels();
                }
            });
        });

        d.dpiInput.addEventListener('input', () => {
            this.currentDPI = parseInt(d.dpiInput.value) || 300;
            if (this.getSelectedUnit() === 'inches') {
                this.convertToInches();
            }
        });

        d.widthInput.addEventListener('input', () => this.syncAspect('width'));
        d.heightInput.addEventListener('input', () => this.syncAspect('height'));
    }

    getSelectedUnit() {
        return document.querySelector('input[name="units"]:checked')?.value || 'pixels';
    }

    syncAspect(changed) {
        const { widthInput, heightInput } = this.dom;
        if (!this.originalWidth || !this.originalHeight) return;

        const aspectRatio = this.originalWidth / this.originalHeight;
        const unit = this.getSelectedUnit();

        if (changed === 'width') {
            const newWidth = parseFloat(widthInput.value);
            heightInput.value = unit === 'inches'
                ? (newWidth / aspectRatio).toFixed(2)
                : Math.round(newWidth / aspectRatio);
        } else {
            const newHeight = parseFloat(heightInput.value);
            widthInput.value = unit === 'inches'
                ? (newHeight * aspectRatio).toFixed(2)
                : Math.round(newHeight * aspectRatio);
        }
    }

    convertToInches() {
        const { widthInput, heightInput } = this.dom;
        widthInput.value = (parseFloat(widthInput.value) / this.currentDPI).toFixed(2);
        heightInput.value = (parseFloat(heightInput.value) / this.currentDPI).toFixed(2);
    }

    convertToPixels() {
        const { widthInput, heightInput } = this.dom;
        widthInput.value = Math.round(parseFloat(widthInput.value) * this.currentDPI);
        heightInput.value = Math.round(parseFloat(heightInput.value) * this.currentDPI);
    }

    getDimensionsInPixels() {
        const { widthInput, heightInput } = this.dom;
        const unit = this.getSelectedUnit();

        return {
            width: unit === 'inches'
                ? Math.round(parseFloat(widthInput.value) * this.currentDPI)
                : parseInt(widthInput.value),
            height: unit === 'inches'
                ? Math.round(parseFloat(heightInput.value) * this.currentDPI)
                : parseInt(heightInput.value)
        };
    }

    setupTheme() {
        const theme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', theme);
        this.updateThemeIcon(theme);
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        this.updateThemeIcon(newTheme);
    }

    updateThemeIcon(theme) {
        const icon = document.querySelector('#theme-toggle i');
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files.length > 0) {
            this.uploadFile(e.dataTransfer.files[0]);
        }
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) this.uploadFile(file);
    }

    async uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/upload', { method: 'POST', body: formData });
            const result = await response.json();

            if (result.success) {
                this.currentFilename = result.filename;
                this.displayOriginalImage(result.preview);
                this.setupDimensionInputs(result.width, result.height);
                this.dom.controlsSection.style.display = 'block';
            } else {
                alert('Upload failed: ' + result.error);
            }
        } catch (err) {
            alert('Upload error: ' + err.message);
        }
    }

    displayOriginalImage(preview) {
        const img = this.dom.originalImg;
        img.src = preview;
        img.style.display = 'block';
    }

    setupDimensionInputs(width, height) {
        this.originalWidth = width;
        this.originalHeight = height;

        this.dom.widthInput.value = width;
        this.dom.heightInput.value = height;
    }

    async processImage() {
        const { loading, previewSection } = this.dom;
        const { width, height } = this.getDimensionsInPixels();

        if (!width || !height) {
            alert('Please enter valid dimensions');
            return;
        }

        const payload = {
            filename: this.currentFilename,
            width, height
        };

        loading.style.display = 'block';
        previewSection.style.display = 'none';

        try {
            const res = await fetch('/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const result = await res.json();

            if (result.success) {
                this.outputFilename = result.output_filename;
                this.displayEnhancedImage(result.preview);
                previewSection.style.display = 'block';
            } else {
                alert('Processing failed: ' + result.error);
            }
        } catch (err) {
            alert('Processing error: ' + err.message);
        } finally {
            loading.style.display = 'none';
        }
    }

    displayEnhancedImage(preview) {
        const img = this.dom.enhancedImg;
        img.src = preview;
        img.style.display = 'block';
        this.resetZoom();
    }

    zoom(factor) {
        this.currentZoom *= factor;
        this.updateZoom();
    }

    resetZoom() {
        this.currentZoom = 1;
        this.updateZoom();
    }

    updateZoom() {
        const { originalImg, enhancedImg, zoomLevel } = this.dom;
        const transform = `scale(${this.currentZoom})`;

        originalImg.style.transform = transform;
        enhancedImg.style.transform = transform;
        zoomLevel.textContent = `${Math.round(this.currentZoom * 100)}%`;
    }

    downloadImage() {
        if (this.outputFilename) {
            window.location.href = `/download/${this.outputFilename}`;
        } else {
            alert('No enhanced image available for download');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ImageUpscaler();
});
