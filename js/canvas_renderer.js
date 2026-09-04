// Anti-Gravity AI Vision Engine - High-Performance Futuristic HUD Canvas Renderer
class HUDCanvasRenderer {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.isMirrored = true;
    this.showLandmarks = false;
    this.showEmotions = true;
    this.hudStyle = 'cyberpunk';
    this.trackedBoxes = new Map();
    this.scanlineY = 0;
  }

  setMirrored(state) {
    this.isMirrored = !!state;
  }

  setLandmarks(state) {
    this.showLandmarks = !!state;
  }

  setEmotions(state) {
    this.showEmotions = !!state;
  }

  setHudStyle(style) {
    this.hudStyle = style;
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  draw(detections, videoWidth, videoHeight) {
    if (!this.canvas || !this.ctx) return;

    if (this.canvas.width !== videoWidth || this.canvas.height !== videoHeight) {
      this.canvas.width = videoWidth;
      this.canvas.height = videoHeight;
    }

    this.clear();

    const now = performance.now();
    this.scanlineY = (this.scanlineY + 3) % (this.canvas.height || 480);

    for (const d of detections) {
      const rawBox = d.box;
      
      let x = this.isMirrored ? (this.canvas.width - (rawBox.x + rawBox.width)) : rawBox.x;
      let y = rawBox.y;
      let w = rawBox.width;
      let h = rawBox.height;

      const key = d.match.id || (Math.round(x / 40) + '_' + Math.round(y / 40));
      let smooth = this.trackedBoxes.get(key);
      if (!smooth) {
        smooth = { x, y, w, h, lastSeen: now };
      } else {
        const factor = 0.45;
        smooth.x = smooth.x + (x - smooth.x) * factor;
        smooth.y = smooth.y + (y - smooth.y) * factor;
        smooth.w = smooth.w + (w - smooth.w) * factor;
        smooth.h = smooth.h + (h - smooth.h) * factor;
        smooth.lastSeen = now;
      }
      this.trackedBoxes.set(key, smooth);

      const isKnown = d.match.isKnown;
      const primaryColor = isKnown ? '#00ff88' : '#ff3366';
      const secondaryColor = isKnown ? '#00f0ff' : '#ff9900';
      const glowColor = isKnown ? 'rgba(0, 255, 136, 0.5)' : 'rgba(255, 51, 102, 0.5)';

      if (this.showLandmarks && d.landmarks) {
        this._drawLandmarks(d.landmarks, secondaryColor);
      }

      this._drawTargetCorners(smooth.x, smooth.y, smooth.w, smooth.h, primaryColor, glowColor);
      this._drawFaceScanline(smooth.x, smooth.y, smooth.w, smooth.h, primaryColor);
      this._drawNamePlate(smooth.x, smooth.y, smooth.w, smooth.h, d.match, primaryColor, secondaryColor);

      if (this.showEmotions && (d.emotion || d.age)) {
        this._drawInfoBadge(smooth.x, smooth.y, smooth.w, smooth.h, d.emotion, d.age, d.gender);
      }
    }

    for (const [k, v] of this.trackedBoxes.entries()) {
      if (now - v.lastSeen > 800) {
        this.trackedBoxes.delete(k);
      }
    }
  }

  _drawTargetCorners(x, y, w, h, color, glow) {
    const ctx = this.ctx;
    const cornerLen = Math.min(28, w * 0.22);
    const lineW = 3;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineW;
    ctx.shadowColor = glow;
    ctx.shadowBlur = 12;
    ctx.lineCap = 'square';

    // Top-Left
    ctx.beginPath();
    ctx.moveTo(x, y + cornerLen);
    ctx.lineTo(x, y);
    ctx.lineTo(x + cornerLen, y);
    ctx.stroke();

    // Top-Right
    ctx.beginPath();
    ctx.moveTo(x + w - cornerLen, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + cornerLen);
    ctx.stroke();

    // Bottom-Left
    ctx.beginPath();
    ctx.moveTo(x, y + h - cornerLen);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x + cornerLen, y + h);
    ctx.stroke();

    // Bottom-Right
    ctx.beginPath();
    ctx.moveTo(x + w - cornerLen, y + h);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + w, y + cornerLen);
    ctx.stroke();

    ctx.restore();
  }

  _drawFaceScanline(x, y, w, h, color) {
    const ctx = this.ctx;
    const scanY = y + (this.scanlineY % Math.max(20, h));

    ctx.save();
    const grad = ctx.createLinearGradient(x, scanY, x + w, scanY);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.5, color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, scanY);
    ctx.lineTo(x + w, scanY);
    ctx.stroke();
    ctx.restore();
  }

  _drawNamePlate(x, y, w, h, match, primaryColor, secondaryColor) {
    const ctx = this.ctx;
    ctx.save();

    const isKnown = match.isKnown;
    const displayName = match.name.toUpperCase();
    const roleText = match.role || (isKnown ? 'XODIM' : 'NOTANISH SHAXS');
    const confText = isKnown ? (match.confidence + '% ANIQLIK') : "RO'YXATDA YO'Q";

    const plateHeight = 54;
    const plateWidth = Math.max(w, 210);
    const plateX = x + (w - plateWidth) / 2;
    let plateY = y - plateHeight - 12;
    if (plateY < 10) {
      plateY = y + h + 12;
    }

    ctx.fillStyle = 'rgba(7, 12, 22, 0.92)';
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = primaryColor;
    ctx.shadowBlur = 10;

    const radius = 8;
    ctx.beginPath();
    ctx.roundRect(plateX, plateY, plateWidth, plateHeight, radius);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isKnown ? 'rgba(0, 255, 136, 0.20)' : 'rgba(255, 51, 102, 0.20)';
    ctx.beginPath();
    ctx.roundRect(plateX, plateY, plateWidth, 18, [radius, radius, 0, 0]);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = primaryColor;
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(isKnown ? '● ANTI-GRAVITY VERIFIED' : '▲ OGOHLANTIRISH / ALERT', plateX + 10, plateY + 12);

    ctx.textAlign = 'right';
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = secondaryColor;
    ctx.fillText(confText, plateX + plateWidth - 10, plateY + 12);

    ctx.textAlign = 'left';
    ctx.font = "bold 17px 'Segoe UI', sans-serif";
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 4;
    ctx.fillText(displayName, plateX + 10, plateY + 36);

    ctx.font = '500 11px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.shadowBlur = 0;
    ctx.fillText(roleText, plateX + 10, plateY + 48);

    ctx.restore();
  }

  _drawInfoBadge(x, y, w, h, emotion, age, gender) {
    const ctx = this.ctx;
    ctx.save();

    const texts = [];
    if (emotion) {
      const emoMap = {
        happy: '😊 Quvnoq',
        neutral: '😐 Xotirjam',
        surprised: '😲 Hayratda',
        sad: '😔 Xafa',
        angry: '😠 Jahldor',
        fearful: '😨 Xavotirda',
        disgusted: '😒 Norozi'
      };
      texts.push(emoMap[emotion.emotion] || emotion.emotion);
    }
    if (age) {
      const g = gender === 'female' ? 'Ayol' : 'Erkak';
      texts.push('~' + age + ' yosh (' + g + ')');
    }

    if (texts.length === 0) return;

    const label = texts.join(' • ');
    ctx.font = 'bold 11px monospace';
    const textW = ctx.measureText(label).width;
    const badgeW = textW + 18;
    const badgeH = 22;
    const badgeX = x + (w - badgeW) / 2;
    const badgeY = y + h + 8;

    ctx.fillStyle = 'rgba(10, 16, 28, 0.85)';
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#00f0ff';
    ctx.textAlign = 'center';
    ctx.fillText(label, badgeX + badgeW / 2, badgeY + 15);

    ctx.restore();
  }

  _drawLandmarks(landmarks, color) {
    const ctx = this.ctx;
    const positions = landmarks.positions;
    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 5;

    for (const pt of positions) {
      const px = this.isMirrored ? (this.canvas.width - pt.x) : pt.x;
      const py = pt.y;
      ctx.beginPath();
      ctx.arc(px, py, 1.8, 0, 2 * Math.PI);
      ctx.fill();
    }
    ctx.restore();
  }
}

window.HUDCanvasRenderer = HUDCanvasRenderer;
