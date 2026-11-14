/* Trilha do Solo — estado do usuário (salvo no navegador) + revisão espaçada + backup. */
(function () {
  const TS = (window.TS = window.TS || {});
  const CHAVE = 'trilha-do-solo:v1';
  const E = {};

  /* Revisão espaçada (sistema de caixas): caixa 1 revisa amanhã, caixa 6 daqui a 30 dias. */
  E.INTERVALOS = [0, 1, 2, 4, 7, 14, 30];
  E.CAIXA_MAX = 6;

  const doisDig = (n) => String(n).padStart(2, '0');
  E.hoje = function () {
    const d = new Date();
    return d.getFullYear() + '-' + doisDig(d.getMonth() + 1) + '-' + doisDig(d.getDate());
  };
  const paraData = (iso) => { const [a, m, d] = iso.split('-').map(Number); return new Date(a, m - 1, d, 12); };
  E.somarDias = function (iso, n) {
    const d = paraData(iso); d.setDate(d.getDate() + n);
    return d.getFullYear() + '-' + doisDig(d.getMonth() + 1) + '-' + doisDig(d.getDate());
  };
  E.diasEntre = (a, b) => Math.round((paraData(b) - paraData(a)) / 86400000);
  E.dataCurta = function (iso) {
    const d = paraData(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
  };
  E.diaDoAno = function () { return Math.floor(paraData(E.hoje()) / 86400000); };

  function padrao() {
    return {
      versao: 1,
      criadoEm: E.hoje(),
      perfil: { configurado: false, corda: 'nylon', cutaway: false, minutos: 20, graveEmCima: false },
      faseAtual: 1,
      checks: {},
      fasesConcluidas: {},
      licks: {},
      quiz: {},
      sessoes: [],
      hojeFeitos: { data: null, blocos: {} },
      base: { estilo: 'menor', tom: 9, bpm: 70, ritmo: 'bateria', volume: 0.6 },
      braco: { tom: 9, modo: 'menor', desenho: 1, vista: 'desenho', rotulo: 'nota' }
    };
  }

  function mesclar(base, novo) {
    if (!novo || typeof novo !== 'object' || Array.isArray(novo)) return novo === undefined ? base : novo;
    const out = Array.isArray(base) ? [] : Object.assign({}, base);
    Object.keys(novo).forEach((k) => {
      const b = base ? base[k] : undefined;
      out[k] = b && typeof b === 'object' && !Array.isArray(b) ? mesclar(b, novo[k]) : novo[k];
    });
    return out;
  }

  let estado = padrao();
  let armazenamentoOk = true;

  E.carregar = function () {
    try {
      const txt = localStorage.getItem(CHAVE);
      if (txt) estado = mesclar(padrao(), JSON.parse(txt));
    } catch (e) {
      armazenamentoOk = false;
    }
    return estado;
  };
  E.salvar = function () {
    try { localStorage.setItem(CHAVE, JSON.stringify(estado)); armazenamentoOk = true; }
    catch (e) { armazenamentoOk = false; }
  };
  E.ok = () => armazenamentoOk;
  E.get = () => estado;
  E.mudar = function (fn) { fn(estado); E.salvar(); };

  /* -------- Frases: revisão espaçada -------- */
  E.lick = (id) => estado.licks[id] || null;
  E.vencimento = function (id) {
    const l = E.lick(id);
    if (!l) return null;
    return E.somarDias(l.ultima, E.INTERVALOS[Math.min(l.caixa, E.CAIXA_MAX)]);
  };
  E.statusLick = function (id) {
    const l = E.lick(id);
    if (!l) return { tipo: 'nova', texto: 'Nova' };
    const venc = E.vencimento(id), hoje = E.hoje();
    if (l.caixa >= E.CAIXA_MAX && venc > hoje) return { tipo: 'dominada', texto: 'Dominada' };
    if (venc <= hoje) return { tipo: 'revisar', texto: 'Revisar hoje' };
    return { tipo: 'emdia', texto: 'Próxima revisão: ' + E.dataCurta(venc) };
  };
  E.comecarLick = function (id) {
    E.mudar((s) => { if (!s.licks[id]) s.licks[id] = { caixa: 1, ultima: E.hoje(), vezes: 1 }; });
  };
  E.avaliarLick = function (id, deMemoria) {
    E.mudar((s) => {
      const l = s.licks[id] || { caixa: 0, ultima: E.hoje(), vezes: 0 };
      l.caixa = deMemoria ? Math.min(E.CAIXA_MAX, l.caixa + 1) : 1;
      l.ultima = E.hoje();
      l.vezes = (l.vezes || 0) + 1;
      s.licks[id] = l;
    });
  };
  E.revisoesDeHoje = function (limite) {
    const hoje = E.hoje();
    return Object.keys(estado.licks)
      .map((id) => ({ id, venc: E.vencimento(id) }))
      .filter((x) => x.venc <= hoje && E.lick(x.id).ultima !== hoje)
      .sort((a, b) => (a.venc < b.venc ? -1 : 1))
      .slice(0, limite)
      .map((x) => x.id);
  };

  /* -------- Blocos de hoje -------- */
  E.blocosDeHoje = function () {
    if (estado.hojeFeitos.data !== E.hoje()) estado.hojeFeitos = { data: E.hoje(), blocos: {} };
    return estado.hojeFeitos.blocos;
  };
  E.marcarBloco = function (id, feito) {
    E.mudar(() => { E.blocosDeHoje()[id] = !!feito; });
  };

  /* -------- Sessões e sequência -------- */
  E.registrarSessao = function (sessao) {
    E.mudar((s) => s.sessoes.push(Object.assign({ data: E.hoje(), fase: s.faseAtual }, sessao)));
  };
  E.diasPraticados = function () {
    return new Set(estado.sessoes.map((s) => s.data));
  };
  E.sequencia = function () {
    const dias = E.diasPraticados();
    let d = E.hoje();
    if (!dias.has(d)) d = E.somarDias(d, -1);
    let n = 0;
    while (dias.has(d)) { n++; d = E.somarDias(d, -1); }
    return n;
  };

  /* -------- Backup -------- */
  E.exportar = function () {
    const blob = new Blob([JSON.stringify(estado, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'trilha-do-solo-backup-' + E.hoje() + '.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
  };
  E.importar = function (texto) {
    const dados = JSON.parse(texto);
    if (!dados || typeof dados !== 'object' || !dados.perfil || !Array.isArray(dados.sessoes)) {
      throw new Error('Este arquivo não é um backup da Trilha do Solo.');
    }
    estado = mesclar(padrao(), dados);
    E.salvar();
  };
  E.zerar = function () {
    const perfil = estado.perfil;
    estado = padrao();
    estado.perfil = perfil;
    E.salvar();
  };

  TS.Estado = E;
})();
