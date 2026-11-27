import hashlib
import hmac
import json
import os
import re
import threading
import time
import urllib.request
import streamlit as st
import streamlit.components.v1 as components
from sqlalchemy import create_engine, text

from licencas import CATALOGO_APPS, renderizar_painel_admin_licencas, validar_licenca

st.set_page_config(
    page_title="Barbearia Clássica — Atendimento, Horários & Cortes",
    page_icon="💈",
    layout="wide",
    initial_sidebar_state="collapsed",
)


def _obter_urls_apps_keepalive() -> list:
    padrao = [
        "https://distribuidora-bebidas.streamlit.app",
        "https://deposito-alimentos.streamlit.app",
        "https://barbearia-app.streamlit.app",
        "https://safe-training-monitor-stm.streamlit.app",
        "https://safe-training-monitor.streamlit.app",
        "http://127.0.0.1:8501",
        "http://127.0.0.1:8502",
        "http://127.0.0.1:8503",
        "http://127.0.0.1:8504",
    ]
    extras_raw = str(st.secrets.get("KEEPALIVE_URLS", os.environ.get("KEEPALIVE_URLS", ""))).strip()
    if extras_raw:
        for u in extras_raw.split(","):
            u = u.strip()
            if u and u not in padrao:
                padrao.append(u)
    return padrao


@st.cache_resource(show_spinner=False)
def _iniciar_keepalive_24x7():
    estado = {"ativo": True, "ultimo_ping": "", "total_pings": 0}

    def _loop():
        while True:
            try:
                for url in _obter_urls_apps_keepalive():
                    try:
                        req = urllib.request.Request(
                            url,
                            headers={"User-Agent": "Mozilla/5.0 (Streamlit-KeepAlive-24x7)"},
                        )
                        with urllib.request.urlopen(req, timeout=8) as r:
                            _ = r.status
                    except Exception:
                        pass
                sb_url = st.secrets.get("SUPABASE_URL", os.environ.get("SUPABASE_URL", ""))
                sb_key = st.secrets.get("SUPABASE_KEY", os.environ.get("SUPABASE_KEY", ""))
                if sb_url and sb_key:
                    try:
                        req_sb = urllib.request.Request(
                            f"{sb_url}/rest/v1/",
                            headers={"apikey": sb_key, "Authorization": f"Bearer {sb_key}"},
                        )
                        with urllib.request.urlopen(req_sb, timeout=8) as r:
                            _ = r.status
                    except Exception:
                        pass
                estado["ultimo_ping"] = time.strftime("%d/%m/%Y %H:%M:%S")
                estado["total_pings"] += 1
            except Exception:
                pass
            time.sleep(240)

    t = threading.Thread(target=_loop, daemon=True)
    t.start()
    return estado


_keepalive_info = _iniciar_keepalive_24x7()

APP_KEY = "barbearia_app"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DIST_DIR = os.path.join(BASE_DIR, "dist")
INDEX_FILE = os.path.join(DIST_DIR, "index.html")
LOCAL_DB_FILE = os.path.join(BASE_DIR, "data", "barbearia-db.json")
LOGO_SVG_FILE = os.path.join(BASE_DIR, "public", "logo-barbearia.svg")


def _gerar_sync_token(tenant_app_key: str = APP_KEY) -> str:
    db_url = st.secrets.get("DATABASE_URL", os.environ.get("DATABASE_URL", "local"))
    pin = str(st.secrets.get("APP_PIN", os.environ.get("APP_PIN", "2026"))).strip() or "2026"
    segredo = f"{db_url}::{pin}".encode("utf-8")
    return hmac.new(segredo, tenant_app_key.encode("utf-8"), hashlib.sha256).hexdigest()


def _resolver_licenca_barbearia() -> dict:
    chave_padrao = CATALOGO_APPS[APP_KEY]["chave_mestre"]
    raw_lic = st.query_params.get("lic", "")
    if raw_lic:
        st.session_state["barb_licenca_chave"] = str(raw_lic).strip().upper()
    chave_atual = st.session_state.get("barb_licenca_chave", chave_padrao)
    res_lic = validar_licenca(chave_atual, APP_KEY)
    if not res_lic.get("valida"):
        _, col_c, _ = st.columns([1, 1.5, 1])
        with col_c:
            st.markdown("<div style='height:8vh'></div>", unsafe_allow_html=True)
            st.error(f"⛔ **Sistema Temporariamente Indisponível** — {res_lic.get('motivo', 'Licença expirada ou bloqueada.')}")
            st.info("Se você é o proprietário da barbearia, insira uma nova chave válida abaixo ou renove sua assinatura com o suporte.")
            nova_chave = st.text_input("🔑 Informar Chave de Licença:", value=chave_atual, key="barb_revalidar_chave")
            if st.button("Ativar / Verificar Licença", type="primary", use_container_width=True):
                st.session_state["barb_licenca_chave"] = nova_chave.strip().upper()
                st.rerun()
            with st.expander("💼 Painel do Proprietário (SaaS) — Renovar / Gerar Licenças", expanded=False):
                renderizar_painel_admin_licencas(APP_KEY, "barb_blk")
        st.stop()
    return res_lic


licenca_info_atual = _resolver_licenca_barbearia()
TENANT_APP_KEY = licenca_info_atual["tenant_app_key"]
LICENCA_OBJ = licenca_info_atual["licenca"]
if TENANT_APP_KEY != APP_KEY:
    _slug_lic = LICENCA_OBJ["chave"].replace(":", "_")
    LOCAL_DB_FILE = os.path.join(BASE_DIR, "data", f"barbearia-db-{_slug_lic}.json")


def _dados_padrao() -> dict:
    if os.path.exists(LOCAL_DB_FILE):
        try:
            with open(LOCAL_DB_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    return data
        except Exception:
            pass
    return {
        "appointments": [],
        "barbers": [],
        "shopSettings": {"shopName": "BARBEARIA CLÁSSICA", "shopLogoUrl": ""},
        "lunchOverrides": {},
        "unavailableSlots": {},
        "barberPhotos": {},
    }


def _inicializar_supabase_storage(sync_token: str, tenant_app_key: str = APP_KEY) -> dict:
    db_url = st.secrets.get("DATABASE_URL", os.environ.get("DATABASE_URL", ""))
    iniciais = _dados_padrao()
    if not db_url:
        return iniciais

    engine = create_engine(
        db_url,
        connect_args={"connect_timeout": 10},
        pool_pre_ping=True,
        pool_recycle=300,
    )
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS public.app_cloud_storage (
                app_key TEXT PRIMARY KEY,
                dados JSONB NOT NULL,
                updated_at TIMESTAMPTZ DEFAULT now()
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS public.app_cloud_tokens (
                app_key TEXT PRIMARY KEY,
                sync_token TEXT NOT NULL,
                updated_at TIMESTAMPTZ DEFAULT now()
            )
        """))
        conn.execute(text("ALTER TABLE public.app_cloud_storage ENABLE ROW LEVEL SECURITY"))
        conn.execute(text("ALTER TABLE public.app_cloud_tokens ENABLE ROW LEVEL SECURITY"))
        conn.execute(text("REVOKE ALL ON TABLE public.app_cloud_storage FROM anon, authenticated"))
        conn.execute(text("REVOKE ALL ON TABLE public.app_cloud_tokens FROM anon, authenticated"))

        conn.execute(
            text("""
                INSERT INTO public.app_cloud_tokens (app_key, sync_token, updated_at)
                VALUES (:k, :t, now())
                ON CONFLICT (app_key)
                DO UPDATE SET sync_token = EXCLUDED.sync_token, updated_at = now()
            """),
            {"k": tenant_app_key, "t": sync_token},
        )

        conn.execute(text("DROP FUNCTION IF EXISTS public.sync_app_storage(text, text, jsonb)"))
        conn.execute(text("""
            CREATE OR REPLACE FUNCTION public.sync_app_storage(
                p_app_key text,
                p_acao text,
                p_dados jsonb DEFAULT NULL,
                p_token text DEFAULT ''
            )
            RETURNS jsonb
            LANGUAGE plpgsql
            SECURITY DEFINER
            SET search_path = public
            AS $$
            DECLARE
                v_res jsonb;
            BEGIN
                IF NOT (
                    p_app_key LIKE 'deposito_alimentos%'
                    OR p_app_key LIKE 'distribuidora_bebidas%'
                    OR p_app_key LIKE 'barbearia_app%'
                ) THEN
                    RAISE EXCEPTION 'App key invalida';
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM public.app_cloud_tokens
                     WHERE app_key = p_app_key
                       AND sync_token = COALESCE(p_token, '')
                ) THEN
                    RAISE EXCEPTION 'Acesso negado: token de sincronizacao invalido';
                END IF;

                IF p_acao = 'set' AND p_dados IS NOT NULL THEN
                    IF octet_length(p_dados::text) > 4194304 THEN
                        RAISE EXCEPTION 'Payload excede o limite de seguranca (4 MB)';
                    END IF;
                    INSERT INTO public.app_cloud_storage (app_key, dados, updated_at)
                    VALUES (p_app_key, p_dados, now())
                    ON CONFLICT (app_key)
                    DO UPDATE SET dados = EXCLUDED.dados, updated_at = now()
                    RETURNING dados INTO v_res;
                    RETURN v_res;
                ELSE
                    SELECT dados INTO v_res
                      FROM public.app_cloud_storage
                     WHERE app_key = p_app_key;
                    RETURN COALESCE(v_res, '{}'::jsonb);
                END IF;
            END;
            $$
        """))
        conn.execute(text(
            "GRANT EXECUTE ON FUNCTION public.sync_app_storage(text, text, jsonb, text) TO anon, authenticated"
        ))

        row = conn.execute(
            text("SELECT dados FROM public.app_cloud_storage WHERE app_key = :k"),
            {"k": tenant_app_key},
        ).fetchone()
        if not row:
            conn.execute(
                text("""
                    INSERT INTO public.app_cloud_storage (app_key, dados, updated_at)
                    VALUES (:k, CAST(:d AS jsonb), now())
                """),
                {"k": tenant_app_key, "d": json.dumps(iniciais, ensure_ascii=False)},
            )
            return iniciais
        return row[0] if isinstance(row[0], dict) else json.loads(row[0])


def _carregar_html_inline() -> str:
    if not os.path.exists(INDEX_FILE):
        return "<h2>Build dist/index.html não encontrado. Execute npm run build.</h2>"

    with open(INDEX_FILE, "r", encoding="utf-8") as f:
        html = f.read()

    # Inline CSS (<link rel="stylesheet" ... href="/assets/...">)
    def _inline_css(match):
        href = match.group(1).lstrip("/")
        css_path = os.path.join(DIST_DIR, href)
        if os.path.exists(css_path):
            with open(css_path, "r", encoding="utf-8") as cf:
                return f"<style>{cf.read()}</style>"
        return match.group(0)

    html = re.sub(
        r'<link[^>]+rel=["\']stylesheet["\'][^>]+href=["\']([^"\']+)["\'][^>]*>',
        _inline_css,
        html,
    )

    # Inline JS (<script type="module" ... src="/assets/..."></script>)
    def _inline_js(match):
        src = match.group(1).lstrip("/")
        js_path = os.path.join(DIST_DIR, src)
        if os.path.exists(js_path):
            with open(js_path, "r", encoding="utf-8") as jf:
                js_code = jf.read().replace("</script>", "<\\/script>")
                return f'<script type="module">{js_code}</script>'
        return match.group(0)

    html = re.sub(
        r'<script[^>]+src=["\']([^"\']+)["\'][^>]*></script>',
        _inline_js,
        html,
    )

    # Inline SVG logo if referenced
    if os.path.exists(LOGO_SVG_FILE):
        with open(LOGO_SVG_FILE, "r", encoding="utf-8") as lf:
            svg_raw = lf.read()
        import base64
        svg_b64 = base64.b64encode(svg_raw.encode("utf-8")).decode("ascii")
        html = html.replace("/logo-barbearia.svg", f"data:image/svg+xml;base64,{svg_b64}")

    return html


st.markdown("""
    <style>
        #MainMenu, header, footer, [data-testid="stToolbar"], [data-testid="stDecoration"] {
            display: none !important;
            height: 0 !important;
        }
        html, body, .stApp, [data-testid="stAppViewContainer"], .main {
            max-width: 100vw !important;
            overflow-x: hidden !important;
            margin: 0 !important;
            padding: 0 !important;
        }
        .block-container, [data-testid="stMainBlockContainer"] {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
        }
        [data-testid="stElementContainer"], [data-testid="stIFrame"] {
            width: 100% !important;
            max-width: 100vw !important;
            margin: 0 !important;
            padding: 0 !important;
        }
        iframe {
            border: none !important;
            width: 100% !important;
            max-width: 100vw !important;
            height: 100dvh !important;
            min-height: 100vh !important;
            display: block !important;
        }
    </style>
""", unsafe_allow_html=True)

token_sincronizacao = _gerar_sync_token(TENANT_APP_KEY)
try:
    dados_iniciais = _inicializar_supabase_storage(token_sincronizacao, TENANT_APP_KEY)
except Exception:
    dados_iniciais = _dados_padrao()

supabase_url = st.secrets.get("SUPABASE_URL", os.environ.get("SUPABASE_URL", ""))
supabase_key = st.secrets.get("SUPABASE_KEY", os.environ.get("SUPABASE_KEY", ""))

bridge_script = f"""
<script>
(function() {{
  const SUPABASE_URL = {json.dumps(supabase_url)};
  const SUPABASE_KEY = {json.dumps(supabase_key)};
  const APP_KEY = {json.dumps(TENANT_APP_KEY)};
  const SYNC_TOKEN = {json.dumps(token_sincronizacao)};
  const originalFetch = window.fetch.bind(window);

  const DEFAULT_BARBERS = [
    {{
      id: 'lucas', name: 'Lucas Mendes', nickname: 'Lucas', role: 'Barbeiro Sênior',
      specialty: 'Degradê, Navalhado & Barba Tradicional', experienceYears: 8,
      rating: 4.9, reviewsCount: 312,
      bio: 'Referência em fade limpo, acabamento na navalha e alinhamento geométrico de barba.',
      initials: 'LM', photoUrl: '', accentColor: '#d4a853',
      workStart: '09:00', workEnd: '19:00', lunchStart: '12:00', lunchEnd: '13:00',
      featuredServices: ['corte-degrade', 'corte-navalhado', 'combo-completo']
    }},
    {{
      id: 'rafael', name: 'Rafael Costa', nickname: 'Rafael', role: 'Mestre Visagista',
      specialty: 'Tesoura, Cortes Clássicos & Visagismo', experienceYears: 11,
      rating: 5.0, reviewsCount: 428,
      bio: 'Especialista em cortes estruturados na tesoura, consultoria de estilo e perfil facial.',
      initials: 'RC', photoUrl: '', accentColor: '#60a5fa',
      workStart: '09:30', workEnd: '19:30', lunchStart: '13:00', lunchEnd: '14:00',
      featuredServices: ['corte-tesoura', 'corte-social', 'barba-terapia']
    }},
    {{
      id: 'thiago', name: 'Thiago Rocha', nickname: 'Thiago', role: 'Barbeiro Stylist',
      specialty: 'Freestyle, Platinado & Barba Terapia', experienceYears: 6,
      rating: 4.8, reviewsCount: 245,
      bio: 'Focado em estilos modernos, pigmentação, platinado seguro e cuidados com a pele.',
      initials: 'TR', photoUrl: '', accentColor: '#34d399',
      workStart: '10:00', workEnd: '20:00', lunchStart: '13:30', lunchEnd: '14:30',
      featuredServices: ['corte-freestyle', 'platinado', 'combo-completo']
    }}
  ];

  let cloudDb = {json.dumps(dados_iniciais, ensure_ascii=False)};
  if (!cloudDb || typeof cloudDb !== 'object') cloudDb = {{}};
  if (!Array.isArray(cloudDb.appointments)) cloudDb.appointments = [];
  if (!Array.isArray(cloudDb.barbers) || cloudDb.barbers.length === 0) cloudDb.barbers = JSON.parse(JSON.stringify(DEFAULT_BARBERS));
  if (!cloudDb.shopSettings) cloudDb.shopSettings = {{ shopName: 'BARBEARIA CLÁSSICA', shopLogoUrl: '', loyaltyGoal: 10 }};
  if (!cloudDb.lunchOverrides) cloudDb.lunchOverrides = {{}};
  if (!cloudDb.unavailableSlots) cloudDb.unavailableSlots = {{}};
  if (!cloudDb.barberPhotos) cloudDb.barberPhotos = {{}};
  if (!Array.isArray(cloudDb.waitlist)) cloudDb.waitlist = [];
  if (!cloudDb.proPins) cloudDb.proPins = {{ all: '1234', lucas: '1234', rafael: '1234', thiago: '1234' }};

  const SERVICE_DURATIONS = {{
    'corte-social': 30, 'corte-degrade': 45, 'corte-navalhado': 45,
    'corte-tesoura': 45, 'corte-freestyle': 45, 'corte-infantil': 30,
    'barba-tradicional': 30, 'barba-terapia': 45, 'pezinho-acabamento': 15,
    'sobrancelha-navalha': 15, 'combo-completo': 60, 'combo-vip': 90,
    'platinado': 120, 'hidratacao-capilar': 30
  }};

  function getOccupiedSlotTimes(startTime, durationMinutes) {{
    const [sh, sm] = startTime.split(':').map(Number);
    const startMin = sh * 60 + sm;
    const blocks = Math.max(1, Math.ceil((durationMinutes || 30) / 30));
    const out = [];
    for (let i = 0; i < blocks; i++) {{
      const m = startMin + i * 30;
      out.push(String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'));
    }}
    return out;
  }}

  function generateTimeSlots(workStart, workEnd) {{
    const [sh, sm] = workStart.split(':').map(Number);
    const [eh, em] = workEnd.split(':').map(Number);
    let cur = sh * 60 + sm;
    const end = eh * 60 + em;
    const out = [];
    while (cur < end) {{
      out.push(String(Math.floor(cur / 60)).padStart(2, '0') + ':' + String(cur % 60).padStart(2, '0'));
      cur += 30;
    }}
    return out;
  }}

  function getLunchSlots(barberId, date) {{
    const key = barberId + '_' + date;
    if (cloudDb.lunchOverrides[key]) return cloudDb.lunchOverrides[key];
    const b = cloudDb.barbers.find(x => x.id === barberId);
    return b ? generateTimeSlots(b.lunchStart, b.lunchEnd) : [];
  }}

  function getUnavailableSlots(barberId, date) {{
    return cloudDb.unavailableSlots[barberId + '_' + date] || [];
  }}

  async function pullSupabase() {{
    if (!SUPABASE_URL || !SUPABASE_KEY) return cloudDb;
    try {{
      const r = await originalFetch(SUPABASE_URL + '/rest/v1/rpc/sync_app_storage', {{
        method: 'POST',
        headers: {{
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': 'Bearer ' + SUPABASE_KEY
        }},
        body: JSON.stringify({{ p_app_key: APP_KEY, p_acao: 'get', p_token: SYNC_TOKEN }})
      }});
      if (r.ok) {{
        const d = await r.json();
        if (d && typeof d === 'object' && Array.isArray(d.appointments)) {{
          cloudDb = d;
        }}
      }}
    }} catch (_) {{}}
    return cloudDb;
  }}

  async function pushSupabase() {{
    if (!SUPABASE_URL || !SUPABASE_KEY) return;
    try {{
      await originalFetch(SUPABASE_URL + '/rest/v1/rpc/sync_app_storage', {{
        method: 'POST',
        headers: {{
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': 'Bearer ' + SUPABASE_KEY
        }},
        body: JSON.stringify({{ p_app_key: APP_KEY, p_acao: 'set', p_dados: cloudDb, p_token: SYNC_TOKEN }})
      }});
    }} catch (_) {{}}
  }}

  const sseListeners = new Set();
  function notifySse() {{
    const data = JSON.stringify(cloudDb);
    sseListeners.forEach(fn => {{
      try {{ fn({{ data }}); }} catch (_) {{}}
    }});
  }}

  // Mock EventSource for /api/events with periodic Supabase sync
  window.EventSource = function(url) {{
    const listeners = [];
    const obj = {{
      addEventListener: function(type, cb) {{
        if (type === 'state') {{
          listeners.push(cb);
          sseListeners.add(cb);
          setTimeout(() => cb({{ data: JSON.stringify(cloudDb) }}), 50);
        }}
      }},
      close: function() {{
        listeners.forEach(cb => sseListeners.delete(cb));
      }},
      onerror: null
    }};
    return obj;
  }};

  setInterval(async () => {{
    const prev = JSON.stringify(cloudDb);
    await pullSupabase();
    if (JSON.stringify(cloudDb) !== prev) notifySse();
  }}, 8000);

  function jsonResp(status, body) {{
    return new Response(JSON.stringify(body), {{
      status,
      headers: {{ 'Content-Type': 'application/json' }}
    }});
  }}

  window.fetch = async function(input, init) {{
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    if (!url.startsWith('/api/')) return originalFetch(input, init);
    const method = ((init && init.method) || 'GET').toUpperCase();
    const body = init && init.body ? JSON.parse(init.body) : {{}};

    if (method === 'GET' && url === '/api/state') {{
      await pullSupabase();
      return jsonResp(200, cloudDb);
    }}

    if (method === 'POST' && url === '/api/auth/verify-pin') {{
      const pins = cloudDb.proPins || {{ all: '1234', lucas: '1234', rafael: '1234', thiago: '1234' }};
      const expected = String(pins[body.barberId] || pins.all || '1234');
      if (String(body.pin || '').trim() !== expected) {{
        return jsonResp(401, {{ ok: false, error: 'PIN incorreto.' }});
      }}
      return jsonResp(200, {{ ok: true }});
    }}

    if (method === 'POST' && url === '/api/appointments') {{
      await pullSupabase();
      const {{ barberId, serviceId, date, time, clientName, clientPhone, bookingType, isWalkIn, fromClient }} = body;
      if (fromClient && !isWalkIn) {{
        const normName = String(clientName || '').trim().toLowerCase();
        const normPhone = String(clientPhone || '').replace(/\\D/g, '');
        const conflict = cloudDb.appointments.find(a => {{
          if (a.date !== date || a.status === 'Concluído' || a.barberId === barberId) return false;
          const aName = String(a.clientName || '').trim().toLowerCase();
          const aPhone = String(a.clientPhone || '').replace(/\\D/g, '');
          return (normPhone.length >= 8 && aPhone === normPhone) || (normName.length >= 2 && aName === normName);
        }});
        if (conflict) {{
          const ob = cloudDb.barbers.find(b => b.id === conflict.barberId);
          return jsonResp(409, {{
            error: `Você já possui um agendamento nesta data com ${{ob ? ob.name : 'outro profissional'}} às ${{conflict.time}}. Só é permitido marcar com 1 profissional por dia.`
          }});
        }}
      }}
      const lunch = getLunchSlots(barberId, date);
      const unavail = getUnavailableSlots(barberId, date);
      const occupiedSet = new Set();
      cloudDb.appointments
        .filter(a => a.barberId === barberId && a.date === date)
        .forEach(a => {{
          const dur = SERVICE_DURATIONS[a.serviceId] || 30;
          getOccupiedSlotTimes(a.time, dur).forEach(s => occupiedSet.add(s));
        }});
      const reqDur = isWalkIn ? 30 : (SERVICE_DURATIONS[serviceId] || 30);
      const needed = getOccupiedSlotTimes(time, reqDur);
      if (needed.some(s => lunch.includes(s) || unavail.includes(s) || occupiedSet.has(s))) {{
        return jsonResp(409, {{ error: 'Este horário (ou duração do serviço) conflita com outro agendamento ou bloqueio.' }});
      }}
      const apt = {{
        id: 'apt-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        barberId, serviceId, date, time,
        clientName: String(clientName || '').trim(),
        clientPhone: String(clientPhone || '').trim(),
        status: 'Aguardando',
        bookingType: bookingType || 'normal',
        isWalkIn: Boolean(isWalkIn)
      }};
      cloudDb.appointments.push(apt);
      await pushSupabase();
      return jsonResp(201, {{ appointment: apt, state: cloudDb }});
    }}

    if (method === 'PATCH' && url.startsWith('/api/appointments/')) {{
      const id = decodeURIComponent(url.replace('/api/appointments/', ''));
      const idx = cloudDb.appointments.findIndex(a => a.id === id);
      if (idx !== -1) {{
        if (body.status) cloudDb.appointments[idx].status = body.status;
        if (body.paymentMethod) cloudDb.appointments[idx].paymentMethod = body.paymentMethod;
        if (typeof body.finalPrice === 'number') cloudDb.appointments[idx].finalPrice = body.finalPrice;
        await pushSupabase();
      }}
      return jsonResp(200, {{ state: cloudDb }});
    }}

    if (method === 'POST' && url === '/api/waitlist') {{
      const now = new Date();
      const createdAt = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
      const entry = {{
        id: 'wl-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        clientName: String(body.clientName || '').trim(),
        clientPhone: String(body.clientPhone || '').trim(),
        preferredBarberId: body.preferredBarberId || 'any',
        serviceId: body.serviceId || 'corte-social',
        bookingType: body.bookingType || 'normal',
        date: body.date,
        createdAt
      }};
      if (!Array.isArray(cloudDb.waitlist)) cloudDb.waitlist = [];
      cloudDb.waitlist.push(entry);
      await pushSupabase();
      return jsonResp(201, {{ entry, state: cloudDb }});
    }}

    if (method === 'DELETE' && url.startsWith('/api/waitlist/')) {{
      const id = decodeURIComponent(url.replace('/api/waitlist/', ''));
      cloudDb.waitlist = (cloudDb.waitlist || []).filter(w => w.id !== id);
      await pushSupabase();
      return jsonResp(200, {{ ok: true, state: cloudDb }});
    }}

    if (method === 'DELETE' && url.startsWith('/api/appointments/')) {{
      const id = decodeURIComponent(url.replace('/api/appointments/', ''));
      cloudDb.appointments = cloudDb.appointments.filter(a => a.id !== id);
      await pushSupabase();
      return jsonResp(200, {{ ok: true, state: cloudDb }});
    }}

    if (method === 'POST' && url === '/api/appointments/reset') {{
      cloudDb.lunchOverrides = {{}};
      cloudDb.unavailableSlots = {{}};
      await pushSupabase();
      return jsonResp(200, {{ state: cloudDb }});
    }}

    if (method === 'PUT' && url === '/api/slots/lunch') {{
      const {{ barberId, date, time }} = body;
      const key = barberId + '_' + date;
      const cur = getLunchSlots(barberId, date);
      const exists = cur.includes(time);
      cloudDb.lunchOverrides[key] = exists ? cur.filter(t => t !== time) : [...cur, time];
      await pushSupabase();
      return jsonResp(200, {{ exists: !exists, state: cloudDb }});
    }}

    if (method === 'PUT' && url === '/api/slots/unavailable') {{
      const {{ barberId, date, time }} = body;
      const key = barberId + '_' + date;
      const cur = getUnavailableSlots(barberId, date);
      const exists = cur.includes(time);
      cloudDb.unavailableSlots[key] = exists ? cur.filter(t => t !== time) : [...cur, time];
      await pushSupabase();
      return jsonResp(200, {{ exists: !exists, state: cloudDb }});
    }}

    if (method === 'PUT' && url === '/api/slots/unavailable-period') {{
      const {{ barberId, date, period }} = body;
      const targets = barberId === 'all' ? cloudDb.barbers : cloudDb.barbers.filter(b => b.id === barberId);
      const getPeriodSlots = (b) => {{
        const all = generateTimeSlots(b.workStart, b.workEnd);
        if (period === 'morning') return all.filter(t => t < '12:00');
        if (period === 'afternoon') return all.filter(t => t >= '12:00');
        return all;
      }};
      const allAlreadyBlocked = targets.length > 0 && targets.every(b => {{
        const pSlots = getPeriodSlots(b);
        const cur = getUnavailableSlots(b.id, date);
        return pSlots.length > 0 && pSlots.every(t => cur.includes(t));
      }});
      targets.forEach(b => {{
        const key = b.id + '_' + date;
        const cur = new Set(getUnavailableSlots(b.id, date));
        getPeriodSlots(b).forEach(t => {{
          if (allAlreadyBlocked) cur.delete(t);
          else cur.add(t);
        }});
        cloudDb.unavailableSlots[key] = Array.from(cur);
      }});
      await pushSupabase();
      return jsonResp(200, {{ blocked: !allAlreadyBlocked, state: cloudDb }});
    }}

    if (method === 'PUT' && url === '/api/shop') {{
      const {{ shopName, shopLogoUrl, loyaltyGoal, barberUpdates, pinUpdates }} = body;
      cloudDb.shopSettings = {{
        shopName: String(shopName || 'BARBEARIA CLÁSSICA').trim() || 'BARBEARIA CLÁSSICA',
        shopLogoUrl: String(shopLogoUrl || ''),
        loyaltyGoal: Math.max(3, Math.min(30, Number(loyaltyGoal) || 10))
      }};
      if (Array.isArray(barberUpdates)) {{
        cloudDb.barbers = cloudDb.barbers.map(b => {{
          const u = barberUpdates.find(x => x.id === b.id);
          if (!u) return b;
          const name = String(u.name || b.name).trim() || b.name;
          const parts = name.split(/\\s+/);
          const nickname = parts[0] || name;
          const initials = parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
          return {{
            ...b,
            name,
            nickname,
            initials,
            role: u.role || b.role,
            specialty: u.specialty || b.specialty,
            commissionPercent: typeof u.commissionPercent === 'number' ? u.commissionPercent : (b.commissionPercent ?? 50)
          }};
        }});
      }}
      if (pinUpdates && typeof pinUpdates === 'object') {{
        if (!cloudDb.proPins) cloudDb.proPins = {{ all: '1234', lucas: '1234', rafael: '1234', thiago: '1234' }};
        Object.entries(pinUpdates).forEach(([k, v]) => {{
          if (String(v || '').trim()) cloudDb.proPins[k] = String(v).trim();
        }});
      }}
      await pushSupabase();
      return jsonResp(200, {{ state: cloudDb }});
    }}

    if (method === 'POST' && url === '/api/shop/reset') {{
      cloudDb.shopSettings = {{ shopName: 'BARBEARIA CLÁSSICA', shopLogoUrl: '' }};
      cloudDb.barbers = JSON.parse(JSON.stringify(DEFAULT_BARBERS));
      await pushSupabase();
      return jsonResp(200, {{ state: cloudDb }});
    }}

    if (method === 'PUT' && url.startsWith('/api/barbers/') && url.endsWith('/photo')) {{
      const barberId = decodeURIComponent(url.replace('/api/barbers/', '').replace('/photo', ''));
      if (body.dataUrl) cloudDb.barberPhotos[barberId] = String(body.dataUrl);
      else delete cloudDb.barberPhotos[barberId];
      await pushSupabase();
      return jsonResp(200, {{ state: cloudDb }});
    }}

    return jsonResp(404, {{ error: 'Rota não encontrada.' }});
  }};
}})();
</script>
"""

html_content = _carregar_html_inline()
html_content = html_content.replace("<head>", "<head>" + bridge_script, 1)
components.html(html_content, height=920, scrolling=True)

with st.expander("💼 Administração SaaS — Trocar Chave de Licença ou Gerenciar Clientes", expanded=False):
    c_lic1, c_lic2 = st.columns([3, 1])
    with c_lic1:
        nova_ch = st.text_input(
            f"Licença Ativa: {LICENCA_OBJ.get('chave')} ({LICENCA_OBJ.get('cliente_nome')})",
            value=LICENCA_OBJ.get("chave", ""),
            key="barb_troca_lic_input",
        )
    with c_lic2:
        st.write("")
        st.write("")
        if st.button("Aplicar Licença", use_container_width=True, key="btn_barb_trocar_lic"):
            st.session_state["barb_licenca_chave"] = nova_ch.strip().upper()
            st.rerun()
    st.divider()
    renderizar_painel_admin_licencas(APP_KEY, "barb_rodape")
