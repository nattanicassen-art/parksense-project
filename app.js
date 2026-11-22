// =====================================================
// ParkSense - app.js
// JavaScript: เก็บสถานะช่องจอด วาดผัง และอัปเดตหน้าจอ
// เวอร์ชันนี้: ชั้น 1 ชั้นเดียว 3 ช่อง ไม่มีรถจำลอง
// สถานะมาจากบอร์ดจริง (ผ่าน ThingsBoard) หรือเรียก updateSlots() เอง
// =====================================================

/* ---------- 1) ค่าตั้งต้น ---------- */
const N = 3;                                  // จำนวนช่องจอดทั้งหมด (ชั้น 1)
const $ = id => document.getElementById(id);  // ตัวช่วยหา element จาก id

// ตั้งค่าการเชื่อมต่อ ThingsBoard
// เว้น host เป็นค่าว่างไว้ = ยังไม่เชื่อมต่อ (หน้าเว็บจะแสดง "รอข้อมูล")
const CONFIG = {
    host: '',                                 // เช่น 'https://thingsboard.cloud'
    publicId: '',                             // Public Customer ID ที่อาจารย์ให้
    deviceId: '',                             // Device ID ของบอร์ด
    keys: ['s1', 's2', 's3'],                 // ชื่อ key ของแต่ละช่อง (ค่า 1 = มีรถ, 0 = ว่าง)
    distKeys: [],                             // (ไม่บังคับ) key ระยะที่วัดได้ หน่วย มม. เช่น ['d1','d2','d3']
    pollMs: 3000,                             // ขอข้อมูลใหม่ทุกกี่มิลลิวินาที
    staleMs: 30000                            // ข้อมูลเก่ากว่านี้ถือว่าบอร์ดหยุดส่ง
};

/* ---------- 2) ข้อมูลสถานะ ---------- */
// sp[i] = สถานะช่องที่ i :  null = รอข้อมูล,  0 = ว่าง,  1 = มีรถ
let sp = Array(N).fill(null);
let dist = Array(N).fill(null);               // ระยะจากเซนเซอร์ (มม.) ถ้ามี

/* ---------- 3) รูปรถมองจากด้านบน (หัวรถอยู่ด้านบน) ---------- */
const PAL = ['#e11d48', '#2563eb', '#f1f5f9', '#facc15', '#16a34a', '#7c3aed', '#f97316', '#475569'];
const CAR = '<svg viewBox="0 0 40 80"><rect x="0" y="12" width="5" height="15" rx="2" fill="#111"/><rect x="35" y="12" width="5" height="15" rx="2" fill="#111"/><rect x="0" y="53" width="5" height="15" rx="2" fill="#111"/><rect x="35" y="53" width="5" height="15" rx="2" fill="#111"/><rect x="3" y="2" width="34" height="76" rx="13" style="fill:var(--cc)"/><rect x="7" y="15" width="26" height="15" rx="5" fill="#bfe3ff"/><rect x="9" y="33" width="22" height="20" rx="5" fill="#0003"/><rect x="8" y="56" width="24" height="10" rx="4" fill="#bfe3ff" opacity=".85"/><rect x="6" y="3" width="9" height="4" rx="2" fill="#fde68a"/><rect x="25" y="3" width="9" height="4" rx="2" fill="#fde68a"/><rect x="6" y="73" width="9" height="3" rx="1.5" fill="#ef4444"/><rect x="25" y="73" width="9" height="3" rx="1.5" fill="#ef4444"/></svg>';
const CARG = CAR.replace(/^<svg[^>]*>|<\/svg>$/g, '');   // เอาเฉพาะรูปข้างใน ไปวางในผัง

/* ---------- 4) วาดผังช่องจอดเฉียง 72° ---------- */
// ch = ลำดับช่องที่เพิ่งเปลี่ยนสถานะ (ให้กะพริบ) ถ้าไม่มีใส่ -1
function plan(ch) {
    const A = 190;                    // ตำแหน่งขอบทางวิ่ง
    const Y0 = 100;                   // ความสูงเริ่มต้นของช่องแรก
    const W = 46;                     // ความกว้างของแต่ละช่อง
    const c = Math.cos(Math.PI / 10); // มุม 18° (ช่องเอียง 72° จากทางวิ่ง)
    const n = Math.sin(Math.PI / 10);
    const Lx = 150 * c, Ly = 150 * n; // ความยาวช่องจอด
    const Y = k => Y0 + k * W;        // ตำแหน่งแนวตั้งของเส้นที่ k
    const H = Y(N) + 55 - 40;         // ความสูงของภาพ

    // พื้นทางวิ่ง และเส้นขอบทางวิ่ง
    let s = `<svg class="plan" viewBox="40 40 285 ${H}">`
          + `<rect x="${A}" y="${Y0 - 10}" width="125" height="${Y(N) + 50 - Y0}" fill="var(--road)" opacity=".55"/>`
          + `<path class="ln" d="M${A},${Y0 - 10}V${Y(N) + 40}M${A + 125},${Y0 - 10}V${Y(N) + 40}"/>`;

    // เส้นแบ่งช่องจอด
    for (let k = 0; k <= N; k++) {
        s += `<path class="ln" d="M${A},${Y(k)}L${A - Lx},${Y(k) - Ly}"/>`;
    }

    // วาดแต่ละช่อง
    for (let k = 0; k < N; k++) {
        const v = sp[k];                                 // null / 0 / 1
        const yk = Y(k), y1 = Y(k + 1), ym = (yk + y1) / 2;
        const cx = A - 85 * c, cy = ym - 85 * n;         // จุดกลางช่อง (ไว้วางรถหรือข้อความ)
        const cls = v === null ? 'bu' : (v ? 'bo' : 'bf');
        const flash = k === ch ? ' fl2' : '';

        // พื้นที่ช่อง (สี่เหลี่ยมด้านขนาน)
        s += `<polygon class="${cls}${flash}" points="${A},${yk} ${A - Lx},${yk - Ly} ${A - Lx},${y1 - Ly} ${A},${y1}"/>`;
        // เลขช่อง
        s += `<text class="mu" x="${A - 132 * c}" y="${ym - 132 * n + 5}" text-anchor="middle" style="font-size:15px">${String(k + 1).padStart(2, '0')}</text>`;

        if (v === null) {
            s += `<text class="wait" x="${cx}" y="${cy + 6}" text-anchor="middle" style="font-size:18px">รอข้อมูล</text>`;
        } else if (v === 0) {
            s += `<text class="ok" x="${cx}" y="${cy + 7}" text-anchor="middle" style="font-size:22px">ว่าง</text>`;
        } else {
            // มีรถ: วางรูปรถหมุน 72° ให้หัวรถหันเข้าผนัง
            const col = PAL[(k * 3) % PAL.length];
            s += `<g style="--cc:${col}" transform="translate(${cx} ${cy}) rotate(-72) scale(.8) translate(-20 -40)">${CARG}</g>`;
        }
    }

    // ลูกศรบอกทิศทางทางวิ่ง
    for (const y of [Y(2), Y(0) + 10]) {
        s += `<path class="ln" d="M${A + 50},${y + 14}L${A + 62},${y}L${A + 74},${y + 14}"/>`;
    }
    return s + '</svg>';
}

/* ---------- 5) อัปเดตหน้าจอตามข้อมูลใน sp ---------- */
// หลักการ: เปลี่ยนข้อมูลใน sp ก่อน แล้วเรียก paint() เพื่อวาดหน้าจอใหม่
function paint(ch) {
    const known = sp.filter(v => v !== null).length;     // ช่องที่รู้สถานะแล้ว
    const fr = sp.filter(v => v === 0).length;           // จำนวนช่องว่าง
    const oc = sp.filter(v => v === 1).length;           // จำนวนช่องที่มีรถ

    // ตัวเลขสรุป (ถ้ายังไม่มีข้อมูลเลยแสดงขีด)
    $('nfree').textContent = known ? fr : '–';
    $('nocc').textContent = known ? oc : '–';
    $('a').textContent = known ? fr : '–';
    $('b').textContent = known ? oc : '–';

    // ไฟสัญญาณ: เทา = รอข้อมูล, เขียว = มีที่ว่าง, แดง = เต็ม
    $('lp').className = 'lamp ' + (known === 0 ? 'n' : (fr ? 'g' : 'r'));
    $('fc').classList.toggle('full', known > 0 && fr === 0);

    // ผังช่องจอด
    $('pv').innerHTML = plan(ch);

    // รายการสถานะรายช่อง (พร้อมระยะ ถ้ามี)
    $('slots').innerHTML = sp.map((v, i) => {
        const cls = v === null ? '' : (v ? 'o' : 'f');
        const txt = v === null ? 'รอข้อมูล' : (v ? 'มีรถ' : 'ว่าง');
        const d = dist[i] === null ? '' : dist[i] + ' มม.';
        return `<div class="sl ${cls}"><b>ช่อง ${i + 1}</b><span>${txt}</span><small>${d}</small></div>`;
    }).join('');
}

/* ---------- 6) ฟังก์ชันรับข้อมูลจากบอร์ด ---------- */
// states = [สถานะช่อง 1..3] ค่า 1 = มีรถ, 0 = ว่าง (ใส่ null = ไม่ทราบ)
// dists  = (ไม่บังคับ) [ระยะช่อง 1..3 หน่วย มม.]
// ทดสอบได้ทันที: กด F12 > Console แล้วพิมพ์  updateSlots([1,0,1])
function updateSlots(states, dists) {
    let ch = -1;                                          // ช่องที่เพิ่งเปลี่ยน
    states.slice(0, N).forEach((raw, i) => {
        const v = (raw === null || raw === undefined || raw === '') ? null : Number(raw);
        const nv = (v === 0 || v === 1) ? v : null;
        if (sp[i] !== null && sp[i] !== nv) ch = i;
        sp[i] = nv;
    });
    if (dists) {
        dists.slice(0, N).forEach((d, i) => { dist[i] = Number.isFinite(d) ? d : null; });
    }
    paint(ch);
    setLive(true, 'LIVE', new Date().toLocaleTimeString('th-TH'));
}

// แสดงสถานะการเชื่อมต่อที่ป้ายมุมขวาบน
function setLive(on, label, time) {
    $('live').classList.toggle('off', !on);
    $('lt').textContent = label;
    if (time) $('upd').textContent = 'ข้อมูลล่าสุดจากบอร์ด เวลา ' + time;
}

/* ---------- 7) ดึงข้อมูลจาก ThingsBoard (REST API) ---------- */
// หมายเหตุ: ส่วนนี้เขียนตามรูปแบบ API ทั่วไปของ ThingsBoard ยังไม่ได้ทดสอบกับเซิร์ฟเวอร์จริง
// ต้องใส่ค่า CONFIG ด้านบนให้ครบ และตั้ง Device/Dashboard เป็น Public ก่อน
// ห้ามใส่ Access Token ของบอร์ดในไฟล์นี้ (เว็บเป็นสาธารณะ ใครก็เปิดดูโค้ดได้)
let token = null;

async function tbLogin() {
    const r = await fetch(CONFIG.host + '/api/auth/login/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicId: CONFIG.publicId })
    });
    if (!r.ok) throw new Error('ล็อกอินสาธารณะไม่สำเร็จ HTTP ' + r.status);
    return (await r.json()).token;
}

async function pollThingsBoard() {
    if (!CONFIG.host) return;                             // ยังไม่ตั้งค่า = ไม่เชื่อมต่อ
    try {
        if (!token) token = await tbLogin();
        const keys = CONFIG.keys.concat(CONFIG.distKeys).join(',');
        const url = `${CONFIG.host}/api/plugins/telemetry/DEVICE/${CONFIG.deviceId}/values/timeseries?keys=${keys}`;
        const r = await fetch(url, { headers: { 'X-Authorization': 'Bearer ' + token } });
        if (r.status === 401) { token = null; throw new Error('token หมดอายุ'); }
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const d = await r.json();                         // เช่น { s1: [{ts: 1730000000000, value: "1"}] }

        const val = k => (d[k] && d[k][0]) ? d[k][0].value : null;
        const ts = Math.max(0, ...CONFIG.keys.map(k => (d[k] && d[k][0]) ? d[k][0].ts : 0));
        updateSlots(
            CONFIG.keys.map(val),
            CONFIG.distKeys.map(k => val(k) === null ? null : Number(val(k)))
        );
        const fresh = Date.now() - ts < CONFIG.staleMs;   // ข้อมูลยังใหม่อยู่ไหม
        setLive(fresh, fresh ? 'LIVE' : 'บอร์ดไม่ส่งข้อมูล', ts ? new Date(ts).toLocaleTimeString('th-TH') : '');
    } catch (e) {
        console.warn('ดึงข้อมูลจาก ThingsBoard ไม่สำเร็จ:', e);
        setLive(false, 'เชื่อมต่อไม่ได้');
    }
}

/* ---------- 8) เริ่มทำงาน ---------- */
paint(-1);                                                // วาดครั้งแรก (ทุกช่อง "รอข้อมูล")
const tm = () => new Date().toLocaleTimeString('th-TH');
$('clk').textContent = tm();
setInterval(() => { $('clk').textContent = tm(); }, 1000);   // นาฬิกา
pollThingsBoard();
setInterval(pollThingsBoard, CONFIG.pollMs);              // ขอข้อมูลใหม่เป็นรอบ
