/*
 * Contador de café - Shelly Plug M Gen3 (firmware 2.2.0) - v3
 *
 * Mede cada bebida inteira na própria tomada, a cada segundo:
 *   - começa quando a máquina passa de 50 W
 *   - acaba quando fica 10 s seguidos abaixo de 50 W
 *   - só conta se teve pelo menos 1 s acima de 600 W (a resistência a aquecer água)
 *
 * No fim envia ao Home Assistant, por webhook, a duração total, os segundos a trabalhar,
 * os segundos acima de 600 W, a potência máxima, a energia, o tempo que a máquina esteve
 * parada antes e o registo segundo a segundo da potência (tr, em dezenas de W).
 *
 * Cada bebida fica guardada num de 10 lugares da memória da tomada (KVS cafe_b0..cafe_b9).
 * As que não chegaram ao HA são reenviadas de 5 em 5 minutos, mesmo depois de a tomada reiniciar.
 * Teste da ligação: abrir http://<ip-da-tomada>/script/1/teste
 */

let URL = 'http://<IP_DO_HA>:8123/api/webhook/<O_TEU_WEBHOOK_ID>';

let C = {
  ACT: 50,      // W: acima disto a máquina está a trabalhar
  HI: 600,      // W: acima disto está a aquecer água (há bebida)
  QUIET: 10,    // s abaixo de ACT para dar a bebida por terminada
  TRMAX: 400    // máximo de segundos guardados no registo tr
};

let st = { on: false, t0: 0, ts: 0, last: 0, hiS: 0, actS: 0, pmax: 0, e0: 0,
           idle: 0, endPrev: 0, ePrev: 0, tr: [] };
let seq = 0;
let q = [];   // últimas 10 bebidas (para reenvio)

// ---- arranque: recupera a sequência e as bebidas guardadas na KVS ----
function ler(i) {
  if (i > 9) { return; }
  Shelly.call('KVS.Get', { key: 'cafe_b' + JSON.stringify(i) }, function (r) {
    if (r && r.value) {
      let a = JSON.parse(r.value);
      q.push({ seq: a[0], ts: a[1], dur: a[2], act: a[3], hi: a[4], pmax: a[5],
               wh: a[6], idle: a[7], v: 3, ok: a[8] });
    }
    ler(i + 1);
  });
}

Shelly.call('KVS.Get', { key: 'cafe_seq' }, function (r) {
  if (r && r.value) { seq = JSON.parse(r.value); }
  ler(0);
});

function guardar(ev) {
  Shelly.call('KVS.Set', {
    key: 'cafe_b' + JSON.stringify(ev.seq % 10),
    value: JSON.stringify([ev.seq, ev.ts, ev.dur, ev.act, ev.hi, ev.pmax, ev.wh, ev.idle, ev.ok])
  });
}

function enviar(ev, tr) {
  let b = { seq: ev.seq, ts: ev.ts, dur: ev.dur, act: ev.act, hi: ev.hi,
            pmax: ev.pmax, wh: ev.wh, idle: ev.idle, v: 3 };
  if (ev.teste) { b = { teste: 1 }; }
  if (tr) { b.tr = tr; }
  Shelly.call('HTTP.POST',
    { url: URL, body: JSON.stringify(b), content_type: 'application/json', timeout: 10 },
    function (r, ec) {
      // só marca como entregue se o HA respondeu 200
      if (ec === 0 && r && r.code === 200 && ev.seq && !ev.ok) {
        ev.ok = 1;
        guardar(ev);
      }
    });
}

function registar(ev, tr) {
  seq = seq + 1;
  ev.seq = seq;
  ev.ok = 0;
  q.push(ev);
  if (q.length > 10) { q.splice(0, q.length - 10); }
  Shelly.call('KVS.Set', { key: 'cafe_seq', value: JSON.stringify(seq) });
  guardar(ev);
  enviar(ev, tr);
}

let s0 = Shelly.getComponentStatus('switch:0');
if (s0 && s0.aenergy) { st.ePrev = s0.aenergy.total; }

// ---- a cada segundo ----
Timer.set(1000, true, function () {
  let s = Shelly.getComponentStatus('switch:0');
  if (!s || !s.aenergy) { return; }
  let sys = Shelly.getComponentStatus('sys');
  let t = sys.uptime;
  let p = s.apower;
  let e = s.aenergy.total;

  if (p > C.ACT) {
    if (!st.on) {                       // início de uma sessão
      st.on = true;
      st.t0 = t;
      st.ts = sys.unixtime || 0;
      st.e0 = st.ePrev;
      st.hiS = 0; st.actS = 0; st.pmax = 0; st.tr = [];
      st.idle = st.endPrev ? t - st.endPrev : 99999;   // segundos parada antes
    }
    st.last = t;
    st.actS = st.actS + 1;
    if (p > C.HI) { st.hiS = st.hiS + 1; }
    if (p > st.pmax) { st.pmax = p; }
  }

  if (st.on && st.tr.length < C.TRMAX) { st.tr.push(Math.round(p / 10)); }

  if (st.on && p <= C.ACT && t - st.last >= C.QUIET) {   // fim da sessão
    st.on = false;
    if (st.hiS > 0) {
      st.endPrev = st.last;
      let n = st.last - st.t0 + 1;
      registar({ ts: st.ts, dur: n, act: st.actS, hi: st.hiS, pmax: Math.round(st.pmax),
                 wh: Math.round((e - st.e0) * 100) / 100, idle: st.idle },
               st.tr.slice(0, n).join(','));
    }
    st.tr = [];
  }
  st.ePrev = e;
});

// ---- reenvio do que ficou por entregar (de 5 em 5 min) ----
Timer.set(300000, true, function () {
  for (let i = 0; i < q.length; i++) {
    if (!q[i].ok) { enviar(q[i], null); }
  }
});

// ---- endpoint de teste ----
HTTPServer.registerEndpoint('teste', function (req, res) {
  enviar({ teste: 1 }, null);
  res.code = 200;
  res.body = 'teste enviado';
  res.send();
});
