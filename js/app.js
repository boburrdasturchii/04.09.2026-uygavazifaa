// Anti-Gravity AI Vision Engine - Main Application Controller
(function() {
  'use strict';

  // DOM Elements
  const videoEl = document.getElementById('webcam-video');
  const canvasEl = document.getElementById('overlay-canvas');
  const testPhotoImg = document.getElementById('test-photo-img');
  const loadingOverlay = document.getElementById('viewport-loading');
  const loadingText = document.getElementById('loading-text');
  const viewportModeTitle = document.getElementById('viewport-mode-title');
  
  // Header stats
  const fpsVal = document.getElementById('fps-val');
  const latencyVal = document.getElementById('latency-val');
  const facesVal = document.getElementById('faces-val');
  
  // Controls
  const cameraSelect = document.getElementById('camera-select');
  const detectorSelect = document.getElementById('detector-select');
  const thresholdSlider = document.getElementById('threshold-slider');
  const thresholdVal = document.getElementById('threshold-val');
  const btnToggleMirror = document.getElementById('btn-toggle-mirror');
  const btnToggleLandmarks = document.getElementById('btn-toggle-landmarks');
  const btnToggleEmotions = document.getElementById('btn-toggle-emotions');
  const btnToggleSound = document.getElementById('btn-toggle-sound');
  const btnOpenEnroll = document.getElementById('btn-open-enroll');
  const btnCaptureNow = document.getElementById('btn-capture-now');
  const btnResetDb = document.getElementById('btn-reset-db');
  const testPhotoInput = document.getElementById('test-photo-input');
  
  // Access Banner & Turnstile
  const accessBanner = document.getElementById('access-banner');
  const accessIcon = document.getElementById('access-icon');
  const accessName = document.getElementById('access-name');
  const accessStatus = document.getElementById('access-status');
  const turnstilePill = document.getElementById('turnstile-pill');
  
  // Database & Logs
  const peopleList = document.getElementById('people-list');
  const peopleCount = document.getElementById('people-count');
  const logContainer = document.getElementById('log-container');
  const btnClearLogs = document.getElementById('btn-clear-logs');
  
  // Modal Elements
  const enrollModal = document.getElementById('enroll-modal');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const btnModalCancel = document.getElementById('btn-modal-cancel');
  const btnModalSave = document.getElementById('btn-modal-save');
  const enrollNameInput = document.getElementById('enroll-name');
  const enrollRoleInput = document.getElementById('enroll-role');
  const snapshotPreview = document.getElementById('snapshot-preview');
  const enrollFileInput = document.getElementById('enroll-file');
  const btnSnapCamera = document.getElementById('btn-snap-camera');

  // Instances
  const engine = new window.AntiGravityVisionEngine();
  const renderer = new window.HUDCanvasRenderer(canvasEl);
  const sound = window.soundFX;

  // State
  let currentStream = null;
  let isRunning = false;
  let frameCount = 0;
  let lastFpsUpdate = performance.now();
  let currentFps = 0;
  let isCameraActive = false;
  let isPhotoMode = false;
  
  const recognitionCooldowns = new Map();
  let turnstileTimer = null;
  let pendingSnapshotData = null;

  async function init() {
    bindEvents();
    renderPeopleList();

    renderer.setMirrored(true);
    renderer.setLandmarks(false);
    renderer.setEmotions(true);

    try {
      loadingText.textContent = "AI Nefron Modellari Yuklanmoqda...";
      await engine.loadModels('./models');
      renderPeopleList();
      logEvent("Neyron modellar (128D Face Recognition) muvaffaqiyatli yuklandi", 'known');
    } catch (err) {
      console.error('Model loading error:', err);
      loadingText.innerHTML = '<span style="color:var(--accent-red)">Modellarni yuklashda xatolik yuz berdi. Sahifani qayta yangilang.</span>';
      return;
    }

    await attemptStartCamera();
  }

  async function attemptStartCamera() {
    isPhotoMode = false;
    testPhotoImg.style.display = 'none';
    videoEl.style.display = 'block';
    viewportModeTitle.textContent = "Jonli Kamera Oqimi (Live Feed)";

    loadingOverlay.style.display = 'flex';
    loadingOverlay.style.opacity = '1';
    loadingText.textContent = "Videokamera ulanmoqda (Ruxsat so'ralmoqda)...";

    try {
      await setupCameras();
      await startCamera();

      isCameraActive = true;
      loadingOverlay.style.opacity = '0';
      setTimeout(() => {
        loadingOverlay.style.display = 'none';
      }, 350);

      if (!isRunning) {
        isRunning = true;
        requestAnimationFrame(processLoop);
      }
      logEvent('Videokamera oqimi ulandi. AI Vision tahlili boshlandi!', 'known');
    } catch (camErr) {
      console.warn('Camera start error:', camErr);
      isCameraActive = false;
      
      let msg = "Kameraga ulanib bo'lmadi.";
      if (camErr.name === 'NotAllowedError' || camErr.name === 'PermissionDeniedError') {
        msg = "Kameradan foydalanishga ruxsat berilmadi. Iltimos, brauzer qidiruv satridagi kamera belgisini bosib 'Ruxsat berish' (Allow) ni tanlang.";
      } else if (camErr.name === 'NotFoundError' || camErr.name === 'DevicesNotFoundError') {
        msg = "Kompyuterga ulangan kamera topilmadi. 'Rasmni Sinash' orqali rasm yuklab AI ni sinashingiz mumkin.";
      }

      loadingText.innerHTML = '<div style="max-width:380px; text-align:center; display:flex; flex-direction:column; gap:12px; align-items:center;">' +
        '<span style="color:var(--accent-red); font-size:14px; font-weight:700;">⚠️ Kamera Ulanmadi</span>' +
        '<span style="color:var(--text-muted); font-size:12px; line-height:1.5;">' + msg + '</span>' +
        '<div style="display:flex; gap:10px; margin-top:8px;">' +
          '<button id="btn-retry-camera" class="btn btn-primary btn-sm">🔄 Qayta Urinish</button>' +
          '<button id="btn-test-image-mode" class="btn btn-sm">📁 Surat Yuklab Sinash</button>' +
        '</div>' +
      '</div>';

      const btnRetry = document.getElementById('btn-retry-camera');
      if (btnRetry) {
        btnRetry.onclick = () => attemptStartCamera();
      }

      const btnTestImg = document.getElementById('btn-test-image-mode');
      if (btnTestImg) {
        btnTestImg.onclick = () => {
          testPhotoInput.click();
        };
      }
    }
  }

  async function setupCameras() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      
      cameraSelect.innerHTML = '';
      if (videoDevices.length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'Kamera topilmadi';
        cameraSelect.appendChild(opt);
        return;
      }

      videoDevices.forEach((dev, idx) => {
        const opt = document.createElement('option');
        opt.value = dev.deviceId;
        opt.textContent = dev.label || ('Kamera ' + (idx + 1));
        cameraSelect.appendChild(opt);
      });
    } catch (e) {
      console.warn('Enumerate devices failed:', e);
    }
  }

  async function startCamera(deviceId = null) {
    if (currentStream) {
      currentStream.getTracks().forEach(t => t.stop());
    }

    const constraints = {
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 }
      },
      audio: false
    };

    if (deviceId) {
      constraints.video.deviceId = { exact: deviceId };
    }

    currentStream = await navigator.mediaDevices.getUserMedia(constraints);
    videoEl.srcObject = currentStream;

    return new Promise((resolve, reject) => {
      videoEl.onloadedmetadata = () => {
        videoEl.play().then(() => {
          canvasEl.width = videoEl.videoWidth || 1280;
          canvasEl.height = videoEl.videoHeight || 720;
          resolve();
        }).catch(reject);
      };
      videoEl.onerror = reject;
    });
  }

  async function processLoop() {
    if (!isRunning) return;

    const startT = performance.now();

    if (isCameraActive && !isPhotoMode && videoEl.readyState >= 2 && !videoEl.paused) {
      const vw = videoEl.videoWidth || 1280;
      const vh = videoEl.videoHeight || 720;

      try {
        const detections = await engine.detectAndRecognize(videoEl, {
          enableEmotions: renderer.showEmotions,
          enableAgeGender: false
        });

        const endT = performance.now();
        const latency = Math.round(endT - startT);
        latencyVal.textContent = latency + ' ms';
        facesVal.textContent = detections.length;

        renderer.draw(detections, vw, vh);
        handleRecognitionEvents(detections);
      } catch (err) {
        console.error('Frame processing error:', err);
      }
    }

    frameCount++;
    const now = performance.now();
    if (now - lastFpsUpdate >= 500) {
      currentFps = Math.round((frameCount * 1000) / (now - lastFpsUpdate));
      fpsVal.textContent = isCameraActive ? currentFps : (isPhotoMode ? 'PHOTO' : 0);
      frameCount = 0;
      lastFpsUpdate = now;
    }

    requestAnimationFrame(processLoop);
  }

  // Test face recognition with a static uploaded image
  async function testStaticImage(imgSrc) {
    loadingOverlay.style.display = 'none';
    isPhotoMode = true;
    viewportModeTitle.textContent = "Surat Tahlili Rejimi (Static Photo Mode)";

    testPhotoImg.src = imgSrc;
    testPhotoImg.style.display = 'block';
    videoEl.style.display = 'none';

    testPhotoImg.onload = async () => {
      const iw = testPhotoImg.naturalWidth || 640;
      const ih = testPhotoImg.naturalHeight || 480;

      canvasEl.width = iw;
      canvasEl.height = ih;
      renderer.setMirrored(false); // Do not mirror uploaded photos

      const startT = performance.now();
      try {
        const detections = await engine.detectAndRecognize(testPhotoImg, {
          enableEmotions: true,
          enableAgeGender: false
        });

        const latency = Math.round(performance.now() - startT);
        latencyVal.textContent = latency + ' ms';
        facesVal.textContent = detections.length;

        renderer.draw(detections, iw, ih);
        handleRecognitionEvents(detections);

        if (detections.length === 0) {
          logEvent("Suratda yuz aniqlanmadi", 'unknown');
        }
      } catch (e) {
        console.error("Static image recognition error:", e);
      }
    };
  }

  function handleRecognitionEvents(detections) {
    if (detections.length === 0) return;

    const now = performance.now();

    for (const d of detections) {
      const match = d.match;

      if (match.isKnown) {
        const lastSeen = recognitionCooldowns.get(match.id) || 0;
        if (now - lastSeen > 4000) {
          recognitionCooldowns.set(match.id, now);
          triggerAccessGranted(match);
        }
      } else {
        const lastAlert = recognitionCooldowns.get('unknown_alert') || 0;
        if (now - lastAlert > 5000) {
          recognitionCooldowns.set('unknown_alert', now);
          triggerAccessDenied(match);
        }
      }
    }
  }

  function triggerAccessGranted(person) {
    sound.playRecognized();

    accessBanner.className = 'access-banner granted';
    accessIcon.textContent = '🟢';
    accessName.textContent = person.name.toUpperCase();
    accessName.style.color = 'var(--accent-green)';
    accessStatus.textContent = 'Xush kelibsiz! ' + person.role + ' • ' + person.confidence + '% aniqlikda tasdiqlandi';

    turnstilePill.className = 'turnstile-pill open';
    turnstilePill.textContent = 'OCHILDI [3s]';

    clearTimeout(turnstileTimer);
    turnstileTimer = setTimeout(() => {
      turnstilePill.className = 'turnstile-pill closed';
      turnstilePill.textContent = 'QULFLANGAN';
    }, 3200);

    logEvent('Xush kelibsiz, ' + person.name + '! Turniket ochildi (' + person.confidence + '% aniqlik)', 'known');
  }

  function triggerAccessDenied(match) {
    sound.playAlert();

    accessBanner.className = 'access-banner denied';
    accessIcon.textContent = '🔴';
    accessName.textContent = 'NOTANISH / BEGONA';
    accessName.style.color = 'var(--accent-red)';
    accessStatus.textContent = "Diqqat! Shaxs bazada topilmadi. Kirish taqiqlangan.";

    logEvent("Notanish shaxs aniqlandi! Xavfsizlik signali berildi.", 'unknown');
  }

  function logEvent(text, type = 'info') {
    const timeStr = new Date().toLocaleTimeString('uz-UZ', { hour12: false });
    const entry = document.createElement('div');
    entry.className = 'log-entry ' + type;
    
    const textSpan = document.createElement('span');
    textSpan.textContent = text;

    const timeSpan = document.createElement('span');
    timeSpan.className = 'log-time';
    timeSpan.textContent = timeStr;

    entry.appendChild(textSpan);
    entry.appendChild(timeSpan);
    logContainer.prepend(entry);
    
    while (logContainer.children.length > 25) {
      logContainer.removeChild(logContainer.lastChild);
    }
  }

  function renderPeopleList() {
    peopleList.innerHTML = '';
    const db = engine.database;
    peopleCount.textContent = db.length + ' ta';

    if (db.length === 0) {
      peopleList.innerHTML = '<div style="color:var(--text-muted);font-size:12px;padding:8px 0;">Bazada hech kim yo\'q</div>';
      return;
    }

    db.forEach(person => {
      const item = document.createElement('div');
      item.className = 'person-item';

      const sampleCount = (person.descriptors && person.descriptors.length) || 1;
      const avatarHtml = person.avatar 
        ? ('<img src="' + person.avatar + '" alt="' + person.name + '">')
        : person.name.charAt(0);

      item.innerHTML = 
        '<div class="person-info">' +
          '<div class="person-avatar">' + avatarHtml + '</div>' +
          '<div class="person-details">' +
            '<div class="name">' + person.name + ' <span class="person-badge">' + sampleCount + ' namuna</span></div>' +
            '<div class="role">' + (person.role || 'Xodim') + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="controls-group">' +
          '<button class="btn btn-danger btn-sm btn-delete-person" data-id="' + person.id + '" title="O\'chirish">✕</button>' +
        '</div>';

      item.querySelector('.btn-delete-person').addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(person.name + " ni bazadan o'chirishni tasdiqlaysizmi?")) {
          engine.deletePerson(person.id);
          renderPeopleList();
          logEvent(person.name + " bazadan o'chirildi", 'unknown');
        }
      });

      peopleList.appendChild(item);
    });
  }

  function captureCurrentFrame() {
    sound.playShutter();
    const sourceEl = isPhotoMode ? testPhotoImg : videoEl;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = sourceEl.videoWidth || sourceEl.naturalWidth || 640;
    tempCanvas.height = sourceEl.videoHeight || sourceEl.naturalHeight || 480;
    const ctx = tempCanvas.getContext('2d');
    
    ctx.drawImage(sourceEl, 0, 0, tempCanvas.width, tempCanvas.height);
    const dataUrl = tempCanvas.toDataURL('image/jpeg', 0.9);
    
    pendingSnapshotData = {
      canvas: tempCanvas,
      dataUrl: dataUrl
    };

    snapshotPreview.innerHTML = '<img src="' + dataUrl + '" style="max-height:100%;object-fit:contain;">';
    openEnrollModal();
  }

  function openEnrollModal() {
    enrollModal.classList.add('active');
    enrollNameInput.focus();
  }

  function closeEnrollModal() {
    enrollModal.classList.remove('active');
    pendingSnapshotData = null;
    snapshotPreview.innerHTML = '<span style="color:var(--text-muted);font-size:12px;">Surat yo\'q. Pastdagi tugmalardan foydalaning.</span>';
    enrollNameInput.value = '';
    enrollRoleInput.value = '';
  }

  function bindEvents() {
    cameraSelect.addEventListener('change', (e) => {
      if (e.target.value) {
        startCamera(e.target.value);
      }
    });

    detectorSelect.addEventListener('change', (e) => {
      engine.setDetectorType(e.target.value);
    });

    thresholdSlider.addEventListener('input', (e) => {
      const val = e.target.value;
      thresholdVal.textContent = val;
      engine.setThreshold(val);
    });

    btnToggleMirror.addEventListener('click', () => {
      const isMirrored = !renderer.isMirrored;
      renderer.setMirrored(isMirrored);
      videoEl.style.transform = isMirrored ? 'scaleX(-1)' : 'none';
      btnToggleMirror.classList.toggle('active', isMirrored);
    });

    btnToggleLandmarks.addEventListener('click', () => {
      renderer.setLandmarks(!renderer.showLandmarks);
      btnToggleLandmarks.classList.toggle('active', renderer.showLandmarks);
    });

    btnToggleEmotions.addEventListener('click', () => {
      renderer.setEmotions(!renderer.showEmotions);
      btnToggleEmotions.classList.toggle('active', renderer.showEmotions);
    });

    btnToggleSound.addEventListener('click', () => {
      const state = sound.toggle();
      btnToggleSound.classList.toggle('active', state);
      btnToggleSound.textContent = state ? '🔊 Ovoz: Yoqiq' : '🔇 Ovoz: O\'chiq';
    });

    btnClearLogs.addEventListener('click', () => {
      logContainer.innerHTML = '';
    });

    btnResetDb.addEventListener('click', () => {
      if (confirm("Bazani dastlabki holatga (Behruz, Asadbek, Anvar) qaytarishni xohlaysizmi?")) {
        localStorage.removeItem(engine.dbStorageKey);
        engine.loadDatabase();
        renderPeopleList();
        logEvent("Ma'lumotlar bazasi standart holatga keltirildi", 'known');
      }
    });

    // Test Photo upload
    testPhotoInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        testStaticImage(ev.target.result);
      };
      reader.readAsDataURL(file);
    });

    btnCaptureNow.addEventListener('click', () => {
      if (isCameraActive || isPhotoMode) {
        captureCurrentFrame();
      } else {
        openEnrollModal();
      }
    });

    btnOpenEnroll.addEventListener('click', () => {
      if (isCameraActive || isPhotoMode) {
        captureCurrentFrame();
      } else {
        openEnrollModal();
      }
    });

    btnCloseModal.addEventListener('click', closeEnrollModal);
    btnModalCancel.addEventListener('click', closeEnrollModal);

    btnSnapCamera.addEventListener('click', () => {
      if (isCameraActive || isPhotoMode) {
        captureCurrentFrame();
      } else {
        alert("Kamera ulanmagan. Iltimos, 'Rasm Fayli' orqali kompyuterdagi suratni yuklang!");
      }
    });

    enrollFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = img.naturalWidth;
          tempCanvas.height = img.naturalHeight;
          const ctx = tempCanvas.getContext('2d');
          ctx.drawImage(img, 0, 0);

          pendingSnapshotData = {
            canvas: tempCanvas,
            dataUrl: ev.target.result
          };
          snapshotPreview.innerHTML = '<img src="' + ev.target.result + '" style="max-height:100%;object-fit:contain;">';
          openEnrollModal();
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });

    btnModalSave.addEventListener('click', async () => {
      const name = enrollNameInput.value.trim();
      const role = enrollRoleInput.value.trim() || 'Foydalanuvchi';

      if (!name) {
        alert('Iltimos, shaxs ismini kiriting!');
        enrollNameInput.focus();
        return;
      }

      if (!pendingSnapshotData) {
        alert('Iltimos, kameradan suratga oling yoki rasm fayli yuklang!');
        return;
      }

      btnModalSave.disabled = true;
      btnModalSave.textContent = "AI tahlil qilmoqda...";

      try {
        const newPerson = await engine.enrollFace(
          pendingSnapshotData.canvas,
          name,
          role,
          pendingSnapshotData.dataUrl
        );

        sound.playRecognized();
        alert('Muvaffaqiyatli! ' + newPerson.name + ' Anti-Gravity AI bazasiga kiritildi.');
        renderPeopleList();
        closeEnrollModal();
        logEvent(newPerson.name + ' (' + newPerson.role + ') yangi shaxs sifatida ro\'yxatdan o\'tdi', 'known');
      } catch (err) {
        alert('Xatolik: ' + err.message);
      } finally {
        btnModalSave.disabled = false;
        btnModalSave.textContent = "Saqlash va Bazaga Kiritish";
      }
    });
  }

  window.addEventListener('DOMContentLoaded', init);
})();
