/**
 * ROBOWARS — 3D bot.glb Studio Engine
 * Minimalist Monochrome & Yellow Cinematic Design System
 * Engineered & Crafted by Suryansh
 */

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Global State
  // ---------------------------------------------------------------------------
  let scene, camera, renderer, controls;
  let modelGroup, currentModel = null;
  let groundGrid, contactShadowPlane;

  // Cinematic Lighting references
  let keySpotLight, fillLight, rimLight, ambientLight, hemiLight;
  let currentLighting = 'cinematic';

  // CAD ViewCube State
  let cubeScene, cubeCamera, cubeRenderer, cubeMesh;
  let cubeFaceMaterials = [];
  let hoveredFaceIndex = -1;
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  // ViewCube Drag-to-Rotate interaction state
  let isCubeDragging = false;
  let cubePointerStart = { x: 0, y: 0 };
  let cubeTotalDragDist = 0;

  // Smooth Camera Animation State
  let isTransitioning = false;
  let transitionStart = 0;
  const transitionDuration = 650; // ms
  const camStartPos = new THREE.Vector3();
  const camTargetPos = new THREE.Vector3();
  const controlsStartTarget = new THREE.Vector3();
  const controlsEndTarget = new THREE.Vector3();

  // Model geometry info
  const modelCenter = new THREE.Vector3(0, 0, 0);
  const modelSize = new THREE.Vector3(1, 1, 1);
  let modelRadius = 1;
  let defaultCamDistance = 1.8;

  // Display toggles
  let autoRotate = false;
  let wireframeMode = false;
  let showGrid = true;

  // FPS tracking
  let lastTime = performance.now();
  let frameCount = 0;
  let fps = 60;

  // DOM references
  const viewportContainer = document.getElementById('viewport-container');
  const mainCanvas = document.getElementById('three-canvas');
  const viewCubeCanvas = document.getElementById('viewcube-canvas');
  const loadingOverlay = document.getElementById('loading-overlay');
  const loadingBarFill = document.getElementById('loading-bar-fill');
  const loadingText = document.getElementById('loading-text');
  const toastNotice = document.getElementById('toast-notice');
  const toastMessage = document.getElementById('toast-message');
  const fpsBadge = document.getElementById('fps-badge');
  const corsModal = document.getElementById('cors-modal');
  const fileInput = document.getElementById('file-input');

  // Cube faces according to BoxGeometry material indices:
  // 0: Right (+X), 1: Left (-X), 2: Top (+Y), 3: Bottom (-Y), 4: Front (+Z), 5: Back (-Z)
  const FACE_NAMES = ['RIGHT', 'LEFT', 'TOP', 'BOTTOM', 'FRONT', 'BACK'];

  // ---------------------------------------------------------------------------
  // Application Entry Point
  // ---------------------------------------------------------------------------
  function init() {
    initMainScene();
    initCinematicLights();
    initFloorAndShadow();
    initCADViewCube();
    initEventListeners();
    loadModel('bot.glb');
    animate();
  }

  // ---------------------------------------------------------------------------
  // Main Three.js Scene Setup
  // ---------------------------------------------------------------------------
  function initMainScene() {
    scene = new THREE.Scene();
    scene.background = null;

    const aspect = viewportContainer.clientWidth / viewportContainer.clientHeight;
    camera = new THREE.PerspectiveCamera(42, aspect, 0.01, 1000);
    camera.position.set(1.4, 1.1, 1.6);

    renderer = new THREE.WebGLRenderer({
      canvas: mainCanvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(viewportContainer.clientWidth, viewportContainer.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95; // Controls highlights to avoid washed out / over-bright surfaces
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Smooth OrbitControls with tactile inertia
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.055;
    controls.screenSpacePanning = true;
    controls.minDistance = 0.05;
    controls.maxDistance = 50;
    controls.maxPolarAngle = Math.PI / 2 + 0.3; // Allow slight under-horizon viewing

    modelGroup = new THREE.Group();
    scene.add(modelGroup);
  }

  // ---------------------------------------------------------------------------
  // Yellow Cinematic Lighting Setup (Focused on the Main Object)
  // ---------------------------------------------------------------------------
  function initCinematicLights() {
    // Ambient light - Deep charcoal base so shadows have depth and contrast
    ambientLight = new THREE.AmbientLight(0x18181b, 0.28);
    scene.add(ambientLight);

    // Hemispheric light - Golden sky reflection and dark floor bounce
    hemiLight = new THREE.HemisphereLight(0xffdf99, 0x09090b, 0.3);
    scene.add(hemiLight);

    // Primary Key Light: Warm Yellow Cinematic Spotlight / Directional beam
    keySpotLight = new THREE.DirectionalLight(0xffd27d, 2.4); // 3200K Tungsten Golden Yellow
    keySpotLight.position.set(2.8, 4.6, 3.4);
    keySpotLight.castShadow = true;
    keySpotLight.shadow.mapSize.width = 2048;
    keySpotLight.shadow.mapSize.height = 2048;
    keySpotLight.shadow.camera.near = 0.1;
    keySpotLight.shadow.camera.far = 20;
    keySpotLight.shadow.bias = -0.0001;
    scene.add(keySpotLight);

    // Secondary Warm Fill Light
    fillLight = new THREE.DirectionalLight(0xffe099, 0.35);
    fillLight.position.set(-3.5, 2.0, -2.0);
    scene.add(fillLight);

    // Cool-Silver Silhouette Rim Light (Accentuates beveled edges)
    rimLight = new THREE.DirectionalLight(0xe2e8f0, 0.6);
    rimLight.position.set(0, 4.0, -4.5);
    scene.add(rimLight);
  }

  // ---------------------------------------------------------------------------
  // Monochrome Floor Grid & Soft Contact Shadow
  // ---------------------------------------------------------------------------
  function initFloorAndShadow() {
    // Dark Minimalist CAD Engineering Grid
    groundGrid = new THREE.GridHelper(10, 50, 0x3f3f46, 0x27272a);
    groundGrid.position.y = 0;
    groundGrid.material.opacity = 0.35;
    groundGrid.material.transparent = true;
    scene.add(groundGrid);

    // Dark Circular Contact Shadow Plane
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 512;
    shadowCanvas.height = 512;
    const ctx = shadowCanvas.getContext('2d');
    const grad = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
    grad.addColorStop(0.3, 'rgba(0, 0, 0, 0.55)');
    grad.addColorStop(0.7, 'rgba(0, 0, 0, 0.15)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
    const shadowGeo = new THREE.PlaneGeometry(3, 3);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      opacity: 0.7,
      depthWrite: false
    });
    contactShadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    contactShadowPlane.rotation.x = -Math.PI / 2;
    contactShadowPlane.position.y = 0.001;
    scene.add(contactShadowPlane);
  }

  // ---------------------------------------------------------------------------
  // Precision CAD 3D ViewCube (Autodesk / Fusion 360 Grade)
  // ---------------------------------------------------------------------------
  function createFaceTexture(name, isHighlighted = false) {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    if (isHighlighted) {
      // Crisp monochrome white highlight on hover
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);

      ctx.strokeStyle = '#a1a1aa';
      ctx.lineWidth = 12;
      ctx.strokeRect(6, 6, size - 12, size - 12);

      ctx.fillStyle = '#09090b';
    } else {
      // Refined CAD light-slate face with bevel border
      const grad = ctx.createLinearGradient(0, 0, size, size);
      grad.addColorStop(0, '#f8fafc');
      grad.addColorStop(1, '#e2e8f0');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);

      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 8;
      ctx.strokeRect(4, 4, size - 8, size - 8);

      ctx.fillStyle = '#0f172a';
    }

    ctx.font = 'bold 50px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, size / 2, size / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 4;
    return texture;
  }

  function initCADViewCube() {
    cubeScene = new THREE.Scene();

    // Fixed orthographic camera viewing the center (0, 0, 0)
    const cubeCamSize = 1.55;
    cubeCamera = new THREE.OrthographicCamera(
      -cubeCamSize, cubeCamSize,
      cubeCamSize, -cubeCamSize,
      0.1, 50
    );
    cubeCamera.position.set(0, 0, 4);
    cubeCamera.lookAt(0, 0, 0);

    cubeRenderer = new THREE.WebGLRenderer({
      canvas: viewCubeCanvas,
      antialias: true,
      alpha: true
    });
    cubeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    cubeRenderer.setSize(140, 140);
    cubeRenderer.outputEncoding = THREE.sRGBEncoding;

    // Ambient and key lighting for the cube
    const cubeLight = new THREE.AmbientLight(0xffffff, 0.95);
    cubeScene.add(cubeLight);

    const cubeDir = new THREE.DirectionalLight(0xffffff, 0.6);
    cubeDir.position.set(2, 4, 3);
    cubeScene.add(cubeDir);

    // Build the 6 face materials
    cubeFaceMaterials = FACE_NAMES.map(name => {
      return new THREE.MeshBasicMaterial({
        map: createFaceTexture(name, false)
      });
    });

    const cubeGeo = new THREE.BoxGeometry(1.45, 1.45, 1.45);
    cubeMesh = new THREE.Mesh(cubeGeo, cubeFaceMaterials);

    // Crisp dark border edges around cube
    const wireGeo = new THREE.EdgesGeometry(cubeGeo);
    const wireMat = new THREE.LineBasicMaterial({ color: 0x334155, linewidth: 2 });
    cubeMesh.add(new THREE.LineSegments(wireGeo, wireMat));

    cubeScene.add(cubeMesh);

    // Pointer events for ViewCube
    viewCubeCanvas.addEventListener('pointerdown', onCubePointerDown);
    window.addEventListener('pointermove', onCubePointerMove);
    window.addEventListener('pointerup', onCubePointerUp);
    viewCubeCanvas.addEventListener('mouseleave', onCubeMouseLeave);
  }

  function updateCubeHighlight(newIndex) {
    if (hoveredFaceIndex === newIndex) return;

    if (hoveredFaceIndex >= 0 && hoveredFaceIndex < 6) {
      cubeFaceMaterials[hoveredFaceIndex].map = createFaceTexture(FACE_NAMES[hoveredFaceIndex], false);
      cubeFaceMaterials[hoveredFaceIndex].needsUpdate = true;
    }

    hoveredFaceIndex = newIndex;
    if (hoveredFaceIndex >= 0 && hoveredFaceIndex < 6) {
      cubeFaceMaterials[hoveredFaceIndex].map = createFaceTexture(FACE_NAMES[hoveredFaceIndex], true);
      cubeFaceMaterials[hoveredFaceIndex].needsUpdate = true;
    }
  }

  function getCubeIntersectFace(clientX, clientY) {
    const rect = viewCubeCanvas.getBoundingClientRect();
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, cubeCamera);
    const intersects = raycaster.intersectObject(cubeMesh);

    if (intersects.length > 0 && intersects[0].face) {
      return intersects[0].face.materialIndex;
    }
    return -1;
  }

  function onCubePointerDown(e) {
    isCubeDragging = true;
    cubePointerStart = { x: e.clientX, y: e.clientY };
    cubeTotalDragDist = 0;
  }

  function onCubePointerMove(e) {
    if (isCubeDragging) {
      const dx = e.clientX - cubePointerStart.x;
      const dy = e.clientY - cubePointerStart.y;
      cubeTotalDragDist += Math.hypot(dx, dy);

      // Rotate main camera around OrbitControls target
      const rotSpeed = 0.015;
      rotateCameraAroundTarget(-dx * rotSpeed, -dy * rotSpeed);

      cubePointerStart = { x: e.clientX, y: e.clientY };
      return;
    }

    // Hover detection when not dragging
    const rect = viewCubeCanvas.getBoundingClientRect();
    if (
      e.clientX >= rect.left && e.clientX <= rect.right &&
      e.clientY >= rect.top && e.clientY <= rect.bottom
    ) {
      const faceIdx = getCubeIntersectFace(e.clientX, e.clientY);
      updateCubeHighlight(faceIdx);
      viewCubeCanvas.style.cursor = faceIdx >= 0 ? 'pointer' : 'default';
    }
  }

  function onCubePointerUp(e) {
    if (!isCubeDragging) return;
    isCubeDragging = false;

    // If total movement was small, treat as a face click
    if (cubeTotalDragDist < 5) {
      const faceIdx = getCubeIntersectFace(e.clientX, e.clientY);
      if (faceIdx >= 0) {
        setViewByFaceName(FACE_NAMES[faceIdx]);
      }
    }
  }

  function onCubeMouseLeave() {
    if (!isCubeDragging) {
      updateCubeHighlight(-1);
    }
  }

  function rotateCameraAroundTarget(deltaYaw, deltaPitch) {
    const offset = new THREE.Vector3().copy(camera.position).sub(controls.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);

    spherical.theta += deltaYaw;
    spherical.phi = Math.max(0.05, Math.min(Math.PI - 0.05, spherical.phi + deltaPitch));

    offset.setFromSpherical(spherical);
    camera.position.copy(controls.target).add(offset);
    camera.lookAt(controls.target);
  }

  function syncViewCubeOrientation() {
    if (!cubeMesh || !camera) return;

    // Perfectly synchronize the cube orientation with main camera
    // Mathematical quaternion inversion guarantees dead-center alignment and eliminates gimbal lock!
    cubeMesh.quaternion.copy(camera.quaternion).invert();
  }

  // ---------------------------------------------------------------------------
  // Smooth Camera Transitions & View Presets
  // ---------------------------------------------------------------------------
  function setViewByFaceName(name) {
    const dist = defaultCamDistance;
    const targetOffset = new THREE.Vector3();

    switch (name) {
      case 'FRONT':
        targetOffset.set(0, 0, dist);
        break;
      case 'BACK':
        targetOffset.set(0, 0, -dist);
        break;
      case 'RIGHT':
        targetOffset.set(dist, 0, 0);
        break;
      case 'LEFT':
        targetOffset.set(-dist, 0, 0);
        break;
      case 'TOP':
        targetOffset.set(0, dist, 0.0001);
        break;
      case 'BOTTOM':
        targetOffset.set(0, -dist, 0.0001);
        break;
      case 'ISOMETRIC':
      default:
        targetOffset.set(dist * 0.72, dist * 0.58, dist * 0.72);
        break;
    }

    const endCamPos = new THREE.Vector3().copy(modelCenter).add(targetOffset);
    smoothTransitionCamera(endCamPos, modelCenter);
    updatePresetPillActive(name);
  }

  function smoothTransitionCamera(endPos, endTarget) {
    camStartPos.copy(camera.position);
    camTargetPos.copy(endPos);
    controlsStartTarget.copy(controls.target);
    controlsEndTarget.copy(endTarget);

    transitionStart = performance.now();
    isTransitioning = true;
    controls.enabled = false;
  }

  function updateCameraTransition() {
    if (!isTransitioning) return;

    const elapsed = performance.now() - transitionStart;
    const progress = Math.min(elapsed / transitionDuration, 1);
    const ease = 1 - Math.pow(1 - progress, 3); // Smooth cubic ease-out

    camera.position.lerpVectors(camStartPos, camTargetPos, ease);
    controls.target.lerpVectors(controlsStartTarget, controlsEndTarget, ease);

    if (progress >= 1) {
      isTransitioning = false;
      controls.enabled = true;
    }
  }

  function rotateViewByAngle(angleYaw, anglePitch) {
    const offset = new THREE.Vector3().copy(camera.position).sub(controls.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);

    spherical.theta += angleYaw;
    spherical.phi = Math.max(0.05, Math.min(Math.PI - 0.05, spherical.phi + anglePitch));

    offset.setFromSpherical(spherical);
    const endPos = new THREE.Vector3().copy(controls.target).add(offset);
    smoothTransitionCamera(endPos, controls.target);
  }

  // ---------------------------------------------------------------------------
  // Model Loading & Auto-Framing
  // ---------------------------------------------------------------------------
  function loadModel(url) {
    setLoadingProgress(20, 'Loading bot.glb asset...');

    const loader = new THREE.GLTFLoader();

    loader.load(
      url,
      function (gltf) {
        setLoadingProgress(85, 'Calibrating yellow cinematic light...');

        if (currentModel) {
          modelGroup.remove(currentModel);
        }

        currentModel = gltf.scene;
        processLoadedMesh(currentModel);
        modelGroup.add(currentModel);

        setLoadingProgress(100, 'Model ready');
        setTimeout(() => {
          loadingOverlay.classList.add('hidden');
        }, 300);

        showToast('bot.glb loaded successfully');
      },
      function (xhr) {
        if (xhr.lengthComputable && xhr.total > 0) {
          const percent = Math.round((xhr.loaded / xhr.total) * 65) + 20;
          setLoadingProgress(percent, `Downloading ${(xhr.loaded / 1048576).toFixed(1)} MB...`);
        }
      },
      function (err) {
        console.warn('Network fetch blocked. Opening local fallback...', err);
        loadingOverlay.classList.add('hidden');
        corsModal.style.display = 'flex';
      }
    );
  }

  function processLoadedMesh(model) {
    let vertexCount = 0;
    let triangleCount = 0;
    let meshCount = 0;

    model.traverse(function (child) {
      if (child.isMesh) {
        meshCount++;
        child.castShadow = true;
        child.receiveShadow = true;

        if (child.geometry) {
          if (child.geometry.index) {
            triangleCount += child.geometry.index.count / 3;
            vertexCount += child.geometry.attributes.position ? child.geometry.attributes.position.count : 0;
          } else if (child.geometry.attributes.position) {
            vertexCount += child.geometry.attributes.position.count;
            triangleCount += child.geometry.attributes.position.count / 3;
          }
        }

        if (child.material) {
          child.userData.originalMaterial = child.material;
          child.material.envMapIntensity = 1.0;
          child.material.needsUpdate = true;
        }
      }
    });

    const box = new THREE.Box3().setFromObject(model);
    box.getCenter(modelCenter);
    box.getSize(modelSize);

    // Re-center model at origin and ground to Y=0
    model.position.x = -modelCenter.x;
    model.position.y = -box.min.y;
    model.position.z = -modelCenter.z;

    const sphere = box.getBoundingSphere(new THREE.Sphere());
    modelRadius = sphere.radius || 1;
    defaultCamDistance = modelRadius * 2.4;

    // Contact shadow setup
    contactShadowPlane.scale.set(modelRadius * 3.5, modelRadius * 3.5, 1);
    contactShadowPlane.position.y = 0.001;
    groundGrid.position.y = 0;

    // Camera framing
    modelCenter.set(0, modelSize.y * 0.5, 0);
    controls.target.copy(modelCenter);

    // Focus key light directly on the bot center
    keySpotLight.target = model;

    const initPos = new THREE.Vector3(
      defaultCamDistance * 0.72,
      modelSize.y * 0.5 + defaultCamDistance * 0.58,
      defaultCamDistance * 0.72
    );
    camera.position.copy(initPos);
    controls.update();

    updateModelStats(vertexCount, Math.round(triangleCount), meshCount, modelSize);
  }

  function updateModelStats(verts, tris, meshes, size) {
    const elVerts = document.getElementById('stat-vertices');
    const elTris = document.getElementById('stat-triangles');
    const elMeshes = document.getElementById('stat-meshes');
    const elDims = document.getElementById('stat-dimensions');

    if (elVerts) elVerts.textContent = verts.toLocaleString();
    if (elTris) elTris.textContent = tris.toLocaleString();
    if (elMeshes) elMeshes.textContent = meshes.toString();
    if (elDims) {
      const w = (size.x * 100).toFixed(1);
      const h = (size.y * 100).toFixed(1);
      const d = (size.z * 100).toFixed(1);
      elDims.textContent = `${w} × ${h} × ${d} cm`;
    }
  }

  function setLoadingProgress(percent, msg) {
    if (loadingBarFill) loadingBarFill.style.width = `${percent}%`;
    if (loadingText) loadingText.textContent = msg;
  }

  // ---------------------------------------------------------------------------
  // Action Handlers & Controls
  // ---------------------------------------------------------------------------
  function toggleWireframe() {
    wireframeMode = !wireframeMode;
    if (!currentModel) return;

    currentModel.traverse(child => {
      if (child.isMesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.wireframe = wireframeMode);
        } else {
          child.material.wireframe = wireframeMode;
        }
      }
    });

    const btn = document.getElementById('btn-wireframe');
    if (btn) btn.classList.toggle('active', wireframeMode);
    showToast(wireframeMode ? 'Wireframe mode enabled' : 'Solid render enabled');
  }

  function toggleAutoRotate() {
    autoRotate = !autoRotate;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 2.0;

    const btn = document.getElementById('btn-autorotate');
    if (btn) btn.classList.toggle('active', autoRotate);
    showToast(autoRotate ? 'Turntable auto-rotate active' : 'Auto-rotate paused');
  }

  function toggleFloorGrid() {
    showGrid = !showGrid;
    if (groundGrid) groundGrid.visible = showGrid;
    if (contactShadowPlane) contactShadowPlane.visible = showGrid;

    const btn = document.getElementById('btn-grid');
    if (btn) btn.classList.toggle('active', showGrid);
    showToast(showGrid ? 'Floor grid visible' : 'Floor grid hidden');
  }

  function zoomStep(factor) {
    const offset = new THREE.Vector3().copy(camera.position).sub(controls.target);
    offset.multiplyScalar(factor);

    if (offset.length() < 0.1) offset.setLength(0.1);
    if (offset.length() > 50) offset.setLength(50);

    const endPos = new THREE.Vector3().copy(controls.target).add(offset);
    smoothTransitionCamera(endPos, controls.target);
  }

  function resetView() {
    setViewByFaceName('ISOMETRIC');
    showToast('Camera reset to default');
  }

  function setLightingPreset(type) {
    currentLighting = type;

    switch (type) {
      case 'cinematic': // Yellow Cinematic Spotlight (User Requested)
        ambientLight.intensity = 0.28;
        ambientLight.color.set(0x18181b);
        hemiLight.intensity = 0.3;
        hemiLight.color.set(0xffdf99);
        hemiLight.groundColor.set(0x09090b);
        keySpotLight.intensity = 2.4;
        keySpotLight.color.set(0xffd27d); // Warm golden amber spotlight
        fillLight.intensity = 0.35;
        fillLight.color.set(0xffe099);
        rimLight.intensity = 0.6;
        rimLight.color.set(0xe2e8f0);
        renderer.toneMappingExposure = 0.95;
        break;

      case 'studio_bw': // Monochrome Studio
        ambientLight.intensity = 0.45;
        ambientLight.color.set(0x27272a);
        hemiLight.intensity = 0.35;
        hemiLight.color.set(0xffffff);
        hemiLight.groundColor.set(0x18181b);
        keySpotLight.intensity = 1.6;
        keySpotLight.color.set(0xffffff);
        fillLight.intensity = 0.5;
        fillLight.color.set(0xd4d4d8);
        rimLight.intensity = 0.8;
        rimLight.color.set(0xa1a1aa);
        renderer.toneMappingExposure = 1.0;
        break;

      case 'noir': // High Contrast Dark
        ambientLight.intensity = 0.12;
        ambientLight.color.set(0x09090b);
        hemiLight.intensity = 0.15;
        hemiLight.color.set(0xffd27d);
        hemiLight.groundColor.set(0x000000);
        keySpotLight.intensity = 3.2;
        keySpotLight.color.set(0xffc966);
        fillLight.intensity = 0.15;
        fillLight.color.set(0x71717a);
        rimLight.intensity = 1.2;
        rimLight.color.set(0xffffff);
        renderer.toneMappingExposure = 0.85;
        break;

      case 'daylight': // Balanced Daylight
        ambientLight.intensity = 0.6;
        ambientLight.color.set(0x3f3f46);
        hemiLight.intensity = 0.5;
        hemiLight.color.set(0xfff7ed);
        hemiLight.groundColor.set(0x27272a);
        keySpotLight.intensity = 1.4;
        keySpotLight.color.set(0xffedd5);
        fillLight.intensity = 0.7;
        fillLight.color.set(0xe2e8f0);
        rimLight.intensity = 0.5;
        rimLight.color.set(0xffffff);
        renderer.toneMappingExposure = 1.05;
        break;
    }

    document.querySelectorAll('.popover-item').forEach(item => {
      item.classList.toggle('active', item.dataset.light === type);
    });

    closeAllPopovers();
    showToast(`Lighting: ${type.replace('_', ' ').toUpperCase()}`);
  }

  function takeScreenshot() {
    renderer.render(scene, camera);
    const dataURL = renderer.domElement.toDataURL('image/png');

    const link = document.createElement('a');
    link.download = `robowars-bot-${Date.now()}.png`;
    link.href = dataURL;
    link.click();

    showToast('4K Screenshot captured');
  }

  function downloadModelFile() {
    const link = document.createElement('a');
    link.href = 'bot.glb';
    link.download = 'bot.glb';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Downloading bot.glb (15.7 MB)...');
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  function updatePresetPillActive(name) {
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === name);
    });
  }

  function showToast(msg) {
    if (!toastNotice || !toastMessage) return;
    toastMessage.textContent = msg;
    toastNotice.classList.add('show');
    clearTimeout(toastNotice._timer);
    toastNotice._timer = setTimeout(() => {
      toastNotice.classList.remove('show');
    }, 2400);
  }

  function closeAllPopovers() {
    document.querySelectorAll('.dock-popover').forEach(p => p.classList.remove('open'));
  }

  // ---------------------------------------------------------------------------
  // Event Binding
  // ---------------------------------------------------------------------------
  function initEventListeners() {
    window.addEventListener('resize', onWindowResize);

    // Preset view pills
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        setViewByFaceName(btn.dataset.view);
      });
    });

    // ViewCube directional arrow navigation
    document.getElementById('cube-arrow-up').addEventListener('click', (e) => {
      e.stopPropagation();
      rotateViewByAngle(0, -Math.PI / 4);
    });
    document.getElementById('cube-arrow-down').addEventListener('click', (e) => {
      e.stopPropagation();
      rotateViewByAngle(0, Math.PI / 4);
    });
    document.getElementById('cube-arrow-left').addEventListener('click', (e) => {
      e.stopPropagation();
      rotateViewByAngle(-Math.PI / 4, 0);
    });
    document.getElementById('cube-arrow-right').addEventListener('click', (e) => {
      e.stopPropagation();
      rotateViewByAngle(Math.PI / 4, 0);
    });

    // ViewCube Home / Isometric Reset
    document.getElementById('cube-home-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      setViewByFaceName('ISOMETRIC');
    });

    // Quick Zoom Buttons
    document.getElementById('cube-zoom-in').addEventListener('click', () => zoomStep(0.75));
    document.getElementById('cube-zoom-out').addEventListener('click', () => zoomStep(1.33));

    // Bottom Dock Controls
    document.getElementById('btn-zoom-in').addEventListener('click', () => zoomStep(0.75));
    document.getElementById('btn-zoom-out').addEventListener('click', () => zoomStep(1.33));
    document.getElementById('btn-reset-view').addEventListener('click', resetView);
    document.getElementById('btn-autorotate').addEventListener('click', toggleAutoRotate);
    document.getElementById('btn-wireframe').addEventListener('click', toggleWireframe);
    document.getElementById('btn-grid').addEventListener('click', toggleFloorGrid);
    document.getElementById('btn-screenshot').addEventListener('click', takeScreenshot);
    document.getElementById('btn-fullscreen').addEventListener('click', toggleFullscreen);

    // Download triggers
    const downloadNav = document.getElementById('btn-download-nav');
    if (downloadNav) downloadNav.addEventListener('click', downloadModelFile);

    const downloadDock = document.getElementById('btn-download-dock');
    if (downloadDock) downloadDock.addEventListener('click', downloadModelFile);

    // Lighting menu
    const lightMenuBtn = document.getElementById('btn-light-menu');
    const lightPopover = document.getElementById('light-popover');
    if (lightMenuBtn && lightPopover) {
      lightMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        lightPopover.classList.toggle('open');
      });

      document.querySelectorAll('.popover-item').forEach(item => {
        item.addEventListener('click', () => {
          setLightingPreset(item.dataset.light);
        });
      });
    }

    window.addEventListener('click', () => {
      closeAllPopovers();
    });

    viewportContainer.addEventListener('dblclick', () => {
      resetView();
    });

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const blobURL = URL.createObjectURL(file);
          corsModal.style.display = 'none';
          loadingOverlay.classList.remove('hidden');
          loadModel(blobURL);
        }
      });
    }

    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => {
      e.preventDefault();
      if (e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (file.name.endsWith('.glb') || file.name.endsWith('.gltf')) {
          const blobURL = URL.createObjectURL(file);
          if (corsModal) corsModal.style.display = 'none';
          loadingOverlay.classList.remove('hidden');
          loadModel(blobURL);
        }
      }
    });
  }

  function onWindowResize() {
    const width = viewportContainer.clientWidth;
    const height = viewportContainer.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  // ---------------------------------------------------------------------------
  // Animation Loop
  // ---------------------------------------------------------------------------
  function animate(now) {
    requestAnimationFrame(animate);

    // FPS Counter
    frameCount++;
    if (now - lastTime >= 1000) {
      fps = Math.round((frameCount * 1000) / (now - lastTime));
      if (fpsBadge) fpsBadge.textContent = `${fps} FPS`;
      frameCount = 0;
      lastTime = now;
    }

    // Camera fly interpolation
    updateCameraTransition();

    // Controls update
    controls.update();

    // Render main scene
    renderer.render(scene, camera);

    // Synchronize and render CAD ViewCube
    syncViewCubeOrientation();
    cubeRenderer.render(cubeScene, cubeCamera);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
