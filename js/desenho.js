/* Trilha do Solo — desenho em SVG do braço do violão e da tablatura.
   Ambos devolvem texto SVG; as cores vêm do CSS (tokens), então funcionam nos dois temas. */
(function () {
  const TS = (window.TS = window.TS || {});
  const T = TS.T;

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------------- Braço ----------------
     opts: { de, ate, pontos:[{c,f,tipo:'raiz'|'nota'|'extra'|'certo'|'errado'|'falta'|'marcado', rotulo, fora}],
             graveEmCima, clicavel, id, faixas:[{de,ate}] } */
  function braco(opts) {
    const de = Math.max(0, opts.de || 0), ate = Math.max(de + 3, opts.ate);
    const casaW = 52, soltaW = de === 0 ? 40 : 0, padL = 10, padR = 10, topo = 16, gap = 24;
    const primeira = Math.max(de, 1);
    const n = ate - primeira + 1;
    const x0 = padL + soltaW;
    const W = x0 + n * casaW + padR;
    const yCorda = (c) => topo + (opts.graveEmCima ? 6 - c : c - 1) * gap;
    const yBaixo = topo + 5 * gap;
    const H = yBaixo + 30;
    const xCasa = (f) => (f === 0 ? padL + soltaW / 2 : x0 + (f - primeira + 0.5) * casaW);
    const p = [];
    p.push(`<svg class="braco${opts.clicavel ? ' clicavel' : ''}" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Braço do violão, casas ${de} a ${ate}"${opts.id ? ` data-braco="${esc(opts.id)}"` : ''}>`);
    p.push(`<rect class="fb-madeira" x="${x0}" y="${topo - 8}" width="${n * casaW}" height="${5 * gap + 16}" rx="3"/>`);
    (opts.faixas || []).forEach((fx) => {
      if (fx.ate < de || fx.de > ate) return;
      const xa = fx.de <= 0 && de === 0 ? padL : x0 + (Math.max(fx.de, primeira) - primeira) * casaW;
      const xb = fx.ate < primeira ? x0 : x0 + (Math.min(fx.ate, ate) - primeira + 1) * casaW;
      p.push(`<rect class="fb-faixa" x="${xa}" y="${topo - 10}" width="${xb - xa}" height="${5 * gap + 20}" rx="6"/>`);
    });
    // marcações (bolinhas de madrepérola)
    for (let f = primeira; f <= ate; f++) {
      const x = xCasa(f), m = f % 12;
      if ([3, 5, 7, 9].includes(m) || f === 15) p.push(`<circle class="fb-marca" cx="${x}" cy="${topo + 2.5 * gap}" r="5"/>`);
      if (m === 0) {
        p.push(`<circle class="fb-marca" cx="${x}" cy="${topo + 1.5 * gap}" r="5"/>`);
        p.push(`<circle class="fb-marca" cx="${x}" cy="${topo + 3.5 * gap}" r="5"/>`);
      }
    }
    // trastes
    for (let i = 0; i <= n; i++) {
      const x = x0 + i * casaW;
      p.push(`<line class="${i === 0 && de === 0 ? 'fb-pestana' : 'fb-traste'}" x1="${x}" y1="${topo - 8}" x2="${x}" y2="${yBaixo + 8}"/>`);
    }
    // cordas
    for (let c = 1; c <= 6; c++) {
      const y = yCorda(c);
      p.push(`<line class="fb-corda" x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" style="stroke-width:${0.8 + (c - 1) * 0.35}"/>`);
    }
    // números das casas
    for (let f = primeira; f <= ate; f++) {
      const forte = [3, 5, 7, 9, 12, 15].includes(f);
      p.push(`<text class="fb-num${forte ? ' forte' : ''}" x="${xCasa(f)}" y="${yBaixo + 24}">${f}</text>`);
    }
    if (de === 0) p.push(`<text class="fb-num" x="${xCasa(0)}" y="${yBaixo + 24}">solta</text>`);
    // áreas clicáveis
    if (opts.clicavel) {
      for (let c = 1; c <= 6; c++) {
        for (let f = de; f <= ate; f++) {
          const x = f === 0 ? padL : x0 + (f - primeira) * casaW, w = f === 0 ? soltaW : casaW;
          p.push(`<rect class="fb-clique" x="${x}" y="${yCorda(c) - gap / 2}" width="${w}" height="${gap}" data-c="${c}" data-f="${f}"><title>Corda ${c}, casa ${f}</title></rect>`);
        }
      }
    }
    // notas
    (opts.pontos || []).forEach((pt) => {
      if (pt.f < de || pt.f > ate) return;
      const x = xCasa(pt.f), y = yCorda(pt.c);
      const cls = 'fb-nota t-' + pt.tipo + (pt.fora ? ' fora' : '');
      p.push(`<g class="${cls}" data-pos="${pt.c}:${pt.f}"${opts.clicavel ? '' : ` data-c="${pt.c}" data-f="${pt.f}"`}>`);
      p.push(`<circle cx="${x}" cy="${y}" r="10.5"/>`);
      if (pt.rotulo != null && pt.rotulo !== '') p.push(`<text x="${x}" y="${y + 3.6}">${esc(pt.rotulo)}</text>`);
      p.push('</g>');
    });
    p.push('</svg>');
    return p.join('');
  }

  /* ---------------- Tablatura ----------------
     evs: eventos (TS.T.eventosFrase). opts: { compasso, anacruse, id } */
  function tab(evs, opts) {
    opts = opts || {};
    const compasso = opts.compasso || 4, anac = opts.anacruse || 0;
    const total = evs.reduce((m, e) => Math.max(m, e.t + e.d), 0);
    const compPorLinha = compasso === 3 ? 3 : 2;
    const tPorLinha = compPorLinha * compasso;
    const beatW = 50, padL = 30, padR = 14, topo = 24, gap = 14;
    // limites das linhas (sistemas)
    const linhas = [];
    if (total <= tPorLinha * 1.3 + anac) linhas.push([0, total]);
    else {
      let ini = 0, fim = anac + tPorLinha;
      while (ini < total - 1e-6) { linhas.push([ini, Math.min(fim, total)]); ini = fim; fim += tPorLinha; }
    }
    const larguraMax = Math.max(...linhas.map(([a, b]) => b - a));
    const W = padL + larguraMax * beatW + padR + 10;
    const hLinha = topo + 5 * gap + 16;
    const H = linhas.length * hLinha + 4;
    const p = [];
    p.push(`<svg class="tab" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Tablatura"${opts.id ? ` data-tab="${esc(opts.id)}"` : ''}>`);
    const anterior = {}; // por corda: {x, f}
    linhas.forEach(([ini, fim], li) => {
      const y0 = li * hLinha + topo;
      const yC = (c) => y0 + (c - 1) * gap;
      const xT = (t) => padL + 12 + (t - ini) * beatW;
      const xFim = padL + 12 + (fim - ini) * beatW + 4;
      for (let c = 1; c <= 6; c++) p.push(`<line class="tab-linha" x1="${padL}" y1="${yC(c)}" x2="${xFim}" y2="${yC(c)}"/>`);
      p.push(`<text class="tab-rot" x="10" y="${y0 + gap * 1.2}">T</text><text class="tab-rot" x="10" y="${y0 + gap * 2.7}">A</text><text class="tab-rot" x="10" y="${y0 + gap * 4.2}">B</text>`);
      p.push(`<line class="tab-barra" x1="${padL}" y1="${y0}" x2="${padL}" y2="${yC(6)}"/>`);
      // barras de compasso e marcas de tempo
      for (let t = Math.ceil(ini); t <= fim + 1e-6; t++) {
        const x = xT(t) - 10;
        const ehBarra = Math.abs(((t - anac) % compasso + compasso) % compasso) < 1e-6 && t > ini + 1e-6;
        if (ehBarra) p.push(`<line class="tab-barra" x1="${x}" y1="${y0}" x2="${x}" y2="${yC(6)}"/>`);
        else if (t < fim - 1e-6) p.push(`<line class="tab-tempo" x1="${xT(t)}" y1="${y0 - 9}" x2="${xT(t)}" y2="${y0 - 5}"/>`);
      }
      p.push(`<line class="tab-barra" x1="${xFim}" y1="${y0}" x2="${xFim}" y2="${yC(6)}"/>`);
      evs.forEach((ev, i) => {
        if (ev.t < ini - 1e-6 || ev.t >= fim - 1e-6 || ev.pausa) return;
        const x = xT(ev.t);
        p.push(`<g class="tab-ev" data-i="${i}">`);
        ev.notas.forEach((nt) => {
          const y = yC(nt.c), txt = String(nt.f), w = txt.length * 7.2 + 5;
          p.push(`<rect class="tab-fundo" x="${x - w / 2}" y="${y - 7}" width="${w}" height="14" rx="3"/>`);
          p.push(`<text class="tab-num" x="${x}" y="${y + 4}">${txt}</text>`);
          const ant = anterior[nt.c];
          if (ev.lig && ant && ant.linha === li && ev.notas.length === 1) {
            if (ev.lig === 'h' || ev.lig === 'p') {
              p.push(`<text class="tab-tec" x="${(ant.x + x) / 2}" y="${y - 6}">${ev.lig}</text>`);
            } else if (ev.lig === 's') {
              const sobe = nt.f > ant.f;
              p.push(`<line class="tab-slide" x1="${ant.x + 8}" y1="${y + (sobe ? 4 : -4)}" x2="${x - 8}" y2="${y + (sobe ? -4 : 4)}"/>`);
            }
          }
          if (ev.b) {
            const xb = x + 7, yb = y - 2, topoB = y0 - 4;
            p.push(`<path class="tab-bend" d="M${xb} ${yb} Q${xb + 10} ${yb} ${xb + 10} ${topoB + 6}"/><path class="tab-seta" d="M${xb + 6} ${topoB + 9} L${xb + 10} ${topoB + 3} L${xb + 14} ${topoB + 9} Z"/>`);
            p.push(`<text class="tab-tec" x="${xb + 10}" y="${topoB - 1}">${ev.b === 1 ? '½' : ev.b === 2 ? '1' : ev.b / 2}</text>`);
            if (ev.rel) p.push(`<path class="tab-bend" d="M${xb + 12} ${topoB + 6} Q${xb + 14} ${yb} ${xb + 24} ${yb}"/>`);
          }
          if (ev.v) {
            const xv = x + (ev.b ? 28 : 9), yv = y - 1;
            p.push(`<path class="tab-vib" d="M${xv} ${yv} q3 -4 6 0 t6 0 t6 0"/>`);
          }
          anterior[nt.c] = { x, f: nt.f, linha: li };
        });
        p.push('</g>');
      });
    });
    p.push('</svg>');
    return p.join('');
  }

  /* Mini-braço com as notas usadas numa frase ou melodia, para "ver no braço". */
  function bracoDaFrase(evs, raiz, opts) {
    const vistos = new Map();
    evs.forEach((ev) => {
      if (ev.pausa) return;
      ev.notas.forEach((n) => {
        const k = n.c + ':' + n.f;
        if (!vistos.has(k)) vistos.set(k, { c: n.c, f: n.f, altura: n.midi, tipo: T.pc(n.midi) === T.pc(raiz) ? 'raiz' : 'nota', rotulo: T.nome(n.midi) });
      });
    });
    const pts = [...vistos.values()];
    const casas = pts.map((p) => p.f);
    let de = Math.max(0, Math.min(...casas) - 1), ate = Math.max(...casas) + 1;
    if (de <= 1) de = 0;
    if (ate - de < 4) ate = de + 4;
    return braco(Object.assign({ de, ate, pontos: pts }, opts || {}));
  }

  TS.Desenho = { braco, tab, bracoDaFrase, esc };
})();
