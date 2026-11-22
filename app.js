// =====================================================
// ParkSense - app.js (เชื่อมต่อ ThingsBoard จริง)
// =====================================================

/* ---------- 1) ค่าตั้งต้น ---------- */
const N = 3;                                  // จำนวนช่องจอดทั้งหมด (ชั้น 1)
const $ = id => document.getElementById(id);  // ตัวช่วยหา element จาก id

// *** แก้ไขเฉพาะ 2 บรรทัด (publicId และ deviceId) ด้านล่างนี้ ***
const CONFIG = {
    host: 'https://thingsboard.cloud',        // URL ของ ThingsBoard
    publicId: 'u9c86lIG9pXixsiBuiis',          // Public ID ที่ได้จากปุ่มรูปโล่
    deviceId: 'df5c12d0-e107-11f1-bf4d-5ba6e9bd2b60',          // Device ID ของ Parking Gateway
    keys: ['obj'],                            // คีย์ที่บอร์ดส่งมา (0 = มีรถ, 1 = ว่าง)
    distKeys: [],
    pollMs: 2000,                             // ดึงข้อมูลใหม่ทุก 2 วินาที
    staleMs: 30000                            // ข้อมูลเก่ากว่า 30 วินาที ถือว่าบอร์ดหยุดส่ง
};

/* ---------- 2) ข้อมูลสถานะ ---------- */
// sp[i] = สถานะช่องที่ i :  null = รอข้อมูล,  0 = ว่าง,  1 = มีรถ
let sp = Array(N).fill(null);
let dist = Array(N).fill(null);

/* ---------- 3) รูปรถมองจากด้านบน ---------- */
const PAL = ['#e11d48', '#2563eb', '#f1f5f9', '#facc15', '#16a34a', '#7c3aed', '#f97316', '#475569'];
const CAR = '<svg viewBox="0 0 40 80"><rect x="0" y="12" width="5" height="15" rx="2" fill="#111"/><rect x="35" y="12" width="5" height="15" rx="2" fill="#111"/><rect x="0" y="53" width="5" height="15" rx="2" fill="#111"/><rect x="35" y="53" width="5" height="15" rx="2" fill="#111"/><rect x="3" y="2" width="34" height="76" rx="13" style="fill:var(--cc)"/><rect x="7" y="15" width="26" height="15" rx="5" fill="#bfe3ff"/><rect x="9" y="33" width="22" height="20" rx="5" fill="#0003"/><rect x="8" y="56" width="24" height="10" rx="4" fill="#bfe3ff" opacity=".85"/><rect x="6" y="3" width="9" height="4" rx="2" fill="#fde68a"/><rect x="25" y="3" width="9" height="4" rx="2" fill="#fde68a"/><rect x="6" y="73" width="9" height="3" rx="1.5" fill="#ef4444"/><rect x="25" y="73" width="9" height="3" rx="1.5" fill="#ef4444"/></svg>';
const CARG = CAR.replace(/^<svg[^>]*>|<\/svg>$/g, '');

/* ---------- 4) วาดผังช่องจอดเฉียง 72° ---------- */
function plan(ch) {
    const A = 190;
    const Y0 = 100;
    const W = 46;
    const c = Math.cos(Math.PI / 10);
    const n = Math.sin(Math.PI / 10);
    const Lx = 150 * c, Ly = 150 * n;
    const Y = k => Y0 + k * W;
    const H = Y(N) + 55 - 40;

    let s = `<svg class="plan" viewBox="40 40 285 ${H}">`
          + `<rect x="${A}" y="${Y0 - 10}" width="125" height="${Y(N) + 50 - Y0}" fill="var(--road)" opacity=".55"/>`
          + `<path class="ln" d="M${A},${Y0 - 10}V${Y(N) + 40}M${A + 125},${Y0 - 10}V${Y(N) + 40}"/>`;

    for (let k = 0; k <= N; k++) {
        s += `<path class="ln" d="M${A},${Y(k)}L${A - Lx},${Y(k) - Ly}"/>`;
    }

    for (let k = 0; k < N; k++) {
        const v = sp[k];
        const yk = Y(k), y1 = Y(k + 1), ym = (yk + y1) / 2;
        const cx = A - 85 * c, cy = ym - 85 * n;
        const cls = v === null ? 'bu' : (v ? 'bo' : 'bf');
        const flash = k === ch ? ' fl2' : '';

        s += `<polygon class="${cls}${flash}" points="${A},${yk} ${A - Lx},${yk - Ly} ${A - Lx},${y1 - Ly} ${A},${y1}"/>`;
        s += `<text class="mu" x="${A - 132 * c}" y="${ym - 132 * n + 5}" text-anchor="middle" style="font-size:15px">${String(k + 1).padStart(2, '0')}</text>`;

        if (v === null) {
            s += `<text class="wait" x="${cx}" y="${cy + 6}" text-anchor="middle" style="font-size:18px">รอข้อมูล</text>`;
        } else if (v === 0) {
            s += `<text class="ok" x="${cx}" y="${cy + 7}" text-anchor="middle" style="font-size:22px">ว่าง</text>`;
        } else {
            const col = PAL[(k * 3) % PAL.length];
            s += `<g style="--cc:${col}" transform="translate(${cx} ${cy}) rotate(-72) scale(.8) translate(-20 -40)">${CARG}</g>`;
        }
    }

    for (const y of [Y(2), Y(0) + 10]) {
        s += `<path class="ln" d="M${A + 50},${y + 14}L${A + 62},${y}L${A + 74},${y + 14}"/>`;
    }
    return s + '</svg>';
}

/* ---------- 5) อัปเดตหน้าจอตามข้อมูลใน sp ---------- */
function paint(ch) {
    const known = sp.filter(v => v !== null).length;
    const fr = sp.filter(v => v === 0).length;
    const oc = sp.filter(v => v === 1).length;

    $('nfree').textContent = known ? fr : '–';
    $('nocc').textContent = known ? oc : '–';
    $('a').textContent = known ? fr : '–';
    $('b').textContent = known ? oc : '–';

    $('lp').className = 'lamp ' + (known === 0 ? 'n' : (fr ? 'g' : 'r'));
    $('fc').classList.toggle('full', known > 0 && fr === 0);

    $('pv').innerHTML = plan(ch);

    $('slots').innerHTML = sp.map((v, i) => {
        const cls = v === null ? '' : (v ? 'o' : 'f');
        const txt = v === null ? 'รอข้อมูล' : (v ? 'มีรถ' : 'ว่าง');
        const d = dist[i] === null ? '' : dist[i] + ' มม.';
        return `<div class="sl ${cls}"><b>ช่อง ${i + 1}</b><span>${txt}</span><small>${d}</small></div>`;
    }).join('');
}

/* ---------- 6) ฟังก์ชันรับข้อมูลจากบอร์ด ---------- */
function updateSlots(states, dists) {
    let ch = -1;
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
}

function setLive(on, label, time) {
    $('live').classList.toggle('off', !on);
    $('lt').textContent = label;
    if (time) $('upd').textContent = 'ข้อมูลล่าสุดจากบอร์ด เวลา ' + time;
}

/* ---------- 7) ดึงข้อมูลจาก ThingsBoard (REST API) ---------- */
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
    if (!CONFIG.host || !CONFIG.publicId || !CONFIG.deviceId) return;
    try {
        if (!token) token = await tbLogin();
        const keys = CONFIG.keys.join(',');
        const url = `${CONFIG.host}/api/plugins/telemetry/DEVICE/${CONFIG.deviceId}/values/timeseries?keys=${keys}`;
        const r = await fetch(url, { headers: { 'X-Authorization': 'Bearer ' + token } });
        if (r.status === 401) { token = null; throw new Error('token หมดอายุ'); }
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const d = await r.json();

        // แปลงค่าจากบอร์ด (0 = มีรถ, 1 = ว่าง -> สลับให้ตรงกับหน้าเว็บที่ 1 = มีรถ, 0 = ว่าง)
        let slot1 = null;
        let ts = 0;
        if (d.obj && d.obj[0]) {
            const rawObj = Number(d.obj[0].value);
            if (rawObj === 0) slot1 = 1;       // 0 จากบอร์ด = มีรถจอด
            else if (rawObj === 1) slot1 = 0;  // 1 จากบอร์ด = ว่าง
            ts = d.obj[0].ts;
        }

        // อัปเดตช่อง 01 (ส่วนช่อง 02 และ 03 ยังไม่มีเซนเซอร์ให้ขึ้น "รอข้อมูล")
        updateSlots([slot1, null, null]);

        const fresh = ts > 0 && (Date.now() - ts < CONFIG.staleMs);
        setLive(fresh, fresh ? 'LIVE' : 'บอร์ดไม่ส่งข้อมูล', ts ? new Date(ts).toLocaleTimeString('th-TH') : '');
    } catch (e) {
        console.warn('ดึงข้อมูลจาก ThingsBoard ไม่สำเร็จ:', e);
        setLive(false, 'เชื่อมต่อไม่ได้');
    }
}

/* ---------- 8) เริ่มทำงาน ---------- */
paint(-1);
const tm = () => new Date().toLocaleTimeString('th-TH');
$('clk').textContent = tm();
setInterval(() => { $('clk').textContent = tm(); }, 1000);
pollThingsBoard();
setInterval(pollThingsBoard, CONFIG.pollMs);
