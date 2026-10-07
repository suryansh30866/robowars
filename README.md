# ROBOWARS — 3D `bot.glb` Viewer

A minimalist, high-performance 3D asset showcase inspired by **Stripe**, **Linear**, and **Apple** design aesthetics, tailored for `bot.glb`.

---

## 🚀 Features

- **Stripe & Linear Aesthetic**:
  - Dark ambient mesh glow with iridescent violet/cyan accents
  - Frosted glassmorphism panels (`backdrop-filter: blur(24px)`)
  - Crisp typography and micro-interactions
  - Stripe-style primary button: **Download bot.glb (15.7 MB)** with one-click download

- **Interactive CAD 3D ViewCube** *(Matching your reference images)*:
  - 3D orientation cube synchronized with main viewport camera
  - Clean CAD face labels: `TOP`, `BOTTOM`, `FRONT`, `BACK`, `LEFT`, `RIGHT`
  - Sky-blue face highlight on hover
  - Click any face to smoothly glide camera to that orthogonal angle
  - Directional navigation arrows (`▲`, `▼`, `◀`, `▶`) to rotate 90°
  - Home / Reset button to return to isometric view
  - Quick `+` / `−` zoom buttons

- **Floating Apple / Linear Control Dock**:
  - **Zoom In / Out**: Precise incremental zoom buttons
  - **Fit / Frame**: Automatically re-centers and fits `bot.glb` in view
  - **Turntable Auto-Rotate**: Smooth 360° showcase rotation
  - **Wireframe Mode**: Toggles mesh polygon wireframe overlay
  - **Floor Grid & Contact Shadow**: Toggles engineering grid and soft ground shadow
  - **Lighting Presets**: Studio Neutral, Stripe Cyberpunk, Dramatic Dark, and High Contrast
  - **4K Screenshot**: Instant clean render snapshot download
  - **Download**: Direct download of `bot.glb`

- **Model Inspector & Stats Card**:
  - Live triangle & vertex counts (`561,804 vertices`, `187,268 triangles`)
  - Real-time FPS monitor
  - Real-world bounding box dimensions in centimeters

---

## 💻 How to Run

### Option 1: Quick Double-Click (Recommended)
Double-click `run_viewer.bat` in the project folder. It will start a local server and open `http://localhost:8080` in your default browser.

### Option 2: Command Line
Open PowerShell or Terminal in this folder and run:
```bash
python -m http.server 8080
```
Then visit [http://localhost:8080](http://localhost:8080) in your browser.

### Option 3: Direct File Opening
If you open `index.html` directly via `file:///` and your browser restricts local GLB loading, the built-in fallback prompt will let you click or drag & drop `bot.glb` to view it immediately without a server.
