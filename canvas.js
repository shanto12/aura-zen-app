/* ==========================================================================
   Aura | Overhauled Interactive Generative Canvas Particle Engine
   ========================================================================== */

class AuraCanvasEngine {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    
    // Core parameters (Modulatable via UI settings)
    this.maxParticles = 200;
    this.speedMultiplier = 1.0;
    this.attractionStrength = 0.8;
    this.currentPreset = 'aurora';
    
    // Particle Storage
    this.particles = [];
    
    // Gesture Drawing Trail Collection
    this.gestureTrail = [];
    
    // Smooth Lerped Mouse Tracker
    this.mouse = { x: 0, y: 0, isActive: false, isDown: false };
    this.targetMouse = { x: 0, y: 0 };
    this.lerpFactor = 0.08;
    
    // Color Schemes (HSL mappings)
    this.colorSchemes = {
      aurora: { h1: 140, h2: 260, saturation: 85, lightness: 55, linkDistance: 80, bgBlend: 0.08, accentSolid: 'hsl(140, 85%, 55%)' },
      flare: { h1: 20, h2: 45, saturation: 95, lightness: 60, linkDistance: 50, bgBlend: 0.12, accentSolid: 'hsl(38, 95%, 60%)' },
      ocean: { h1: 180, h2: 210, saturation: 90, lightness: 50, linkDistance: 95, bgBlend: 0.06, accentSolid: 'hsl(188, 90%, 50%)' },
      nebula: { h1: 280, h2: 330, saturation: 85, lightness: 55, linkDistance: 85, bgBlend: 0.08, accentSolid: 'hsl(328, 85%, 55%)' }
    };
    
    this.animationFrameId = null;
  }

  /**
   * Binds canvas element and initializes resize/interaction listeners
   */
  init(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    
    this.setupResize();
    this.setupInteractions();
    
    this.spawnParticles(this.maxParticles);
    
    // Center mouse coordinates initially
    this.targetMouse.x = this.canvas.width / 2;
    this.targetMouse.y = this.canvas.height / 2;
    this.mouse.x = this.targetMouse.x;
    this.mouse.y = this.targetMouse.y;
    
    this.loop(0);
  }

  setupResize() {
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = this.canvas.getBoundingClientRect();
      
      this.canvas.width = rect.width * dpr;
      this.canvas.height = rect.height * dpr;
      this.ctx.scale(dpr, dpr);
      
      this.width = rect.width;
      this.height = rect.height;
    };
    
    window.addEventListener('resize', resize);
    resize();
  }

  setupInteractions() {
    const handleMove = (e) => {
      this.mouse.isActive = true;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      
      const rect = this.canvas.getBoundingClientRect();
      this.targetMouse.x = clientX - rect.left;
      this.targetMouse.y = clientY - rect.top;
      
      // If user is dragging (active drawing!), record gesture trail points
      if (this.mouse.isDown) {
        this.gestureTrail.push({ x: this.targetMouse.x, y: this.targetMouse.y });
        
        // Spawn sparks in drawing trail wake
        if (Math.random() < 0.35) {
          const p = this.createParticle(false);
          p.x = this.targetMouse.x;
          p.y = this.targetMouse.y;
          p.vx = Math.random() * 2.0 - 1.0;
          p.vy = Math.random() * 2.0 - 1.0;
          p.hue = 0; // striking white/gold stars along drag
          p.lightness = 90;
          p.size = Math.random() * 2.5 + 1.0;
          this.particles.push(p);
        }
      }
    };
    
    const handleLeave = () => {
      this.mouse.isActive = false;
      this.targetMouse.x = this.width / 2;
      this.targetMouse.y = this.height / 2;
      this.mouse.isDown = false;
      this.gestureTrail = [];
    };
    
    const handleDown = () => {
      this.mouse.isDown = true;
      this.gestureTrail = [{ x: this.targetMouse.x, y: this.targetMouse.y }];
    };
    
    const handleUp = () => {
      this.mouse.isDown = false;
      // Do not clear gesture trail instantly, let main.js capture it for shape recognition first
    };
    
    this.canvas.addEventListener('mousemove', handleMove);
    this.canvas.addEventListener('mouseleave', handleLeave);
    this.canvas.addEventListener('mousedown', handleDown);
    window.addEventListener('mouseup', handleUp);
    
    this.canvas.addEventListener('touchmove', handleMove, { passive: true });
    this.canvas.addEventListener('touchstart', (e) => {
      handleMove(e);
      handleDown();
    }, { passive: true });
    this.canvas.addEventListener('touchend', handleUp, { passive: true });
  }

  /**
   * Spawns particle pool
   */
  spawnParticles(count) {
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push(this.createParticle(true));
    }
  }

  /**
   * Particle creation factory
   */
  createParticle(randomizeLocation = false) {
    const scheme = this.colorSchemes[this.currentPreset];
    const isFlare = this.currentPreset === 'flare';
    const isOcean = this.currentPreset === 'ocean';
    const isNebula = this.currentPreset === 'nebula';
    
    let x, y, vx, vy, size, decay, life;
    
    if (randomizeLocation) {
      x = Math.random() * this.width;
      y = Math.random() * this.height;
    } else {
      const offsetAngle = Math.random() * Math.PI * 2;
      const offsetDist = Math.random() * 20;
      x = this.mouse.x + Math.cos(offsetAngle) * offsetDist;
      y = this.mouse.y + Math.sin(offsetAngle) * offsetDist;
    }
    
    if (isFlare) {
      size = Math.random() * 2.5 + 0.5;
      vx = Math.random() * 1.5 - 0.75;
      vy = -(Math.random() * 2.0 + 1.0);
      life = 1.0;
      decay = Math.random() * 0.015 + 0.008;
    } else if (isOcean) {
      size = Math.random() * 5.0 + 1.5;
      vx = Math.random() * 0.8 - 0.4;
      vy = -(Math.random() * 0.6 + 0.2);
      life = 1.0;
      decay = Math.random() * 0.006 + 0.003;
    } else if (isNebula) {
      size = Math.random() * 3.0 + 0.8;
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 1.2 + 0.3;
      vx = Math.cos(angle) * speed;
      vy = Math.sin(angle) * speed;
      life = 1.0;
      decay = Math.random() * 0.008 + 0.004;
    } else {
      size = Math.random() * 3.5 + 1.0;
      vx = Math.random() * 1.0 - 0.5;
      vy = Math.random() * 0.6 - 0.3;
      life = 1.0;
      decay = Math.random() * 0.006 + 0.003;
    }
    
    const blendFactor = Math.random();
    const hue = Math.floor(scheme.h1 + (scheme.h2 - scheme.h1) * blendFactor);
    
    return {
      x, y,
      vx, vy,
      baseVx: vx, baseVy: vy,
      size,
      originalSize: size,
      hue,
      saturation: scheme.saturation,
      lightness: scheme.lightness + (Math.random() * 16 - 8),
      life,
      decay,
      wanderAngle: Math.random() * Math.PI * 2,
      wanderSpeed: Math.random() * 0.06 + 0.02
    };
  }

  /**
   * Spawns dynamic particle shockwaves upon clicks or taps
   */
  triggerExplosion() {
    const burstCount = 35;
    for (let i = 0; i < burstCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6.5 + 2.5;
      const p = this.createParticle(false);
      
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.decay = Math.random() * 0.025 + 0.015;
      p.size = Math.random() * 3.5 + 1.5;
      p.lightness = 75;
      
      this.particles.push(p);
    }
    
    if (this.particles.length > 500) {
      this.particles.splice(0, this.particles.length - 500);
    }
  }

  /* ==========================================================================
     9. Magical Audio-Visual Shape Spawning Engines
     ========================================================================== */
  
  /**
   * CIRCLE EVENT: Spawns a gorgeous spinning orbital nebula galaxy
   */
  spawnCosmicNebula(cx, cy) {
    const burstCount = 90;
    
    for (let i = 0; i < burstCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 55 + 15;
      const p = this.createParticle(false);
      
      p.x = cx + Math.cos(angle) * radius;
      p.y = cy + Math.sin(angle) * radius;
      
      // Orbital speed vectors (Rotate perpendicular to angle vector)
      const speed = Math.random() * 2.0 + 1.2;
      p.vx = -Math.sin(angle) * speed;
      p.vy = Math.cos(angle) * speed;
      
      p.hue = Math.random() > 0.5 ? 280 : 335; // glowing violet and magenta
      p.size = Math.random() * 3.5 + 1.2;
      p.decay = Math.random() * 0.007 + 0.004; // longer lifespans for orbital swirls
      p.lightness = 70;
      
      this.particles.push(p);
    }
  }

  /**
   * RECTANGLE EVENT: Spawns a glowing square outline that explodes outwards
   */
  spawnShatterBox(rx, ry, rw, rh) {
    const steps = 18;
    
    const addBoxSpark = (px, py, vx, vy) => {
      const p = this.createParticle(false);
      p.x = px;
      p.y = py;
      
      // Blast velocity outwards with speed randoms
      const speed = Math.random() * 2.8 + 1.2;
      p.vx = vx * speed;
      p.vy = vy * speed;
      
      p.hue = Math.random() > 0.5 ? 22 : 44; // warm golden fire sparks
      p.size = Math.random() * 3.2 + 1.0;
      p.decay = Math.random() * 0.016 + 0.008;
      p.lightness = 75;
      
      this.particles.push(p);
    };

    // Horizontal top/bottom edges
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = rx + rw * t;
      addBoxSpark(px, ry, 0, -1.0); // top blows up
      addBoxSpark(px, ry + rh, 0, 1.0); // bottom blows down
    }
    
    // Vertical left/right edges
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const py = ry + rh * t;
      addBoxSpark(rx, py, -1.0, 0); // left blows left
      addBoxSpark(rx + rw, py, 1.0, 0); // right blows right
    }
  }

  /**
   * TRIANGLE EVENT: Spawns a glowing geometric prism shooting outwards at 3 angles
   */
  spawnPrism(cx, cy, r = 80) {
    const corners = [
      { x: cx, y: cy - r }, // Top peak
      { x: cx - r * Math.sin(Math.PI/3), y: cy + r * Math.cos(Math.PI/3) }, // bottom left
      { x: cx + r * Math.sin(Math.PI/3), y: cy + r * Math.cos(Math.PI/3) }  // bottom right
    ];
    
    const steps = 24;
    
    const addPrismSpark = (x1, y1, x2, y2, radialAngle) => {
      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        const p = this.createParticle(false);
        p.x = x1 + (x2 - x1) * t;
        p.y = y1 + (y2 - y1) * t;
        
        // Blast outward radially from triangle centroid
        const speed = Math.random() * 2.5 + 0.8;
        p.vx = Math.cos(radialAngle) * speed;
        p.vy = Math.sin(radialAngle) * speed;
        
        p.hue = Math.random() > 0.5 ? 180 : 215; // sparkling cyan & neon blue
        p.size = Math.random() * 3.5 + 1.0;
        p.decay = Math.random() * 0.012 + 0.005;
        p.lightness = 68;
        
        this.particles.push(p);
      }
    };

    // 1. Top to Bottom Left (vector angles out)
    addPrismSpark(corners[0].x, corners[0].y, corners[1].x, corners[1].y, Math.PI * 7/6);
    // 2. Bottom Left to Bottom Right (vector angles down)
    addPrismSpark(corners[1].x, corners[1].y, corners[2].x, corners[2].y, Math.PI/2);
    // 3. Bottom Right to Top (vector angles out)
    addPrismSpark(corners[2].x, corners[2].y, corners[0].x, corners[0].y, -Math.PI/6);
  }

  /**
   * SLASH EVENT: Spawns high-velocity streaking shooting star trails
   */
  spawnShootingStar(points) {
    if (points.length < 2) return;
    
    const start = points[0];
    const end = points[points.length - 1];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist < 10) return;
    
    // Shoot direction unit vector
    const ux = dx / dist;
    const uy = dy / dist;
    
    const sparkCount = 65;
    for (let i = 0; i < sparkCount; i++) {
      const t = Math.random();
      const ptIdx = Math.floor(t * (points.length - 1));
      const pt = points[ptIdx] || start;
      
      const p = this.createParticle(false);
      p.x = pt.x;
      p.y = pt.y;
      
      // High speed along sweep with slight perpendicular spread
      const shootSpeed = Math.random() * 5.0 + 3.0;
      const spreadSpeed = Math.random() * 1.6 - 0.8;
      
      p.vx = ux * shootSpeed - uy * spreadSpeed;
      p.vy = uy * shootSpeed + ux * spreadSpeed;
      
      p.hue = Math.random() > 0.5 ? 142 : 195; // glowing emerald to cyan
      p.size = Math.random() * 3.8 + 1.2;
      p.decay = Math.random() * 0.018 + 0.008;
      p.lightness = 72;
      
      this.particles.push(p);
    }
  }

  /* ==========================================================================
     10. Main Loop & Settings Control
     ========================================================================== */

  updateSettings(particleCount, speed, attraction) {
    if (particleCount !== undefined) {
      this.maxParticles = particleCount;
      if (this.particles.length < this.maxParticles) {
        const diff = this.maxParticles - this.particles.length;
        for (let i = 0; i < diff; i++) this.particles.push(this.createParticle(true));
      } else if (this.particles.length > this.maxParticles) {
        this.particles.splice(0, this.particles.length - this.maxParticles);
      }
    }
    if (speed !== undefined) this.speedMultiplier = speed;
    if (attraction !== undefined) this.attractionStrength = attraction;
  }

  setPreset(presetName) {
    if (this.colorSchemes[presetName]) {
      this.currentPreset = presetName;
      this.particles.forEach(p => {
        const scheme = this.colorSchemes[this.currentPreset];
        p.hue = Math.floor(scheme.h1 + (scheme.h2 - scheme.h1) * Math.random());
        p.saturation = scheme.saturation;
        p.lightness = scheme.lightness + (Math.random() * 16 - 8);
      });
    }
  }

  loop(timestamp) {
    this.mouse.x += (this.targetMouse.x - this.mouse.x) * this.lerpFactor;
    this.mouse.y += (this.targetMouse.y - this.mouse.y) * this.lerpFactor;
    
    const scheme = this.colorSchemes[this.currentPreset];
    
    this.ctx.fillStyle = `rgba(5, 5, 10, ${scheme.bgBlend})`;
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    // Draw active drawing path (Glowing Neon Ribbon)
    if (this.mouse.isDown && this.gestureTrail.length > 1) {
      this.ctx.save();
      // Draw neon path glow
      this.ctx.shadowBlur = 12;
      this.ctx.shadowColor = scheme.accentSolid;
      this.ctx.strokeStyle = scheme.accentSolid;
      this.ctx.lineWidth = 4.5;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      
      this.ctx.beginPath();
      this.ctx.moveTo(this.gestureTrail[0].x, this.gestureTrail[0].y);
      for (let i = 1; i < this.gestureTrail.length; i++) {
        this.ctx.lineTo(this.gestureTrail[i].x, this.gestureTrail[i].y);
      }
      this.ctx.stroke();
      this.ctx.restore();
    }
    
    const len = this.particles.length;
    
    for (let i = 0; i < len; i++) {
      let p = this.particles[i];
      if (!p) continue;
      
      p.wanderAngle += p.wanderSpeed;
      let wx = Math.cos(p.wanderAngle) * 0.15;
      let wy = Math.sin(p.wanderAngle) * 0.15;
      
      const dx = this.mouse.x - p.x;
      const dy = this.mouse.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      let ax = 0;
      let ay = 0;
      
      if (this.attractionStrength > 0 && dist > 10) {
        const force = Math.min(2.5, (100 / dist) * this.attractionStrength);
        
        if (this.currentPreset === 'nebula') {
          const angle = Math.atan2(dy, dx);
          ax = Math.cos(angle + Math.PI / 2.2) * force * 0.6;
          ay = Math.sin(angle + Math.PI / 2.2) * force * 0.6;
        } else {
          ax = (dx / dist) * force * 0.25;
          ay = (dy / dist) * force * 0.25;
        }
      }
      
      p.vx += ax + wx;
      p.vy += ay + wy;
      
      const friction = this.currentPreset === 'ocean' ? 0.985 : 0.975;
      p.vx *= friction;
      p.vy *= friction;
      
      p.x += p.vx * this.speedMultiplier;
      p.y += p.vy * this.speedMultiplier;
      
      if (this.currentPreset === 'aurora') {
        p.vx += Math.sin(p.y * 0.005 + timestamp * 0.0005) * 0.015;
      }
      
      p.life -= p.decay;
      p.size = p.originalSize * p.life;
      
      if (p.x < -10 || p.x > this.width + 10 || p.y < -10 || p.y > this.height + 10 || p.life <= 0) {
        this.particles[i] = this.createParticle(this.mouse.isActive ? false : true);
        p = this.particles[i];
      }
      
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, Math.max(0.1, p.size), 0, Math.PI * 2);
      this.ctx.fillStyle = `hsla(${p.hue}, ${p.saturation}%, ${p.lightness}%, ${p.life})`;
      this.ctx.fill();
    }
    
    this.drawConnections(scheme.linkDistance);
    
    this.animationFrameId = requestAnimationFrame((t) => this.loop(t));
  }

  drawConnections(maxDistance) {
    const len = this.particles.length;
    for (let i = 0; i < len; i++) {
      for (let j = i + 1; j < len; j++) {
        const p1 = this.particles[i];
        const p2 = this.particles[j];
        
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dist = dx * dx + dy * dy;
        const maxDistSq = maxDistance * maxDistance;
        
        if (dist < maxDistSq) {
          const actualDist = Math.sqrt(dist);
          const alpha = (1 - actualDist / maxDistance) * 0.13 * Math.min(p1.life, p2.life);
          
          this.ctx.beginPath();
          this.ctx.moveTo(p1.x, p1.y);
          this.ctx.lineTo(p2.x, p2.y);
          
          const grad = this.ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
          grad.addColorStop(0, `hsla(${p1.hue}, ${p1.saturation}%, ${p1.lightness}%, ${alpha})`);
          grad.addColorStop(1, `hsla(${p2.hue}, ${p2.saturation}%, ${p2.lightness}%, ${alpha})`);
          
          this.ctx.strokeStyle = grad;
          this.ctx.lineWidth = 0.5;
          this.ctx.stroke();
        }
      }
    }
  }

  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}

window.AuraCanvas = new AuraCanvasEngine();
