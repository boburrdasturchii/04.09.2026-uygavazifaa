// Anti-Gravity AI Vision Engine - Core Biometric Detection & Recognition
class AntiGravityVisionEngine {
  constructor() {
    this.isModelLoaded = false;
    this.detectorType = 'tiny';
    this.distanceThreshold = 0.55;
    this.labeledDescriptors = [];
    this.faceMatcher = null;
    this.database = [];
    this.dbStorageKey = 'antigravity_vision_faces_v1';
    this.loadDatabase();
    
    // Tiny Face Detector options
    this.tinyOptions = new faceapi.TinyFaceDetectorOptions({
      inputSize: 320,
      scoreThreshold: 0.5
    });

    // SSD MobileNet options
    this.ssdOptions = new faceapi.SsdMobilenetv1Options({
      minConfidence: 0.5
    });
  }

  async loadModels(modelPath = './models') {
    console.log('[AI Engine] Loading Neural Network Models from: ' + modelPath);
    
    try {
      if (typeof faceapi !== 'undefined' && faceapi.tf) {
        try {
          if (faceapi.tf.findBackend && faceapi.tf.findBackend('webgl')) {
            await faceapi.tf.setBackend('webgl');
          } else {
            await faceapi.tf.setBackend('cpu');
          }
        } catch (e) {
          console.warn('[AI Engine] Setting webgl backend failed, using cpu:', e);
          if (faceapi.tf.setBackend) await faceapi.tf.setBackend('cpu');
        }
        if (faceapi.tf.ready) await faceapi.tf.ready();
        console.log('[AI Engine] TFJS Backend initialized:', faceapi.tf.getBackend ? faceapi.tf.getBackend() : 'default');
      }
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(modelPath),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(modelPath),
        faceapi.nets.faceRecognitionNet.loadFromUri(modelPath),
        faceapi.nets.faceExpressionNet.loadFromUri(modelPath),
        faceapi.nets.ageGenderNet.loadFromUri(modelPath)
      ]);

      try {
        await faceapi.nets.ssdMobilenetv1.loadFromUri(modelPath);
      } catch (e) {
        console.warn('[AI Engine] SSD MobileNet fallback or deferred:', e);
      }

      this.isModelLoaded = true;
      console.log('[AI Engine] All neural networks successfully loaded into WebGL / WASM memory.');
      
      this.loadDatabase();
      return true;
    } catch (err) {
      console.error('[AI Engine] Error loading models:', err);
      throw err;
    }
  }

  setDetectorType(type) {
    this.detectorType = type === 'ssd' ? 'ssd' : 'tiny';
    console.log('[AI Engine] Detector switched to: ' + this.detectorType);
  }

  setThreshold(val) {
    this.distanceThreshold = parseFloat(val);
    this._rebuildFaceMatcher();
    console.log('[AI Engine] Distance threshold set to: ' + this.distanceThreshold);
  }

  loadDatabase() {
    try {
      const stored = localStorage.getItem(this.dbStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.database = parsed.map(item => ({
          ...item,
          descriptors: item.descriptors.map(d => new Float32Array(d))
        }));
      } else {
        this._seedDefaultProfiles();
      }
    } catch (e) {
      console.warn('[AI Engine] Error reading saved database, re-seeding:', e);
      this._seedDefaultProfiles();
    }

    this._rebuildFaceMatcher();
  }

  _seedDefaultProfiles() {
    this.database = [
      {
        id: 'seed-behruz',
        name: 'Behruz',
        role: 'Bosh Dasturchi & Muhandis',
        descriptors: [this._generateSampleDescriptor(42)],
        avatar: this._createDefaultAvatar('Behruz', '#00f0ff'),
        createdAt: new Date().toISOString()
      },
      {
        id: 'seed-asadbek',
        name: 'Asadbek',
        role: 'AI & Data Scientist',
        descriptors: [this._generateSampleDescriptor(77)],
        avatar: this._createDefaultAvatar('Asadbek', '#00ff88'),
        createdAt: new Date().toISOString()
      },
      {
        id: 'seed-anvar',
        name: 'Anvar',
        role: 'Tizim Xavfsizlik Boshligi',
        descriptors: [this._generateSampleDescriptor(108)],
        avatar: this._createDefaultAvatar('Anvar', '#ffb700'),
        createdAt: new Date().toISOString()
      }
    ];
    this.saveDatabase();
  }

  _generateSampleDescriptor(seed) {
    const desc = new Float32Array(128);
    for (let i = 0; i < 128; i++) {
      desc[i] = (Math.sin(seed + i * 0.43) * 0.5) / 10;
    }
    return desc;
  }

  _createDefaultAvatar(name, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 72;
    canvas.height = 72;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0a1020';
    ctx.fillRect(0, 0, 72, 72);
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 68, 68);
    ctx.fillStyle = color;
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name.charAt(0).toUpperCase(), 36, 38);
    return canvas.toDataURL('image/png');
  }

  saveDatabase() {
    try {
      const serializable = this.database.map(item => ({
        id: item.id,
        name: item.name,
        role: item.role,
        avatar: item.avatar,
        createdAt: item.createdAt,
        descriptors: item.descriptors.map(d => Array.from(d))
      }));
      localStorage.setItem(this.dbStorageKey, JSON.stringify(serializable));
    } catch (e) {
      console.error('[AI Engine] Failed to save database to localStorage:', e);
    }
  }

  _rebuildFaceMatcher() {
    this.labeledDescriptors = this.database
      .filter(p => p.descriptors && p.descriptors.length > 0)
      .map(p => new faceapi.LabeledFaceDescriptors(p.id, p.descriptors));

    if (this.labeledDescriptors.length > 0) {
      this.faceMatcher = new faceapi.FaceMatcher(this.labeledDescriptors, this.distanceThreshold);
      console.log('[AI Engine] FaceMatcher rebuilt with ' + this.labeledDescriptors.length + ' people. Max distance: ' + this.distanceThreshold);
    } else {
      this.faceMatcher = null;
    }
  }

  async enrollFace(element, name, role, avatarDataUrl = null) {
    if (!this.isModelLoaded) throw new Error('Modellar hali yuklanmagan');

    const detection = await faceapi
      .detectSingleFace(element, this.detectorType === 'ssd' ? this.ssdOptions : this.tinyOptions)
      .withFaceLandmarks(true)
      .withFaceDescriptor();

    if (!detection) {
      throw new Error('Kadrda yuz aniqlanmadi! Iltimos, yuzingizni kameraga to\'g\'ri tuting va yorug\'lik yetarli ekanligiga ishonch hosil qiling.');
    }

    const descriptor = detection.descriptor;
    const personId = 'person-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);

    let finalAvatar = avatarDataUrl;
    if (!finalAvatar) {
      finalAvatar = this._cropFaceAvatar(element, detection.detection.box);
    }

    const newPerson = {
      id: personId,
      name: name.trim(),
      role: role.trim() || 'Foydalanuvchi',
      descriptors: [descriptor],
      avatar: finalAvatar,
      createdAt: new Date().toISOString()
    };

    const existingIndex = this.database.findIndex(p => p.name.toLowerCase() === name.trim().toLowerCase());
    if (existingIndex >= 0) {
      this.database[existingIndex].descriptors.push(descriptor);
      if (avatarDataUrl) this.database[existingIndex].avatar = avatarDataUrl;
      console.log('[AI Engine] Added extra descriptor sample to existing person: ' + name);
    } else {
      this.database.push(newPerson);
      console.log('[AI Engine] Registered brand new person: ' + name);
    }

    this.saveDatabase();
    this._rebuildFaceMatcher();
    return newPerson;
  }

  _cropFaceAvatar(element, box) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 96;
      canvas.height = 96;
      const ctx = canvas.getContext('2d');
      const pad = box.width * 0.2;
      const sx = Math.max(0, box.x - pad);
      const sy = Math.max(0, box.y - pad);
      const sw = Math.min(element.width || element.videoWidth, box.width + pad * 2);
      const sh = Math.min(element.height || element.videoHeight, box.height + pad * 2);

      ctx.drawImage(element, sx, sy, sw, sh, 0, 0, 96, 96);
      return canvas.toDataURL('image/jpeg', 0.85);
    } catch (e) {
      return this._createDefaultAvatar('User', '#00f0ff');
    }
  }

  deletePerson(id) {
    this.database = this.database.filter(p => p.id !== id);
    this.saveDatabase();
    this._rebuildFaceMatcher();
  }

  async detectAndRecognize(videoElement, config = {}) {
    if (!this.isModelLoaded || !videoElement || videoElement.paused || videoElement.ended) {
      return [];
    }

    const detector = this.detectorType === 'ssd' ? this.ssdOptions : this.tinyOptions;

    let pipeline = faceapi
      .detectAllFaces(videoElement, detector)
      .withFaceLandmarks(true)
      .withFaceDescriptors();

    if (config.enableEmotions) {
      pipeline = pipeline.withFaceExpressions();
    }
    if (config.enableAgeGender) {
      pipeline = pipeline.withAgeAndGender();
    }

    const detections = await pipeline;
    const results = [];

    for (const d of detections) {
      let matchInfo = {
        name: 'NOTANISH',
        role: 'Begona Shaxs',
        isKnown: false,
        confidence: 0,
        distance: 1.0,
        id: null
      };

      if (this.faceMatcher && d.descriptor) {
        const bestMatch = this.faceMatcher.findBestMatch(d.descriptor);
        
        if (bestMatch.label !== 'unknown') {
          const person = this.database.find(p => p.id === bestMatch.label);
          if (person) {
            const conf = Math.max(0, Math.min(100, Math.round((1 - (bestMatch.distance / (this.distanceThreshold * 1.4))) * 100)));
            matchInfo = {
              name: person.name,
              role: person.role,
              isKnown: true,
              confidence: conf,
              distance: bestMatch.distance,
              id: person.id
            };
          }
        } else {
          matchInfo.distance = bestMatch.distance;
          matchInfo.confidence = Math.max(0, Math.round((1 - bestMatch.distance) * 100));
        }
      }

      let topEmotion = null;
      if (d.expressions) {
        let maxVal = 0;
        for (const [emo, val] of Object.entries(d.expressions)) {
          if (val > maxVal) {
            maxVal = val;
            topEmotion = { emotion: emo, score: Math.round(val * 100) };
          }
        }
      }

      results.push({
        box: d.detection.box,
        score: d.detection.score,
        landmarks: d.landmarks,
        match: matchInfo,
        emotion: topEmotion,
        age: d.age ? Math.round(d.age) : null,
        gender: d.gender || null
      });
    }

    return results;
  }
}

window.AntiGravityVisionEngine = AntiGravityVisionEngine;
