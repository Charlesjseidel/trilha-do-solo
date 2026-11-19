/* Trilha do Solo — teoria: notas, desenhos da pentatônica, encaixe de melodias e transposição. */
(function () {
  const TS = (window.TS = window.TS || {});
  const T = {};

  T.NOMES = ['Dó', 'Dó♯', 'Ré', 'Mi♭', 'Mi', 'Fá', 'Fá♯', 'Sol', 'Lá♭', 'Lá', 'Si♭', 'Si'];
  T.CIFRAS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  T.ABERTAS = [null, 64, 59, 55, 50, 45, 40]; // índice = número da corda (1 = Mi aguda)
  T.CORDAS = [null, '1ª (Mi aguda)', '2ª (Si)', '3ª (Sol)', '4ª (Ré)', '5ª (Lá)', '6ª (Mi grave)'];
  T.MAX_CASA = 15;

  T.pc = (n) => ((n % 12) + 12) % 12;
  T.altura = (c, f) => T.ABERTAS[c] + f;
  T.nome = (n) => T.NOMES[T.pc(n)];
  T.cifra = (n) => T.CIFRAS[T.pc(n)];
  T.nomeTom = (raiz, tipo) => T.NOMES[T.pc(raiz)] + (tipo === 'maior' ? ' maior' : ' menor');

  /* Os 5 desenhos: casas relativas à tônica menor na 6ª corda, por corda (1..6), e dedos sugeridos. */
  T.DESENHOS = {
    1: { casas: { 6: [0, 3], 5: [0, 2], 4: [0, 2], 3: [0, 2], 2: [0, 3], 1: [0, 3] }, dedos: { 6: [1, 4], 5: [1, 3], 4: [1, 3], 3: [1, 3], 2: [1, 4], 1: [1, 4] } },
    2: { casas: { 6: [3, 5], 5: [2, 5], 4: [2, 5], 3: [2, 4], 2: [3, 5], 1: [3, 5] }, dedos: { 6: [2, 4], 5: [1, 4], 4: [1, 4], 3: [1, 3], 2: [2, 4], 1: [2, 4] } },
    3: { casas: { 6: [5, 7], 5: [5, 7], 4: [5, 7], 3: [4, 7], 2: [5, 8], 1: [5, 7] }, dedos: { 6: [1, 3], 5: [1, 3], 4: [1, 3], 3: [1, 4], 2: [1, 4], 1: [1, 3] } },
    4: { casas: { 6: [7, 10], 5: [7, 10], 4: [7, 9], 3: [7, 9], 2: [8, 10], 1: [7, 10] }, dedos: { 6: [1, 4], 5: [1, 4], 4: [1, 3], 3: [1, 3], 2: [2, 4], 1: [1, 4] } },
    5: { casas: { 6: [10, 12], 5: [10, 12], 4: [9, 12], 3: [9, 12], 2: [10, 12], 1: [10, 12] }, dedos: { 6: [2, 4], 5: [2, 4], 4: [1, 4], 3: [1, 4], 2: [2, 4], 1: [2, 4] } }
  };

  /* Modos de visualização. tom = tônica escolhida pelo usuário. */
  T.MODOS = {
    menor: { nome: 'Pentatônica menor', curto: 'Menor' },
    maior: { nome: 'Pentatônica maior', curto: 'Maior' },
    blues: { nome: 'Escala blues', curto: 'Blues' },
    completa: { nome: 'Escala completa (menor natural)', curto: 'Completa' }
  };

  T.escala = function (modo, tom) {
    tom = T.pc(tom);
    if (modo === 'maior') {
      return {
        pcMenor: T.pc(tom - 3), centro: tom,
        tons: [0, 2, 4, 7, 9].map((i) => T.pc(tom + i)), extras: [],
        grau: { 0: '1', 2: '2', 4: '3', 7: '5', 9: '6' }, rel: tom
      };
    }
    const base = {
      pcMenor: tom, centro: tom,
      tons: [0, 3, 5, 7, 10].map((i) => T.pc(tom + i)), extras: [],
      grau: { 0: '1', 3: '♭3', 5: '4', 7: '5', 10: '♭7', 6: '♭5', 2: '2', 8: '♭6' }, rel: tom
    };
    if (modo === 'blues') base.extras = [T.pc(tom + 6)];
    if (modo === 'completa') base.extras = [T.pc(tom + 2), T.pc(tom + 8)];
    return base;
  };

  T.rotuloGrau = function (esc, altura) {
    return esc.grau[T.pc(altura - esc.rel)] || '';
  };

  /* Todas as ocorrências de um desenho dentro do braço (casas 0..max). */
  T.instancias = function (pcMenor, d, max) {
    max = max == null ? T.MAX_CASA : max;
    const r = T.pc(pcMenor - 4); // casa da tônica menor na 6ª corda
    const def = T.DESENHOS[d];
    const out = [];
    for (const k of [-12, 0, 12]) {
      const pos = [];
      let de = 99, ate = -99;
      for (let c = 1; c <= 6; c++) {
        def.casas[c].forEach((o, i) => {
          const f = r + k + o;
          pos.push({ c, f, dedo: def.dedos[c][i] });
          de = Math.min(de, f);
          ate = Math.max(ate, f);
        });
      }
      if (de >= 0 && ate <= max) {
        if (de === 0) pos.forEach((p) => (p.dedo = p.f)); // posição aberta: um dedo por casa, 0 = solta
        out.push({ desenho: d, de, ate, pos });
      }
    }
    return out;
  };

  /* A ocorrência mais confortável (a mais baixa no braço). */
  T.instanciaPrincipal = function (pcMenor, d, max) {
    const l = T.instancias(pcMenor, d, max);
    return l.length ? l[0] : null;
  };

  /* Pontos para desenhar no braço: notas do desenho + notas extras (blue note, escala completa). */
  T.pontosDesenho = function (esc, inst, max) {
    max = max == null ? T.MAX_CASA : max;
    const pts = inst.pos.map((p) => {
      const a = T.altura(p.c, p.f);
      return { c: p.c, f: p.f, altura: a, dedo: p.dedo, tipo: T.pc(a) === esc.centro ? 'raiz' : 'nota' };
    });
    if (esc.extras.length) {
      for (let c = 1; c <= 6; c++) {
        for (let f = inst.de; f <= Math.min(inst.ate + 1, max); f++) {
          const a = T.altura(c, f);
          if (esc.extras.includes(T.pc(a))) pts.push({ c, f, altura: a, tipo: 'extra' });
        }
      }
    }
    return pts;
  };

  /* Braço inteiro: todas as notas da escala, marcando quais pertencem ao desenho escolhido. */
  T.pontosBraco = function (esc, instSel, max) {
    max = max == null ? T.MAX_CASA : max;
    const dentro = new Set();
    (instSel || []).forEach((inst) => T.pontosDesenho(esc, inst, max).forEach((p) => dentro.add(p.c + ':' + p.f)));
    const pts = [];
    for (let c = 1; c <= 6; c++) {
      for (let f = 0; f <= max; f++) {
        const a = T.altura(c, f), pc = T.pc(a);
        const ehTom = esc.tons.includes(pc), ehExtra = esc.extras.includes(pc);
        if (!ehTom && !ehExtra) continue;
        pts.push({ c, f, altura: a, tipo: ehExtra ? 'extra' : pc === esc.centro ? 'raiz' : 'nota', fora: instSel && !dentro.has(c + ':' + f) });
      }
    }
    return pts;
  };

  /* Encaixa uma melodia (alturas MIDI) num desenho. Tenta todas as ocorrências e oitavas;
     escolhe a que deixa mais notas dentro do desenho, preferindo casas baixas (violão). */
  T.encaixarMelodia = function (alturas, pcMenor, d, max) {
    max = max == null ? T.MAX_CASA : max;
    let melhor = null;
    T.instancias(pcMenor, d, max).forEach((inst) => {
      const noDesenho = new Set(inst.pos.map((p) => p.c + ':' + p.f));
      [0, -12, 12].forEach((oit) => {
        let custo = 0;
        const pos = [];
        for (const a0 of alturas) {
          if (!a0) { pos.push(null); continue; }
          const a = a0 + oit;
          let best = null, bestScore = Infinity;
          for (let c = 1; c <= 6; c++) {
            const f = a - T.ABERTAS[c];
            if (f < 0 || f > max) continue;
            let s;
            if (noDesenho.has(c + ':' + f)) s = 0;
            else if (f >= inst.de - 1 && f <= inst.ate + 1) s = 1 + (f < inst.de ? inst.de - f : f > inst.ate ? f - inst.ate : 0);
            else continue;
            if (s < bestScore) { bestScore = s; best = { c, f }; }
          }
          if (!best) { custo = Infinity; break; }
          custo += bestScore;
          pos.push(best);
        }
        if (custo === Infinity) return;
        const total = custo * 10 + Math.abs(oit) / 12 + inst.de / 100;
        if (!melhor || total < melhor.total) melhor = { total, pos, inst, oitava: oit };
      });
    });
    return melhor;
  };

  /* Transpõe uma lista de notas de frase por semitons, ajustando a oitava para caber no braço. */
  T.transporFrase = function (notas, semis, max) {
    max = max == null ? T.MAX_CASA : max;
    const casas = [];
    notas.forEach((n) => {
      if (n.p) return;
      (n.n || [n]).forEach((x) => casas.push(x.f));
    });
    if (!casas.length) return { notas, desloc: 0 };
    const opcoes = [semis, semis - 12, semis + 12, semis - 24, semis + 24];
    let escolhido = null;
    for (const s of opcoes) {
      const lo = Math.min(...casas) + s, hi = Math.max(...casas) + s;
      if (lo >= 0 && hi <= max) {
        if (escolhido === null || Math.abs(s - semis) < Math.abs(escolhido - semis) ||
          (Math.abs(s - semis) === Math.abs(escolhido - semis) && s < escolhido)) escolhido = s;
      }
    }
    if (escolhido === null) return null;
    const mover = (x) => Object.assign({}, x, { f: x.f + escolhido });
    return {
      desloc: escolhido,
      notas: notas.map((n) => (n.p ? n : n.n ? Object.assign({}, n, { n: n.n.map(mover) }) : mover(n)))
    };
  };

  /* Converte notas de frase em eventos com tempo absoluto (em tempos) e alturas. */
  T.eventosFrase = function (notas) {
    let t = 0;
    return notas.map((n) => {
      const ev = { t, d: n.d };
      if (n.p) ev.pausa = true;
      else {
        ev.notas = (n.n || [n]).map((x) => ({ c: x.c, f: x.f, midi: T.altura(x.c, x.f) }));
        if (n.lig) ev.lig = n.lig;
        if (n.b) ev.b = n.b;
        if (n.rel) ev.rel = true;
        if (n.v) ev.v = true;
      }
      t += n.d;
      return ev;
    });
  };

  T.eventosMelodia = function (mel, pos) {
    let t = 0;
    return mel.notas.map(([a, d], i) => {
      const ev = { t, d };
      t += d;
      if (!a || !pos[i]) { ev.pausa = true; return ev; }
      ev.notas = [{ c: pos[i].c, f: pos[i].f, midi: T.altura(pos[i].c, pos[i].f) }];
      if (d >= 2) ev.v = true;
      return ev;
    });
  };

  /* Acordes para as bases: vozes em MIDI, baixo entre Mi2 e Ré♯3. */
  T.acorde = function (raiz, tipo) {
    const b = 40 + T.pc(raiz - 4);
    if (tipo === 'm') return [b, b + 7, b + 12, b + 15, b + 19];
    if (tipo === '7') return [b, b + 7, b + 10, b + 16, b + 19];
    if (tipo === 'm7') return [b, b + 7, b + 10, b + 15, b + 19];
    if (tipo === '5') return [b, b + 7, b + 12];
    return [b, b + 7, b + 12, b + 16, b + 19];
  };
  T.nomeAcorde = (raiz, tipo) => T.cifra(raiz) + ({ m: 'm', 7: '7', m7: 'm7', 5: '5' }[tipo] || '');

  /* Progressões das bases (graus em semitons a partir do tom).
     Cada item: [grau, tipo do acorde, compassos]. Tipos: 'M' maior, 'm' menor, '7', 'm7', '5' (power chord).
     A levada de cada base (bateria, baixo, violão) mora em js/audio.js, com a mesma chave. */
  const P = (...l) => l.map(([g, tipo, comp]) => ({ g, tipo, comp: comp || 1 }));
  const doze = (graus, tipo) => graus.map((g) => ({ g, tipo, comp: 1 }));
  T.PROGRESSOES = {
    metronomo: [{ g: 0, tipo: null, comp: 1 }],
    drone: [{ g: 0, tipo: 'pedal', comp: 1 }],
    // rock e pop em tom menor
    menor: P([0, 'm', 2], [10, 'M', 2]),
    menor2: P([0, 'm', 2], [5, 'm', 2]),
    rock3: P([0, 'm', 2], [8, 'M'], [10, 'M']),
    descida: P([0, 'm'], [10, 'M'], [8, 'M'], [10, 'M']),
    balada: P([0, 'm'], [8, 'M'], [3, 'M'], [10, 'M']),
    epica: P([0, 'm'], [10, 'M'], [8, 'M'], [5, 'm']),
    pesado: P([0, '5', 2], [3, '5'], [5, '5']),
    // blues
    blues: doze([0, 0, 0, 0, 5, 5, 0, 0, 7, 5, 0, 7], '7'),
    bluesLento: doze([0, 5, 0, 0, 5, 5, 0, 0, 7, 5, 0, 7], '7'),
    bluesMenor: P([0, 'm', 4], [5, 'm', 2], [0, 'm', 2], [8, '7'], [7, '7'], [0, 'm'], [7, '7']),
    rocknroll: doze([0, 0, 0, 0, 5, 5, 0, 0, 7, 5, 0, 0], '7'),
    // tom maior
    pop: P([0, 'M'], [7, 'M'], [9, 'm'], [5, 'M']),
    anos50: P([0, 'M'], [9, 'm'], [5, 'M'], [7, 'M']),
    country: P([0, 'M', 2], [5, 'M', 2], [7, 'M', 2], [0, 'M', 2]),
    rockMaior: P([0, 'M'], [10, 'M'], [5, 'M'], [0, 'M']),
    // latino
    andaluz: P([0, 'm'], [10, 'M'], [8, 'M'], [7, 'M']),
    latino: P([0, 'm7'], [5, '7']),
    reggae: P([0, 'm', 2], [7, 'm', 2])
  };

  /* Lista compasso a compasso de uma base: [{raiz, tipo, nome}] */
  T.compassosBase = function (estilo, tom) {
    const prog = T.PROGRESSOES[estilo] || T.PROGRESSOES.metronomo;
    const out = [];
    prog.forEach((p) => {
      for (let i = 0; i < p.comp; i++) {
        const raiz = T.pc(tom + p.g);
        let nome = '';
        if (p.tipo === 'pedal') nome = T.cifra(raiz);
        else if (p.tipo) nome = T.nomeAcorde(raiz, p.tipo);
        out.push({ raiz, tipo: p.tipo, nome });
      }
    });
    return out;
  };

  TS.T = T;
})();
