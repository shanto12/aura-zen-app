/* ==========================================================================
   Aura | Overhauled Central Coordinator & Interactivity
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // UI References
  const audioShield = document.getElementById('audio-shield');
  const btnEnter = document.getElementById('btn-enter-aurora');
  const btnAudioToggle = document.getElementById('btn-audio-toggle');
  const btnBreathingToggle = document.getElementById('btn-breathing-toggle');
  const btnPanelToggle = document.getElementById('btn-panel-toggle');
  const btnZenMode = document.getElementById('btn-zen-mode');
  
  const presetsPanel = document.getElementById('presets-panel');
  const settingsPanel = document.getElementById('settings-panel');
  const breathingSection = document.getElementById('breathing-section');
  const zenHud = document.getElementById('zen-hud');
  
  const spotlight = document.getElementById('cursor-spotlight');
  
  // Customizer Controls
  const sliderDrone = document.getElementById('slider-drone');
  const sliderNature = document.getElementById('slider-nature');
  const sliderChimes = document.getElementById('slider-chimes');
  const sliderParticles = document.getElementById('slider-particles');
  const sliderSpeed = document.getElementById('slider-speed');
  const sliderAttraction = document.getElementById('slider-attraction');
  const selectScale = document.getElementById('select-scale');
  
  // Breathing Controls
  const btnBreathingBox = document.getElementById('btn-breathing-box');
  const btnBreathingRelax = document.getElementById('btn-breathing-relax');
  const breathInstruction = document.getElementById('breath-instruction');
  const breathTimer = document.getElementById('breath-timer');
  const dialProgressBar = document.getElementById('dial-progress-bar');

  // App State variables
  let appActivated = false;
  let isActivating = false;
  let isPanelsHidden = false;
  let isZenMode = false;
  let isBreathingActive = false;
  let zenHudTimeoutId = null;
  let idleTimerId = null;
  
  // Breathing Sequence variables
  let breathingInterval = null;
  let breathStateIndex = 0;
  let breathCount = 0;
  let activeBreathingPattern = 'box'; // 'box' or 'relax'
  
  // Breathing pattern configurations (state, duration, label)
  const breathingPatterns = {
    box: [
      { state: 'inhale', duration: 4, label: 'Inhale' },
      { state: 'hold-in', duration: 4, label: 'Hold' },
      { state: 'exhale', duration: 4, label: 'Exhale' },
      { state: 'hold-out', duration: 4, label: 'Hold' }
    ],
    relax: [
      { state: 'inhale', duration: 4, label: 'Inhale' },
      { state: 'hold-in', duration: 7, label: 'Hold' },
      { state: 'exhale', duration: 8, label: 'Exhale' }
    ]
  };

  // Preset configuration variable packages
  const themeAccentColors = {
    aurora: {
      accentSolid: '#38bdf8',
      accentGlow: 'rgba(56, 189, 248, 0.25)',
      grad1: '#10b981',
      grad2: '#6366f1',
      grad3: '#8b5cf6'
    },
    flare: {
      accentSolid: '#f59e0b',
      accentGlow: 'rgba(245, 158, 11, 0.25)',
      grad1: '#f59e0b',
      grad2: '#ef4444',
      grad3: '#ec4899'
    },
    ocean: {
      accentSolid: '#06b6d4',
      accentGlow: 'rgba(6, 182, 212, 0.25)',
      grad1: '#06b6d4',
      grad2: '#3b82f6',
      grad3: '#2563eb'
    },
    nebula: {
      accentSolid: '#ec4899',
      accentGlow: 'rgba(236, 72, 153, 0.25)',
      grad1: '#ec4899',
      grad2: '#8b5cf6',
      grad3: '#d946ef'
    }
  };

  /* ==========================================================================
     1. App Activation Setup
     ========================================================================== */
  
  const activateApp = async (event) => {
    if (event) event.stopPropagation();
    if (appActivated || isActivating) return;
    isActivating = true;
    
    audioShield.classList.add('fade-out');

    try {
      // Initialize Web Audio (Lush Additive organ synths, brown noise)
      await window.AuraAudio.init();

      // Initialize Canvas Particle physics
      window.AuraCanvas.init('visualizer-canvas');

      appActivated = true;

      btnAudioToggle.classList.add('active');
      btnAudioToggle.classList.add('activated');
      btnAudioToggle.querySelector('span').textContent = 'Sound On';

      // Start default Midnight Aurora preset
      window.AuraAudio.setPreset('aurora');

      syncParameters();
    } catch (error) {
      console.error('[Aura] Audio/visual engine activation failed.', error);
      audioShield.classList.remove('fade-out');
      const subtext = audioShield.querySelector('.subtext');
      if (subtext) subtext.textContent = 'Audio could not start. Check browser permissions and try again.';
    } finally {
      isActivating = false;
    }
  };

  btnEnter.addEventListener('click', activateApp);
  audioShield.addEventListener('click', activateApp);

  /* ==========================================================================
     2. Interactive Spotlight Cursor Tracker
     ========================================================================== */
  
  const moveSpotlight = (e) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    spotlight.style.left = `${clientX}px`;
    spotlight.style.top = `${clientY}px`;
  };

  window.addEventListener('mousemove', moveSpotlight);
  window.addEventListener('touchmove', moveSpotlight, { passive: true });

  /* ==========================================================================
     3. Preset Theme Switching
     ========================================================================== */
  
  const applyPresetTheme = (presetName) => {
    const root = document.documentElement;
    const colors = themeAccentColors[presetName];
    
    root.style.setProperty('--accent-solid', colors.accentSolid);
    root.style.setProperty('--accent-glow', colors.accentGlow);
    root.style.setProperty('--gradient-1', colors.grad1);
    root.style.setProperty('--gradient-2', colors.grad2);
    root.style.setProperty('--gradient-3', colors.grad3);
    
    window.AuraCanvas.setPreset(presetName);
    window.AuraAudio.setPreset(presetName);
    
    selectScale.value = window.AuraAudio.currentScale;
  };

  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetBtn = e.target.closest('.preset-btn');
      if (!targetBtn) return;
      
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      targetBtn.classList.add('active');
      
      const preset = targetBtn.dataset.preset;
      applyPresetTheme(preset);
    });
  });

  /* ==========================================================================
     4. Customizer Parameters Syncer
     ========================================================================== */
  
  const syncParameters = () => {
    if (!appActivated) return;
    
    window.AuraAudio.setDroneVolume(parseFloat(sliderDrone.value));
    window.AuraAudio.setNatureVolume(parseFloat(sliderNature.value));
    window.AuraAudio.setChimesVolume(parseFloat(sliderChimes.value));
    
    window.AuraCanvas.updateSettings(
      parseInt(sliderParticles.value),
      parseFloat(sliderSpeed.value),
      parseFloat(sliderAttraction.value)
    );
    
    window.AuraAudio.setScale(selectScale.value);
  };

  sliderDrone.addEventListener('input', () => window.AuraAudio.setDroneVolume(parseFloat(sliderDrone.value)));
  sliderNature.addEventListener('input', () => window.AuraAudio.setNatureVolume(parseFloat(sliderNature.value)));
  sliderChimes.addEventListener('input', () => window.AuraAudio.setChimesVolume(parseFloat(sliderChimes.value)));
  
  sliderParticles.addEventListener('input', () => window.AuraCanvas.updateSettings(parseInt(sliderParticles.value), undefined, undefined));
  sliderSpeed.addEventListener('input', () => window.AuraCanvas.updateSettings(undefined, parseFloat(sliderSpeed.value), undefined));
  sliderAttraction.addEventListener('input', () => window.AuraCanvas.updateSettings(undefined, undefined, parseFloat(sliderAttraction.value)));
  
  selectScale.addEventListener('change', () => window.AuraAudio.setScale(selectScale.value));

  /* ==========================================================================
     5. Audio Master Toggle
     ========================================================================== */
  
  btnAudioToggle.addEventListener('click', () => {
    if (!appActivated) {
      activateApp();
      return;
    }
    
    if (window.AuraAudio.isMuted) {
      window.AuraAudio.unmute();
      btnAudioToggle.classList.add('active');
      btnAudioToggle.querySelector('span').textContent = 'Sound On';
    } else {
      window.AuraAudio.mute();
      btnAudioToggle.classList.remove('active');
      btnAudioToggle.querySelector('span').textContent = 'Sound Off';
    }
  });

  /* ==========================================================================
     6. Customize Panels Toggle
     ========================================================================== */
  
  const togglePanels = () => {
    isPanelsHidden = !isPanelsHidden;
    
    if (isPanelsHidden) {
      presetsPanel.classList.add('hidden');
      settingsPanel.classList.add('hidden');
      btnPanelToggle.classList.remove('active');
    } else {
      presetsPanel.classList.remove('hidden');
      settingsPanel.classList.remove('hidden');
      btnPanelToggle.classList.add('active');
    }
  };
  
  btnPanelToggle.addEventListener('click', togglePanels);

  /* ==========================================================================
     7. Mindfulness Breathing Coach & SVG Ring Progress
     ========================================================================== */
  
  const startBreathingCoach = () => {
    isBreathingActive = true;
    btnBreathingToggle.classList.add('active');
    breathingSection.classList.remove('hidden');
    
    if (!isPanelsHidden) togglePanels();
    
    breathStateIndex = 0;
    runBreathingCycle();
  };

  const stopBreathingCoach = () => {
    isBreathingActive = false;
    btnBreathingToggle.classList.remove('active');
    breathingSection.classList.add('hidden');
    
    if (breathingInterval) clearTimeout(breathingInterval);
    
    breathingSection.className = 'breathing-container hidden';
    resetSvgProgress();
  };

  const resetSvgProgress = () => {
    dialProgressBar.style.strokeDashoffset = 553; // empty circumference offset
  };

  const updateSvgProgress = (secondsLeft, totalDuration, state) => {
    const circumference = 553; // 2 * pi * r (88)
    let ratio;
    
    if (state === 'inhale') {
      // Inhaling fills the circular stroke up (goes from 553 down to 0 offset)
      ratio = (totalDuration - secondsLeft) / totalDuration;
    } else {
      // Exhaling and Holding empties the circular stroke (goes from 0 up to 553 offset)
      ratio = secondsLeft / totalDuration;
    }
    
    const offset = circumference * (1 - ratio);
    dialProgressBar.style.strokeDashoffset = offset;
  };

  const runBreathingCycle = () => {
    if (!isBreathingActive) return;
    
    const pattern = breathingPatterns[activeBreathingPattern];
    const step = pattern[breathStateIndex];
    
    // Update Text UI
    breathInstruction.textContent = step.label;
    breathCount = step.duration;
    breathTimer.textContent = breathCount;
    
    // Update CSS Ring State classes
    breathingSection.className = 'breathing-container';
    breathingSection.classList.add(`state-${step.state}`);
    
    // Instruct synthesized drone filters to sweep cutoffs
    window.AuraAudio.setBreathState(step.state, step.duration);
    
    // Trigger visual canvas ripples on inhale/exhale transition
    if (step.state === 'inhale' || step.state === 'exhale') {
      window.AuraCanvas.triggerExplosion();
    }
    
    updateSvgProgress(breathCount, step.duration, step.state);
    
    // Tick-down timer
    const tick = () => {
      breathCount--;
      if (breathCount >= 0) {
        // Ticking down
        breathTimer.textContent = breathCount === 0 ? '' : breathCount;
        updateSvgProgress(breathCount, step.duration, step.state);
        breathingInterval = setTimeout(tick, 1000);
      } else {
        // Step complete, increment cycle index
        breathStateIndex = (breathStateIndex + 1) % pattern.length;
        runBreathingCycle();
      }
    };
    
    if (breathingInterval) clearTimeout(breathingInterval);
    breathingInterval = setTimeout(tick, 1000);
  };

  btnBreathingToggle.addEventListener('click', () => {
    if (isBreathingActive) {
      stopBreathingCoach();
    } else {
      startBreathingCoach();
    }
  });

  btnBreathingBox.addEventListener('click', () => {
    btnBreathingBox.classList.add('active');
    btnBreathingRelax.classList.remove('active');
    activeBreathingPattern = 'box';
    breathStateIndex = 0;
    if (isBreathingActive) runBreathingCycle();
  });

  btnBreathingRelax.addEventListener('click', () => {
    btnBreathingRelax.classList.add('active');
    btnBreathingBox.classList.remove('active');
    activeBreathingPattern = 'relax';
    breathStateIndex = 0;
    if (isBreathingActive) runBreathingCycle();
  });

  /* ==========================================================================
     8. Zen Mode (Interactions auto-fader)
     ========================================================================== */
  
  const enterZenMode = () => {
    isZenMode = true;
    document.body.classList.add('zen-mode');
    btnZenMode.classList.add('active');
    
    showZenHud();
    
    presetsPanel.classList.add('hidden');
    settingsPanel.classList.add('hidden');
    
    startIdleTracker();
  };

  const exitZenMode = () => {
    isZenMode = false;
    document.body.classList.remove('zen-mode');
    btnZenMode.classList.remove('active');
    
    hideZenHud();
    stopIdleTracker();
    
    if (!isPanelsHidden) {
      presetsPanel.classList.remove('hidden');
      settingsPanel.classList.remove('hidden');
    }
  };

  const showZenHud = () => {
    zenHud.classList.add('visible');
    if (zenHudTimeoutId) clearTimeout(zenHudTimeoutId);
    
    zenHudTimeoutId = setTimeout(() => {
      zenHud.classList.remove('visible');
    }, 3500);
  };

  const hideZenHud = () => {
    zenHud.classList.remove('visible');
    if (zenHudTimeoutId) clearTimeout(zenHudTimeoutId);
  };

  const startIdleTracker = () => {
    const resetIdleTimer = () => {
      document.body.classList.remove('zen-mode');
      showZenHud();
      
      if (idleTimerId) clearTimeout(idleTimerId);
      
      idleTimerId = setTimeout(() => {
        if (isZenMode) {
          document.body.classList.add('zen-mode');
          hideZenHud();
        }
      }, 4000);
    };
    
    window.addEventListener('mousemove', resetIdleTimer);
    window.addEventListener('touchmove', resetIdleTimer);
    window.addEventListener('mousedown', resetIdleTimer);
    
    window._zenIdleListener = resetIdleTimer;
    resetIdleTimer();
  };

  const stopIdleTracker = () => {
    if (window._zenIdleListener) {
      window.removeEventListener('mousemove', window._zenIdleListener);
      window.removeEventListener('touchmove', window._zenIdleListener);
      window.removeEventListener('mousedown', window._zenIdleListener);
      window._zenIdleListener = null;
    }
    if (idleTimerId) clearTimeout(idleTimerId);
  };

  btnZenMode.addEventListener('click', () => {
    if (isZenMode) {
      exitZenMode();
    } else {
      enterZenMode();
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isZenMode) {
      exitZenMode();
    }
  });

  /* ==========================================================================
     9. Interactive Gesture Shape Recognition Engine
     ========================================================================== */

  const showGestureAlert = (icon, text) => {
    const alert = document.getElementById('gesture-alert');
    if (!alert) return;
    alert.querySelector('.gesture-icon').textContent = icon;
    alert.querySelector('.gesture-text').textContent = text;
    
    alert.classList.add('hidden');
    void alert.offsetWidth; // Force CSS reflow to restart CSS keyframe animation
    alert.classList.remove('hidden');
  };

  const recognizeShape = (points) => {
    if (!points || points.length < 8) return null;

    // 1. Calculate path length L
    let L = 0;
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      L += Math.sqrt(dx * dx + dy * dy);
    }
    if (L < 35) return null; // Ignore tiny drawings

    // 2. Start-End Distance Dse
    const start = points[0];
    const end = points[points.length - 1];
    const dseDx = end.x - start.x;
    const dseDy = end.y - start.y;
    const Dse = Math.sqrt(dseDx * dseDx + dseDy * dseDy);

    // 3. Centroid and Bounding Box
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let sumX = 0, sumY = 0;
    
    points.forEach(p => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
      sumX += p.x;
      sumY += p.y;
    });
    
    const N = points.length;
    const cx = sumX / N;
    const cy = sumY / N;
    const W = maxX - minX;
    const H = maxY - minY;
    const A_box = W * H;

    if (A_box === 0) return null;

    // 4. Slash / Shooting Star: Open path check
    if (Dse > 0.42 * L) {
      return {
        shape: 'slash',
        centroid: { x: cx, y: cy },
        boundingBox: { x: minX, y: minY, w: W, h: H },
        points: points
      };
    }

    // 5. Calculate Polygon Area (Shoelace Formula)
    let sumArea = 0;
    for (let i = 0; i < N; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % N];
      sumArea += (p1.x * p2.y - p2.x * p1.y);
    }
    const A_poly = Math.abs(sumArea) / 2;

    // 6. Calculate Average Radius and Deviation for Circle Check
    let sumR = 0;
    const radii = [];
    points.forEach(p => {
      const dx = p.x - cx;
      const dy = p.y - cy;
      const r = Math.sqrt(dx * dx + dy * dy);
      radii.push(r);
      sumR += r;
    });
    const R_avg = sumR / N;

    let sumRDev = 0;
    radii.forEach(r => {
      sumRDev += Math.abs(r - R_avg);
    });
    const R_dev = sumRDev / N;
    const radiusDeviationRatio = R_dev / R_avg;

    const areaRatio = A_poly / A_box;

    console.log(`[Gesture] L: ${L.toFixed(1)}, Ratio Dse/L: ${(Dse/L).toFixed(3)}, Area Ratio: ${areaRatio.toFixed(3)}, Radius Dev Ratio: ${radiusDeviationRatio.toFixed(3)}`);

    // Classify closed shapes
    if (radiusDeviationRatio < 0.18) {
      return {
        shape: 'circle',
        centroid: { x: cx, y: cy },
        boundingBox: { x: minX, y: minY, w: W, h: H }
      };
    } else if (areaRatio >= 0.32 && areaRatio <= 0.62) {
      return {
        shape: 'triangle',
        centroid: { x: cx, y: cy },
        boundingBox: { x: minX, y: minY, w: W, h: H }
      };
    } else if (areaRatio > 0.62) {
      return {
        shape: 'rectangle',
        centroid: { x: cx, y: cy },
        boundingBox: { x: minX, y: minY, w: W, h: H }
      };
    } else {
      // Fallback
      return areaRatio > 0.50 ? 
        { shape: 'rectangle', centroid: { x: cx, y: cy }, boundingBox: { x: minX, y: minY, w: W, h: H } } : 
        { shape: 'triangle', centroid: { x: cx, y: cy }, boundingBox: { x: minX, y: minY, w: W, h: H } };
    }
  };

  const handleGestureRelease = () => {
    if (!appActivated) return;
    const trail = window.AuraCanvas.gestureTrail;
    if (!trail || trail.length < 5) {
      window.AuraCanvas.gestureTrail = [];
      return;
    }
    
    const points = [...trail];
    
    // Clear trail immediately so it stops rendering the neon ribbon line on canvas
    window.AuraCanvas.gestureTrail = [];
    
    const result = recognizeShape(points);
    if (!result) return;
    
    if (result.shape === 'circle') {
      showGestureAlert('🌌', 'Cosmic Nebula: Cascade Chimes');
      window.AuraCanvas.spawnCosmicNebula(result.centroid.x, result.centroid.y);
      window.AuraAudio.playCascadeArpeggio();
    } else if (result.shape === 'rectangle') {
      showGestureAlert('🔳', 'Shatter Box: Resonant Organ Chord');
      window.AuraCanvas.spawnShatterBox(result.boundingBox.x, result.boundingBox.y, result.boundingBox.w, result.boundingBox.h);
      window.AuraAudio.playResonantChords();
    } else if (result.shape === 'triangle') {
      showGestureAlert('🔺', 'Light Prism: Soaring Phrygian Scale');
      const size = Math.max(40, Math.min(110, (result.boundingBox.w + result.boundingBox.h) / 3));
      window.AuraCanvas.spawnPrism(result.centroid.x, result.centroid.y, size);
      window.AuraAudio.playMysticalPhrygian();
    } else if (result.shape === 'slash') {
      showGestureAlert('💫', 'Shooting Star: Laser Wind Sweep');
      window.AuraCanvas.spawnShootingStar(result.points);
      window.AuraAudio.playLaserSweep();
    }
  };

  window.addEventListener('mouseup', handleGestureRelease);
  window.addEventListener('touchend', handleGestureRelease, { passive: true });
});
