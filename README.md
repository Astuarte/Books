# BookShare 📄⚖️

> **Sleek HTML/JS PDF Viewer & Custom N-Up Layout Exporter**  
> Designed for law students, legal practitioners, researchers, and professionals who need high-speed PDF viewing, directory scanning, and customizable multi-page sheet layout exports (including **8"x11"** and **8"x13"** paper sizes).

---

## 🌟 Key Features

### 1. 📁 Automatic Documents Directory Loader
- **Pre-Loaded `documents/` Folder**: All PDF files inside the `documents/` directory are automatically loaded and listed on the Documents tab upon opening the app.
- **Sidebar Document Manager**: Search, filter, and switch between loaded PDF files with page count and file size indicators.

### 2. 🖨️ Custom Grid Layout & PDF Export
- **(a) Pages Per Layout Sheet**:
  - Flexible **Custom Grid** controls (Columns × Rows, e.g., 2x2, 2x3, 3x3, custom grid tiles).
- **(b) Paper Sizes**:
  - **8.0" × 13.0"** (8 inches by 13 inches — Legal / Long Bond Paper standard)
  - **8.0" × 11.0"** (8 inches by 11 inches — Standard Compact Letter)
  - **A4** (210mm × 297mm / 8.27" × 11.69" — ISO A4 International Standard)
- **(c) Orientation Options**:
  - **Portrait** or **Landscape** mode.
- **Live Sheet Layout Preview**: Real-time sheet-by-sheet canvas preview updates dynamically as you adjust grid tiles, margins, or paper sizes.
- **Advanced Export Options**:
  - Page range selection (e.g. `1-5, 8, 10-12` or all pages).
  - Adjustable margins (Tight, Normal, Wide, None).
  - Optional sub-page border/cut lines around tiles.
  - Footer sheet page numbers.

### 3. 🔍 Continuous & Single Page Viewer Engine
- **Continuous Scroll View (Default)**: All document pages render stacked vertically with smooth scrolling and dynamic active page tracking (`IntersectionObserver`).
- **Single Page Toggle Mode**: Switch between Continuous Scroll View and Single Page View with a single click in the top toolbar.
- **Dynamic Zoom Controls**: Automatic Fit, Fit Page, Fit Width, and custom percentages (50% to 300%).
- **Rotation**: 90° Clockwise and Counter-Clockwise page rotation.
- **Interactive Thumbnails**: Click any page thumbnail to instantly jump or smoothly scroll to that page.
- **Keyboard Navigation**: `←` / `→` arrow keys, `PageUp` / `PageDown`, `+` / `-` zoom shortcuts.

---

## 🚀 How to Run Locally

Since BookShare is built entirely with client-side HTML, CSS, and JavaScript, no backend server or node installation is required!

1. Clone or download this repository:
   ```bash
   git clone https://github.com/your-username/bookshare.git
   cd bookshare
   ```

2. Open `index.html` in any web browser (Chrome, Edge, Firefox, Safari):
   - Double click `index.html`, OR
   - Run a simple local HTTP server:
     ```bash
     npx http-server . -p 8080
     ```

---

## 🌐 Deploying to GitHub Pages

1. Push this repository to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of BookShare"
   git branch -M main
   git remote add origin https://github.com/your-username/bookshare.git
   git push -u origin main
   ```

2. Turn on GitHub Pages:
   - Go to your repository on GitHub -> **Settings** -> **Pages**.
   - Under **Source**, select `main` branch and `/ (root)` folder.
   - Click **Save**. Your site will be published at `https://your-username.github.io/bookshare/`.

---

## 🛠️ Tech Stack

- **HTML5 & Vanilla CSS3**: Dark mode glassmorphism UI with CSS custom properties.
- **JavaScript (ES6+)**: Zero framework runtime overhead.
- **PDF.js**: Client-side PDF rendering library by Mozilla.
- **jsPDF**: High-resolution vector and raster PDF generation engine.
- **Lucide Icons**: Crisp SVG icons.

---

## 📜 License

MIT License - Feel free to adapt and build upon this project!
