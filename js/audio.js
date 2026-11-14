/* Trilha do Solo — áudio.
   Síntese de corda dedilhada (Karplus-Strong) com timbre de nylon ou aço, tocador de frases
   (martelo, puxada, slide, bend, vibrato) e bases de acompanhamento com bateria. Sem arquivos de áudio. */
(function () {
  const TS = (window.TS = window.TS || {});
  const T = TS.T;
  const A = {};

  let ctx = null, master = null, busFrase = null, busBase = null, ruido = null;
  const cache = new Map();
  const LIMITE_CACHE = 56;
  A.timbre = 'nylon';

  A.contexto = () => ctx;

  A.garantir = function () {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      // iPhone: sem isto o som some quando a chave lateral está no silencioso.
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* navegador sem suporte */ }
      ctx = new AC();
      const corpo = ctx.createBiquadFilter();
      corpo.type = 'peaking'; corpo.frequency.value = 190; corpo.Q.value = 1.1; corpo.gain.value = 4;
      const topo = ctx.createBiquadFilter();
      topo.type = 'lowpass'; topo.frequency.value = 6500; topo.Q.value = 0.5;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16; comp.ratio.value = 3; comp.attack.value = 0.004; comp.release.value = 0.2;
      master = ctx.createGain(); master.gain.value = 0.85;
      master.connect(corpo); corpo.connect(topo); topo.connect(comp); comp.connect(ctx.destination);
      busFrase = ctx.createGain(); busFrase.gain.value = 1; busFrase.connect(master);
      busBase = ctx.createGain(); busBase.gain.value = 0.6; busBase.connect(master);
      ruido = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.4), ctx.sampleRate);
      const r = ruido.getChannelData(0);
      for (let i = 0; i < r.length; i++) r[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };

  A.definirTimbre = function (t) {
    if (t !== A.timbre) { A.timbre = t; cache.clear(); }
  };
  A.volumeBase = function (v) { if (busBase) busBase.gain.value = v; };

  /* Uma corda: buffer Karplus-Strong + correção fina de afinação via playbackRate. */
  function corda(midi) {
    const chave = A.timbre + ':' + midi;
    if (cache.has(chave)) { const v = cache.get(chave); cache.delete(chave); cache.set(chave, v); return v; }
    const sr = ctx.sampleRate;
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    const p = Math.max(2, Math.round(sr / freq - 0.5));
    const real = sr / (p + 0.5);
    const len = Math.floor(sr * 3);
    const buf = ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    const nylon = A.timbre === 'nylon';
    const brilho = nylon ? 0.3 : 0.6;
    const t60 = (nylon ? 2.3 : 3.4) * Math.max(0.45, Math.min(1.35, Math.pow(2, (52 - midi) / 24)));
    const g = Math.pow(0.001, (p + 0.5) / (t60 * sr));
    let lp = 0, media = 0, pico = 0;
    for (let i = 0; i < p; i++) { lp += brilho * (Math.random() * 2 - 1 - lp); d[i] = lp; media += lp; }
    media /= p;
    for (let i = 0; i < p; i++) { d[i] -= media; pico = Math.max(pico, Math.abs(d[i])); }
    const k = pico > 0 ? 0.9 / pico : 1;
    for (let i = 0; i < p; i++) d[i] *= k;
    d[p] = g * 0.5 * (d[0] + d[p - 1]);
    for (let i = p + 1; i < len; i++) d[i] = g * 0.5 * (d[i - p] + d[i - p - 1]);
    const fade = Math.floor(sr * 0.05);
    for (let i = 0; i < fade; i++) d[len - 1 - i] *= i / fade;
    const v = { buf, rate: freq / real };
    cache.set(chave, v);
    if (cache.size > LIMITE_CACHE) cache.delete(cache.keys().next().value);
    return v;
  }

  /* Cria uma voz a partir de uma especificação: {midi, t, fim, vel, offset, rates:[{t, ate, semis}], vib:{de, ate}} */
  function criarVoz(v, bus, grupo) {
    const s = corda(v.midi);
    const src = ctx.createBufferSource();
    src.buffer = s.buf;
    const pr = src.playbackRate;
    pr.setValueAtTime(s.rate, v.t);
    let atual = 0, ultimo = v.t;
    (v.rates || []).forEach((r) => {
      const ini = Math.max(r.t, ultimo + 0.005);
      const fimR = Math.max(r.ate, ini + 0.01);
      pr.setValueAtTime(s.rate * Math.pow(2, atual / 12), ini);
      pr.linearRampToValueAtTime(s.rate * Math.pow(2, r.semis / 12), fimR);
      atual = r.semis; ultimo = fimR;
    });
    const fim = Math.max(v.fim, v.t + 0.06);
    const g = ctx.createGain();
    g.gain.setValueAtTime(v.vel, v.t);
    g.gain.setValueAtTime(v.vel, Math.max(v.t, fim - 0.045));
    g.gain.linearRampToValueAtTime(0.0001, fim);
    src.connect(g); g.connect(bus);
    let osc = null;
    if (v.vib && v.vib.ate > v.vib.de + 0.1) {
      osc = ctx.createOscillator();
      osc.frequency.value = 5.2;
      const prof = ctx.createGain();
      prof.gain.setValueAtTime(0, v.vib.de);
      prof.gain.linearRampToValueAtTime(s.rate * 0.011, v.vib.de + 0.3);
      osc.connect(prof); prof.connect(pr);
      osc.start(v.vib.de); osc.stop(Math.min(fim, v.vib.ate) + 0.05);
    }
    src.start(v.t, v.offset || 0);
    src.stop(fim + 0.05);
    const item = { src, g, osc };
    grupo.add(item);
    src.onended = () => { grupo.delete(item); try { g.disconnect(); } catch (e) { /* já desconectado */ } };
    return item;
  }

  function pararGrupo(grupo) {
    grupo.forEach((it) => {
      try { it.g.gain.cancelScheduledValues(0); it.g.gain.setValueAtTime(0, ctx.currentTime); } catch (e) { /* nada */ }
      try { it.src.stop(); } catch (e) { /* nada */ }
      try { if (it.osc) it.osc.stop(); } catch (e) { /* nada */ }
    });
    grupo.clear();
  }

  function clique(t, forte, bus, grupo) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = forte ? 2100 : 1500;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(forte ? 0.45 : 0.25, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
    o.connect(g); g.connect(bus);
    o.start(t); o.stop(t + 0.06);
    if (grupo) { const it = { src: o, g, osc: null }; grupo.add(it); o.onended = () => grupo.delete(it); }
  }

  function bumbo(t, grupo) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(130, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    o.connect(g); g.connect(busBase);
    o.start(t); o.stop(t + 0.3);
    const it = { src: o, g, osc: null }; grupo.add(it); o.onended = () => grupo.delete(it);
  }

  function ruidoFiltrado(t, tipo, freq, dur, vol, grupo) {
    const s = ctx.createBufferSource(); s.buffer = ruido;
    const f = ctx.createBiquadFilter(); f.type = tipo; f.frequency.value = freq; f.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(busBase);
    s.start(t); s.stop(t + dur + 0.02);
    const it = { src: s, g, osc: null }; grupo.add(it); s.onended = () => grupo.delete(it);
  }
  const caixa = (t, grupo) => ruidoFiltrado(t, 'bandpass', 1900, 0.16, 0.32, grupo);
  const chimbal = (t, forte, grupo) => ruidoFiltrado(t, 'highpass', 7500, 0.045, forte ? 0.14 : 0.08, grupo);

  /* ---------------- Notas soltas (clique no braço) ---------------- */
  const grupoAvulso = new Set();
  A.tocarNota = function (midi, opts) {
    if (!A.garantir()) return;
    opts = opts || {};
    const t = ctx.currentTime + 0.02;
    criarVoz({ midi, t, fim: t + (opts.dur || 1.4), vel: opts.vel || 0.8, rates: [], vib: null }, busFrase, grupoAvulso);
  };
  A.sinal = function () {
    if (!A.garantir()) return;
    const t = ctx.currentTime + 0.02;
    criarVoz({ midi: 71, t, fim: t + 1.2, vel: 0.5, rates: [] }, busFrase, grupoAvulso);
    criarVoz({ midi: 76, t: t + 0.14, fim: t + 1.6, vel: 0.5, rates: [] }, busFrase, grupoAvulso);
  };

  /* ---------------- Frases ---------------- */
  let fraseAtual = null;

  function agendarEventos(evs, inicio, spb, grupo) {
    const porCorda = {};
    const specs = [];
    evs.forEach((ev) => {
      if (ev.pausa) return;
      const t = inicio + ev.t * spb, dur = ev.d * spb;
      ev.notas.forEach((n) => {
        const ant = porCorda[n.c];
        if (ev.lig === 's' && ant && ev.notas.length === 1) {
          ant.rates.push({ t: Math.max(ant.t + 0.03, t - 0.08), ate: t, semis: n.midi - ant.midi });
          ant.fim = t + dur + 0.2;
          if (ev.v) ant.vib = { de: t + Math.min(0.25, dur * 0.35), ate: t + dur + 0.2 };
          return;
        }
        if (ant) ant.fim = Math.min(ant.fim, t + 0.012);
        const ligado = ev.lig === 'h' || ev.lig === 'p';
        const v = {
          midi: n.midi, t, fim: t + dur + 0.22,
          vel: ligado ? 0.5 : ev.notas.length > 1 ? 0.55 : 0.8,
          offset: ligado ? 0.004 : 0, rates: [], vib: null
        };
        if (ev.b) {
          const ini = t + 0.03, sobe = Math.min(0.18, dur * 0.3);
          v.rates.push({ t: ini, ate: ini + sobe, semis: ev.b });
          if (ev.rel) {
            const volta = t + dur * 0.62;
            v.rates.push({ t: volta, ate: volta + Math.min(0.16, dur * 0.25), semis: 0 });
          }
        }
        if (ev.v) v.vib = { de: t + Math.min(0.25, dur * 0.35), ate: t + dur + 0.2 };
        porCorda[n.c] = v;
        specs.push(v);
      });
    });
    specs.forEach((v) => criarVoz(v, busFrase, grupo));
  }

  /* evs: eventos de TS.T.eventosFrase / eventosMelodia.
     cfg: {bpm, contagem (tempos de clique antes), compasso, loop, aoEvento(i|-1), aoFim()} */
  A.tocarFrase = function (evs, cfg) {
    A.pararFrase();
    if (!A.garantir()) return null;
    const spb = 60 / cfg.bpm;
    const grupo = new Set();
    const timers = [];
    const total = evs.reduce((m, e) => Math.max(m, e.t + e.d), 0);
    const h = { grupo, timers, parado: false };
    let inicio = ctx.currentTime + 0.12;
    const compasso = cfg.compasso || 4;
    if (cfg.contagem) {
      for (let i = 0; i < cfg.contagem; i++) clique(inicio + i * spb, i % compasso === 0, busFrase, grupo);
      inicio += cfg.contagem * spb;
    }
    const rodada = (ini) => {
      if (h.parado) return;
      agendarEventos(evs, ini, spb, grupo);
      evs.forEach((ev, i) => {
        const ms = (ini + ev.t * spb - ctx.currentTime) * 1000;
        timers.push(setTimeout(() => !h.parado && cfg.aoEvento && cfg.aoEvento(ev.pausa ? -1 : i), Math.max(0, ms)));
      });
      const fimMs = (ini + total * spb - ctx.currentTime) * 1000;
      if (cfg.loop) {
        const prox = ini + total * spb + spb; // 1 tempo de respiro entre repetições
        timers.push(setTimeout(() => rodada(prox), Math.max(0, fimMs - 200)));
      } else {
        timers.push(setTimeout(() => { if (!h.parado) { h.parado = true; fraseAtual = null; cfg.aoFim && cfg.aoFim(); } }, fimMs + 350));
      }
    };
    rodada(inicio);
    h.parar = () => {
      if (h.parado) return;
      h.parado = true;
      timers.forEach(clearTimeout);
      pararGrupo(grupo);
      cfg.aoFim && cfg.aoFim();
    };
    fraseAtual = h;
    return h;
  };

  A.pararFrase = function () {
    if (fraseAtual) { const f = fraseAtual; fraseAtual = null; f.parar(); }
  };

  /* ---------------- Bases de acompanhamento ---------------- */
  const Base = {
    tocando: false, cfg: { estilo: 'menor', tom: 9, bpm: 70, ritmo: 'bateria' },
    grupo: new Set(), timer: null, compasso: 0, passo: 0, inicioCompasso: 0, fila: [], ouvintes: new Set(), raf: null, compassos: []
  };
  A.Base = Base;

  const BATIDA = [[0, 'D'], [2, 'D'], [3, 'U'], [5, 'U'], [6, 'D'], [7, 'U']];
  const BOOGIE = [7, 7, 9, 9, 10, 10, 9, 9];

  function tempoPasso(inicioCompasso, passo, spb, swing) {
    const tempo = Math.floor(passo / 2), meio = passo % 2;
    return inicioCompasso + tempo * spb + (meio ? (swing ? spb * 2 / 3 : spb / 2) : 0);
  }

  function batida(t, midis, dir, vel, dur) {
    const notas = dir === 'D' ? midis : midis.slice(-4).reverse();
    notas.forEach((m, i) => {
      const ti = t + i * (dir === 'D' ? 0.013 : 0.009);
      criarVoz({ midi: m, t: ti, fim: ti + dur, vel: vel * (dir === 'D' ? 1 : 0.7), rates: [] }, busBase, Base.grupo);
    });
  }

  function agendarPasso(t) {
    const cfg = Base.cfg, spb = 60 / cfg.bpm, est = cfg.estilo;
    const swing = est === 'blues';
    const ac = Base.compassos[Base.compasso % Base.compassos.length];
    const p = Base.passo;

    if (p % 2 === 0) {
      Base.fila.push({ t, compasso: Base.compasso % Base.compassos.length, tempo: p / 2, acorde: ac.nome });
      if (cfg.ritmo === 'clique' || est === 'metronomo') clique(t, p === 0, busBase, Base.grupo);
    }
    if (cfg.ritmo === 'bateria' && est !== 'metronomo') {
      if (p === 0 || p === 4) bumbo(t, Base.grupo);
      if (p === 2 || p === 6) caixa(t, Base.grupo);
      chimbal(t, p % 2 === 0, Base.grupo);
    }

    if (est === 'drone') {
      const r = 40 + T.pc(ac.raiz - 4);
      const seq = { 0: r + 19, 2: r + 24, 4: r + 24, 6: r + 12 };
      if (seq[p] != null) criarVoz({ midi: seq[p], t, fim: t + spb * 4, vel: p === 6 ? 0.6 : 0.42, rates: [] }, busBase, Base.grupo);
      if (p === 0) criarVoz({ midi: r, t, fim: t + spb * 4.2, vel: 0.55, rates: [] }, busBase, Base.grupo);
    } else if (est === 'blues') {
      const r = 40 + T.pc(ac.raiz - 4);
      const dur = (p % 2 === 0 ? spb * 2 / 3 : spb / 3) * 0.92;
      const vel = p % 2 === 0 ? 0.5 : 0.36;
      criarVoz({ midi: r, t, fim: t + dur, vel, rates: [] }, busBase, Base.grupo);
      criarVoz({ midi: r + BOOGIE[p], t: t + 0.006, fim: t + dur, vel: vel * 0.85, rates: [] }, busBase, Base.grupo);
    } else if (est === 'menor' || est === 'menor2' || est === 'pop') {
      const b = BATIDA.find((x) => x[0] === p);
      if (b) {
        const midis = T.acorde(ac.raiz, ac.tipo === 'M' ? 'M' : ac.tipo);
        batida(t, midis, b[1], b[1] === 'D' ? 0.36 : 0.26, spb * 1.1);
      }
      if (p === 0) criarVoz({ midi: T.acorde(ac.raiz, 'm')[0], t, fim: t + spb * 2, vel: 0.5, rates: [] }, busBase, Base.grupo);
    }
  }

  function agendador() {
    if (!Base.tocando) return;
    const spb = 60 / Base.cfg.bpm;
    const swing = Base.cfg.estilo === 'blues';
    const horizonte = ctx.currentTime + 0.15;
    for (;;) {
      const t = tempoPasso(Base.inicioCompasso, Base.passo, spb, swing);
      if (t > horizonte) break;
      agendarPasso(t);
      Base.passo++;
      if (Base.passo >= 8) { Base.passo = 0; Base.compasso++; Base.inicioCompasso += 4 * spb; }
    }
  }

  function lacoVisual() {
    if (!Base.tocando) return;
    const agora = ctx.currentTime;
    while (Base.fila.length && Base.fila[0].t <= agora) {
      const ev = Base.fila.shift();
      Base.ouvintes.forEach((fn) => { try { fn(ev); } catch (e) { /* ouvinte com erro não para a base */ } });
    }
    Base.raf = requestAnimationFrame(lacoVisual);
  }

  Base.configurar = function (cfg) {
    const antes = Object.assign({}, Base.cfg);
    Object.assign(Base.cfg, cfg);
    if (Base.tocando && (antes.estilo !== Base.cfg.estilo || antes.tom !== Base.cfg.tom)) {
      Base.compassos = T.compassosBase(Base.cfg.estilo, Base.cfg.tom);
      Base.compasso = 0; Base.passo = 0;
      Base.inicioCompasso = ctx.currentTime + 0.1;
      Base.fila = [];
      pararGrupo(Base.grupo);
    } else if (Base.tocando && antes.bpm !== Base.cfg.bpm) {
      // novo andamento: começa o próximo compasso já no bpm novo
      if (Base.passo) Base.compasso++;
      Base.passo = 0;
      Base.inicioCompasso = ctx.currentTime + 0.05;
      Base.fila = [];
    }
  };

  Base.iniciar = function (cfg) {
    if (!A.garantir()) return;
    if (cfg) Object.assign(Base.cfg, cfg);
    Base.compassos = T.compassosBase(Base.cfg.estilo, Base.cfg.tom);
    Base.compasso = 0; Base.passo = 0; Base.fila = [];
    Base.inicioCompasso = ctx.currentTime + 0.12;
    Base.tocando = true;
    clearInterval(Base.timer);
    Base.timer = setInterval(agendador, 25);
    agendador();
    cancelAnimationFrame(Base.raf);
    Base.raf = requestAnimationFrame(lacoVisual);
    Base.ouvintes.forEach((fn) => fn({ estado: 'iniciou' }));
  };

  Base.parar = function () {
    Base.tocando = false;
    clearInterval(Base.timer);
    cancelAnimationFrame(Base.raf);
    if (ctx) pararGrupo(Base.grupo);
    Base.fila = [];
    Base.ouvintes.forEach((fn) => fn({ estado: 'parou' }));
  };

  Base.ouvir = function (fn) { Base.ouvintes.add(fn); return () => Base.ouvintes.delete(fn); };

  TS.Audio = A;
})();
