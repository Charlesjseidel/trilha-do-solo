// Testa js/audio.js com um AudioContext falso que valida cada chamada como o navegador faria.
const fs = require('fs'), path = require('path'), vm = require('vm');
const raiz = process.argv[2] || path.join(__dirname, '..');
let problemas = [], agora = 0, vozes = 0, buffersRuins = 0;
const ok = (v) => typeof v === 'number' && isFinite(v);
function param(nome, v) {
  let ultimoT = -Infinity;
  const chk = (fn, val, t) => {
    if (!ok(val)) problemas.push(`${nome}.${fn}: valor inválido ${val}`);
    if (!ok(t) || t < 0) problemas.push(`${nome}.${fn}: tempo inválido ${t}`);
    if (fn === 'exponentialRampToValueAtTime' && val <= 0) problemas.push(`${nome}: rampa exponencial para ${val}`);
    ultimoT = Math.max(ultimoT, t);
  };
  return { value: v, setValueAtTime: (val, t) => chk('setValueAtTime', val, t), linearRampToValueAtTime: (val, t) => chk('linearRamp', val, t),
    exponentialRampToValueAtTime: (val, t) => chk('exponentialRampToValueAtTime', val, t), cancelScheduledValues: () => {} };
}
const no = (extra) => Object.assign({ connect: (x) => x, disconnect: () => {} }, extra);
class FakeCtx {
  constructor() { this.sampleRate = 48000; this.state = 'running'; this.destination = no(); }
  get currentTime() { return agora; }
  resume() {}
  createBuffer(ch, len, sr) { const d = new Float32Array(len); return { length: len, getChannelData: () => d, _d: d }; }
  createGain() { return no({ gain: param('gain', 1) }); }
  createBiquadFilter() { return no({ type: '', frequency: param('freq', 0), Q: param('Q', 0), gain: param('fgain', 0) }); }
  createDynamicsCompressor() { return no({ threshold: param('th', 0), ratio: param('r', 0), attack: param('a', 0), release: param('rel', 0) }); }
  createConvolver() { return no({ buffer: null }); }
  createWaveShaper() { return no({ curve: null, oversample: 'none' }); }
  createOscillator() { return no({ frequency: param('oscfreq', 440), start: (t) => { if (!ok(t)) problemas.push('osc start'); }, stop: (t) => { if (t != null && !ok(t)) problemas.push('osc stop'); } }); }
  createBufferSource() {
    vozes++;
    const s = no({ buffer: null, playbackRate: param('rate', 1) });
    s.start = (t, off) => {
      if (!ok(t) || t < 0) problemas.push('src start tempo ' + t);
      if (off != null && !ok(off)) problemas.push('src offset');
      if (s.buffer && s.buffer._d) {
        const d = s.buffer._d; let pico = 0, nan = false, fim = 0;
        for (let i = 0; i < d.length; i += 7) { if (!isFinite(d[i])) nan = true; pico = Math.max(pico, Math.abs(d[i])); }
        for (let i = d.length - 2000; i < d.length; i++) fim = Math.max(fim, Math.abs(d[i]));
        if (nan || pico < 0.05 || pico > 1.5) buffersRuins++;
      }
    };
    s.stop = (t) => { if (t != null && !ok(t)) problemas.push('src stop ' + t); };
    return s;
  }
}
const ctx = { window: {}, console, setTimeout, clearTimeout, setInterval, clearInterval, requestAnimationFrame: (f) => setTimeout(f, 16), cancelAnimationFrame: clearTimeout };
ctx.window.window = ctx.window;
ctx.window.AudioContext = FakeCtx;
vm.createContext(ctx);
for (const f of ['data/curriculo.js', 'data/frases.js', 'js/teoria.js', 'js/audio.js']) {
  vm.runInContext(fs.readFileSync(path.join(raiz, f), 'utf8').replace(/^window\.TS = window\.TS \|\| \{\};/m, 'var TS = window.TS = window.TS || {};'), ctx, { filename: f });
}
const TS = ctx.window.TS, A = TS.Audio, T = TS.T;
A.garantir();

// 1) timbres e alcance de notas
for (const timbre of ['nylon', 'aco']) { A.definirTimbre(timbre); for (let m = 40; m <= 80; m++) A.tocarNota(m); }
console.log(`Notas 40-80 nos 2 timbres: ${vozes} vozes, buffers ruins: ${buffersRuins}`);

// 2) todas as frases e melodias (síncrono: agenda tudo de uma vez)
vozes = 0;
TS.frases.forEach((l) => { const h = A.tocarFrase(T.eventosFrase(l.notas), { bpm: l.bpm, contagem: 4, compasso: 4 }); h.parar(); });
TS.melodias.forEach((m) => {
  const pcMenor = T.pc(m.tipo === 'maior' ? m.centro - 3 : m.centro);
  for (let d = 1; d <= 5; d++) { const enc = T.encaixarMelodia(m.notas.map((n) => n[0]), pcMenor, d); const h = A.tocarFrase(T.eventosMelodia(m, enc.pos), { bpm: m.bpm, contagem: 3 }); h.parar(); }
});
console.log(`Frases e melodias agendadas: ${vozes} vozes`);

// 3) bases: avança o relógio e conta eventos de compasso/acorde
(async () => {
  for (const estilo of Object.keys(T.PROGRESSOES)) {
    for (const ritmo of ['bateria', 'clique', 'nada']) {
      vozes = 0; agora = 0;
      const vistos = [];
      const sair = A.Base.ouvir((ev) => { if (ev.acorde !== undefined) vistos.push(ev.compasso + ':' + ev.acorde); });
      A.Base.iniciar({ estilo, tom: 9, bpm: 120, ritmo });
      // 12 compassos a 120 bpm = 24 s; avança o relógio em passos de 25 ms
      for (let i = 0; i < 1000; i++) { agora += 0.025; await new Promise((r) => setImmediate(r)); ctx.window.__t = i; }
      await new Promise((r) => setTimeout(r, 60));
      A.Base.parar(); sair();
      if (ritmo === 'bateria') {
        const acordes = [...new Set(vistos.filter((v) => v).map((v) => v.split(':')[1]))];
        console.log(`Base ${estilo.padEnd(9)} vozes/25s=${String(vozes).padStart(4)} compassos vistos=${new Set(vistos.map((v) => v.split(':')[0])).size} acordes=${acordes.join(',')}`);
      }
    }
  }
  // toda progressão precisa de uma levada com a mesma chave, e os padrões têm de ter o tamanho da grade
  for (const estilo of Object.keys(T.PROGRESSOES)) {
    const lv = A.LEVADAS[estilo];
    if (!lv) { problemas.push('sem levada: ' + estilo); continue; }
    const n = 4 * lv.div;
    [lv.b, lv.c, lv.h, lv.baixo, lv.viol && lv.viol.p].forEach((pad) => { if (pad && pad.length !== n) problemas.push(`levada ${estilo}: padrão com ${pad.length} passos, esperado ${n}`); });
    if (!TS.estilosBase[estilo]) problemas.push('sem descrição em estilosBase: ' + estilo);
  }
  // contagem de entrada: 4 cliques antes do primeiro compasso
  {
    agora = 0;
    const cont = [], primeiro = [];
    const sair = A.Base.ouvir((ev) => { if (ev.contagem) cont.push(ev.contagem); else if (ev.acorde !== undefined && !primeiro.length) primeiro.push(cont.length); });
    A.Base.iniciar({ estilo: 'menor', tom: 9, bpm: 120, ritmo: 'bateria', contagem: true });
    for (let i = 0; i < 200; i++) { agora += 0.025; await new Promise((r) => setImmediate(r)); }
    await new Promise((r) => setTimeout(r, 60));
    A.Base.parar(); sair();
    if (cont.join(',') !== '1,2,3,4' || primeiro[0] !== 4) problemas.push('contagem de entrada: ' + cont.join(',') + ' / base entrou depois de ' + primeiro[0]);
    console.log('Contagem de entrada:', cont.join(' '));
    A.Base.configurar({ contagem: false });
  }
  // troca de andamento e de estilo com a base tocando
  agora = 0; A.Base.iniciar({ estilo: 'blues', tom: 4, bpm: 80, ritmo: 'bateria' });
  agora += 1; A.Base.configurar({ bpm: 95 }); agora += 1; A.Base.configurar({ estilo: 'pop', tom: 0 }); A.Base.parar();
  console.log(problemas.length ? `PROBLEMAS (${problemas.length}): ` + [...new Set(problemas)].slice(0, 15).join(' | ') : 'Áudio: nenhuma chamada inválida.');
  process.exit(problemas.length || buffersRuins ? 1 : 0);
})();
