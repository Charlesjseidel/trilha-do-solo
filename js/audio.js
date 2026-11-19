/* Trilha do Solo — áudio.
   Síntese de corda dedilhada (Karplus-Strong) com timbre de nylon ou aço, tocador de frases
   (martelo, puxada, slide, bend, vibrato) e bases de acompanhamento com bateria. Sem arquivos de áudio. */
(function () {
  const TS = (window.TS = window.TS || {});
  const T = TS.T;
  const A = {};

  let ctx = null, master = null, busFrase = null, busBase = null, busViolao = null, busGrave = null, ruido = null;
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
      topo.type = 'lowpass'; topo.frequency.value = 9000; topo.Q.value = 0.5;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16; comp.ratio.value = 3; comp.attack.value = 0.004; comp.release.value = 0.2;
      master = ctx.createGain(); master.gain.value = 0.85;
      master.connect(corpo); corpo.connect(topo); topo.connect(comp);
      ligarTeto(comp);
      busFrase = ctx.createGain(); busFrase.gain.value = 1.4; busFrase.connect(master);
      busBase = ctx.createGain(); busBase.gain.value = 0.6; busBase.connect(master);
      // o violão da base passa por um filtro só dele; baixo e bateria vão direto
      busViolao = ctx.createGain(); busViolao.gain.value = 1.5; busViolao.connect(busBase);
      busGrave = ctx.createGain(); busGrave.gain.value = 1; busGrave.connect(master);
      ruido = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 1.2), ctx.sampleRate);
      const r = ruido.getChannelData(0);
      for (let i = 0; i < r.length; i++) r[i] = Math.random() * 2 - 1;
      ligarSala();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };

  /* Teto: o compressor deixa passar o estalo inicial do bumbo e da caixa, e a soma passaria do máximo que
     o aparelho reproduz (o som "racha"). Esta curva arredonda só o que passa de 70% do máximo e nunca chega a 100%.
     O WaveShaper só enxerga entradas de -1 a 1, por isso o sinal entra pela metade e a curva já devolve no tamanho certo. */
  function ligarTeto(origem) {
    if (!ctx.createWaveShaper) { origem.connect(ctx.destination); return; }
    const N = 2049, curva = new Float32Array(N), joelho = 0.7, folga = 0.28;
    for (let i = 0; i < N; i++) {
      const x = ((i / (N - 1)) * 2 - 1) * 2;            // entrada real: de -2 a 2
      const a = Math.abs(x);
      const y = a <= joelho ? a : joelho + folga * Math.tanh((a - joelho) / folga);
      curva[i] = x < 0 ? -y : y;
    }
    const metade = ctx.createGain(); metade.gain.value = 0.5;
    const teto = ctx.createWaveShaper();
    teto.curve = curva;
    teto.oversample = '2x';
    origem.connect(metade); metade.connect(teto); teto.connect(ctx.destination);
  }

  /* Sala: reverberação curta gerada na hora (sem arquivo). Dá "ar" ao som seco das cordas. */
  function ligarSala() {
    if (!ctx.createConvolver) return;
    const sr = ctx.sampleRate, len = Math.floor(sr * 1.6);
    const ir = ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      let lp = 0;
      const sobe = Math.floor(sr * 0.004);
      for (let i = 0; i < len; i++) {
        lp += 0.38 * (Math.random() * 2 - 1 - lp);
        d[i] = lp * Math.pow(1 - i / len, 3.4) * (i < sobe ? i / sobe : 1);
      }
    }
    const sala = ctx.createConvolver();
    sala.buffer = ir;
    const volta = ctx.createGain(); volta.gain.value = 0.9;
    sala.connect(volta); volta.connect(master);
    const envioFrase = ctx.createGain(); envioFrase.gain.value = 0.24;
    const envioBase = ctx.createGain(); envioBase.gain.value = 0.13;
    busFrase.connect(envioFrase); envioFrase.connect(sala);
    busBase.connect(envioBase); envioBase.connect(sala);
  }

  A.definirTimbre = function (t) {
    if (t !== A.timbre) { A.timbre = t; cache.clear(); }
  };
  A.volumeBase = function (v) { if (busBase) { busBase.gain.value = v; busGrave.gain.value = Math.min(1.4, v / 0.6); } };

  /* Uma corda: buffer Karplus-Strong + correção fina de afinação via playbackRate. */
  function corda(midi) {
    const chave = A.timbre + ':' + midi;
    if (cache.has(chave)) { const v = cache.get(chave); cache.delete(chave); cache.set(chave, v); return v; }
    const sr = ctx.sampleRate;
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    const nylon = A.timbre === 'nylon';
    // s = peso do filtro do laço: menor segura o brilho por mais tempo (aço); 0,5 apaga os agudos logo (nylon)
    const s = nylon ? 0.5 : 0.38;
    const p = Math.max(2, Math.round(sr / freq - s));
    const real = sr / (p + s);
    const len = Math.floor(sr * 3);
    const buf = ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    const brilho = nylon ? 0.4 : 0.72;
    const t60 = (nylon ? 2.6 : 3.8) * Math.max(0.45, Math.min(1.35, Math.pow(2, (52 - midi) / 24)));
    const g = Math.pow(0.001, (p + s) / (t60 * sr));
    // ataque: ruído suavizado, passado por um "pente" que imita o ponto onde o dedo ou a palheta toca a corda
    const x = new Float32Array(p);
    let lp = 0, media = 0, pico = 0;
    for (let i = 0; i < p; i++) { lp += brilho * (Math.random() * 2 - 1 - lp); x[i] = lp; }
    const ponto = Math.max(1, Math.round(p * (nylon ? 0.24 : 0.14)));
    for (let i = 0; i < p; i++) { d[i] = x[i] - 0.85 * x[(i + p - ponto) % p]; media += d[i]; }
    media /= p;
    for (let i = 0; i < p; i++) { d[i] -= media; pico = Math.max(pico, Math.abs(d[i])); }
    const k = pico > 0 ? 0.9 / pico : 1;
    for (let i = 0; i < p; i++) d[i] *= k;
    d[p] = g * ((1 - s) * d[0] + s * d[p - 1]);
    for (let i = p + 1; i < len; i++) d[i] = g * ((1 - s) * d[i - p] + s * d[i - p - 1]);
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

  /* ---------------- Bateria e baixo (sintetizados) ---------------- */
  function guardar(grupo, src, g, osc) {
    const it = { src, g, osc: osc || null };
    grupo.add(it);
    src.onended = () => grupo.delete(it);
  }

  /* Um tom que cai de frequência: o corpo do bumbo e da caixa. */
  function tomCaindo(t, de, ate, queda, dur, vol, bus, grupo, tipo) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    if (tipo) o.type = tipo;
    o.frequency.setValueAtTime(de, t);
    o.frequency.exponentialRampToValueAtTime(ate, t + queda);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus);
    o.start(t); o.stop(t + dur + 0.02);
    guardar(grupo, o, g);
  }

  function ruidoFiltrado(t, tipo, freq, dur, vol, grupo, q) {
    const s = ctx.createBufferSource(); s.buffer = ruido;
    const f = ctx.createBiquadFilter(); f.type = tipo; f.frequency.value = freq; f.Q.value = q || 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(busBase);
    s.start(t, Math.random() * 0.1); s.stop(t + dur + 0.02);
    guardar(grupo, s, g);
  }

  function bumbo(t, vel, grupo) {
    tomCaindo(t, 150, 46, 0.11, 0.3, vel * 0.85, busGrave, grupo);
    ruidoFiltrado(t, 'lowpass', 2600, 0.02, vel * 0.25, grupo);   // o "tec" da batida
  }
  function caixa(t, vel, grupo) {
    tomCaindo(t, 230, 165, 0.06, 0.12, vel * 0.7, busBase, grupo, 'triangle');   // pele
    ruidoFiltrado(t, 'bandpass', 2300, 0.19, vel, grupo, 0.6);                    // esteira
    ruidoFiltrado(t, 'highpass', 5200, 0.1, vel * 0.45, grupo);
  }
  const aro = (t, grupo) => {
    tomCaindo(t, 1750, 1600, 0.02, 0.035, 0.28, busBase, grupo, 'triangle');
    ruidoFiltrado(t, 'bandpass', 3400, 0.025, 0.16, grupo, 2);
  };
  const chimbal = (t, vel, aberto, grupo) => ruidoFiltrado(t, 'highpass', aberto ? 6800 : 8200, aberto ? 0.28 : 0.045, vel, grupo);
  const prato = (t, grupo) => {
    ruidoFiltrado(t, 'highpass', 5200, 1.1, 0.13, grupo);
    ruidoFiltrado(t, 'bandpass', 9000, 0.7, 0.07, grupo, 1.4);
  };

  /* Volume do baixo em relação ao que a levada pede. Ajustado medindo a mistura: o baixo sustenta a nota,
     então com o mesmo pico ele soma muito mais volume que as cordas dedilhadas. */
  const NIVEL_BAIXO = 0.36;

  /* Baixo: onda triangular filtrada + uma oitava acima bem baixinha (para aparecer em caixas pequenas e no celular). */
  function baixo(midi, t, dur, vel, grupo) {
    const f0 = 440 * Math.pow(2, (midi - 69) / 12);
    const o = ctx.createOscillator(), o2 = ctx.createOscillator();
    o.type = 'triangle'; o.frequency.setValueAtTime(f0, t);
    o2.type = 'sine'; o2.frequency.setValueAtTime(f0 * 2, t);
    const g2 = ctx.createGain(); g2.gain.setValueAtTime(0.42, t);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 0.9;
    f.frequency.setValueAtTime(900, t);
    f.frequency.exponentialRampToValueAtTime(320, t + 0.18);
    const g = ctx.createGain();
    const fim = t + Math.max(0.09, dur);
    vel *= NIVEL_BAIXO;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.008);
    g.gain.linearRampToValueAtTime(vel * 0.72, t + 0.09);
    g.gain.setValueAtTime(vel * 0.72, Math.max(t + 0.09, fim - 0.05));
    g.gain.linearRampToValueAtTime(0.0001, fim);
    o.connect(f); o2.connect(g2); g2.connect(f); f.connect(g); g.connect(busGrave);
    o.start(t); o.stop(fim + 0.03);
    o2.start(t); o2.stop(fim + 0.03);
    guardar(grupo, o, g, o2);
  }

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
    tocando: false, cfg: { estilo: 'menor', tom: 9, bpm: 70, ritmo: 'bateria', baixo: true, contagem: false },
    grupo: new Set(), timer: null, compasso: 0, passo: 0, inicioCompasso: 0, fila: [], ouvintes: new Set(), raf: null, compassos: []
  };
  A.Base = Base;

  /* Levadas: o "jeito de tocar" de cada base. A chave é a mesma de T.PROGRESSOES e de TS.estilosBase.
     Grade: 4 tempos × div passos (div 2 = colcheias; div 3 = tercinas, o balanço do blues lento).
     swing: a 2ª colcheia de cada tempo atrasa (shuffle).
     Bateria, um caractere por passo: b bumbo, c caixa (r = aro), h chimbal (o = aberto). X forte, x fraco, . nada.
     baixo: R tônica, 3 terça, 5 quinta, 6 sexta (ou sétima no acorde menor), 7 sétima, 8 oitava.
     viol: batida (D para baixo, U para cima, minúscula = fraca, x = seca), arpejo (índice da nota do acorde),
           boogie (a levada de duas cordas do blues), power (P cheio, p abafado), pedal. */
  const LEVADAS = {
    metronomo: { div: 2 },
    drone: { div: 2, viol: { t: 'pedal' } },
    menor: { div: 2, b: 'X..xX...', c: '..X...X.', h: 'XxXxXxXx', baixo: 'R..RR.5.', viol: { t: 'batida', p: 'D.DU.UDU' } },
    menor2: { div: 2, b: 'X.....x.', c: '....r...', h: 'x.x.x.x.', baixo: 'R.....5.', viol: { t: 'arpejo', p: [0, 1, 2, 3, 4, 3, 2, 3] } },
    rock3: { div: 2, b: 'X..XX...', c: '..X...X.', h: 'XxXxXxXx', baixo: 'RRRRRRRR', viol: { t: 'batida', p: 'D.D.DUDU' } },
    descida: { div: 2, b: 'X..X..x.', c: '..X...X.', h: 'XxXxXxXx', baixo: 'R..R..R.', viol: { t: 'batida', p: 'D..D..DU' } },
    balada: { div: 2, b: 'X.....X.', c: '....X...', h: 'x.x.x.x.', baixo: 'R.....5.', viol: { t: 'arpejo', p: [0, 2, 3, 4, 3, 2, 3, 2] } },
    epica: { div: 2, b: 'X..x..X.', c: '....X...', h: 'xxXxxxXx', baixo: 'R...R.5.', viol: { t: 'batida', p: 'D...d.DU' } },
    pesado: { div: 2, b: 'X..XX...', c: '..X...X.', h: 'XxXxXxXx', baixo: 'RRRRRRRR', viol: { t: 'power', p: 'PppPppPp' } },
    blues: { div: 2, swing: true, b: 'X...X...', c: '..X...X.', h: 'XxXxXxXx', baixo: 'R.3.5.6.', viol: { t: 'boogie' } },
    bluesLento: { div: 3, b: 'X.....X....x', c: '...X.....X..', h: 'XxxXxxXxxXxx', baixo: 'R..3..5..6..', viol: { t: 'batida', p: 'D....uD..d.u' } },
    bluesMenor: { div: 2, b: 'X..x..X.', c: '..X...X.', h: 'XxXxXxXx', baixo: 'R..R..5.', viol: { t: 'batida', p: 'D.DU.Ud.' } },
    rocknroll: { div: 2, b: 'X...X...', c: '..X...X.', h: 'XXXXXXXX', baixo: 'R3567653', viol: { t: 'boogie' } },
    pop: { div: 2, b: 'X...X.x.', c: '..X...X.', h: 'XxXxXxXx', baixo: 'R..RR...', viol: { t: 'batida', p: 'D.DU.UDU' } },
    anos50: { div: 3, b: 'X.....X.....', c: '...X.....X..', h: 'XxxXxxXxxXxx', baixo: 'R.....R..5..', viol: { t: 'arpejo', p: [0, 2, 3, 4, 3, 2, 1, 2, 3, 4, 3, 2] } },
    country: { div: 2, b: 'X...X...', c: '..x...x.', h: '..x...x.', baixo: 'R...5...', viol: { t: 'batida', p: '..DU..DU' } },
    rockMaior: { div: 2, b: 'X..XX...', c: '..X...X.', h: 'XxXxXxXx', baixo: 'R.RR.R5.', viol: { t: 'batida', p: 'D.DU.UDU' } },
    andaluz: { div: 2, b: 'X..X..X.', c: '..r...r.', h: 'xxXxxxXx', baixo: 'R..R..5.', viol: { t: 'batida', p: 'D.DUdUDU' } },
    latino: { div: 2, b: 'X..x..X.', c: '..r..r..', h: 'xxXxxxXx', baixo: 'R..5R.5.', viol: { t: 'batida', p: 'D..x.UxU' } },
    reggae: { div: 2, b: '....X...', c: '....r...', h: 'x.xXx.xX', baixo: 'R..R.5..', viol: { t: 'batida', p: '..xu..xu' } }
  };
  A.LEVADAS = LEVADAS;
  const BOOGIE = [7, 7, 9, 9, 10, 10, 9, 9];

  const levada = () => LEVADAS[Base.cfg.estilo] || LEVADAS.metronomo;

  function tempoPasso(inicioCompasso, passo, spb, lv) {
    const tempo = Math.floor(passo / lv.div), sub = passo % lv.div;
    const frac = lv.swing && sub === 1 ? 2 / 3 : sub / lv.div;
    return inicioCompasso + (tempo + frac) * spb;
  }

  function batida(t, midis, dir, vel, dur) {
    const baixo2 = dir === 'D';
    const notas = baixo2 ? midis : midis.slice(-4).reverse();
    const humano = 0.9 + Math.random() * 0.2;
    notas.forEach((m, i) => {
      const ti = t + i * (baixo2 ? 0.014 : 0.009);
      criarVoz({ midi: m, t: ti, fim: ti + dur, vel: vel * humano * (baixo2 ? 1 : 0.7), rates: [] }, busViolao, Base.grupo);
    });
  }

  function tocarViolaoBase(lv, ac, p, t, spb) {
    const v = lv.viol;
    if (!v) return;
    const r = 40 + T.pc(ac.raiz - 4);
    const passoT = spb / lv.div;
    if (v.t === 'pedal') {
      const seq = { 0: r + 19, 2: r + 24, 4: r + 24, 6: r + 12 };
      if (seq[p] != null) criarVoz({ midi: seq[p], t, fim: t + spb * 4, vel: p === 6 ? 0.6 : 0.42, rates: [] }, busViolao, Base.grupo);
      if (p === 0) criarVoz({ midi: r, t, fim: t + spb * 4.2, vel: 0.55, rates: [] }, busViolao, Base.grupo);
    } else if (v.t === 'boogie') {
      const forte = p % 2 === 0;
      const dur = (lv.swing ? (forte ? spb * 2 / 3 : spb / 3) : passoT) * 0.92;
      const vel = forte ? 0.5 : 0.36;
      criarVoz({ midi: r, t, fim: t + dur, vel, rates: [] }, busViolao, Base.grupo);
      criarVoz({ midi: r + BOOGIE[p % 8], t: t + 0.006, fim: t + dur, vel: vel * 0.85, rates: [] }, busViolao, Base.grupo);
    } else if (v.t === 'power') {
      const ch = v.p[p];
      if (ch !== 'P' && ch !== 'p') return;
      const cheio = ch === 'P';
      const notas = cheio ? [r, r + 7, r + 12] : [r, r + 7];
      notas.forEach((m, i) => criarVoz({ midi: m, t: t + i * 0.006, fim: t + passoT * (cheio ? 0.95 : 0.45), vel: cheio ? 0.5 : 0.34, rates: [] }, busViolao, Base.grupo));
    } else if (v.t === 'arpejo') {
      const midis = T.acorde(ac.raiz, ac.tipo);
      const i = v.p[p];
      if (i == null) return;
      criarVoz({ midi: midis[Math.min(i, midis.length - 1)], t, fim: t + spb * 2.4, vel: p === 0 ? 0.5 : 0.4, rates: [] }, busViolao, Base.grupo);
    } else if (v.t === 'batida') {
      const ch = v.p[p];
      if (!ch || ch === '.') return;
      const midis = T.acorde(ac.raiz, ac.tipo);
      if (ch === 'x') batida(t, midis.slice(-3), 'D', 0.34, 0.075);
      else if (ch === 'D') batida(t, midis, 'D', 0.36, spb * 1.15);
      else if (ch === 'd') batida(t, midis, 'D', 0.24, spb * 0.9);
      else if (ch === 'U') batida(t, midis, 'U', 0.36, spb * 0.9);
      else if (ch === 'u') batida(t, midis, 'U', 0.26, spb * 0.6);
    }
  }

  function tocarBaixoBase(lv, ac, p, t, spb) {
    const ch = lv.baixo && lv.baixo[p];
    if (!ch || ch === '.') return;
    const menorAc = ac.tipo === 'm' || ac.tipo === 'm7' || ac.tipo === '5';
    const interv = { R: 0, 3: menorAc ? 3 : 4, 5: 7, 6: menorAc ? 10 : 9, 7: 10, 8: 12 }[ch];
    if (interv == null) return;
    const passos = 4 * lv.div;
    let n = 1;
    while (p + n < passos && lv.baixo[p + n] === '.') n++;
    const dur = Math.min(n * spb / lv.div, spb * 2) * 0.9;
    baixo(28 + T.pc(ac.raiz - 4) + interv, t, dur, p === 0 ? 0.62 : 0.5, Base.grupo);
  }

  function tocarBateriaBase(lv, p, t, iComp, nComp) {
    if (!lv.b) return;
    const passos = 4 * lv.div;
    const b = lv.b[p], c = lv.c[p], h = lv.h[p];
    // virada: no último tempo do ciclo (4 compassos ou mais), a caixa cresce e chama o recomeço
    const virada = nComp >= 4 && iComp === nComp - 1 && p >= passos - lv.div;
    if (b === 'X' || b === 'x') bumbo(t, b === 'X' ? 0.95 : 0.6, Base.grupo);
    if (virada) caixa(t, 0.3 + 0.1 * (p - (passos - lv.div)), Base.grupo);
    else if (c === 'X' || c === 'x') caixa(t, c === 'X' ? 0.46 : 0.2, Base.grupo);
    else if (c === 'r') aro(t, Base.grupo);
    if (h === 'X' || h === 'x') chimbal(t, h === 'X' ? 0.13 : 0.07, false, Base.grupo);
    else if (h === 'o') chimbal(t, 0.1, true, Base.grupo);
    if (p === 0 && iComp === 0 && Base.compasso > 0 && nComp >= 4) prato(t, Base.grupo);
  }

  function agendarPasso(t) {
    const cfg = Base.cfg, spb = 60 / cfg.bpm, est = cfg.estilo;
    const lv = levada();
    const p = Base.passo;
    const noTempo = p % lv.div === 0;

    // contagem: um compasso de cliques antes de a base entrar
    if (Base.compasso < 0) {
      if (noTempo) {
        clique(t, p === 0, busBase, Base.grupo);
        Base.fila.push({ t, contagem: p / lv.div + 1 });
      }
      return;
    }

    const nComp = Base.compassos.length;
    const iComp = Base.compasso % nComp;
    const ac = Base.compassos[iComp];
    if (noTempo) {
      Base.fila.push({ t, compasso: iComp, tempo: p / lv.div, acorde: ac.nome });
      if (cfg.ritmo === 'clique' || est === 'metronomo') clique(t, p === 0, busBase, Base.grupo);
    }
    if (est === 'metronomo') return;
    if (cfg.ritmo === 'bateria') tocarBateriaBase(lv, p, t, iComp, nComp);
    if (cfg.baixo !== false) tocarBaixoBase(lv, ac, p, t, spb);
    tocarViolaoBase(lv, ac, p, t, spb);
  }

  function agendador() {
    if (!Base.tocando) return;
    const spb = 60 / Base.cfg.bpm;
    const lv = levada();
    const horizonte = ctx.currentTime + 0.15;
    for (;;) {
      const t = tempoPasso(Base.inicioCompasso, Base.passo, spb, lv);
      if (t > horizonte) break;
      agendarPasso(t);
      Base.passo++;
      if (Base.passo >= 4 * lv.div) { Base.passo = 0; Base.compasso++; Base.inicioCompasso += 4 * spb; }
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
    // contagem: o compasso -1 é só de cliques (1, 2, 3, 4) para você entrar junto
    Base.compasso = Base.cfg.contagem && Base.cfg.estilo !== 'metronomo' ? -1 : 0;
    Base.passo = 0; Base.fila = [];
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
