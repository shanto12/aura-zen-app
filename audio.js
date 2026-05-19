/* ==========================================================================
   Aura | Overhauled Premium Web Audio Synthesis Engine
   ========================================================================== */

class AuraAudioEngine {
  constructor() {
    this.ctx = null;
    this.isInitialized = false;
    this.isMuted = true;
    
    // Musical scales definitions (Frequencies starting from C3 up to A5)
    this.scales = {
      pentatonicMajor: [130.81, 146.83, 164.81, 196.00, 220.00, 261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00], // C Pentatonic Major
      pentatonicMinor: [130.81, 155.56, 174.61, 196.00, 233.08, 261.63, 311.13, 349.23, 392.00, 466.16, 523.25, 622.25, 698.46, 783.99, 932.33], // C Pentatonic Minor
      phrygian: [130.81, 138.59, 164.81, 174.61, 196.00, 207.65, 233.08, 261.63, 277.18, 329.63, 349.23, 392.00, 415.30, 466.16, 523.25],        // C Phrygian Dominant
      lydian: [130.81, 146.83, 164.81, 185.00, 196.00, 220.00, 246.94, 261.63, 293.66, 329.63, 369.99, 392.00, 440.00, 493.88, 523.25]         // C Lydian
    };
    
    this.currentScale = 'pentatonicMajor';
    this.chimeIntervalId = null;
    
    // Core Audio Nodes
    this.masterGain = null;
    this.droneGain = null;
    this.noiseGain = null;
    this.chimesGain = null;
    this.delayNode = null;
    
    // Arrays to keep track of active synth elements for smooth fading & parameter changes
    this.droneVoices = []; // Holds arrays of { oscs, gains, filter }
    this.noiseSource = null;
    this.noiseFilter = null;
    this.noiseLfo = null;
    this.binauralOscs = [];
  }

  /**
   * Initializes the Web Audio Context and configures the signal path
   */
  async init() {
    if (this.isInitialized) return;
    
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContextClass();
    
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    
    this.setupSignalChain();
    this.startAdditiveDroneSynth();
    this.startOrganicBrownNoise();
    this.startChimeSequencer();
    
    this.isInitialized = true;
    this.unmute();
  }

  /**
   * Constructs high-end stereophonic audio busses with ping-pong echo delay
   */
  setupSignalChain() {
    // Master Node (Fades entire app volume)
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);
    
    // Individual Sub-mix Gains (Lush balance)
    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.value = 0.55;
    this.droneGain.connect(this.masterGain);
    
    this.noiseGain = this.ctx.createGain();
    this.noiseGain.gain.value = 0.25;
    this.noiseGain.connect(this.masterGain);
    
    this.chimesGain = this.ctx.createGain();
    this.chimesGain.gain.value = 0.45;
    this.chimesGain.connect(this.masterGain);
    
    // Ping-pong delay loop (creates deep stereophonic acoustic fields for FM bells)
    this.delayNode = this.ctx.createDelay(2.5);
    this.delayNode.delayTime.value = 0.75; // slow echoing delay
    
    const delayFeedback = this.ctx.createGain();
    delayFeedback.gain.value = 0.55; // high feedback feedback for wide ambient wash
    
    const delayPanL = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    const delayPanR = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    
    if (delayPanL && delayPanR) {
      delayPanL.pan.setValueAtTime(-0.8, this.ctx.currentTime);
      delayPanR.pan.setValueAtTime(0.8, this.ctx.currentTime);
      
      this.chimesGain.connect(this.delayNode);
      this.delayNode.connect(delayFeedback);
      delayFeedback.connect(delayPanL);
      
      // Feed Pan L back to Delay Node with slight delay offset (creates ping pong!)
      delayPanL.connect(this.delayNode);
      delayPanL.connect(this.masterGain);
      
      // Secondary cross-delayed link
      delayFeedback.connect(delayPanR);
      delayPanR.connect(this.masterGain);
    } else {
      this.chimesGain.connect(this.delayNode);
      this.delayNode.connect(delayFeedback);
      delayFeedback.connect(this.delayNode);
      this.delayNode.connect(this.masterGain);
    }
  }

  /**
   * Generates a stunning Additive Synthesis Drone
   * Layers fundamental + 4 overtone sine waves with slow LFO gain morphs
   */
  startAdditiveDroneSynth() {
    // Beautiful warm chord: C2 (65.41Hz), G2 (98Hz), C3 (130.81Hz)
    const baseFreqs = [65.41, 98.00, 130.81];
    
    baseFreqs.forEach((f0, voiceIdx) => {
      const voice = {
        oscs: [],
        gains: [],
        filter: null
      };
      
      // Create dynamic lowpass filter for this specific chord layer
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.value = 1.0;
      filter.frequency.setValueAtTime(140 + voiceIdx * 60, this.ctx.currentTime);
      
      // Define additive harmonics: fundamental (1), octave (2), perfect fifth (3), double octave (4)
      const harmonics = [
        { ratio: 1.000, baseVol: 0.40 }, // fundamental
        { ratio: 1.998, baseVol: 0.15 }, // detuned octave
        { ratio: 2.996, baseVol: 0.10 }, // detuned 5th
        { ratio: 3.992, baseVol: 0.05 }  // detuned 2nd octave
      ];
      
      harmonics.forEach((h, hIdx) => {
        // Pure sine wave for zero buzzing
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f0 * h.ratio, this.ctx.currentTime);
        
        // Individual overtone gain node for organic morphing
        const overtoneGain = this.ctx.createGain();
        overtoneGain.gain.setValueAtTime(h.baseVol, this.ctx.currentTime);
        
        // Dynamic LFO to modulate this overtone's gain (causes harmonics to evolve organically)
        const lfo = this.ctx.createOscillator();
        lfo.type = 'sine';
        // slow cycles (e.g. 15s to 30s)
        lfo.frequency.setValueAtTime(0.02 + voiceIdx * 0.01 + hIdx * 0.005, this.ctx.currentTime);
        
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.setValueAtTime(h.baseVol * 0.4, this.ctx.currentTime); // +/- 40% amplitude sweep
        
        lfo.connect(lfoGain);
        lfoGain.connect(overtoneGain.gain);
        
        // Connect signal path
        osc.connect(overtoneGain);
        overtoneGain.connect(filter);
        
        osc.start();
        lfo.start();
        
        voice.oscs.push(osc, lfo);
        voice.gains.push(overtoneGain);
      });
      
      // Dynamic sweep on the low-pass filter
      const filterLfo = this.ctx.createOscillator();
      filterLfo.frequency.setValueAtTime(0.045 + voiceIdx * 0.01, this.ctx.currentTime);
      
      const filterLfoGain = this.ctx.createGain();
      filterLfoGain.gain.setValueAtTime(45, this.ctx.currentTime); // sweep filter frequency +/- 45 Hz
      
      filterLfo.connect(filterLfoGain);
      filterLfoGain.connect(filter.frequency);
      filterLfo.start();
      
      voice.oscs.push(filterLfo);
      voice.filter = filter;
      
      // Stereo panning
      const panNode = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
      if (panNode) {
        panNode.pan.setValueAtTime(voiceIdx === 0 ? -0.65 : voiceIdx === 1 ? 0.65 : 0.0, this.ctx.currentTime);
        filter.connect(panNode);
        panNode.connect(this.droneGain);
      } else {
        filter.connect(this.droneGain);
      }
      
      this.droneVoices.push(voice);
    });
    
    // Add ultra-soft 6Hz Binaural beats for relaxing brainwaves
    const leftOsc = this.ctx.createOscillator();
    leftOsc.type = 'sine';
    leftOsc.frequency.setValueAtTime(90.0, this.ctx.currentTime); // low and warm
    
    const rightOsc = this.ctx.createOscillator();
    rightOsc.type = 'sine';
    rightOsc.frequency.setValueAtTime(96.0, this.ctx.currentTime); // 6 Hz offset
    
    const leftGain = this.ctx.createGain();
    const rightGain = this.ctx.createGain();
    leftGain.gain.value = 0.025; // extremely soft, no pressure
    rightGain.gain.value = 0.025;
    
    const leftPan = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    const rightPan = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    
    leftOsc.connect(leftGain);
    rightOsc.connect(rightGain);
    
    if (leftPan && rightPan) {
      leftPan.pan.setValueAtTime(-1.0, this.ctx.currentTime);
      rightPan.pan.setValueAtTime(1.0, this.ctx.currentTime);
      leftGain.connect(leftPan);
      rightGain.connect(rightPan);
      leftPan.connect(this.droneGain);
      rightPan.connect(this.droneGain);
    } else {
      leftGain.connect(this.droneGain);
      rightGain.connect(this.droneGain);
    }
    
    leftOsc.start();
    rightOsc.start();
    
    this.binauralOscs.push(leftOsc, rightOsc);
  }

  /**
   * Generates mathematical Brown Noise ($1/f^2$ spectral density) inside an AudioBuffer.
   * This completely avoids harsh high-frequency static hiss, creating a warm, organic wind/rain sound.
   */
  startOrganicBrownNoise() {
    const bufferSize = this.ctx.sampleRate * 5; // 5-second seamless loop buffer
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Brown noise formula (leaky integrator to simulate Brownian random walks)
      data[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = data[i];
      data[i] *= 4.0; // amplify to match white noise volume cleanly
    }
    
    this.noiseSource = this.ctx.createBufferSource();
    this.noiseSource.buffer = buffer;
    this.noiseSource.loop = true;
    
    // Shape noise to sound like wind gusts or rainfall
    this.noiseFilter = this.ctx.createBiquadFilter();
    this.noiseFilter.type = 'lowpass';
    this.noiseFilter.Q.value = 1.0;
    this.noiseFilter.frequency.setValueAtTime(250, this.ctx.currentTime);
    
    // Wind gust sweep LFO
    this.noiseLfo = this.ctx.createOscillator();
    this.noiseLfo.frequency.setValueAtTime(0.045, this.ctx.currentTime); // 22 seconds cycles
    
    const noiseLfoGain = this.ctx.createGain();
    noiseLfoGain.gain.setValueAtTime(150, this.ctx.currentTime); // sweeps lowpass frequency +/- 150 Hz
    
    this.noiseLfo.connect(noiseLfoGain);
    noiseLfoGain.connect(this.noiseFilter.frequency);
    
    this.noiseSource.connect(this.noiseFilter);
    this.noiseFilter.connect(this.noiseGain);
    
    this.noiseSource.start();
    this.noiseLfo.start();
  }

  /**
   * Schedules chime strikes at organic intervals
   */
  startChimeSequencer() {
    const playTick = () => {
      if (this.isMuted) return;
      
      if (Math.random() < 0.40) {
        this.playMetallicFMChime();
      }
      
      const nextTick = 1500 + Math.random() * 3500; // organic spacing between 1.5s and 5s
      this.chimeIntervalId = setTimeout(playTick, nextTick);
    };
    
    playTick();
  }

  /**
   * Synthesizes a state-of-the-art Frequency Modulated (FM) Crystalline Bell Chime
   * Generates a realistic dynamic hammer strike that resolves into a pure, calming decay
   */
  playMetallicFMChime() {
    if (!this.ctx || this.isMuted) return;
    
    const scale = this.scales[this.currentScale];
    const randomIndex = Math.floor(Math.random() * scale.length);
    const baseFreq = scale[randomIndex];
    const panVal = Math.random() * 1.6 - 0.8;
    const bellTail = 4.5 + Math.random() * 2.5;
    
    this.playFMChimeAtFrequency(baseFreq, 0.12, bellTail, panVal, 0.16);
  }

  /**
   * Reusable helper to play an FM bell strike at a specific frequency, duration, and panning
   */
  playFMChimeAtFrequency(freq, strikeDecay = 0.12, bellTail = 5.0, panVal = 0.0, volume = 0.16) {
    if (!this.ctx || this.isMuted) return;
    
    const carrier = this.ctx.createOscillator();
    const modulator = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const voiceGain = this.ctx.createGain();
    
    // 1. CARRIER (Sweet base tone - Sine wave)
    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    // 2. MODULATOR (Non-harmonic ratio for metallic bell complexity)
    modulator.type = 'sine';
    modulator.frequency.setValueAtTime(freq * 2.7314, this.ctx.currentTime);
    
    // 3. ENVELOPE 1: Modulation Index (High at click, decays instantly for strike tone)
    const startTime = this.ctx.currentTime;
    modGain.gain.setValueAtTime(freq * 6.0, startTime);
    modGain.gain.exponentialRampToValueAtTime(0.01, startTime + strikeDecay);
    
    // 4. ENVELOPE 2: Carrier Volume (Lush decaying tail)
    voiceGain.gain.setValueAtTime(0.001, startTime);
    voiceGain.gain.linearRampToValueAtTime(volume, startTime + 0.01);
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, startTime + bellTail);
    
    // 5. Connect FM Operator Chain
    modulator.connect(modGain);
    modGain.connect(carrier.frequency);
    
    // 6. Connect Signal Chain with Highpass to cut low rumble
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(150, this.ctx.currentTime);
    
    const panNode = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    
    carrier.connect(filter);
    filter.connect(voiceGain);
    
    if (panNode) {
      panNode.pan.setValueAtTime(panVal, this.ctx.currentTime);
      voiceGain.connect(panNode);
      panNode.connect(this.chimesGain);
    } else {
      voiceGain.connect(this.chimesGain);
    }
    
    carrier.start(startTime);
    modulator.start(startTime);
    
    carrier.stop(startTime + bellTail);
    modulator.stop(startTime + bellTail);
  }

  /**
   * CIRCLE AUDIO RESPONSE: Cascading Pentatonic Bell Arpeggio
   * Plays 6 high chimes sweeping rapidly in succession
   */
  playCascadeArpeggio() {
    if (!this.ctx || this.isMuted) return;
    
    const scale = this.scales[this.currentScale];
    // Start arpeggiation in mid-high register
    const startIdx = Math.min(scale.length - 6, Math.max(0, Math.floor(scale.length * 0.4)));
    const notes = scale.slice(startIdx, startIdx + 6);
    
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        if (this.isMuted) return;
        // Pan sweeps smoothly left to right
        const pan = (idx / 5) * 1.6 - 0.8;
        this.playFMChimeAtFrequency(freq, 0.10, 4.0, pan, 0.14);
      }, idx * 60); // 60ms gap for cascading feel
    });
  }

  /**
   * RECTANGLE AUDIO RESPONSE: Resonant warm fifth pipe-organ synth chord
   * Sweeps dynamic additive harmonics to build a rich geometric space
   */
  playResonantChords() {
    if (!this.ctx || this.isMuted) return;
    
    const scale = this.scales[this.currentScale];
    const rootFreq = scale[0] || 130.81; // Use scale base root (C3 octave)
    
    // Perfect fifth triad/pad frequencies: root, perfect fifth, octave, octave-fifth
    const frequencies = [rootFreq, rootFreq * 1.5, rootFreq * 2.0, rootFreq * 3.0];
    const chordGain = this.ctx.createGain();
    const startTime = this.ctx.currentTime;
    const duration = 6.0; // Warm 6-second pad
    
    chordGain.gain.setValueAtTime(0.001, startTime);
    chordGain.gain.linearRampToValueAtTime(0.20, startTime + 0.8); // 800ms fade in
    chordGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration); // smooth tail
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(650, startTime);
    filter.frequency.exponentialRampToValueAtTime(140, startTime + duration); // filter sweeps down
    
    frequencies.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      // Triangle adds warm retro woodwinds vibe, sine adds pure chime base
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq + (Math.random() * 0.5 - 0.25), startTime); // detuning chorus
      
      const oscGain = this.ctx.createGain();
      oscGain.gain.value = idx === 0 ? 0.35 : idx === 1 ? 0.30 : idx === 2 ? 0.20 : 0.12;
      
      osc.connect(oscGain);
      oscGain.connect(filter);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    });
    
    filter.connect(chordGain);
    
    const panNode = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    if (panNode) {
      panNode.pan.setValueAtTime(0.0, startTime);
      chordGain.connect(panNode);
      panNode.connect(this.droneGain); // feed directly to deep drone mix
    } else {
      chordGain.connect(this.droneGain);
    }
  }

  /**
   * TRIANGLE AUDIO RESPONSE: Soaring mystical Phrygian chime arpeggio chord
   */
  playMysticalPhrygian() {
    if (!this.ctx || this.isMuted) return;
    
    const scale = this.scales[this.currentScale];
    // Grab a selection of 5 upward-moving notes
    const startIdx = Math.min(scale.length - 5, Math.max(0, Math.floor(scale.length * 0.3)));
    const notes = scale.slice(startIdx, startIdx + 5);
    
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        if (this.isMuted) return;
        // Bouncing panning
        const pan = idx % 2 === 0 ? -0.6 : 0.6;
        // Sharper hammer attack strike for crystal peak feel
        this.playFMChimeAtFrequency(freq, 0.07, 3.5, pan, 0.12);
      }, idx * 110); // 110ms staggered steps
    });
  }

  /**
   * SLASH AUDIO RESPONSE: Sweeping space wind filter & shooting star trail
   */
  playLaserSweep() {
    if (!this.ctx || this.isMuted) return;
    
    const startTime = this.ctx.currentTime;
    const duration = 2.0;
    
    // 1. Math-generated noise burst for shooting-star tail friction
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.Q.value = 5.0; // whistling stardust
    noiseFilter.frequency.setValueAtTime(120, startTime);
    noiseFilter.frequency.exponentialRampToValueAtTime(3200, startTime + 0.7); // sweeps up high
    noiseFilter.frequency.exponentialRampToValueAtTime(450, startTime + duration); // sweeps back down
    
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.001, startTime);
    noiseGain.gain.linearRampToValueAtTime(0.25, startTime + 0.12); // swooshing wind swell
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    
    // 2. Synthesized frequency-sweep laser chime
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, startTime);
    osc.frequency.exponentialRampToValueAtTime(1600, startTime + 0.55); // sweep up
    osc.frequency.exponentialRampToValueAtTime(110, startTime + duration); // sweep down
    
    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.001, startTime);
    oscGain.gain.linearRampToValueAtTime(0.08, startTime + 0.08);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    
    osc.connect(oscGain);
    
    const panNode = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    if (panNode) {
      // Pan follows gesture streak direction (Left to Right)
      panNode.pan.setValueAtTime(-0.85, startTime);
      panNode.pan.linearRampToValueAtTime(0.85, startTime + duration);
      
      noiseGain.connect(panNode);
      oscGain.connect(panNode);
      panNode.connect(this.chimesGain);
    } else {
      noiseGain.connect(this.chimesGain);
      oscGain.connect(this.chimesGain);
    }
    
    noise.start(startTime);
    osc.start(startTime);
    
    noise.stop(startTime + duration);
    osc.stop(startTime + duration);
  }

  /**
   * Smoothly shapes active synth tones in response to breathing cycles
   * @param {string} state - 'inhale', 'exhale', 'hold'
   * @param {number} duration - seconds state lasts
   */
  setBreathState(state, duration) {
    if (!this.isInitialized || this.isMuted) return;
    
    const now = this.ctx.currentTime;
    
    if (state === 'inhale') {
      // Sweeps lowpass filters open, brightening the drone pad (inhaling clarity)
      this.droneVoices.forEach((voice, idx) => {
        const targetFreq = 380 + idx * 110;
        voice.filter.frequency.cancelScheduledValues(now);
        voice.filter.frequency.exponentialRampToValueAtTime(targetFreq, now + duration);
      });
      // Softly bring up chimes volume
      this.chimesGain.gain.cancelScheduledValues(now);
      this.chimesGain.gain.linearRampToValueAtTime(0.55, now + duration);
    } 
    else if (state === 'exhale') {
      // Sweeps lowpass filters closed, warming and darkening the sound (exhaling relaxation)
      this.droneVoices.forEach((voice, idx) => {
        const targetFreq = 100 + idx * 30;
        voice.filter.frequency.cancelScheduledValues(now);
        voice.filter.frequency.exponentialRampToValueAtTime(targetFreq, now + duration);
      });
      // Gently lower chimes
      this.chimesGain.gain.cancelScheduledValues(now);
      this.chimesGain.gain.linearRampToValueAtTime(0.25, now + duration);
    }
  }

  /**
   * Soundscape Preset Calibration (Sets frequency levels and noise types)
   */
  setPreset(presetName) {
    if (!this.isInitialized) return;
    
    const now = this.ctx.currentTime;
    
    switch (presetName) {
      case 'aurora':
        // Midnight Aurora: Slow wave sweeping, lush pentatonic major chime scale
        this.currentScale = 'pentatonicMajor';
        this.droneGain.gain.linearRampToValueAtTime(0.65, now + 3.0);
        this.noiseGain.gain.linearRampToValueAtTime(0.25, now + 3.0);
        
        // Organic forest mountain wind (deep brown lowpass with slow sweep)
        this.noiseFilter.type = 'lowpass';
        this.noiseFilter.Q.setValueAtTime(1.0, now);
        this.noiseLfo.frequency.setValueAtTime(0.03, now); // slow gust
        
        // Detune drone to spacious open chord root pitches
        this.updateDroneChord([65.41, 98.00, 130.81]); // C Open Pad
        break;
        
      case 'flare':
        // Solar Flare: Energetic warm scales, thermal crackle noise, golden frequencies
        this.currentScale = 'lydian';
        this.droneGain.gain.linearRampToValueAtTime(0.45, now + 3.0);
        this.noiseGain.gain.linearRampToValueAtTime(0.35, now + 3.0);
        
        // Solar flare static crackle (bandpass brown noise sweeps at high frequency)
        this.noiseFilter.type = 'bandpass';
        this.noiseFilter.Q.setValueAtTime(1.5, now);
        this.noiseFilter.frequency.setValueAtTime(750, now);
        this.noiseLfo.frequency.setValueAtTime(0.12, now); // faster wind crackle
        
        // Re-tune drone to warm major Lydian pitches
        this.updateDroneChord([73.42, 110.00, 146.83]); // D Anchor
        break;
        
      case 'ocean':
        // Deep Ocean: Ultra-low submarine drones, rainfall noise, peaceful chimes
        this.currentScale = 'pentatonicMinor';
        this.droneGain.gain.linearRampToValueAtTime(0.70, now + 3.0);
        this.noiseGain.gain.linearRampToValueAtTime(0.45, now + 3.0);
        
        // Rainfall noise (extremely low filtered lowpass brown noise, highly damp)
        this.noiseFilter.type = 'lowpass';
        this.noiseFilter.Q.setValueAtTime(0.7, now); // damp, flat rain
        this.noiseFilter.frequency.setValueAtTime(180, now);
        this.noiseLfo.frequency.setValueAtTime(0.015, now); // very static downpour
        
        // Deep oceanic sub-bass chord
        this.updateDroneChord([55.00, 82.41, 110.00]); // A Subchord
        break;
        
      case 'nebula':
        // Cosmic Nebula: Ethereal and mystical, stellar swept noises
        this.currentScale = 'phrygian';
        this.droneGain.gain.linearRampToValueAtTime(0.60, now + 3.0);
        this.noiseGain.gain.linearRampToValueAtTime(0.20, now + 3.0);
        
        // Stardust whistling sweeps
        this.noiseFilter.type = 'bandpass';
        this.noiseFilter.Q.setValueAtTime(4.5, now); // whistling stardust
        this.noiseLfo.frequency.setValueAtTime(0.07, now);
        
        // Mystical Phrygian chord
        this.updateDroneChord([58.27, 87.31, 116.54]); // A# Phrygian Root
        break;
    }
  }

  /**
   * Helper to sweep voice frequencies smoothly to new chord triads
   */
  updateDroneChord(freqArray) {
    const now = this.ctx.currentTime;
    
    // Update each voice's additive generators smoothly
    this.droneVoices.forEach((voice, voiceIdx) => {
      const f0 = freqArray[voiceIdx];
      const harmonics = [1.000, 1.998, 2.996, 3.992];
      
      // Update each additive oscillator frequency (first 8 elements are oscs & LFOs)
      for (let i = 0; i < 4; i++) {
        const osc = voice.oscs[i * 2]; // oscillators are spaced in index * 2
        if (osc) {
          osc.frequency.cancelScheduledValues(now);
          osc.frequency.exponentialRampToValueAtTime(f0 * harmonics[i], now + 3.5);
        }
      }
    });
  }

  // Master mute controls
  unmute() {
    if (!this.isInitialized) return;
    this.isMuted = false;
    this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.masterGain.gain.linearRampToValueAtTime(0.85, this.ctx.currentTime + 2.0); // smooth 2s fade-in
  }

  mute() {
    if (!this.isInitialized) return;
    this.isMuted = true;
    this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.masterGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1.0); // smooth 1s fade-out
  }

  // Volume bindings
  setDroneVolume(val) {
    if (!this.isInitialized) return;
    this.droneGain.gain.linearRampToValueAtTime(val, this.ctx.currentTime + 0.15);
  }

  setNatureVolume(val) {
    if (!this.isInitialized) return;
    this.noiseGain.gain.linearRampToValueAtTime(val, this.ctx.currentTime + 0.15);
  }

  setChimesVolume(val) {
    if (!this.isInitialized) return;
    this.chimesGain.gain.linearRampToValueAtTime(val, this.ctx.currentTime + 0.15);
  }

  setScale(scaleName) {
    if (this.scales[scaleName]) {
      this.currentScale = scaleName;
    }
  }
}

// Global Single Instance
window.AuraAudio = new AuraAudioEngine();
