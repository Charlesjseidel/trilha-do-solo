/* Trilha do Solo — telas e interação. */
(function () {
  const TS = window.TS;
  const T = TS.T, A = TS.Audio, E = TS.Estado, D = TS.Desenho;
  const esc = D.esc;
  const st = () => E.get();
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  const ROTAS = {
    hoje: 'Hoje', trilha: 'Trilha', braco: 'Braço', frases: 'Frases', base: 'Base', diario: 'Diário', ajustes: 'Ajustes'
  };
  let rota = 'hoje';

  const ui = {
    cartoes: {},           // estado de cada cartão (transposição, bpm, loop, braço)
    tocandoId: null,       // cartão tocando agora
    filtroFase: null,      // filtro da aba Frases (null = fase atual)
    timer: null,           // cronômetro de bloco
    sessaoCurta: false,
    quiz: { marcados: new Set(), conferido: false, erros: false },
    confirmarZerar: false,
    wakeLock: null
  };

  const fase = (n) => TS.fases[n - 1];
  const faseAtual = () => fase(st().faseAtual);
  const frase = (id) => TS.frases.find((l) => l.id === id);
  const melodia = (id) => TS.melodias.find((m) => m.id === id);
  const desafio = (id) => TS.desafios.find((d) => d.id === id);
  const maxCasa = () => T.MAX_CASA;

  /* ================= utilidades de interface ================= */
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toast.t);
    toast.t = setTimeout(() => (el.hidden = true), 3200);
  }

  function passo(acao, id, valor, extra) {
    return `<span class="passo" role="group">
      <button type="button" class="btn-mini" data-acao="${acao}" data-id="${id}" data-delta="-1" aria-label="Diminuir">−</button>
      <span class="passo-valor">${valor}</span>
      <button type="button" class="btn-mini" data-acao="${acao}" data-id="${id}" data-delta="1" aria-label="Aumentar">+</button>${extra || ''}
    </span>`;
  }

  function segmentado(acao, opcoes, atual, extra) {
    return `<span class="segmentado" role="group">${opcoes.map(([v, rot]) =>
      `<button type="button" class="${String(v) === String(atual) ? 'ativo' : ''}" data-acao="${acao}" data-v="${v}"${extra || ''} aria-pressed="${String(v) === String(atual)}">${rot}</button>`).join('')}</span>`;
  }

  function opcoesTom(atual) {
    return T.NOMES.map((n, i) => `<option value="${i}"${i === atual ? ' selected' : ''}>${n}</option>`).join('');
  }

  async function manterTelaAcesa(ligar) {
    try {
      if (ligar && !ui.wakeLock && navigator.wakeLock) ui.wakeLock = await navigator.wakeLock.request('screen');
      if (!ligar && ui.wakeLock) { await ui.wakeLock.release(); ui.wakeLock = null; }
    } catch (e) { ui.wakeLock = null; }
  }

  /* ================= mini-braço de foco das fases ================= */
  function bracoFoco(foco) {
    const e = T.escala(foco.modo, foco.tom);
    const vistos = new Map(), faixas = [];
    foco.desenhos.forEach((d) => {
      const inst = T.instanciaPrincipal(e.pcMenor, d);
      if (!inst) return;
      faixas.push({ de: inst.de, ate: inst.ate });
      T.pontosDesenho(e, inst).forEach((p) => {
        if (foco.cordas && !foco.cordas.includes(p.c)) return;
        if (foco.modo === 'blues' && p.tipo === 'extra') p.tipo = 'blue';
        vistos.set(p.c + ':' + p.f, Object.assign(p, { rotulo: T.nome(p.altura) }));
      });
    });
    const pts = [...vistos.values()];
    const casas = pts.map((p) => p.f);
    let de = Math.max(0, Math.min(...casas) - 1), ate = Math.min(maxCasa(), Math.max(...casas) + 1);
    if (de <= 1) de = 0;
    return D.braco({ de, ate, pontos: pts, faixas: foco.desenhos.length > 1 ? faixas : [], graveEmCima: st().perfil.graveEmCima });
  }

  /* ================= cartões ================= */
  function estadoCartao(id, padrao) {
    if (!ui.cartoes[id]) ui.cartoes[id] = Object.assign({ transp: 0, loop: false, braco: false }, padrao);
    return ui.cartoes[id];
  }

  function dadosFrase(l) {
    const c = estadoCartao(l.id, { bpm: l.bpm });
    const tr = T.transporFrase(l.notas, c.transp) || { notas: l.notas, desloc: 0 };
    const evs = T.eventosFrase(tr.notas);
    const raiz = T.pc(l.tom.raiz + tr.desloc);
    let maior = 0;
    tr.notas.forEach((n) => { if (!n.p) (n.n || [n]).forEach((x) => (maior = Math.max(maior, x.f))); });
    return { c, evs, raiz, maior, nomeTom: T.nomeTom(raiz, l.tom.tipo) };
  }

  function dicaViolao(l) {
    const p = st().perfil;
    if (l.tecnicas.includes('bend')) {
      return p.corda === 'nylon'
        ? 'No seu violão de nylon: ¼ a ½ tom é o limite saudável. Empurre de lado com 2 ou 3 dedos.'
        : 'No seu violão de aço: meio tom é tranquilo. Para 1 tom, use cordas .010 ou .011.';
    }
    if (l.tecnicas.includes('vibrato') && l.fase <= 2) {
      return p.corda === 'nylon'
        ? 'Vibrato no nylon: balance o dedo ao longo da corda, como no violão clássico.'
        : 'Vibrato no aço: empurre a corda levemente para cima e para baixo, em pulsos regulares.';
    }
    return '';
  }

  /* Exercícios marcados com violao: true ganham a dica de bend (f3e2) ou de vibrato para o tipo de corda. */
  function dicaExercicio(ex) {
    if (!ex.violao) return '';
    const corda = st().perfil.corda;
    return `<p class="dica violao">${esc(TS.violao[corda][ex.id === 'f3e2' ? 0 : 1])}</p>`;
  }

  const LEGENDA_TAB = '<p class="legenda-tab">Cada linha é uma corda: a de <strong>baixo é a 6ª, a mais grossa</strong>; a de cima é a 1ª, a mais fina. Os números são as casas. Leia da esquerda para a direita.</p>';

  function cartaoFrase(l) {
    const { c, evs, raiz, maior, nomeTom } = dadosFrase(l);
    const s = E.statusLick(l.id);
    const p = st().perfil;
    const tocando = ui.tocandoId === l.id;
    const dv = dicaViolao(l);
    const avisoCut = !p.cutaway && maior > 12;
    const est = E.lick(l.id);
    return `<article class="cartao frase" id="c-${l.id}" data-cartao="${l.id}">
      <header class="cartao-topo">
        <div class="titulos"><h3>${esc(l.nome)}</h3>
          <p class="meta">Fase ${l.fase} · Desenho ${l.desenho} · ${esc(nomeTom)}</p></div>
        <span class="selo s-${s.tipo}">${esc(s.texto)}</span>
      </header>
      ${l.estilo ? `<p class="estilo-de">No estilo de <strong>${esc(l.estilo)}</strong> <span class="meta">· frase original do método, com os recursos que marcaram esse som</span></p>` : ''}
      <p class="ideia">${esc(l.ideia)}</p>
      <div class="rolagem">${D.tab(evs, { id: l.id })}</div>
      ${LEGENDA_TAB}
      ${c.braco ? `<div class="rolagem">${D.bracoDaFrase(evs, raiz, { id: l.id, graveEmCima: p.graveEmCima })}</div>` : ''}
      <div class="controles">
        <button type="button" class="btn ${tocando ? 'parar' : 'primario'}" data-acao="tocar" data-id="${l.id}">${tocando ? '■ Parar' : '▶ Ouvir'}</button>
        <label class="marcar"><input type="checkbox" data-acao="loop" data-id="${l.id}"${c.loop ? ' checked' : ''}> Repetir</label>
        <span class="rotulo-ctrl">Andamento</span>${passo('bpm', l.id, c.bpm + ' bpm')}
        <span class="rotulo-ctrl">Tom</span>${passo('transp', l.id, esc(nomeTom))}
        <button type="button" class="btn" data-acao="ver-braco" data-id="${l.id}">${c.braco ? 'Esconder braço' : 'Ver no braço'}</button>
      </div>
      <ul class="etiquetas">${l.tecnicas.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      <p class="dica">${esc(l.dica)}</p>
      ${dv ? `<p class="dica violao">${esc(dv)}</p>` : ''}
      ${avisoCut ? `<p class="aviso">Esta frase passa da casa 12, o que é desconfortável sem cutaway.
        <button type="button" class="btn-link" data-acao="transp-para" data-id="${l.id}" data-semis="-5">Tocar 5 casas abaixo (${esc(T.nomeTom(l.tom.raiz - 5, l.tom.tipo))})</button></p>` : ''}
      <div class="srs">
        ${!est ? `<button type="button" class="btn" data-acao="comecar" data-id="${l.id}">Comecei a estudar esta frase</button>
          <span class="srs-texto">O app vai trazê-la de volta para revisão nos dias certos.</span>`
        : `<span class="srs-texto">Hoje, tocou sem olhar a tab?</span>
          <button type="button" class="btn ok" data-acao="avaliar" data-id="${l.id}" data-ok="1">Sim, de memória</button>
          <button type="button" class="btn" data-acao="avaliar" data-id="${l.id}" data-ok="0">Precisei olhar</button>`}
      </div>
    </article>`;
  }

  function dadosMelodia(m) {
    const c = estadoCartao(m.id, { bpm: m.bpm, desenho: 1 });
    const centro = T.pc(m.centro + c.transp);
    const pcMenor = T.pc((m.tipo === 'maior' ? m.centro - 3 : m.centro) + c.transp);
    const alturas = m.notas.map((n) => (n[0] ? n[0] + c.transp : 0));
    const enc = T.encaixarMelodia(alturas, pcMenor, c.desenho);
    const evs = enc ? T.eventosMelodia(m, enc.pos) : null;
    return { c, centro, enc, evs, nomeTom: T.nomeTom(centro, m.tipo) };
  }

  function cartaoMelodia(m) {
    const { c, centro, enc, evs, nomeTom } = dadosMelodia(m);
    const p = st().perfil;
    const tocando = ui.tocandoId === m.id;
    let maior = 0;
    if (enc) enc.pos.forEach((x) => x && (maior = Math.max(maior, x.f)));
    return `<article class="cartao melodia" id="c-${m.id}" data-cartao="${m.id}">
      <header class="cartao-topo">
        <div class="titulos"><h3>${esc(m.nome)}</h3>
          <p class="meta">${esc(m.origem)} · ${esc(nomeTom)} · compasso de ${m.compasso} tempos</p></div>
        <span class="selo s-melodia">Melodia</span>
      </header>
      <p class="ideia">${esc(m.sobre)}</p>
      <div class="controles">
        <span class="rotulo-ctrl">Tocar no</span>${segmentado('desenho-mel', [1, 2, 3, 4, 5].map((d) => [d, 'Desenho ' + d]), c.desenho, ` data-id="${m.id}"`)}
      </div>
      ${enc ? `<p class="meta">Desenho ${c.desenho}: casas ${enc.inst.de} a ${enc.inst.ate}.${!p.cutaway && maior > 12 ? ' Passa da casa 12: sem cutaway, prefira outro desenho ou outro tom.' : ''}</p>
        <div class="rolagem">${D.tab(evs, { id: m.id, compasso: m.compasso, anacruse: m.anacruse })}</div>
        ${LEGENDA_TAB}
        ${c.braco ? `<div class="rolagem">${D.bracoDaFrase(evs, centro, { id: m.id, graveEmCima: p.graveEmCima })}</div>` : ''}`
        : `<p class="aviso">Neste tom, a melodia não cabe no Desenho ${c.desenho} dentro das casas 0 a 15. Escolha outro desenho ou mude o tom.</p>`}
      <div class="controles">
        ${enc ? `<button type="button" class="btn ${tocando ? 'parar' : 'primario'}" data-acao="tocar" data-id="${m.id}">${tocando ? '■ Parar' : '▶ Ouvir'}</button>` : ''}
        <label class="marcar"><input type="checkbox" data-acao="loop" data-id="${m.id}"${c.loop ? ' checked' : ''}> Repetir</label>
        <span class="rotulo-ctrl">Andamento</span>${passo('bpm', m.id, c.bpm + ' bpm')}
        <span class="rotulo-ctrl">Tom</span>${passo('transp', m.id, esc(nomeTom))}
        ${enc ? `<button type="button" class="btn" data-acao="ver-braco" data-id="${m.id}">${c.braco ? 'Esconder braço' : 'Ver no braço'}</button>` : ''}
      </div>
      <p class="dica">Toque pela tab, depois cantando junto, depois sem olhar. Se uma nota soar estranha, confie no ouvido e procure a certa.</p>
    </article>`;
  }

  function cartaoDesafio(d) {
    const q = encodeURIComponent;
    const feito = !!st().desafiosFeitos[d.id];
    const est = TS.estilosBase[d.base.estilo];
    return `<article class="cartao desafio${feito ? ' tirado' : ''}" id="c-${d.id}">
      <header class="cartao-topo">
        <div class="titulos"><h3>${esc(d.musica)}</h3>
          <p class="meta">${esc(d.artista)} · ${esc(d.parte)} · Fase ${d.fase}</p></div>
        <span class="selo s-desafio">Solo famoso</span>
      </header>
      <p><strong>Onde mora:</strong> ${esc(d.onde)}</p>
      <ol class="pistas">${d.pistas.map((p, i) => `<li><details><summary>Pista ${i + 1}</summary><p>${esc(p)}</p></details></li>`).join('')}</ol>
      <div class="controles">
        <button type="button" class="btn primario" data-acao="base-com" data-estilo="${d.base.estilo}" data-tom="${d.base.tom}" data-bpm="${d.base.bpm}">▶ Base em ${esc(T.NOMES[d.base.tom])} para treinar</button>
        <span class="meta">${esc(est.curto)}, ${d.base.bpm} bpm. É uma base do app no tom da música, não a gravação.</span>
      </div>
      <p class="dica">Tente primeiro de ouvido: ouça, cante e procure no braço. Use a tab só para conferir no final.</p>
      <p class="links">
        <a href="https://www.youtube.com/results?search_query=${q(d.musica + ' ' + d.artista + ' ' + d.parte + ' aula')}" target="_blank" rel="noopener">Ouvir e ver aulas (YouTube)</a>
        <a href="https://www.songsterr.com/?pattern=${q(d.musica + ' ' + d.artista)}" target="_blank" rel="noopener">Conferir a tab (Songsterr)</a>
      </p>
      <div class="srs"><label class="marcar"><input type="checkbox" data-acao="desafio-feito" data-id="${d.id}"${feito ? ' checked' : ''}> Já tirei este de ouvido</label></div>
    </article>`;
  }

  function atualizarCartao(id) {
    const el = $('#c-' + id);
    if (!el) return;
    const l = frase(id), m = melodia(id);
    const html = l ? cartaoFrase(l) : m ? cartaoMelodia(m) : null;
    if (html) el.outerHTML = html;
  }

  /* ================= tocar frases e melodias ================= */
  function destacar(id, evs, i) {
    $$(`[data-tab="${id}"] .tab-ev.ativo, [data-braco="${id}"] .fb-nota.ativo`).forEach((x) => x.classList.remove('ativo'));
    if (i < 0) return;
    $$(`[data-tab="${id}"] .tab-ev[data-i="${i}"]`).forEach((x) => x.classList.add('ativo'));
    (evs[i].notas || []).forEach((n) => $$(`[data-braco="${id}"] [data-pos="${n.c}:${n.f}"]`).forEach((x) => x.classList.add('ativo')));
  }

  function tocarCartao(id) {
    if (ui.tocandoId === id) { A.pararFrase(); return; }
    const l = frase(id), m = melodia(id);
    let evs, c, compasso = 4;
    if (l) { const d = dadosFrase(l); evs = d.evs; c = d.c; }
    else if (m) { const d = dadosMelodia(m); if (!d.evs) return; evs = d.evs; c = d.c; compasso = m.compasso; }
    else return;
    const anterior = ui.tocandoId;
    ui.tocandoId = id;
    if (anterior) atualizarCartao(anterior);
    atualizarCartao(id);
    A.tocarFrase(evs, {
      bpm: c.bpm, compasso, contagem: compasso, loop: c.loop,
      aoEvento: (i) => destacar(id, evs, i),
      aoFim: () => {
        if (ui.tocandoId === id) ui.tocandoId = null;
        destacar(id, evs, -1);
        atualizarCartao(id);
      }
    });
  }

  /* ================= TELA: HOJE ================= */
  const DIST = {
    10: { aquec: 1, mapa: 0, vocab: 3, rep: 0, impro: 6 },
    20: { aquec: 2, mapa: 4, vocab: 5, rep: 0, impro: 9 },
    30: { aquec: 3, mapa: 6, vocab: 7, rep: 5, impro: 9 },
    45: { aquec: 4, mapa: 8, vocab: 10, rep: 8, impro: 15 }
  };

  function fraseNova() {
    const s = st();
    const ordem = [s.faseAtual];
    for (let n = 1; n < s.faseAtual; n++) ordem.push(n);
    for (const n of ordem) {
      const id = fase(n).frases.find((x) => !E.lick(x));
      if (id) return id;
    }
    return null;
  }

  /* ----- Aulas e progresso -----
     Cada fase é uma fila de aulas numeradas. O conteúdo de cada aula (exercício, repertório e regra do improviso)
     sai do número da aula, e não do dia do calendário: assim dá para avançar, voltar e fazer duas no mesmo dia. */
  const aulasPrevistas = (f) => f.frases.length * 2;
  const checksDaFase = (f) => f.checkpoint.filter((_, i) => st().checks['f' + f.n + 'c' + i]).length;

  /* Quanto da fase já foi: metade vem das aulas feitas, metade do checkpoint. */
  function progressoFase(f) {
    const s = st();
    if (s.fasesConcluidas[f.n] || f.n < s.faseAtual) return 100;
    if (f.n > s.faseAtual) return 0;
    const aulas = Math.min(1, E.aulasFeitasNaFase(f.n) / aulasPrevistas(f));
    return Math.round(100 * (aulas * 0.5 + (checksDaFase(f) / f.checkpoint.length) * 0.5));
  }
  const progressoTrilha = () => Math.round(TS.fases.reduce((a, f) => a + progressoFase(f), 0) / TS.fases.length);

  function planoDoDia() {
    const f = faseAtual(), a = E.aulaAtual(), p = st().perfil;
    if (ui.sessaoCurta) return [{ id: 'impro', min: 5 }];
    const d = Object.assign({}, DIST[p.minutos] || DIST[20]);
    const repItens = f.melodias.map((x) => ['m', x]).concat(f.desafios.map((x) => ['d', x]));
    if (!repItens.length) { d.impro += d.rep; d.rep = 0; }
    const blocos = [];
    if (d.aquec) blocos.push({ id: 'aquec', min: d.aquec });
    if (d.mapa) blocos.push({ id: 'mapa', min: d.mapa, ex: f.exercicios[a % f.exercicios.length] });
    if (d.vocab) blocos.push({ id: 'vocab', min: d.vocab });
    if (d.rep) blocos.push({ id: 'rep', min: d.rep, item: repItens[a % repItens.length] });
    blocos.push({ id: 'impro', min: d.impro });
    return blocos;
  }

  const TITULOS_BLOCO = { aquec: 'Aquecimento', mapa: 'Exercício da aula', vocab: 'Vocabulário', rep: 'Repertório', impro: 'Improviso' };

  function cabecalhoBloco(b, feitos) {
    const ativo = ui.timer && ui.timer.bloco === b.id;
    const rest = ativo ? ui.timer.restante : b.min * 60;
    const mmss = Math.floor(rest / 60) + ':' + String(rest % 60).padStart(2, '0');
    return `<header class="bloco-topo">
      <h3>${TITULOS_BLOCO[b.id]}</h3>
      <span class="minutos">${b.min} min</span>
      <button type="button" class="btn-timer${ativo ? ' rodando' : ''}" data-acao="timer" data-bloco="${b.id}" data-min="${b.min}" id="timer-${b.id}">${ativo ? '⏸ ' : '⏱ '}${mmss}</button>
      <label class="marcar feito"><input type="checkbox" data-acao="bloco-feito" data-bloco="${b.id}"${feitos[b.id] ? ' checked' : ''}> Feito</label>
    </header>`;
  }

  function corpoBloco(b) {
    const f = faseAtual(), s = st();
    if (b.id === 'aquec') {
      const ultimo = [...s.sessoes].reverse().find((x) => x.bpm);
      const bpm = ultimo ? ultimo.bpm : 60;
      return `<p>${esc(f.aquecimento)}</p>
        <div class="rolagem">${bracoFoco(f.foco)}</div>
        <p class="meta">${esc(f.focoTexto)}</p>
        <div class="controles"><button type="button" class="btn" data-acao="base-com" data-estilo="metronomo" data-tom="${f.base.tom}" data-bpm="${bpm}">Ligar metrônomo a ${bpm} bpm</button>
        ${ultimo ? `<span class="meta">Seu último bpm limpo foi ${ultimo.bpm}.</span>` : ''}</div>`;
    }
    if (b.id === 'mapa') {
      const ex = b.ex;
      return `<h4>${esc(ex.t)}</h4>
        <ol class="passos">${ex.passos.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>
        ${dicaExercicio(ex)}
        <p class="meta"><strong>Objetivo:</strong> ${esc(ex.meta)}</p>`;
    }
    if (b.id === 'vocab') {
      const nova = fraseNova();
      const revisoes = E.revisoesDeHoje(3).filter((id) => id !== nova);
      let h = '';
      if (nova) h += `<p class="rotulo-sec">Frase nova</p><p class="meta">Siga o ciclo: tocar igual, mudar o ritmo, mudar o final.</p>${cartaoFrase(frase(nova))}`;
      if (revisoes.length) h += `<p class="rotulo-sec">Revisão de hoje</p><p class="meta">Tente tocar de memória antes de olhar a tab. É o esforço de lembrar que fixa.</p>${revisoes.map((id) => cartaoFrase(frase(id))).join('')}`;
      if (!nova && !revisoes.length) h += `<p>Nenhuma frase nova nem revisão pendente hoje. Escolha sua frase favorita e toque-a em 3 ritmos diferentes.</p>`;
      return h;
    }
    if (b.id === 'rep') {
      const [tipo, id] = b.item;
      return tipo === 'm' ? cartaoMelodia(melodia(id)) : cartaoDesafio(desafio(id));
    }
    if (b.id === 'impro') {
      const regra = f.regras[E.aulaAtual() % f.regras.length];
      const nomeEst = TS.estilosBase[f.base.estilo].nome;
      return `<div class="regra"><span class="rotulo-sec">Regra desta aula</span><p>${esc(regra)}</p></div>
        <p>Improvise sobre a base respeitando a regra. Sem parar, sem corrigir: errou, repita a nota errada de propósito e siga em frente.</p>
        <div class="controles"><button type="button" class="btn primario" data-acao="base-com" data-estilo="${f.base.estilo}" data-tom="${f.base.tom}" data-bpm="${f.base.bpm}">▶ Tocar base: ${esc(nomeEst)} em ${esc(T.NOMES[f.base.tom])}, ${f.base.bpm} bpm</button></div>`;
    }
    return '';
  }

  function faixaDias(n) {
    const dias = E.diasPraticados(), hoje = E.hoje();
    let h = '';
    for (let i = n - 1; i >= 0; i--) {
      const d = E.somarDias(hoje, -i);
      h += `<span class="dia${dias.has(d) ? ' sim' : ''}${d === hoje ? ' hoje' : ''}" title="${E.dataCurta(d)}${dias.has(d) ? ': praticou' : ''}"></span>`;
    }
    return h;
  }

  function telaConfigurar() {
    const p = st().perfil;
    return `<section class="cartao configurar">
      <h2>Antes de começar: o seu violão</h2>
      <p>Quatro respostas rápidas para o app adaptar as dicas (bend, vibrato, casas altas), o tamanho da aula e o desenho do braço.</p>
      <form id="form-perfil" class="form-perfil">${camposPerfil(p)}
        <button type="submit" class="btn primario">Salvar e começar</button>
      </form>
    </section>`;
  }

  function camposPerfil(p) {
    const radio = (nome, v, rot, atual) => `<label class="opcao"><input type="radio" name="${nome}" value="${v}"${String(atual) === String(v) ? ' checked' : ''}> ${rot}</label>`;
    return `<fieldset><legend>Cordas do violão</legend>${radio('corda', 'nylon', 'Nylon', p.corda)}${radio('corda', 'aco', 'Aço', p.corda)}</fieldset>
      <fieldset><legend>Tem cutaway (recorte no corpo para alcançar as casas altas)?</legend>${radio('cutaway', 'sim', 'Sim', p.cutaway ? 'sim' : 'nao')}${radio('cutaway', 'nao', 'Não', p.cutaway ? 'sim' : 'nao')}</fieldset>
      <fieldset><legend>Tempo de prática por dia</legend>${[10, 20, 30, 45].map((m) => radio('minutos', m, m + ' min', p.minutos)).join('')}</fieldset>
      <fieldset><legend>Como desenhar o braço do violão</legend>
        ${radio('cordas', 'fina', 'Corda fina em cima, igual à tablatura', p.graveEmCima ? 'grossa' : 'fina')}
        ${radio('cordas', 'grossa', 'Corda grossa em cima, como você vê o violão no colo', p.graveEmCima ? 'grossa' : 'fina')}
        <p class="meta">Nos dois jeitos, o nome de cada corda aparece ao lado. A 6ª corda é a mais grossa (som grave) e a 1ª é a mais fina (som agudo).</p></fieldset>`;
  }

  /* A trilha em 7 pontos: o que já passou, onde você está e o que falta. */
  function jornada() {
    const s = st();
    const pct = progressoTrilha();
    return `<section class="jornada" aria-label="Sua jornada">
      <div class="jornada-topo"><p class="eyebrow">Sua jornada</p><p class="meta"><strong>${pct}%</strong> da trilha</p></div>
      <ol class="trilho">${TS.fases.map((f) => {
        const feita = s.fasesConcluidas[f.n] || f.n < s.faseAtual;
        const cls = f.n === s.faseAtual ? 'atual' : feita ? 'feita' : 'futura';
        return `<li class="${cls}"><a href="#trilha" data-acao="abrir-fase" data-n="${f.n}" title="Fase ${f.n}: ${esc(f.titulo)}"><span class="ponto">${feita ? '✓' : f.n}</span></a></li>`;
      }).join('')}</ol>
      <div class="barra larga"><span style="width:${pct}%"></span></div>
    </section>`;
  }

  /* O que falta para passar de fase, numa frase. */
  function faltaParaAvancar(f) {
    const faltam = f.checkpoint.length - checksDaFase(f);
    const feitas = E.aulasFeitasNaFase(f.n), prev = aulasPrevistas(f);
    if (!faltam) return f.n < TS.fases.length ? 'Checkpoint completo: você já pode passar para a próxima fase.' : 'Checkpoint completo: você fechou a trilha.';
    const itens = faltam === 1 ? 'falta 1 item do checkpoint' : `faltam ${faltam} itens do checkpoint`;
    if (feitas < prev) return `Para passar de fase: ${itens}. Esta fase tem ${prev} aulas previstas e você fez ${feitas}.`;
    return `Você já fez as ${prev} aulas previstas. Para passar de fase, ${itens}.`;
  }

  function blocoCheckpoint(f) {
    const s = st();
    const checks = f.checkpoint.map((_, i) => !!s.checks['f' + f.n + 'c' + i]);
    const n = checks.filter(Boolean).length, total = f.checkpoint.length;
    const ultima = f.n === TS.fases.length;
    let acoes;
    if (ultima) acoes = n === total ? '<p class="destaque">Trilha completa. Veja na aba Trilha os próximos passos.</p>' : '';
    else if (n === total) acoes = `<button type="button" class="btn primario" data-acao="avancar" data-n="${f.n}">Concluir a Fase ${f.n} e começar a Fase ${f.n + 1}</button>`;
    else if (ui.confirmarAvanco) acoes = `<p class="aviso">Passar para a Fase ${f.n + 1} sem fechar o checkpoint? Você pode voltar a esta fase quando quiser, pela aba Trilha.
        <button type="button" class="btn primario" data-acao="avancar" data-n="${f.n}">Sim, ir para a Fase ${f.n + 1}</button>
        <button type="button" class="btn" data-acao="avancar-nao">Ficar nesta fase</button></p>`;
    else acoes = `<span class="meta">${total - n === 1 ? 'Falta 1 item.' : 'Faltam ' + (total - n) + ' itens.'}</span>
        <button type="button" class="btn" data-acao="avancar-pedir">Passar para a Fase ${f.n + 1} mesmo assim</button>`;
    return `<article class="bloco checkpoint" id="bloco-checkpoint">
      <header class="bloco-topo"><h3>Posso passar de fase?</h3><span class="minutos">${n} de ${total}</span></header>
      <div class="bloco-corpo">
        <p class="meta">Marque o que você já consegue fazer. Com tudo marcado, a próxima fase abre. Quem decide é você, não o calendário.</p>
        <ul class="checklist">${f.checkpoint.map((c, i) => `<li><label class="marcar"><input type="checkbox" data-acao="check" data-id="f${f.n}c${i}"${checks[i] ? ' checked' : ''}> ${esc(c)}</label></li>`).join('')}</ul>
        <div class="controles">${acoes}</div>
      </div>
    </article>`;
  }

  function telaHoje() {
    const s = st(), f = faseAtual();
    if (!s.perfil.configurado) return telaConfigurar() + blocoMetodo(true);
    E.abrirAulaDoDia();
    const a = E.aulaAtual(), prev = aulasPrevistas(f);
    const feitaEm = E.aulaFeitaEm(f.n, a);
    const blocos = planoDoDia();
    const feitos = E.blocosDeHoje();
    const total = blocos.reduce((x, b) => x + b.min, 0);
    const pctFase = progressoFase(f);
    const seq = E.sequencia();
    const ult7 = [...E.diasPraticados()].filter((d) => E.diasEntre(d, E.hoje()) < 7).length;
    const deMemoria = Object.keys(s.licks).filter((id) => s.licks[id].caixa >= 3).length;
    const solos = Object.keys(s.desafiosFeitos).filter((id) => s.desafiosFeitos[id]).length;
    const nomeAula = `Aula ${a + 1}`;
    return `${jornada()}
      <section class="resumo">
        <div class="resumo-fase">
          <p class="eyebrow">Fase ${f.n} de ${TS.fases.length} · semanas ${f.semanas}</p>
          <h2>${esc(f.titulo)}</h2>
          <p>${esc(f.objetivo)}</p>
          <div class="barra"><span style="width:${pctFase}%"></span></div>
          <p class="meta"><strong>${pctFase}% da fase</strong> · ${E.aulasFeitasNaFase(f.n)} de ${prev} aulas · checkpoint ${checksDaFase(f)} de ${f.checkpoint.length}</p>
          <p class="meta">${esc(faltaParaAvancar(f))} <a href="#hoje" data-acao="ir-checkpoint">Ver o checkpoint</a></p>
        </div>
        <div class="resumo-dias">
          <p class="numero">${seq}</p><p class="meta">${seq === 1 ? 'dia seguido' : 'dias seguidos'} · ${ult7} dos últimos 7</p>
          <div class="dias">${faixaDias(14)}</div>
          <p class="meta">${deMemoria} ${deMemoria === 1 ? 'frase' : 'frases'} de memória · ${solos} ${solos === 1 ? 'solo tirado' : 'solos tirados'}</p>
        </div>
      </section>
      <section class="sessao">
        <div class="aula-nav">
          <button type="button" class="btn" data-acao="aula-ir" data-delta="-1"${a === 0 ? ' disabled' : ''}>◀ Aula anterior</button>
          <div class="aula-tit"><h2>${nomeAula} <span class="meta">${a < prev ? 'de ' + prev : 'reforço'} · ${total} min</span></h2>
            <span class="selo ${feitaEm ? 's-concluida' : 's-atual'}">${feitaEm ? 'Concluída em ' + E.dataCurta(feitaEm) : 'A fazer'}</span></div>
          <button type="button" class="btn" data-acao="aula-ir" data-delta="1">Próxima aula ▶</button>
        </div>
        ${feitaEm === E.hoje() ? `<div class="aula-ok"><p><strong>✓ ${nomeAula} concluída hoje.</strong> Quer continuar? Faça a próxima agora. Se preferir parar, amanhã ela abre sozinha.</p>
          <button type="button" class="btn primario" data-acao="aula-ir" data-delta="1">Fazer a Aula ${a + 2} agora</button></div>` : ''}
        ${a >= prev && !feitaEm ? `<p class="meta">Você já passou das ${prev} aulas previstas para esta fase. As aulas de reforço repetem o ciclo de exercícios. Confira o checkpoint no fim da página.</p>` : ''}
        <div class="sessao-topo">
          <p class="meta">Cada aula tem um exercício, uma frase e uma regra de improviso diferentes.</p>
          ${segmentado('sessao-curta', [['0', 'Completa'], ['1', 'Dia corrido (5 min)']], ui.sessaoCurta ? '1' : '0')}
        </div>
        ${ui.sessaoCurta ? '<p class="meta">Dia corrido: só improviso, com a regra e a base desta aula. O importante é não zerar.</p>' : ''}
        ${blocos.map((b) => `<article class="bloco${feitos[b.id] ? ' feito' : ''}" id="bloco-${b.id}">${cabecalhoBloco(b, feitos)}<div class="bloco-corpo">${corpoBloco(b)}</div></article>`).join('')}
        <article class="bloco registro">
          <header class="bloco-topo"><h3>Registro</h3><span class="minutos">1 min</span></header>
          <form id="form-sessao" class="form-sessao">
            <label>Bpm limpo no aquecimento <input type="number" id="sessao-bpm" min="30" max="240" inputmode="numeric" placeholder="ex.: 65"></label>
            <label>Como foi? (opcional) <textarea id="sessao-nota" rows="2" placeholder="O que soou bem, onde travou, o que tentar amanhã"></textarea></label>
            <button type="submit" class="btn primario">${feitaEm ? 'Registrar de novo a ' + nomeAula : 'Concluir a ' + nomeAula}</button>
            <span class="meta">${feitaEm ? 'Esta aula já está concluída.' : 'Ao concluir, a próxima aula fica liberada na hora.'}</span>
          </form>
        </article>
        ${blocoCheckpoint(f)}
      </section>`;
  }

  function blocoMetodo(aberto) {
    return `<details class="cartao metodo"${aberto ? ' open' : ''}>
      <summary><h2>Como este método funciona</h2></summary>
      <h3>${esc(TS.diagnostico.titulo)}</h3>
      <ul>${TS.diagnostico.itens.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      <p class="destaque">${esc(TS.diagnostico.virada)}</p>
      <h3>As regras do jogo</h3>
      <div class="principios">${TS.principios.map((p) => `<div><h4>${esc(p.t)}</h4><p>${esc(p.d)}</p></div>`).join('')}</div>
      <h3>Por que pentatônica antes da escala maior</h3>
      <p>A pentatônica tem 5 notas em vez de 7, e as 2 que ficam de fora são justamente as que mais "batem" com os acordes. Sobre uma base menor ou de blues, quase nada soa errado. Ela também é a escala de quase todos os solos de rock, blues e pop que você conhece. A escala completa é a pentatônica com 2 notas a mais, e ela chega na Fase 7, quando o mapa já estiver pronto.</p>
    </details>`;
  }

  /* ================= TELA: TRILHA ================= */
  function telaTrilha() {
    const s = st();
    return blocoMetodo(false) + `<section class="fases">${TS.fases.map((f) => {
      const atual = f.n === s.faseAtual;
      const concl = s.fasesConcluidas[f.n];
      const checks = f.checkpoint.map((_, i) => !!s.checks['f' + f.n + 'c' + i]);
      const nChecks = checks.filter(Boolean).length;
      const status = concl ? ['concluida', 'Concluída'] : atual ? ['atual', 'Fase atual'] : f.n < s.faseAtual ? ['concluida', 'Para trás'] : ['futura', 'Próxima'];
      const nomeEst = TS.estilosBase[f.base.estilo].nome;
      return `<details class="fase ${status[0]}" id="fase-${f.n}"${atual || ui.abrirFase === f.n ? ' open' : ''}>
        <summary>
          <span class="fase-num">${f.n}</span>
          <span class="fase-tit"><strong>${esc(f.titulo)}</strong><span class="meta">Semanas ${f.semanas} · ${E.aulasFeitasNaFase(f.n)} de ${aulasPrevistas(f)} aulas · checkpoint ${nChecks}/${f.checkpoint.length} · ${progressoFase(f)}%</span></span>
          <span class="selo s-${status[0]}">${status[1]}</span>
        </summary>
        <div class="fase-corpo">
          <p class="objetivo">${esc(f.objetivo)}</p>
          <p class="porque"><strong>Por que funciona:</strong> ${esc(f.porque)}</p>
          <div class="rolagem">${bracoFoco(f.foco)}</div>
          <p class="meta">${esc(f.focoTexto)}</p>
          <h4>Aquecimento</h4><p>${esc(f.aquecimento)}</p>
          <h4>Exercícios</h4>
          <div class="exercicios">${f.exercicios.map((ex) => `<div class="exercicio"><h5>${esc(ex.t)}</h5><ol class="passos">${ex.passos.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>${dicaExercicio(ex)}<p class="meta"><strong>Objetivo:</strong> ${esc(ex.meta)}</p></div>`).join('')}</div>
          <h4>Vocabulário</h4>
          <p class="links-frases">${f.frases.map((id) => `<a href="#frases" data-acao="ir-frase" data-id="${id}" data-fase="${f.n}">${esc(frase(id).nome)}</a>`).join('')}
            ${f.melodias.map((id) => `<a href="#frases" data-acao="ir-frase" data-id="${id}" data-fase="${f.n}">${esc(melodia(id).nome)}</a>`).join('')}
            ${f.desafios.map((id) => `<a href="#frases" data-acao="ir-frase" data-id="${id}" data-fase="${f.n}">${esc(desafio(id).musica)} (de ouvido)</a>`).join('')}</p>
          <h4>Base sugerida</h4>
          <p><button type="button" class="btn" data-acao="base-com" data-estilo="${f.base.estilo}" data-tom="${f.base.tom}" data-bpm="${f.base.bpm}">▶ ${esc(nomeEst)} em ${esc(T.NOMES[f.base.tom])}, ${f.base.bpm} bpm</button></p>
          <h4>Regras para improvisar (uma por dia)</h4>
          <ul class="regras">${f.regras.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
          <h4>Checkpoint: avance quando tudo estiver marcado</h4>
          <ul class="checklist">${f.checkpoint.map((c, i) => `<li><label class="marcar"><input type="checkbox" data-acao="check" data-id="f${f.n}c${i}"${checks[i] ? ' checked' : ''}> ${esc(c)}</label></li>`).join('')}</ul>
          <div class="controles">
            ${atual && nChecks === f.checkpoint.length && f.n < TS.fases.length ? `<button type="button" class="btn primario" data-acao="avancar" data-n="${f.n}">Concluir a Fase ${f.n} e começar a Fase ${f.n + 1}</button>` : ''}
            ${atual && nChecks === f.checkpoint.length && f.n === TS.fases.length ? `<p class="destaque">Trilha completa. Veja abaixo os próximos passos.</p>` : ''}
            ${atual && nChecks < f.checkpoint.length ? `<a class="btn" href="#hoje">Ir para as aulas desta fase</a>` : ''}
            ${!atual ? `<button type="button" class="btn" data-acao="ir-fase" data-n="${f.n}">Estudar esta fase agora</button>` : ''}
          </div>
        </div>
      </details>`;
    }).join('')}</section>
    <section class="cartao">
      <h2>Depois da trilha</h2>
      <ul>${TS.proximoNivel.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      <p>${esc(TS.violao.guitarra)}</p>
    </section>`;
  }

  /* ================= TELA: BRAÇO ================= */
  function estadoBraco() { return st().braco; }

  function telaBraco() {
    const b = estadoBraco(), p = st().perfil;
    const e = T.escala(b.modo, b.tom);
    const insts = T.instancias(e.pcMenor, b.desenho);
    const principal = insts[0];
    const soDesenho = b.vista !== 'braco' && !!principal;
    let pts, de, ate, faixas = [];
    if (!soDesenho) {
      pts = T.pontosBraco(e, insts);
      de = 0; ate = maxCasa();
      faixas = insts.map((i) => ({ de: i.de, ate: i.ate }));
    } else {
      pts = T.pontosDesenho(e, principal);
      de = Math.max(0, principal.de - 1); ate = Math.min(maxCasa(), principal.ate + 1);
      if (de <= 1) de = 0;
    }
    // ordem de tocar: do som mais grave (6ª corda) ao mais agudo (1ª corda)
    const ordem = new Map();
    let inicio = null;
    if (soDesenho) {
      const seq = [...pts].sort((x, y) => x.altura - y.altura || y.c - x.c);
      seq.forEach((pt, i) => ordem.set(pt.c + ':' + pt.f, i + 1));
      inicio = seq[0];
    }
    pts.forEach((pt) => {
      if (b.modo === 'blues' && pt.tipo === 'extra') pt.tipo = 'blue';
      pt.rotulo = b.rotulo === 'nota' ? T.nome(pt.altura)
        : b.rotulo === 'grau' ? T.rotuloGrau(e, pt.altura)
        : b.rotulo === 'dedo' ? (pt.dedo != null ? (pt.dedo === 0 ? '0' : pt.dedo) : '')
        : b.rotulo === 'ordem' ? (ordem.get(pt.c + ':' + pt.f) || T.nome(pt.altura)) : '';
    });
    const nomeEsc = T.MODOS[b.modo].nome;
    const ondeTxt = insts.length ? insts.map((i) => `casas ${i.de} a ${i.ate}`).join(' e ') : 'fora das casas 0 a 15';
    let explica = `Desenho ${b.desenho} de ${T.NOMES[b.tom]} ${b.modo === 'maior' ? 'maior' : 'menor'}: ${ondeTxt}.`;
    if (b.modo === 'maior') explica += ` São as mesmas notas de ${T.NOMES[e.pcMenor]} menor, com o ${T.NOMES[b.tom]} como centro.`;
    if (b.modo === 'blues') explica += ` A blue note (${T.NOMES[e.extras[0]]}) aparece em azul.`;
    if (b.modo === 'completa') explica += ` As 2 notas novas (${T.NOMES[e.extras[0]]} e ${T.NOMES[e.extras[1]]}) aparecem vazadas. São as mesmas 7 notas de ${T.NOMES[T.pc(b.tom + 3)]} maior.`;
    if (!p.cutaway && principal && principal.ate > 12) explica += ' Sem cutaway, este desenho fica desconfortável neste tom. Experimente o tom de Mi.';
    const dominados = [1, 2, 3, 4, 5].map((d) => [d, !!st().quiz[b.tom + '-' + d]]);
    const lado = p.graveEmCima ? 'a linha de cima neste desenho' : 'a linha de baixo neste desenho';
    const porOnde = inicio
      ? `<p class="por-onde"><strong>Por onde começar:</strong> pela <strong>6ª corda, a mais grossa</strong> (${lado}), na ${inicio.f === 0 ? 'corda solta' : 'casa ' + inicio.f}. É a nota com o anel verde. Vá corda por corda até a 1ª, a mais fina, e volte pelo mesmo caminho. "Subir a escala" quer dizer ir do som grave para o agudo, não importa como o braço está desenhado. Escolha <strong>Mostrar: Ordem</strong> para ver as notas numeradas.</p>`
      : '<p class="por-onde"><strong>Por onde começar:</strong> escolha a vista "Só o desenho" para ver a primeira nota marcada e a ordem de tocar.</p>';
    const novato = Object.keys(st().aulasFeitas).length < 3;
    return `<section class="cartao">
      <div class="controles controles-braco">
        <label class="campo">Tom <select id="braco-tom" data-acao="braco-tom">${opcoesTom(b.tom)}</select></label>
        <span class="campo">Escala ${segmentado('braco-modo', Object.keys(T.MODOS).map((k) => [k, T.MODOS[k].curto]), b.modo)}</span>
        <span class="campo">Desenho ${segmentado('braco-desenho', [1, 2, 3, 4, 5].map((d) => [d, d]), b.desenho)}</span>
        <span class="campo">Vista ${segmentado('braco-vista', [['desenho', 'Só o desenho'], ['braco', 'Braço inteiro']], b.vista)}</span>
        <span class="campo">Mostrar ${segmentado('braco-rotulo', [['nota', 'Notas'], ['ordem', 'Ordem'], ['dedo', 'Dedos'], ['grau', 'Graus'], ['nada', 'Nada']], b.rotulo)}</span>
        <span class="campo">Cordas ${segmentado('braco-cordas', [['0', 'Fina em cima'], ['1', 'Grossa em cima']], p.graveEmCima ? '1' : '0')}
          <span class="meta">${p.graveEmCima ? 'como você vê o violão no colo' : 'igual à tablatura'}</span></span>
      </div>
      <p class="explica">${esc(explica)} <span class="meta">${esc(nomeEsc)}. Toque em qualquer nota para ouvir.</span></p>
      <div class="rolagem rolagem-braco">${D.braco({ de, ate, pontos: pts, faixas, graveEmCima: p.graveEmCima, id: 'principal', inicio })}</div>
      <p class="legenda"><span><span class="lg raiz"></span> tônica (${esc(T.NOMES[e.centro])})</span> <span><span class="lg nota"></span> nota da escala</span>
        ${e.extras.length ? `<span><span class="lg extra ${b.modo}"></span> ${b.modo === 'blues' ? 'blue note' : 'notas novas'}</span>` : ''}
        ${inicio ? '<span><span class="lg inicio"></span> comece aqui</span>' : ''}
        ${!soDesenho ? '<span><span class="lg faixa"></span> desenho escolhido</span>' : ''}</p>
      ${porOnde}
      <div class="controles">
        <button type="button" class="btn ${ui.tocandoId === 'desenho' ? 'parar' : 'primario'}" data-acao="tocar-desenho">${ui.tocandoId === 'desenho' ? '■ Parar' : '▶ Tocar o desenho na ordem (grave → agudo → grave)'}</button>
      </div>
      <details class="guia"${novato ? ' open' : ''}>
        <summary>Qual corda é qual?</summary>
        <div class="rolagem">${D.guiaCordas(p.graveEmCima)}</div>
        <ul>
          <li>A <strong>6ª corda</strong> é a mais grossa e a de som mais grave. Com o violão no colo, é a que fica mais perto do seu rosto.</li>
          <li>A <strong>1ª corda</strong> é a mais fina e a de som mais agudo. É a que fica mais perto do chão.</li>
          <li>A <strong>tablatura</strong> é ao contrário do que você vê no colo: a linha de cima é a 1ª corda (fina) e a de baixo é a 6ª (grossa).</li>
          <li>Em "Cordas", acima, você escolhe como ver o braço. Nos dois jeitos, o nome de cada corda aparece à esquerda e a linha da corda grossa é mais grossa.</li>
        </ul>
      </details>
    </section>
    <section class="cartao quiz">
      <h2>Teste de memória: monte o Desenho ${b.desenho}</h2>
      <p>Toque nas casas onde ficam as notas do Desenho ${b.desenho} de ${esc(T.NOMES[e.pcMenor])} menor pentatônica, sem olhar o braço acima. Lembrar sem ver é o que grava o desenho.</p>
      ${principal ? `<div class="rolagem">${bracoQuiz(e, principal)}</div>
      <div class="controles">
        <button type="button" class="btn primario" data-acao="quiz-conferir">Conferir</button>
        <button type="button" class="btn" data-acao="quiz-limpar">Limpar</button>
        <button type="button" class="btn" data-acao="quiz-resposta">Mostrar resposta</button>
        <span class="meta" id="quiz-resultado">${ui.quiz.resultado || ''}</span>
      </div>` : '<p class="aviso">Este desenho não cabe nas casas 0 a 15 neste tom.</p>'}
      <p class="meta">Desenhos dominados em ${esc(T.NOMES[b.tom])}: ${dominados.map(([d, ok]) => `<span class="selo ${ok ? 's-dominada' : 's-futura'}">${d}${ok ? ' ✓' : ''}</span>`).join(' ')}</p>
    </section>`;
  }

  function bracoQuiz(e, inst) {
    const certos = new Set(inst.pos.map((p) => p.c + ':' + p.f));
    const pts = [];
    if (ui.quiz.revelar) {
      inst.pos.forEach((p) => pts.push({ c: p.c, f: p.f, tipo: 'falta', rotulo: '' }));
    } else if (ui.quiz.conferido) {
      ui.quiz.marcados.forEach((k) => { const [c, f] = k.split(':').map(Number); pts.push({ c, f, tipo: certos.has(k) ? 'certo' : 'errado', rotulo: certos.has(k) ? '✓' : '✗' }); });
      certos.forEach((k) => { if (!ui.quiz.marcados.has(k)) { const [c, f] = k.split(':').map(Number); pts.push({ c, f, tipo: 'falta', rotulo: '' }); } });
    } else {
      ui.quiz.marcados.forEach((k) => { const [c, f] = k.split(':').map(Number); pts.push({ c, f, tipo: 'marcado', rotulo: '' }); });
    }
    let de = Math.max(0, inst.de - 2), ate = Math.min(maxCasa(), inst.ate + 2);
    if (de <= 1) de = 0;
    return D.braco({ de, ate, pontos: pts, clicavel: true, graveEmCima: st().perfil.graveEmCima, id: 'quiz' });
  }

  function conferirQuiz() {
    const b = estadoBraco();
    const e = T.escala(b.modo, b.tom);
    const inst = T.instanciaPrincipal(e.pcMenor, b.desenho);
    if (!inst) return;
    const certos = new Set(inst.pos.map((p) => p.c + ':' + p.f));
    let ok = 0, errados = 0;
    ui.quiz.marcados.forEach((k) => (certos.has(k) ? ok++ : errados++));
    const faltam = certos.size - ok;
    ui.quiz.conferido = true;
    if (!faltam && !errados) {
      ui.quiz.resultado = ui.quiz.erros ? 'Tudo certo! Na próxima, tente acertar de primeira.' : 'Perfeito, de primeira! Desenho dominado neste tom.';
      if (!ui.quiz.erros) E.mudar((s) => (s.quiz[b.tom + '-' + b.desenho] = true));
    } else {
      ui.quiz.erros = true;
      ui.quiz.resultado = `${ok} de ${certos.size} certas` + (errados ? `, ${errados} fora do desenho` : '') + (faltam ? `, faltam ${faltam}` : '') + '.';
    }
    render();
  }

  function resetQuiz() { ui.quiz = { marcados: new Set(), conferido: false, erros: false, resultado: '' }; }

  function tocarDesenho() {
    if (ui.tocandoId === 'desenho') { A.pararFrase(); return; }
    const b = estadoBraco();
    const e = T.escala(b.modo, b.tom);
    const inst = T.instanciaPrincipal(e.pcMenor, b.desenho);
    if (!inst) return;
    const pts = T.pontosDesenho(e, inst).sort((x, y) => x.altura - y.altura);
    const seq = pts.concat(pts.slice(0, -1).reverse());
    const evs = seq.map((p, i) => ({ t: i * 0.5, d: i === seq.length - 1 ? 2 : 0.5, notas: [{ c: p.c, f: p.f, midi: p.altura }] }));
    ui.tocandoId = 'desenho';
    render();
    A.tocarFrase(evs, {
      bpm: 80, compasso: 4, contagem: 0,
      aoEvento: (i) => {
        $$('[data-braco="principal"] .fb-nota.ativo').forEach((x) => x.classList.remove('ativo'));
        if (i >= 0) $$(`[data-braco="principal"] [data-pos="${seq[i].c}:${seq[i].f}"]`).forEach((x) => x.classList.add('ativo'));
      },
      aoFim: () => { ui.tocandoId = null; if (rota === 'braco') render(); }
    });
  }

  /* ================= TELA: FRASES ================= */
  function telaFrases() {
    const s = st();
    const filtro = ui.filtroFase == null ? s.faseAtual : ui.filtroFase;
    const tipo = ui.filtroTipo || 'tudo';
    const passa = (x) => filtro === 0 || x.fase === filtro;
    const mostra = (t) => tipo === 'tudo' || tipo === t;
    const fr = mostra('frases') ? TS.frases.filter((l) => passa(l) && !l.estilo) : [];
    const mestres = mostra('mestres') ? TS.frases.filter((l) => passa(l) && l.estilo) : [];
    const mel = mostra('melodias') ? TS.melodias.filter((m) => filtro === 0 || fase(filtro).melodias.includes(m.id)) : [];
    const des = mostra('solos') ? TS.desafios.filter(passa) : [];
    const tirados = TS.desafios.filter((d) => s.desafiosFeitos[d.id]).length;
    const opcoes = [[0, 'Todas']].concat(TS.fases.map((f) => [f.n, 'Fase ' + f.n]));
    const tipos = [['tudo', 'Tudo'], ['frases', 'Frases'], ['mestres', 'Estilo dos mestres'], ['melodias', 'Melodias'], ['solos', 'Solos famosos']];
    return `<section class="filtro">
        <span class="rotulo-ctrl">Fase</span>${segmentado('filtro-fase', opcoes, filtro)}
      </section>
      <section class="filtro">
        <span class="rotulo-ctrl">Mostrar</span>${segmentado('filtro-tipo', tipos, tipo)}
      </section>
      ${fr.length ? `<h2 class="secao">Frases <span class="meta">${fr.length}</span></h2><div class="lista">${fr.map(cartaoFrase).join('')}</div>` : ''}
      ${mestres.length ? `<h2 class="secao">No estilo dos mestres <span class="meta">${mestres.length} · frases originais com os recursos de cada guitarrista</span></h2><div class="lista">${mestres.map(cartaoFrase).join('')}</div>` : ''}
      ${mel.length ? `<h2 class="secao">Melodias conhecidas <span class="meta">mesma música, qualquer desenho</span></h2><div class="lista">${mel.map(cartaoMelodia).join('')}</div>` : ''}
      ${des.length ? `<h2 class="secao">Solos e riffs famosos <span class="meta">${tirados} de ${TS.desafios.length} tirados</span></h2>
        <p class="meta">Para tirar de ouvido. As tabs desses solos têm direitos autorais, então o app não as copia: ele mostra onde a frase mora, dá pistas, toca uma base no mesmo tom e aponta onde ouvir e conferir.</p>
        <div class="lista">${des.map(cartaoDesafio).join('')}</div>` : ''}
      ${!fr.length && !mestres.length && !mel.length && !des.length ? '<p>Nada aqui com esses filtros.</p>' : ''}`;
  }

  /* ================= TELA: BASE ================= */
  /* Qual escala usar sobre a base escolhida, e onde ela fica no braço. */
  function dicaEscala(estilo, tom) {
    const usa = TS.estilosBase[estilo].usa;
    const pcMenor = usa === 'maior' ? T.pc(tom - 3) : T.pc(tom);
    const inst = T.instanciaPrincipal(pcMenor, 1);
    const onde = !inst ? '' : inst.de === 0 ? ' O Desenho 1 fica na primeira posição, com cordas soltas.' : ` O Desenho 1 começa na casa ${inst.de}.`;
    const nome = T.NOMES[T.pc(tom)];
    let texto;
    if (usa === 'maior') texto = `pentatônica maior de ${nome}. São os desenhos de ${T.NOMES[pcMenor]} menor, com as frases pousando no ${nome}.`;
    else if (usa === 'blues') texto = `pentatônica menor de ${nome}, com a blue note de passagem.`;
    else texto = `pentatônica menor de ${nome}.`;
    return { texto: texto + onde, tom: T.pc(tom), modo: usa };
  }

  function telaBase() {
    const s = st(), b = s.base, B = A.Base;
    const comp = T.compassosBase(b.estilo, b.tom);
    const est = TS.estilosBase[b.estilo];
    const dica = dicaEscala(b.estilo, b.tom);
    const botaoEstilo = (k) => {
      const e = TS.estilosBase[k];
      const ex = T.compassosBase(k, b.tom).filter((c, i, arr) => c.nome && arr.findIndex((x) => x.nome === c.nome) === i).map((c) => c.nome).join(' – ');
      return `<button type="button" class="estilo${k === b.estilo ? ' ativo' : ''}" data-acao="base-estilo" data-v="${k}" aria-pressed="${k === b.estilo}">
        <strong>${esc(e.nome)}</strong><span class="meta">${esc(ex || 'clique a cada tempo')} · ${e.bpm} bpm</span><span>${esc(e.quando)}</span></button>`;
    };
    return `<section class="cartao base-painel">
      <div class="base-visor">
        <button type="button" class="btn-play grande" data-acao="base-alternar" aria-label="${B.tocando ? 'Parar a base' : 'Tocar a base'}">${B.tocando ? '■' : '▶'}</button>
        <div><p class="acorde-grande" id="visor-acorde">${B.tocando ? '' : esc(comp[0].nome || '—')}</p>
          <p class="meta" id="visor-compasso">${B.tocando ? '' : 'Parada'}</p></div>
      </div>
      <p><strong>${esc(est.nome)}</strong> em ${esc(T.NOMES[b.tom])} <span class="meta">· ${esc(est.quando)}</span></p>
      <div class="grade-compassos" id="grade">${comp.map((c, i) => `<span class="comp" data-comp="${i}"><small>${i + 1}</small>${esc(c.nome || '·')}</span>`).join('')}</div>
      ${b.estilo !== 'metronomo' ? `<p class="para-solar"><strong>Para solar aqui:</strong> ${esc(dica.texto)} <button type="button" class="btn-link" data-acao="ver-escala" data-tom="${dica.tom}" data-modo="${dica.modo}">Ver no braço</button></p>` : ''}
      <div class="controles controles-base">
        <label class="campo">Tom <select id="base-tom" data-acao="base-tom">${opcoesTom(b.tom)}</select></label>
        <span class="campo">Andamento ${passo('base-bpm', 'base', b.bpm + ' bpm')}</span>
        <label class="campo">Andamento fino <input type="range" min="40" max="180" step="1" value="${b.bpm}" id="base-bpm-range" data-acao="base-bpm-range"></label>
        <span class="campo">Bateria ${segmentado('base-ritmo', [['bateria', 'Bateria'], ['clique', 'Só clique'], ['nada', 'Sem']], b.ritmo)}</span>
        <span class="campo">Baixo ${segmentado('base-baixo', [['1', 'Ligado'], ['0', 'Desligado']], b.baixo !== false ? '1' : '0')}</span>
        <span class="campo">Contagem ${segmentado('base-contagem', [['1', '1, 2, 3, 4 antes'], ['0', 'Sem']], b.contagem !== false ? '1' : '0')}</span>
        <label class="campo">Volume da base <input type="range" min="0" max="1" step="0.05" value="${b.volume}" id="base-volume" data-acao="base-volume"></label>
      </div>
    </section>
    ${TS.gruposBase.map((g) => {
      const chaves = Object.keys(TS.estilosBase).filter((k) => TS.estilosBase[k].grupo === g.id);
      return `<h2 class="secao">${esc(g.nome)} <span class="meta">${chaves.length}</span></h2><section class="estilos">${chaves.map(botaoEstilo).join('')}</section>`;
    }).join('')}
    <p class="meta">${Object.keys(TS.estilosBase).length} bases, em qualquer um dos 12 tons. Ao escolher uma base, o andamento vai para o sugerido; ajuste como quiser. Tudo é gerado pelo próprio app (violão, baixo e bateria), então não precisa de internet.</p>`;
  }

  /* ================= TELA: DIÁRIO ================= */
  function maiorSequencia() {
    const dias = [...E.diasPraticados()].sort();
    let maior = 0, atual = 0, ant = null;
    dias.forEach((d) => { atual = ant && E.diasEntre(ant, d) === 1 ? atual + 1 : 1; maior = Math.max(maior, atual); ant = d; });
    return maior;
  }

  /* Linha do bpm limpo ao longo das sessões. */
  function graficoBpm(lista) {
    const W = 320, H = 96, pad = 10, topo = 16;
    const v = lista.map((x) => x.bpm);
    const min = Math.min(...v) - 4, max = Math.max(...v) + 4;
    const x = (i) => pad + (i * (W - 2 * pad)) / (lista.length - 1);
    const y = (bpm) => H - pad - ((bpm - min) * (H - pad - topo)) / (max - min);
    const pontos = lista.map((p, i) => x(i).toFixed(1) + ',' + y(p.bpm).toFixed(1)).join(' ');
    const ult = lista.length - 1;
    return `<svg class="grafico" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Bpm limpo: de ${v[0]} para ${v[ult]}">
      <polyline class="gr-linha" points="${pontos}"/>
      <circle class="gr-ponto" cx="${x(0)}" cy="${y(v[0])}" r="4"/><circle class="gr-ponto fim" cx="${x(ult)}" cy="${y(v[ult])}" r="5"/>
      <text class="gr-rot" x="${x(0)}" y="${y(v[0]) - 8}">${v[0]}</text><text class="gr-rot fim" x="${x(ult)}" y="${y(v[ult]) - 9}" text-anchor="end">${v[ult]} bpm</text>
    </svg>`;
  }

  function conquistas() {
    const s = st();
    const aulas = Object.keys(s.aulasFeitas).length;
    const mem = Object.keys(s.licks).filter((id) => s.licks[id].caixa >= 3).length;
    const solos = Object.keys(s.desafiosFeitos).filter((id) => s.desafiosFeitos[id]).length;
    const desenhos = Object.keys(s.quiz).filter((k) => s.quiz[k]).length;
    const seq = maiorSequencia();
    return [
      ['Primeira aula', aulas >= 1], ['5 aulas', aulas >= 5], ['20 aulas', aulas >= 20], ['50 aulas', aulas >= 50],
      ['3 dias seguidos', seq >= 3], ['7 dias seguidos', seq >= 7], ['30 dias seguidos', seq >= 30],
      ['3 frases de memória', mem >= 3], ['10 frases de memória', mem >= 10], ['25 frases de memória', mem >= 25],
      ['1º solo famoso tirado', solos >= 1], ['5 solos famosos', solos >= 5], ['15 solos famosos', solos >= 15],
      ['1º desenho de memória', desenhos >= 1], ['Os 5 desenhos em Lá', [1, 2, 3, 4, 5].every((d) => s.quiz['9-' + d])]
    ].concat(TS.fases.map((f) => ['Fase ' + f.n + ' concluída', !!s.fasesConcluidas[f.n]]));
  }

  function telaDiario() {
    const s = st();
    const sess = [...s.sessoes].reverse();
    const minutos = s.sessoes.reduce((a, x) => a + (x.min || 0), 0);
    const comBpm = s.sessoes.filter((x) => x.bpm);
    const emEstudo = Object.keys(s.licks).length;
    const mem = Object.keys(s.licks).filter((id) => s.licks[id].caixa >= 3).length;
    const dominadas = Object.keys(s.licks).filter((id) => E.statusLick(id).tipo === 'dominada').length;
    const aulas = Object.keys(s.aulasFeitas).length;
    const solos = Object.keys(s.desafiosFeitos).filter((id) => s.desafiosFeitos[id]).length;
    const conq = conquistas();
    const ganhas = conq.filter((c) => c[1]).length;
    return `${jornada()}
      <section class="numeros">
        <div><p class="numero">${aulas}</p><p class="meta">aulas concluídas</p></div>
        <div><p class="numero">${E.sequencia()}</p><p class="meta">dias seguidos · recorde ${maiorSequencia()}</p></div>
        <div><p class="numero">${Math.floor(minutos / 60)}h${String(minutos % 60).padStart(2, '0')}</p><p class="meta">de prática</p></div>
        <div><p class="numero">${mem}</p><p class="meta">frases de memória · ${emEstudo} em estudo · ${dominadas} dominadas</p></div>
        <div><p class="numero">${solos}</p><p class="meta">solos famosos tirados, de ${TS.desafios.length}</p></div>
      </section>
      <section class="cartao">
        <h2>Evolução por fase</h2>
        <ul class="evolucao">${TS.fases.map((f) => {
          const pct = progressoFase(f);
          return `<li class="${f.n === s.faseAtual ? 'atual' : ''}"><span class="ev-nome"><strong>Fase ${f.n}</strong> ${esc(f.titulo)}</span>
            <span class="barra"><span style="width:${pct}%"></span></span><span class="ev-pct">${pct}%</span></li>`;
        }).join('')}</ul>
        <p class="meta">Cada fase enche com as aulas feitas (metade) e com o checkpoint marcado (metade).</p>
      </section>
      <section class="cartao">
        <h2>Velocidade limpa</h2>
        ${comBpm.length >= 2 ? `<div class="rolagem">${graficoBpm(comBpm)}</div>
          <p>Bpm limpo no aquecimento: começou em <strong>${comBpm[0].bpm}</strong> (${E.dataCurta(comBpm[0].data)}) e está em <strong>${comBpm[comBpm.length - 1].bpm}</strong> (${E.dataCurta(comBpm[comBpm.length - 1].data)}).</p>`
        : '<p class="meta">Anote o bpm limpo do aquecimento ao concluir cada aula. Com 2 registros, o gráfico aparece aqui.</p>'}
      </section>
      <section class="cartao">
        <h2>Conquistas <span class="meta">${ganhas} de ${conq.length}</span></h2>
        <ul class="conquistas">${conq.map(([t, ok]) => `<li class="${ok ? 'sim' : ''}">${ok ? '✓ ' : ''}${esc(t)}</li>`).join('')}</ul>
      </section>
      <section class="cartao">
        <h2>Últimas 4 semanas</h2>
        <div class="dias grande">${faixaDias(28)}</div>
      </section>
      <section class="cartao">
        <h2>Aulas registradas</h2>
        ${sess.length ? `<ul class="sessoes">${sess.map((x) => `<li><span class="data">${E.dataCurta(x.data)}</span><span>Fase ${x.fase}${x.aula ? ' · Aula ' + x.aula : ''} · ${x.min} min${x.bpm ? ' · ' + x.bpm + ' bpm' : ''}</span>${x.nota ? `<p>${esc(x.nota)}</p>` : ''}</li>`).join('')}</ul>`
        : '<p>Nenhuma aula registrada ainda. Ao terminar a prática na aba Hoje, toque em "Concluir a Aula" e ela aparece aqui.</p>'}
      </section>`;
  }

  /* ================= TELA: AJUSTES ================= */
  function telaAjustes() {
    const p = st().perfil;
    return `<section class="cartao">
        <h2>Seu violão e sua rotina</h2>
        <form id="form-perfil" class="form-perfil">${camposPerfil(p)}
          <button type="submit" class="btn primario">Salvar</button>
        </form>
      </section>
      <section class="cartao">
        <h2>Dicas para o seu violão de ${p.corda === 'nylon' ? 'nylon' : 'aço'}</h2>
        <ul>${TS.violao[p.corda].map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
        ${!p.cutaway ? `<p>${esc(TS.violao.semCutaway)}</p>` : ''}
        <p>${esc(TS.violao.guitarra)}</p>
      </section>
      <section class="cartao">
        <h2>Backup do progresso</h2>
        <p>O progresso fica guardado neste navegador, neste computador. Se você limpar os dados do navegador, ele some. Faça um backup de vez em quando, e use-o também para levar o progresso para outro computador.</p>
        ${!E.ok() ? '<p class="aviso">O navegador está bloqueando o armazenamento. O progresso desta visita não será guardado. Abra o app em uma janela normal (não anônima).</p>' : ''}
        <div class="controles">
          <button type="button" class="btn primario" data-acao="exportar">Baixar backup</button>
          <label class="btn">Restaurar backup <input type="file" accept="application/json,.json" id="importar" hidden></label>
        </div>
      </section>
      <section class="cartao">
        <h2>Recomeçar do zero</h2>
        <p>Apaga fases, checkpoints, frases e diário. O perfil do violão é mantido.</p>
        ${ui.confirmarZerar
          ? `<p class="aviso">Tem certeza? Isso não pode ser desfeito. <button type="button" class="btn perigo" data-acao="zerar-sim">Sim, apagar tudo</button> <button type="button" class="btn" data-acao="zerar-nao">Cancelar</button></p>`
          : `<button type="button" class="btn" data-acao="zerar">Apagar meu progresso</button>`}
      </section>`;
  }

  /* ================= roteamento e render ================= */
  function render() {
    const main = $('#app');
    const telas = { hoje: telaHoje, trilha: telaTrilha, braco: telaBraco, frases: telaFrases, base: telaBase, diario: telaDiario, ajustes: telaAjustes };
    main.innerHTML = telas[rota]();
    $$('.nav a').forEach((a) => a.setAttribute('aria-current', a.dataset.rota === rota ? 'page' : 'false'));
    atualizarPlayer();
  }

  function irPara(r) {
    rota = ROTAS[r] ? r : 'hoje';
    render();
  }

  window.addEventListener('hashchange', () => {
    const r = location.hash.slice(1);
    if (ui.manterRolagem) { ui.manterRolagem = false; if (r === rota) return; }
    irPara(r);
    window.scrollTo(0, 0);
  });

  /* ================= player da base (rodapé) ================= */
  function atualizarPlayer() {
    const b = st().base, B = A.Base;
    const est = TS.estilosBase[b.estilo];
    $('#pl-tocar').textContent = B.tocando ? '■' : '▶';
    $('#pl-tocar').setAttribute('aria-label', B.tocando ? 'Parar a base' : 'Tocar a base');
    $('#pl-desc').textContent = `${est.curto} · ${T.NOMES[b.tom]} · ${b.bpm} bpm`;
    $('#pl-bpm').textContent = b.bpm;
    if (!B.tocando) $('#pl-acorde').textContent = 'Base';
    $('#player').classList.toggle('tocando', B.tocando);
  }

  A.Base.ouvir((ev) => {
    if (ev.estado) { atualizarPlayer(); if (rota === 'base') render(); return; }
    if (ev.contagem) {
      $('#pl-acorde').textContent = ev.contagem + '…';
      const vc = $('#visor-acorde');
      if (vc) { vc.textContent = ev.contagem; $('#visor-compasso').textContent = 'contagem: a base entra depois do 4'; }
      return;
    }
    $('#pl-acorde').textContent = ev.acorde || '♩';
    const v = $('#visor-acorde');
    if (v) {
      v.textContent = ev.acorde || '♩';
      $('#visor-compasso').textContent = `compasso ${ev.compasso + 1} de ${A.Base.compassos.length} · tempo ${ev.tempo + 1}`;
      $$('#grade .comp').forEach((x) => x.classList.toggle('ativo', Number(x.dataset.comp) === ev.compasso));
    }
  });

  function cfgBase() {
    const b = st().base;
    return { estilo: b.estilo, tom: b.tom, bpm: b.bpm, ritmo: b.ritmo, baixo: b.baixo !== false, contagem: b.contagem !== false };
  }

  function aplicarBase(mudanca, iniciar) {
    E.mudar((s) => Object.assign(s.base, mudanca));
    const b = st().base;
    A.Base.configurar(cfgBase());
    if (iniciar && !A.Base.tocando) { A.garantir(); A.volumeBase(b.volume); A.Base.iniciar(); manterTelaAcesa(true); }
    if (rota === 'base') render(); else atualizarPlayer();
  }

  function alternarBase() {
    const b = st().base;
    if (A.Base.tocando) { A.Base.parar(); manterTelaAcesa(false); }
    else { A.garantir(); A.volumeBase(b.volume); A.Base.iniciar(cfgBase()); manterTelaAcesa(true); }
  }

  /* ================= cronômetro dos blocos ================= */
  function alternarTimer(bloco, min) {
    if (ui.timer && ui.timer.bloco === bloco) {
      clearInterval(ui.timer.int);
      ui.timer = null;
      render();
      return;
    }
    if (ui.timer) clearInterval(ui.timer.int);
    ui.timer = { bloco, restante: min * 60 };
    ui.timer.int = setInterval(() => {
      ui.timer.restante--;
      const el = $('#timer-' + bloco);
      if (el) el.textContent = '⏸ ' + Math.floor(ui.timer.restante / 60) + ':' + String(ui.timer.restante % 60).padStart(2, '0');
      if (ui.timer.restante <= 0) {
        clearInterval(ui.timer.int);
        ui.timer = null;
        A.sinal();
        E.marcarBloco(bloco, true);
        toast(TITULOS_BLOCO[bloco] + ': tempo concluído.');
        if (rota === 'hoje') render();
      }
    }, 1000);
    render();
  }

  /* ================= eventos ================= */
  document.addEventListener('click', (ev) => {
    // notas do braço: ouvir ou marcar no teste
    const alvoBraco = ev.target.closest('svg.braco [data-c][data-f]');
    if (alvoBraco) {
      const svg = alvoBraco.closest('svg.braco');
      const c = Number(alvoBraco.dataset.c), f = Number(alvoBraco.dataset.f);
      if (svg.dataset.braco === 'quiz') {
        if (ui.quiz.conferido || ui.quiz.revelar) { ui.quiz.conferido = false; ui.quiz.revelar = false; }
        const k = c + ':' + f;
        if (ui.quiz.marcados.has(k)) ui.quiz.marcados.delete(k); else ui.quiz.marcados.add(k);
        ui.quiz.resultado = '';
        A.tocarNota(T.altura(c, f), { dur: 0.8 });
        render();
      } else {
        A.tocarNota(T.altura(c, f));
      }
      return;
    }

    const el = ev.target.closest('[data-acao]');
    if (!el || el.tagName === 'SELECT' || (el.tagName === 'INPUT' && el.type !== 'button')) return;
    const acao = el.dataset.acao, id = el.dataset.id;
    const delta = Number(el.dataset.delta || 0);

    switch (acao) {
      case 'tocar': A.garantir(); tocarCartao(id); break;
      case 'bpm': {
        const c = ui.cartoes[id];
        c.bpm = Math.max(30, Math.min(200, c.bpm + delta * 5));
        atualizarCartao(id);
        break;
      }
      case 'transp': {
        // pula tons em que a frase não cabe entre as casas 0 e 15
        const c = ui.cartoes[id], l = frase(id);
        let t = c.transp + delta;
        for (let i = 0; l && i < 12 && !T.transporFrase(l.notas, t); i++) t += delta;
        c.transp = t;
        if (ui.tocandoId === id) A.pararFrase();
        atualizarCartao(id);
        break;
      }
      case 'transp-para': ui.cartoes[id].transp = Number(el.dataset.semis); atualizarCartao(id); break;
      case 'ver-braco': ui.cartoes[id].braco = !ui.cartoes[id].braco; atualizarCartao(id); break;
      case 'desenho-mel': ui.cartoes[id].desenho = Number(el.dataset.v); if (ui.tocandoId === id) A.pararFrase(); atualizarCartao(id); break;
      case 'comecar': E.comecarLick(id); toast('Frase adicionada. O app vai trazê-la para revisão amanhã.'); atualizarCartao(id); break;
      case 'avaliar': {
        const ok = el.dataset.ok === '1';
        E.avaliarLick(id, ok);
        toast(ok ? 'Boa! A próxima revisão fica mais espaçada.' : 'Sem problema: ela volta amanhã.');
        atualizarCartao(id);
        break;
      }
      case 'ir-frase': {
        ev.preventDefault();
        ui.filtroFase = Number(el.dataset.fase);
        if (location.hash !== '#frases') { ui.manterRolagem = true; location.hash = '#frases'; }
        irPara('frases');
        setTimeout(() => { const alvo = $('#c-' + id); if (alvo) alvo.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 80);
        break;
      }
      case 'filtro-fase': ui.filtroFase = Number(el.dataset.v); render(); break;
      case 'sessao-curta': ui.sessaoCurta = el.dataset.v === '1'; render(); break;
      case 'timer': alternarTimer(el.dataset.bloco, Number(el.dataset.min)); break;
      case 'base-com':
        A.garantir();
        if (A.Base.tocando) A.Base.parar();
        aplicarBase({ estilo: el.dataset.estilo, tom: Number(el.dataset.tom), bpm: Number(el.dataset.bpm), ritmo: el.dataset.estilo === 'metronomo' ? 'clique' : st().base.ritmo === 'clique' ? 'bateria' : st().base.ritmo }, true);
        toast('Base tocando. Controle no rodapé.');
        break;
      case 'base-alternar': alternarBase(); break;
      case 'base-bpm': aplicarBase({ bpm: Math.max(40, Math.min(200, st().base.bpm + delta * 5)) }); break;
      case 'base-estilo': aplicarBase({ estilo: el.dataset.v, bpm: TS.estilosBase[el.dataset.v].bpm || st().base.bpm }); break;
      case 'base-baixo': aplicarBase({ baixo: el.dataset.v === '1' }); break;
      case 'base-contagem': aplicarBase({ contagem: el.dataset.v === '1' }); break;
      case 'ver-escala':
        E.mudar((x) => Object.assign(x.braco, { tom: Number(el.dataset.tom), modo: el.dataset.modo, desenho: 1, vista: 'desenho' }));
        resetQuiz();
        location.hash = '#braco';
        break;
      case 'aula-ir': {
        const f = st().faseAtual;
        E.irParaAula(f, E.aulaAtual(f) + delta);
        ui.sessaoCurta = false; ui.confirmarAvanco = false;
        if (ui.timer) { clearInterval(ui.timer.int); ui.timer = null; }
        render();
        window.scrollTo(0, 0);
        toast('Aula ' + (E.aulaAtual(f) + 1) + ' aberta.');
        break;
      }
      case 'ir-checkpoint': {
        ev.preventDefault();
        const alvo = $('#bloco-checkpoint'); if (alvo) alvo.scrollIntoView({ behavior: 'smooth', block: 'start' });
        break;
      }
      case 'abrir-fase': {
        ev.preventDefault();
        ui.abrirFase = Number(el.dataset.n);
        if (location.hash !== '#trilha') { ui.manterRolagem = true; location.hash = '#trilha'; }
        irPara('trilha');
        setTimeout(() => { const alvo = $('#fase-' + ui.abrirFase); if (alvo) alvo.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 80);
        break;
      }
      case 'avancar-pedir': ui.confirmarAvanco = true; render(); break;
      case 'avancar-nao': ui.confirmarAvanco = false; render(); break;
      case 'filtro-tipo': ui.filtroTipo = el.dataset.v; render(); break;
      case 'base-ritmo': aplicarBase({ ritmo: el.dataset.v }); break;
      case 'avancar': {
        const n = Number(el.dataset.n);
        const completa = fase(n).checkpoint.every((_, i) => st().checks['f' + n + 'c' + i]);
        E.mudar((s) => { if (completa) s.fasesConcluidas[n] = true; s.faseAtual = Math.min(TS.fases.length, n + 1); });
        resetQuiz();
        ui.confirmarAvanco = false; ui.sessaoCurta = false;
        toast(completa ? `Fase ${n} concluída! Bem-vindo à Fase ${n + 1}.` : `Você está na Fase ${n + 1}. A Fase ${n} continua aberta na aba Trilha.`);
        render();
        if (rota === 'hoje') window.scrollTo(0, 0);
        else { const alvo = $('#fase-' + (n + 1)); if (alvo) alvo.scrollIntoView({ behavior: 'smooth' }); }
        break;
      }
      case 'ir-fase': E.mudar((s) => (s.faseAtual = Number(el.dataset.n))); ui.confirmarAvanco = false; resetQuiz(); toast('Agora você está estudando a Fase ' + el.dataset.n + '. As aulas dela estão na aba Hoje.'); render(); break;
      case 'braco-modo': E.mudar((s) => (s.braco.modo = el.dataset.v)); resetQuiz(); render(); break;
      case 'braco-desenho': E.mudar((s) => (s.braco.desenho = Number(el.dataset.v))); resetQuiz(); render(); break;
      case 'braco-vista': E.mudar((s) => (s.braco.vista = el.dataset.v)); render(); break;
      case 'braco-rotulo': E.mudar((s) => (s.braco.rotulo = el.dataset.v)); render(); break;
      case 'braco-cordas': E.mudar((s) => (s.perfil.graveEmCima = el.dataset.v === '1')); render(); break;
      case 'tocar-desenho': A.garantir(); tocarDesenho(); break;
      case 'quiz-conferir': conferirQuiz(); break;
      case 'quiz-limpar': resetQuiz(); render(); break;
      case 'quiz-resposta': ui.quiz.revelar = true; ui.quiz.erros = true; ui.quiz.resultado = 'Resposta à mostra. Limpe e tente de novo de memória.'; render(); break;
      case 'exportar': E.exportar(); break;
      case 'zerar': ui.confirmarZerar = true; render(); break;
      case 'zerar-nao': ui.confirmarZerar = false; render(); break;
      case 'zerar-sim': E.zerar(); ui.confirmarZerar = false; ui.cartoes = {}; resetQuiz(); toast('Progresso apagado.'); render(); break;
      default: break;
    }
  });

  document.addEventListener('change', (ev) => {
    const el = ev.target;
    const acao = el.dataset && el.dataset.acao;
    if (el.id === 'importar' && el.files && el.files[0]) {
      const r = new FileReader();
      r.onload = () => {
        try { E.importar(r.result); A.definirTimbre(st().perfil.corda); toast('Backup restaurado.'); render(); }
        catch (e) { toast(e.message || 'Não foi possível ler este arquivo.'); }
      };
      r.readAsText(el.files[0]);
      return;
    }
    if (!acao) return;
    const id = el.dataset.id;
    switch (acao) {
      case 'loop': ui.cartoes[id].loop = el.checked; break;
      case 'bloco-feito': E.marcarBloco(el.dataset.bloco, el.checked); el.closest('.bloco').classList.toggle('feito', el.checked); break;
      case 'check': E.mudar((s) => (s.checks[id] = el.checked)); ui.confirmarAvanco = false; render(); break;
      case 'desafio-feito':
        E.mudar((s) => (s.desafiosFeitos[id] = el.checked));
        el.closest('.cartao').classList.toggle('tirado', el.checked);
        if (el.checked) toast('Mais um para a sua lista de solos tirados!');
        break;
      case 'braco-tom': E.mudar((s) => (s.braco.tom = Number(el.value))); resetQuiz(); render(); break;
      case 'base-tom': aplicarBase({ tom: Number(el.value) }); break;
      case 'base-bpm-range': aplicarBase({ bpm: Number(el.value) }); break;
      case 'base-volume': E.mudar((s) => (s.base.volume = Number(el.value))); A.volumeBase(Number(el.value)); break;
      default: break;
    }
  });

  document.addEventListener('input', (ev) => {
    if (ev.target.id === 'base-volume') A.volumeBase(Number(ev.target.value));
  });

  document.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const form = ev.target;
    if (form.id === 'form-perfil') {
      const fd = new FormData(form);
      E.mudar((s) => {
        s.perfil.corda = fd.get('corda') || s.perfil.corda;
        s.perfil.cutaway = fd.get('cutaway') === 'sim';
        s.perfil.minutos = Number(fd.get('minutos')) || s.perfil.minutos;
        if (fd.get('cordas')) s.perfil.graveEmCima = fd.get('cordas') === 'grossa';
        s.perfil.configurado = true;
      });
      A.definirTimbre(st().perfil.corda);
      ui.cartoes = {};
      toast('Perfil salvo.');
      render();
    }
    if (form.id === 'form-sessao') {
      const blocos = planoDoDia();
      const feitos = E.blocosDeHoje();
      const minFeitos = blocos.filter((b) => feitos[b.id]).reduce((a, b) => a + b.min, 0);
      const bpm = Number($('#sessao-bpm').value) || null;
      const nota = $('#sessao-nota').value.trim();
      const nFase = st().faseAtual, aula = E.aulaAtual(nFase);
      E.registrarSessao({ min: (minFeitos || blocos.reduce((a, b) => a + b.min, 0)) + 1, bpm, nota, aula: aula + 1 });
      // o dia corrido (5 min) conta para a sequência, mas a aula continua aberta
      if (!ui.sessaoCurta) E.concluirAula(nFase, aula);
      const seq = E.sequencia();
      const dias = `${seq} ${seq === 1 ? 'dia seguido' : 'dias seguidos'}`;
      toast(ui.sessaoCurta ? `Dia registrado: ${dias}. A Aula ${aula + 1} continua aberta.` : `Aula ${aula + 1} concluída. ${dias}.`);
      ui.sessaoCurta = false;
      render();
      window.scrollTo(0, 0);
    }
  });

  /* ================= início ================= */
  E.carregar();
  A.definirTimbre(st().perfil.corda);
  A.Base.configurar(cfgBase());
  irPara(location.hash.slice(1) || 'hoje');

  /* Celular: a tela apaga e libera a trava; ao voltar com a base tocando, trava de novo. */
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && A.Base.tocando) { ui.wakeLock = null; manterTelaAcesa(true); }
  });

  /* Versão publicada (https): funciona sem internet e pede ao navegador para não apagar o progresso.
     No clique duplo (file://) nada disso roda, e o app funciona como sempre. */
  if (/^https?:$/.test(location.protocol)) {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  }
})();
