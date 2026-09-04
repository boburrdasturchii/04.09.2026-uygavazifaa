# Anti-Gravity AI Vision Engine 👁️⚡

Brauzer orqali real vaqt rejimida (Live Stream) ishlaydigan yuqori aniqlikdagi **AI Vision Engine** biometrik yuzni tanish va Canvas Overlay tizimi.

---

## 🌟 Asosiy Imkoniyatlar

1. **Real-Vaqt Yuzni Aniqlash (Face Detection):**
   - Veb-kamera (yoki tashqi USB kamera) oqimini WebGL / WASM apparat tezlatgichi yordamida soniyasiga 30+ kadr tezlikda qayta ishlaydi.
   - 2 xil neyron tarmoq modeli: **TinyFaceDetector** (ultra-tezkor) va **SSD MobileNet V1** (chuqur aniqlik).

2. **Biometrik Taqqoslash (Face Recognition):**
   - Har bir yuzdan 128 o'lchamli biometrik vektor (descriptor embedding) olinadi.
   - Bazadagi mavjud shaxslar (**Behruz**, **Asadbek**, **Anvar** va yangi qo'shilganlar) bilan Evklid masofasi orqali darhol taqqoslanadi.
   - Moslik darajasi foizda (masalan, `98% ANIQLIK`) ko'rsatiladi.

3. **Yuqori Aniqlikdagi Canvas Overlay (HUD Display):**
   - Video oqimining ustiga kiberpank uslubidagi dinamik ramka (`╔ ╗ ╚ ╝`) va skanerlash nurlari chiziladi.
   - **Tanilgan shaxs:** Yashil / Nefrit rangli yorqin nishon, shaxsning **ISMI** (katta va ravshan), lavozimi va `● ANTI-GRAVITY VERIFIED` belgisi.
   - **Notanish shaxs:** Qizil ogohlantiruvchi nishon: `NOTANISH / BEGONA` va `▲ OGOHLANTIRISH / ALERT`.
   - Oyna (Mirror) rejimi yoqilganda ham yozuvlar va ismlar teskari o'girilmasdan to'g'ri va ravshan o'qiladi.

4. **Tezkor Ro'yxatdan O'tkazish (Enrollment):**
   - Kameraga qarab **"📸 Hozir Suratga Olish"** tugmasini bosing yoki rasm fayli yuklang.
   - Ism va lavozimni kiriting — AI darhol yuz vektorini hisoblab, brauzer xotirasiga (LocalStorage) doimiy saqlaydi.

5. **Audio va Turniket Simulyatori:**
   - Shaxs tasdiqlanganda Web Audio API orqali yoqimli futuristik akkord chalinadi va turniket `OCHILDI [3s]` holatiga o'tadi.
   - Begona shaxsda xavfsizlik signali chalinadi.

---

## 📁 Loyiha Tuzilishi

```
anti_gravity_live_vision/
├── index.html                 # Asosiy foydalanuvchi interfeysi (UI)
├── server.py                  # Mahalliy HTTP server (CORS & WebGL MIME)
├── run.bat                    # Bitta bosishda ishga tushiruvchi fayl
├── README.md                  # Loyiha qo'llanmasi
│
├── css/
│   └── style.css              # Anti-Gravity neon/kiberpank dizayn
│
├── js/
│   ├── app.js                 # Dastur koordinatori va hodisalar
│   ├── vision_engine.js       # Face-API neyron tarmoq yadrosi va vektor bazasi
│   ├── canvas_renderer.js     # Video ustiga HUD va ismlarni chizuvchi Canvas drayveri
│   └── sound_fx.js            # Web Audio API sintetik tovush effektlari
│
├── vendor/
│   └── face-api.min.js        # Face-API JavaScript kutubxonasi
│
└── models/                    # Neyron tarmoq vaznlari (100% oflayn ishlaydi)
    ├── tiny_face_detector_model.bin
    ├── face_landmark_68_tiny_model.bin
    ├── face_recognition_model.bin
    ├── face_expression_model.bin
    ├── age_gender_model.bin
    └── ssd_mobilenetv1_model.bin
```

---

## 🚀 Ishga Tushirish

### 1-usul: `run.bat` orqali (Eng oson)

Fayllar ro'yxatidagi **`run.bat`** faylini sichqoncha bilan ikki marta bosing.
Server avtomatik ishga tushadi va standart brauzeringizda `http://localhost:8000` manzilini ochadi.

### 2-usul: Buyruqlar satri (Terminal) orqali

```powershell
cd C:\Users\User\anti_gravity_live_vision
python server.py
```

Brauzerda kameraga ruxsat bering (**Allow camera**).

---

## 🎮 Interfeys Boshqaruvi

| Tugma / Element            | Vazifasi                                                           |
| :------------------------- | :----------------------------------------------------------------- |
| **📸 Hozir Suratga Olish** | Jonli videodan lahzalik kadr olib yangi yuzni ro'yxatdan o'tkazish |
| **🪞 Oyna**                | Video oqimini ko'zgu kabi teskari yoki to'g'ri ko'rsatish          |
| **🕸️ Nuqtalar**            | Yuzdagi 68 ta biometrik nuqtalar to'rini yoqish/o'chirish          |
| **😊 Hissiyot**            | Shaxsning hissiyotini (Quvnoq, Xotirjam va h.k.) aniqlash          |
| **🔊 Ovoz**                | Tizim tovush effektlarini yoqish yoki o'chirish                    |
| **Taqqoslash Chegarasi**   | Yuzni tanish qat'iyligini (0.35 - 0.75) sozlash                    |
| **Detektor Modeli**        | TinyFace (Yuqori FPS) yoki SSD MobileNet (Maksimal aniqlik)        |
