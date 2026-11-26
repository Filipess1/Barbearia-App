import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3001);
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'barbearia-db.json');
const DIST_DIR = path.join(__dirname, 'dist');

const DEFAULT_BARBERS = [
  {
    id: 'lucas',
    name: 'Lucas Mendes',
    nickname: 'Lucas',
    role: 'Barbeiro Sênior',
    specialty: 'Degradê, Navalhado & Barba Tradicional',
    experienceYears: 8,
    rating: 4.9,
    reviewsCount: 312,
    bio: 'Referência em fade limpo, acabamento na navalha e alinhamento geométrico de barba.',
    initials: 'LM',
    photoUrl: '',
    accentColor: '#d4a853',
    workStart: '09:00',
    workEnd: '19:00',
    lunchStart: '12:00',
    lunchEnd: '13:00',
    featuredServices: ['corte-degrade', 'corte-navalhado', 'combo-completo'],
  },
  {
    id: 'rafael',
    name: 'Rafael Costa',
    nickname: 'Rafael',
    role: 'Mestre Visagista',
    specialty: 'Tesoura, Cortes Clássicos & Visagismo',
    experienceYears: 11,
    rating: 5.0,
    reviewsCount: 428,
    bio: 'Especialista em cortes estruturados na tesoura, consultoria de estilo e perfil facial.',
    initials: 'RC',
    photoUrl: '',
    accentColor: '#60a5fa',
    workStart: '09:30',
    workEnd: '19:30',
    lunchStart: '13:00',
    lunchEnd: '14:00',
    featuredServices: ['corte-tesoura', 'corte-social', 'barba-terapia'],
  },
  {
    id: 'thiago',
    name: 'Thiago Rocha',
    nickname: 'Thiago',
    role: 'Barbeiro Stylist',
    specialty: 'Freestyle, Platinado & Barba Terapia',
    experienceYears: 6,
    rating: 4.8,
    reviewsCount: 245,
    bio: 'Focado em estilos modernos, pigmentação, platinado seguro e cuidados com a pele.',
    initials: 'TR',
    photoUrl: '',
    accentColor: '#34d399',
    workStart: '10:00',
    workEnd: '20:00',
    lunchStart: '13:30',
    lunchEnd: '14:30',
    featuredServices: ['corte-freestyle', 'platinado', 'combo-completo'],
  },
];

function formatDateYYYYMMDD(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function generateTimeSlots(workStart, workEnd, intervalMinutes = 30) {
  const [startH, startM] = workStart.split(':').map(Number);
  const [endH, endM] = workEnd.split(':').map(Number);
  let current = startH * 60 + startM;
  const end = endH * 60 + endM;
  const slots = [];
  while (current < end) {
    const h = String(Math.floor(current / 60)).padStart(2, '0');
    const m = String(current % 60).padStart(2, '0');
    slots.push(`${h}:${m}`);
    current += intervalMinutes;
  }
  return slots;
}

function createInitialAppointments() {
  const today = formatDateYYYYMMDD(new Date());
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = formatDateYYYYMMDD(tomorrowDate);

  return [
    {
      id: 'apt-1',
      barberId: 'lucas',
      serviceId: 'corte-degrade',
      date: today,
      time: '09:30',
      clientName: 'Bruno Almeida',
      clientPhone: '(11) 98421-3301',
      status: 'Concluído',
    },
    {
      id: 'apt-2',
      barberId: 'lucas',
      serviceId: 'combo-completo',
      date: today,
      time: '10:30',
      clientName: 'Marcos Vinícius',
      clientPhone: '(11) 97210-8842',
      status: 'Em Atendimento',
    },
    {
      id: 'apt-3',
      barberId: 'lucas',
      serviceId: 'corte-navalhado',
      date: today,
      time: '14:00',
      clientName: 'Gabriel Ferreira',
      clientPhone: '(11) 99102-4410',
      status: 'Aguardando',
    },
    {
      id: 'apt-4',
      barberId: 'lucas',
      serviceId: 'barba-tradicional',
      date: today,
      time: '16:30',
      clientName: 'Eduardo Lima',
      clientPhone: '(11) 98834-1290',
      status: 'Aguardando',
    },
    {
      id: 'apt-5',
      barberId: 'rafael',
      serviceId: 'corte-tesoura',
      date: today,
      time: '10:00',
      clientName: 'Henrique Santos',
      clientPhone: '(11) 99540-2211',
      status: 'Concluído',
    },
    {
      id: 'apt-6',
      barberId: 'rafael',
      serviceId: 'barba-terapia',
      date: today,
      time: '11:30',
      clientName: 'Rodrigo Nogueira',
      clientPhone: '(11) 98112-6500',
      status: 'Aguardando',
    },
    {
      id: 'apt-7',
      barberId: 'rafael',
      serviceId: 'combo-vip',
      date: today,
      time: '15:00',
      clientName: 'Alexandre Pires',
      clientPhone: '(11) 99321-0098',
      status: 'Aguardando',
    },
    {
      id: 'apt-8',
      barberId: 'thiago',
      serviceId: 'corte-freestyle',
      date: today,
      time: '11:00',
      clientName: 'Cauã Oliveira',
      clientPhone: '(11) 97654-3210',
      status: 'Em Atendimento',
    },
    {
      id: 'apt-9',
      barberId: 'thiago',
      serviceId: 'corte-degrade',
      date: today,
      time: '15:30',
      clientName: 'Matheus Cardoso',
      clientPhone: '(11) 98223-7741',
      status: 'Aguardando',
    },
    {
      id: 'apt-10',
      barberId: 'thiago',
      serviceId: 'platinado',
      date: tomorrow,
      time: '10:30',
      clientName: 'Felipe Duarte',
      clientPhone: '(11) 99441-5520',
      status: 'Aguardando',
    },
    {
      id: 'apt-11',
      barberId: 'lucas',
      serviceId: 'combo-completo',
      date: tomorrow,
      time: '11:00',
      clientName: 'João Pedro',
      clientPhone: '(11) 98765-1122',
      status: 'Aguardando',
    },
  ];
}

function createInitialDb() {
  return {
    appointments: createInitialAppointments(),
    barbers: structuredClone(DEFAULT_BARBERS),
    shopSettings: {
      shopName: 'BARBEARIA CLÁSSICA',
      shopLogoUrl: '',
    },
    lunchOverrides: {},
    unavailableSlots: {},
    barberPhotos: {},
  };
}

function loadDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initial = createInitialDb();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      ...createInitialDb(),
      ...parsed,
    };
  } catch {
    const fallback = createInitialDb();
    fs.writeFileSync(DB_FILE, JSON.stringify(fallback, null, 2), 'utf-8');
    return fallback;
  }
}

let db = loadDb();
const sseClients = new Set();

function saveDb() {
  const tmpFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2), 'utf-8');
  fs.renameSync(tmpFile, DB_FILE);
  broadcastState();
}

function broadcastState() {
  const payload = `event: state\ndata: ${JSON.stringify(db)}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(payload);
    } catch {
      sseClients.delete(res);
    }
  }
}

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(body));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 6 * 1024 * 1024) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function getLunchSlots(barberId, date) {
  const key = `${barberId}_${date}`;
  if (db.lunchOverrides[key]) return db.lunchOverrides[key];
  const barber = db.barbers.find((b) => b.id === barberId);
  if (!barber) return [];
  return generateTimeSlots(barber.lunchStart, barber.lunchEnd, 30);
}

function getUnavailableSlots(barberId, date) {
  const key = `${barberId}_${date}`;
  return db.unavailableSlots[key] || [];
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json; charset=utf-8',
};

function serveStatic(req, res, urlPath) {
  if (!fs.existsSync(DIST_DIR)) {
    sendJson(res, 404, { error: 'Frontend build (dist/) não encontrado. Rode npm run build.' });
    return;
  }
  const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
  let filePath = path.join(DIST_DIR, safePath === '/' ? 'index.html' : safePath);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST_DIR, 'index.html');
  }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  try {
    // Health check
    if (req.method === 'GET' && pathname === '/api/health') {
      return sendJson(res, 200, { ok: true, clientsConnected: sseClients.size });
    }

    // Full state
    if (req.method === 'GET' && pathname === '/api/state') {
      return sendJson(res, 200, db);
    }

    // Server-Sent Events for real-time sync
    if (req.method === 'GET' && pathname === '/api/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });
      res.write(`event: state\ndata: ${JSON.stringify(db)}\n\n`);
      sseClients.add(res);
      const keepAlive = setInterval(() => {
        try {
          res.write(': ping\n\n');
        } catch {
          clearInterval(keepAlive);
          sseClients.delete(res);
        }
      }, 25000);
      req.on('close', () => {
        clearInterval(keepAlive);
        sseClients.delete(res);
      });
      return;
    }

    // Create appointment
    if (req.method === 'POST' && pathname === '/api/appointments') {
      const body = await readJsonBody(req);
      const {
        barberId,
        serviceId,
        date,
        time,
        clientName,
        clientPhone,
        bookingType,
        isWalkIn,
        fromClient,
      } = body;

      if (!barberId || !serviceId || !date || !time || !String(clientName || '').trim()) {
        return sendJson(res, 400, { error: 'Campos obrigatórios ausentes.' });
      }

      if (fromClient && !isWalkIn) {
        const normName = String(clientName).trim().toLowerCase();
        const normPhone = String(clientPhone || '').replace(/\D/g, '');
        const existingOtherBarber = db.appointments.find((a) => {
          if (a.date !== date || a.status === 'Concluído' || a.barberId === barberId) {
            return false;
          }
          const aName = String(a.clientName || '').trim().toLowerCase();
          const aPhone = String(a.clientPhone || '').replace(/\D/g, '');
          const phoneMatch = normPhone.length >= 8 && aPhone === normPhone;
          const nameMatch = normName.length >= 2 && aName === normName;
          return phoneMatch || nameMatch;
        });

        if (existingOtherBarber) {
          const otherBarber = db.barbers.find((b) => b.id === existingOtherBarber.barberId);
          return sendJson(res, 409, {
            error: `Você já possui um agendamento nesta data com ${otherBarber?.name || 'outro profissional'} às ${existingOtherBarber.time}. Só é permitido marcar com 1 profissional por dia.`,
          });
        }
      }

      const lunch = getLunchSlots(barberId, date);
      const unavail = getUnavailableSlots(barberId, date);
      const alreadyBooked = db.appointments.some(
        (a) => a.barberId === barberId && a.date === date && a.time === time
      );

      if (lunch.includes(time) || unavail.includes(time) || alreadyBooked) {
        return sendJson(res, 409, { error: 'Este horário acabou de ser ocupado ou bloqueado.' });
      }

      const newApt = {
        id: `apt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        barberId,
        serviceId,
        date,
        time,
        clientName: String(clientName).trim(),
        clientPhone: String(clientPhone || '').trim(),
        status: 'Aguardando',
        bookingType: bookingType || 'normal',
        isWalkIn: Boolean(isWalkIn),
      };

      db.appointments.push(newApt);
      saveDb();
      return sendJson(res, 201, { appointment: newApt, state: db });
    }

    // Update appointment status
    if (req.method === 'PATCH' && pathname.startsWith('/api/appointments/')) {
      const id = decodeURIComponent(pathname.replace('/api/appointments/', ''));
      const body = await readJsonBody(req);
      const idx = db.appointments.findIndex((a) => a.id === id);
      if (idx === -1) return sendJson(res, 404, { error: 'Agendamento não encontrado.' });

      if (body.status) {
        db.appointments[idx].status = body.status;
      }
      saveDb();
      return sendJson(res, 200, { appointment: db.appointments[idx], state: db });
    }

    // Delete / cancel appointment
    if (req.method === 'DELETE' && pathname.startsWith('/api/appointments/')) {
      const id = decodeURIComponent(pathname.replace('/api/appointments/', ''));
      const before = db.appointments.length;
      db.appointments = db.appointments.filter((a) => a.id !== id);
      if (db.appointments.length === before) {
        return sendJson(res, 404, { error: 'Agendamento não encontrado.' });
      }
      saveDb();
      return sendJson(res, 200, { ok: true, state: db });
    }

    // Reset demo schedule
    if (req.method === 'POST' && pathname === '/api/appointments/reset') {
      db.appointments = createInitialAppointments();
      db.lunchOverrides = {};
      db.unavailableSlots = {};
      saveDb();
      return sendJson(res, 200, { state: db });
    }

    // Toggle lunch slot
    if (req.method === 'PUT' && pathname === '/api/slots/lunch') {
      const { barberId, date, time } = await readJsonBody(req);
      if (!barberId || !date || !time) {
        return sendJson(res, 400, { error: 'barberId, date e time são obrigatórios.' });
      }
      const key = `${barberId}_${date}`;
      const current = getLunchSlots(barberId, date);
      const exists = current.includes(time);
      db.lunchOverrides[key] = exists
        ? current.filter((t) => t !== time)
        : [...current, time];
      saveDb();
      return sendJson(res, 200, { exists: !exists, state: db });
    }

    // Toggle unavailable slot
    if (req.method === 'PUT' && pathname === '/api/slots/unavailable') {
      const { barberId, date, time } = await readJsonBody(req);
      if (!barberId || !date || !time) {
        return sendJson(res, 400, { error: 'barberId, date e time são obrigatórios.' });
      }
      const key = `${barberId}_${date}`;
      const current = getUnavailableSlots(barberId, date);
      const exists = current.includes(time);
      db.unavailableSlots[key] = exists
        ? current.filter((t) => t !== time)
        : [...current, time];
      saveDb();
      return sendJson(res, 200, { exists: !exists, state: db });
    }

    // Toggle unavailable period (morning, afternoon, day)
    if (req.method === 'PUT' && pathname === '/api/slots/unavailable-period') {
      const { barberId, date, period } = await readJsonBody(req);
      if (!barberId || !date || !period) {
        return sendJson(res, 400, { error: 'barberId, date e period são obrigatórios.' });
      }
      const targets =
        barberId === 'all' ? db.barbers : db.barbers.filter((b) => b.id === barberId);
      const getPeriodSlots = (b) => {
        const [sh, sm] = b.workStart.split(':').map(Number);
        const [eh, em] = b.workEnd.split(':').map(Number);
        let cur = sh * 60 + sm;
        const end = eh * 60 + em;
        const all = [];
        while (cur < end) {
          all.push(
            String(Math.floor(cur / 60)).padStart(2, '0') +
              ':' +
              String(cur % 60).padStart(2, '0')
          );
          cur += 30;
        }
        if (period === 'morning') return all.filter((t) => t < '12:00');
        if (period === 'afternoon') return all.filter((t) => t >= '12:00');
        return all;
      };
      const allAlreadyBlocked =
        targets.length > 0 &&
        targets.every((b) => {
          const pSlots = getPeriodSlots(b);
          const cur = getUnavailableSlots(b.id, date);
          return pSlots.length > 0 && pSlots.every((t) => cur.includes(t));
        });
      for (const b of targets) {
        const key = `${b.id}_${date}`;
        const cur = new Set(getUnavailableSlots(b.id, date));
        for (const t of getPeriodSlots(b)) {
          if (allAlreadyBlocked) cur.delete(t);
          else cur.add(t);
        }
        db.unavailableSlots[key] = Array.from(cur);
      }
      saveDb();
      return sendJson(res, 200, { blocked: !allAlreadyBlocked, state: db });
    }

    // Update shop settings & barber names
    if (req.method === 'PUT' && pathname === '/api/shop') {
      const { shopName, shopLogoUrl, barberUpdates } = await readJsonBody(req);
      db.shopSettings = {
        shopName: String(shopName || 'BARBEARIA CLÁSSICA').trim() || 'BARBEARIA CLÁSSICA',
        shopLogoUrl: String(shopLogoUrl || ''),
      };
      if (Array.isArray(barberUpdates)) {
        db.barbers = db.barbers.map((b) => {
          const upd = barberUpdates.find((u) => u.id === b.id);
          if (!upd) return b;
          const name = String(upd.name || b.name).trim() || b.name;
          const parts = name.split(/\s+/);
          const nickname = parts[0] || name;
          const initials =
            parts.length >= 2
              ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
              : name.slice(0, 2).toUpperCase();
          return {
            ...b,
            name,
            nickname,
            initials,
            role: String(upd.role || b.role).trim() || b.role,
            specialty: String(upd.specialty || b.specialty).trim() || b.specialty,
          };
        });
      }
      saveDb();
      return sendJson(res, 200, { state: db });
    }

    // Reset shop defaults
    if (req.method === 'POST' && pathname === '/api/shop/reset') {
      db.shopSettings = { shopName: 'BARBEARIA CLÁSSICA', shopLogoUrl: '' };
      db.barbers = structuredClone(DEFAULT_BARBERS);
      saveDb();
      return sendJson(res, 200, { state: db });
    }

    // Update or remove barber photo
    if (req.method === 'PUT' && pathname.startsWith('/api/barbers/') && pathname.endsWith('/photo')) {
      const barberId = decodeURIComponent(
        pathname.replace('/api/barbers/', '').replace('/photo', '')
      );
      const { dataUrl } = await readJsonBody(req);
      if (dataUrl) {
        db.barberPhotos[barberId] = String(dataUrl);
      } else {
        delete db.barberPhotos[barberId];
      }
      saveDb();
      return sendJson(res, 200, { state: db });
    }

    // Serve static frontend in production
    if (req.method === 'GET' && !pathname.startsWith('/api/')) {
      return serveStatic(req, res, pathname);
    }

    sendJson(res, 404, { error: 'Rota não encontrada.' });
  } catch (err) {
    console.error('Erro na API:', err);
    sendJson(res, 500, { error: err?.message || 'Erro interno no servidor.' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Barbearia API rodando em http://localhost:${PORT} (0.0.0.0:${PORT})`);
});
