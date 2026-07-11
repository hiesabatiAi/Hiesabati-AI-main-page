/* ==========================================================================
  HIESABATI AI — 3D AI Orb Script (Three.js)
   ========================================================================== */

(function () {
  const canvas = document.getElementById("hero-orb-canvas");
  if (!canvas) return;

  // Scene setup
  const scene = new THREE.Scene();
  const container = canvas.parentElement;

  // Camera
  const camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    100
  );
  camera.position.z = 6.5;

  // Renderer
  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance"
  });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);

  const blueKeyLight = new THREE.PointLight(0x2563eb, 3, 15);
  blueKeyLight.position.set(3, 3, 3);
  scene.add(blueKeyLight);

  const cyanRimLight = new THREE.PointLight(0x06b6d4, 4, 15);
  cyanRimLight.position.set(-3, -3, 3);
  scene.add(cyanRimLight);

  const whiteCoreLight = new THREE.PointLight(0xffffff, 2, 8);
  whiteCoreLight.position.set(0, 0, 1);
  scene.add(whiteCoreLight);

  // Group to hold everything for easy rotation
  const coreGroup = new THREE.Group();
  scene.add(coreGroup);

  // ==========================================
  // 1. THE 3D GLOWING AI ORB (Custom Shader)
  // ==========================================
  
  // Custom vertex and fragment shaders for the luxury glass/energy sphere
  const vertexShader = `
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec3 vWorldPosition;
    uniform float uTime;
    
    // Simple 3D Noise for organic pulsation
    float hash(vec3 p) {
      p = fract(p * vec3(443.8975, 397.2973, 491.1871));
      p += dot(p.xyz, p.yzx + 19.19);
      return fract(p.x * p.y * p.z);
    }
    
    float noise(vec3 p) {
      vec3 i = floor(p);
      vec3 f = fract(p);
      f = f*f*(3.0-2.0*f);
      return mix(
        mix(mix(hash(i+vec3(0,0,0)), hash(i+vec3(1,0,0)), f.x),
            mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
        mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x),
            mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y), f.z
      );
    }

    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;
      
      // Calculate world position
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;

      // Add soft pulsation
      float pulsation = noise(position * 1.5 + vec3(0.0, 0.0, uTime * 0.6)) * 0.08;
      vec3 newPosition = position + normal * pulsation;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
    }
  `;

  const fragmentShader = `
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec3 vWorldPosition;
    uniform float uTime;
    uniform vec3 uMousePos;

    void main() {
      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(vViewPosition);

      // Fresnel Rim Effect
      float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0);
      
      // Soft Inner Core Glow
      float innerGlow = max(dot(normal, viewDir), 0.0);
      innerGlow = pow(innerGlow, 5.0);

      // Colors matching brand spec (Electric Blue, Cyan, White Core)
      vec3 electricBlue = vec3(0.145, 0.388, 0.925); // #2563eb
      vec3 iceCyan = vec3(0.023, 0.713, 0.831); // #06b6d4
      vec3 whiteCore = vec3(1.0, 1.0, 1.0);

      // Mouse influence highlight
      float mouseDist = distance(normalize(vWorldPosition), normalize(uMousePos));
      float highlight = smoothstep(0.8, 0.0, mouseDist) * 0.15;

      // Blending colors
      vec3 baseColor = mix(electricBlue, iceCyan, fresnel);
      baseColor += whiteCore * innerGlow * 0.6;
      baseColor += iceCyan * highlight;

      // Set alpha for translucent glass feel
      float alpha = 0.88 + fresnel * 0.12;

      gl_FragColor = vec4(baseColor, alpha);
    }
  `;

  const orbMaterial = new THREE.ShaderMaterial({
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uMousePos: { value: new THREE.Vector3(0, 0, 1) }
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending
  });

  const orbGeometry = new THREE.SphereGeometry(1.6, 64, 64);
  const orb = new THREE.Mesh(orbGeometry, orbMaterial);
  coreGroup.add(orb);

  // ==========================================
  // 2. THE INTEL NEURAL NETWORK (Connecting Nodes)
  // ==========================================
  
  const nodeCount = 36;
  const nodes = [];
  const nodeVelocities = [];
  const initialNodes = []; // store initial layout to allow subtle mouse distortion

  const nodeGeometry = new THREE.BufferGeometry();
  const nodePositions = new Float32Array(nodeCount * 3);

  // Generate nodes on the surface of a slightly larger sphere
  for (let i = 0; i < nodeCount; i++) {
    const phi = Math.acos(-1 + (2 * i) / nodeCount);
    const theta = Math.sqrt(nodeCount * Math.PI) * phi;
    const r = 2.0 + Math.random() * 0.2; // radius

    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);

    nodes.push(new THREE.Vector3(x, y, z));
    initialNodes.push(new THREE.Vector3(x, y, z));
    
    // Slow drift velocity on sphere
    nodeVelocities.push(
      new THREE.Vector3(
        (Math.random() - 0.5) * 0.002,
        (Math.random() - 0.5) * 0.002,
        (Math.random() - 0.5) * 0.002
      )
    );

    nodePositions[i * 3] = x;
    nodePositions[i * 3 + 1] = y;
    nodePositions[i * 3 + 2] = z;
  }

  nodeGeometry.setAttribute("position", new THREE.BufferAttribute(nodePositions, 3));

  // Small glowing point mesh for each node
  const pointMaterial = new THREE.PointsMaterial({
    color: 0x06b6d4,
    size: 0.065,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const pointCloud = new THREE.Points(nodeGeometry, pointMaterial);
  coreGroup.add(pointCloud);

  // Neural connections (Lines between close nodes)
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x2563eb,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const lineGeometry = new THREE.BufferGeometry();
  let lineSegmentsGroup = new THREE.LineSegments(lineGeometry, lineMaterial);
  coreGroup.add(lineSegmentsGroup);

  // ==========================================
  // 3. ORBITING DATA PARTICLES
  // ==========================================

  const particleCount = 180;
  const particlesGeom = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(particleCount * 3);
  const particleOrbitInfo = []; // [radius, speed, angle, axisY, axisX]

  for (let i = 0; i < particleCount; i++) {
    const radius = 2.2 + Math.random() * 1.5;
    const speed = (0.2 + Math.random() * 0.6) * 0.01;
    const angle = Math.random() * Math.PI * 2;

    // Random orbit plane
    const axisY = (Math.random() - 0.5) * 0.4;
    const axisX = (Math.random() - 0.5) * 0.4;

    particleOrbitInfo.push({ radius, speed, angle, axisY, axisX });

    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius + (Math.sin(angle) * axisY);
    const z = (Math.cos(angle) * axisX);

    particlePositions[i * 3] = x;
    particlePositions[i * 3 + 1] = y;
    particlePositions[i * 3 + 2] = z;
  }

  particlesGeom.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));

  const particleMaterial = new THREE.PointsMaterial({
    color: 0x6366f1,
    size: 0.035,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const orbitingCloud = new THREE.Points(particlesGeom, particleMaterial);
  coreGroup.add(orbitingCloud);

  // ==========================================
  // Mouse & Resize Handlers
  // ==========================================

  const mouse = { x: 0, y: 0, targetX: 0, targetY: 0, lerpX: 0, lerpY: 0 };
  const worldMouse = new THREE.Vector3(0, 0, 1);

  window.addEventListener("mousemove", (e) => {
    // Normalized coordinates (-1 to 1)
    mouse.targetX = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.targetY = -(e.clientY / window.innerHeight) * 2 + 1;

    // Unproject to map to world coordinate for highlights
    worldMouse.set(mouse.targetX, mouse.targetY, 0.5);
    worldMouse.unproject(camera);
  });

  window.addEventListener("resize", () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    
    renderer.setSize(width, height);
  });

  // ==========================================
  // Animation Loop (60 FPS, GPU Optimized)
  // ==========================================

  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    const time = clock.getElapsedTime();
    orbMaterial.uniforms.uTime.value = time;
    orbMaterial.uniforms.uMousePos.value.lerp(worldMouse, 0.08);

    // Smooth lerped mouse rotation (Apple/OpenAI dynamic feel)
    mouse.lerpX += (mouse.targetX - mouse.lerpX) * 0.04;
    mouse.lerpY += (mouse.targetY - mouse.lerpY) * 0.04;

    coreGroup.rotation.y = time * 0.06 + mouse.lerpX * 0.25;
    coreGroup.rotation.x = mouse.lerpY * 0.25;

    // 1. Update nodes position (Slow surface drift + subtle mouse distortion)
    const positions = pointCloud.geometry.attributes.position.array;
    for (let i = 0; i < nodeCount; i++) {
      const node = nodes[i];
      const vel = nodeVelocities[i];
      const initial = initialNodes[i];

      // Surface drift
      node.add(vel);
      // Project back to sphere radius
      node.normalize().multiplyScalar(2.0 + Math.sin(time * 0.5 + i) * 0.05);

      // Mouse distortion (subtle pull on nodes close to cursor)
      const distToMouse = node.distanceTo(worldMouse);
      if (distToMouse < 2.5) {
        const pullStrength = (2.5 - distToMouse) * 0.06;
        const pullDir = new THREE.Vector3().subVectors(worldMouse, node).normalize();
        node.addScaledVector(pullDir, pullStrength);
      }

      positions[i * 3] = node.x;
      positions[i * 3 + 1] = node.y;
      positions[i * 3 + 2] = node.z;
    }
    pointCloud.geometry.attributes.position.needsUpdate = true;

    // 2. Rebuild line segments (Connect close nodes dynamically)
    const linePositions = [];
    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        const dist = nodes[i].distanceTo(nodes[j]);
        if (dist < 1.45) { // threshold connection distance
          linePositions.push(nodes[i].x, nodes[i].y, nodes[i].z);
          linePositions.push(nodes[j].x, nodes[j].y, nodes[j].z);
        }
      }
    }
    
    lineSegmentsGroup.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(linePositions), 3)
    );

    // 3. Update orbiting particles
    const partPositions = orbitingCloud.geometry.attributes.position.array;
    for (let i = 0; i < particleCount; i++) {
      const info = particleOrbitInfo[i];
      info.angle += info.speed;
      
      const x = Math.cos(info.angle) * info.radius;
      const y = Math.sin(info.angle) * info.radius + (Math.sin(info.angle) * info.axisY);
      const z = Math.sin(info.angle) * info.radius * info.axisX;

      partPositions[i * 3] = x;
      partPositions[i * 3 + 1] = y;
      partPositions[i * 3 + 2] = z;
    }
    orbitingCloud.geometry.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
  }

  // Start Animation
  animate();
})();
