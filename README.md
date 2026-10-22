# 🎵 ทายเพลง PARTY (Multiplayer Realtime Music Quiz)

เว็บเกมทายชื่อเพลงแบบ Multiplayer Realtime เล่นได้ทั้งบนมือถือและคอมพิวเตอร์ ไม่ต้องสมัครสมาชิก ใส่ชื่อเล่นแล้วเข้าเล่นได้ทันที รองรับทั้งโหมด **Quick Match** จับคู่อัตโนมัติ และ **Private Room** สร้างห้องแชร์ลิงก์ให้เพื่อน

## ✨ ฟีเจอร์หลัก
- **ไม่ต้องสมัครสมาชิก**: ใส่ชื่อเล่นแล้วเล่นได้ทันที จดจำผู้เล่นด้วย `playerId` ใน `localStorage`
- **Quick Match & Private Room**:
  - **Quick Match**: จับคู่ตามหมวดเพลงที่เลือก เมื่อครบขั้นต่ำ 2 คนจะเริ่มนับถอยหลัง 15 วินาที (หรือครบ 8 คนเริ่มทันที)
  - **Private Room**: สร้างห้องรหัส 5 ตัวอักษร พร้อมปุ่มคัดลอกลิงก์ (`?room=ABCDE`) โอนสิทธิ์ Host อัตโนมัติเมื่อ Host ออก และ Reconnect กลับห้องเดิมได้ภายใน 60 วินาที
- **แหล่งเพลงจาก Deezer API**:
  - เรียกจากฝั่ง Server เท่านั้นพร้อมระบบ Cache (ป้องกัน CORS และ Rate Limit) และมีระบบ Fallback เพลงสำรองอัตโนมัติหาก API ล่ม
  - หมวดเพลง: เพลงไทยฮิต, เพลงสากลฮิต, K-Pop, ยุค 2000s/2010s, ผสมทุกหมวด
  - ใช้เฉพาะเสียง Preview 30 วินาที, ชื่อเพลง, ศิลปิน และภาพปก (ไม่แสดงหรือเก็บเนื้อเพลง)
- **Server-Authoritative Game Loop**:
  - ซิงค์เวลาระหว่าง Client-Server (Server Time Offset) เพื่อให้ทุกคนฟังและเห็นเวลานับถอยหลังตรงกัน
  - โหมดตอบ: **Multiple Choice (4 ตัวเลือก)** และ **พิมพ์ตอบ (Fuzzy Match รองรับไทย/อังกฤษ สะกดผิดเล็กน้อยได้)**
  - คำนวณคะแนนฝั่ง Server จากความเร็ว + โบนัสคนตอบถูกอันดับแรกๆ + โบนัส Streak

---

## 🚀 วิธีรันในเครื่อง (Local Development)

ต้องการ **Node.js 20+**

```bash
npm install && npm run dev
```

เปิดเบราว์เซอร์ไปที่ `http://localhost:3000` (สามารถเปิดหลายแท็บเพื่อทดสอบระบบ Multiplayer และ Quick Match ได้ทันที)

### คำสั่งอื่นๆ
- รันชุดทดสอบ (Tests):
  ```bash
  npm test
  ```
- Build สำหรับ Production:
  ```bash
  npm run build
  ```
- รันเซิร์ฟเวอร์ Production:
  ```bash
  npm start
  ```

---

## 🔧 ตัวแปรสภาพแวดล้อม (Environment Variables)

ไม่จำเป็นต้องใช้ API Key ใดๆ ในการเริ่มต้น สามารถกำหนดค่าเพิ่มเติมผ่าน Environment Variables ได้ดังนี้:

| ตัวแปร | ค่าเริ่มต้น | คำอธิบาย |
|---|---|---|
| `PORT` | `3000` | พอร์ตที่ Express + Socket.IO เปิดให้บริการ |
| `NODE_ENV` | `development` | ตั้งเป็น `production` เมื่อรันจริงหลัง `npm run build` |
| `CORS_ORIGIN` | `*` | โดเมนที่อนุญาตให้เชื่อมต่อ Socket.IO |

---

## ☁️ วิธี Deploy (รองรับ WebSocket)

โปรเจกต์นี้ออกแบบให้ทำงานเป็น Node.js HTTP + WebSocket Server ตัวเดียว (เสิร์ฟทั้ง API, Socket.IO และ Static Frontend) จึงนำไป Deploy บน PaaS ที่รองรับ WebSocket ได้ทันที

### 1. Render (Web Service)
1. สร้าง **New Web Service** เชื่อมต่อกับ Git Repository นี้
2. ตั้งค่า:
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment Variables**: `NODE_ENV=production`

### 2. Railway
1. สร้างโปรเจกต์ใหม่จาก GitHub Repo
2. Railway (Nixpacks) จะตรวจพบ `build` และ `start` script ใน `package.json` อัตโนมัติ
3. ตั้งค่า `NODE_ENV=production` ในแท็บ Variables แล้วเปิด Public Networking

### 3. Fly.io
1. รัน `fly launch` ในโฟลเดอร์โปรเจกต์
2. ตั้งค่า internal port เป็น `3000` และ `NODE_ENV=production`
3. รัน `fly deploy`
