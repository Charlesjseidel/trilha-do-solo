// Valida o conteúdo musical da Trilha do Solo carregando os arquivos num contexto isolado.
const fs = require('fs'), path = require('path'), vm = require('vm');
const raiz = process.argv[2] || path.join(__dirname, '..');
const ctx = { window: {}, console };
ctx.window.window = ctx.window;
vm.createContext(ctx);
for (const f of ['data/curriculo.js', 'data/frases.js', 'js/teoria.js', 'js/desenho.js']) {
  vm.runInContext(fs.readFileSync(path.join(raiz, f), 'utf8').replace(/^window\.TS = window\.TS \|\| \{\};/m, 'var TS = window.TS = window.TS || {};'), ctx, { filename: f });
}
const TS = ctx.window.TS, T = TS.T;
let erros = 0;
const erro = (m) => { erros++; console.log('ERRO:', m); };

// 1) Desenhos de Lá menor: posições e alturas únicas
console.log('--- Desenhos de Lá menor (casas) ---');
for (let d = 1; d <= 5; d++) {
  const insts = T.instancias(9, d);
  insts.forEach((i) => {
    const alturas = i.pos.map((p) => T.altura(p.c, p.f));
    const pcs = new Set(alturas.map(T.pc));
    if (new Set(alturas).size !== 12) erro(`Desenho ${d}: alturas repetidas`);
    [...pcs].forEach((pc) => { if (![9, 0, 2, 4, 7].includes(pc)) erro(`Desenho ${d}: nota fora da escala ${T.nome(pc)}`); });
    const porCorda = {};
    i.pos.forEach((p) => (porCorda[p.c] = (porCorda[p.c] || []).concat(p.f + '(' + p.dedo + ')')));
    console.log(`D${d} casas ${i.de}-${i.ate}: ` + [6, 5, 4, 3, 2, 1].map((c) => 'c' + c + '=' + porCorda[c].join(',')).join('  '));
  });
}

// 2) Frases: notas dentro da escala esperada
const escalaDe = (l) => {
  const r = l.tom.raiz;
  if (l.tom.tipo === 'maior') return [0, 2, 4, 7, 9].map((i) => T.pc(r + i));
  const base = [0, 3, 5, 7, 10];
  if (l.fase === 3 || l.tecnicas.includes('blue note')) base.push(6);
  if (l.id === 'l24') base.push(2, 8);
  return base.map((i) => T.pc(r + i));
};
console.log('\n--- Frases ---');
TS.frases.forEach((l) => {
  const esc = escalaDe(l);
  const evs = T.eventosFrase(l.notas);
  const total = evs.reduce((m, e) => Math.max(m, e.t + e.d), 0);
  const nomes = [];
  let fora = [];
  evs.forEach((e) => {
    if (e.pausa) { nomes.push('_'); return; }
    e.notas.forEach((n) => {
      if (n.f < 0 || n.f > 15) erro(`${l.id}: casa ${n.f}`);
      if (!esc.includes(T.pc(n.midi))) fora.push(`${T.nome(n.midi)}(c${n.c} f${n.f})`);
    });
    let rot = e.notas.map((n) => T.nome(n.midi)).join('+');
    if (e.b) rot += `↑${e.b}=${T.nome(e.notas[0].midi + e.b)}`;
    if (e.lig) rot = e.lig + rot;
    nomes.push(rot);
  });
  // a nota do bend precisa chegar numa nota da escala (ou blue note)
  evs.forEach((e) => { if (e.b && !esc.includes(T.pc(e.notas[0].midi + e.b))) fora.push('alvo do bend ' + T.nome(e.notas[0].midi + e.b)); });
  // a última nota deveria ser a tônica (aviso, não erro)
  const ult = [...evs].reverse().find((e) => !e.pausa);
  const fim = T.nome(ult.notas[0].midi);
  if (fora.length) erro(`${l.id} ${l.nome}: fora da escala: ${fora.join(', ')}`);
  console.log(`${l.id} [${T.nomeTom(l.tom.raiz, l.tom.tipo)}] ${total} tempos, termina em ${fim}: ${nomes.join(' ')}`);
  // transposições: todas as 12 devem caber
  // transposições: o app pula tons que não cabem nas casas 0-15; exige pelo menos 9 dos 12 tons
  let cabem = 0;
  for (let s = -5; s <= 6; s++) if (T.transporFrase(l.notas, s)) cabem++;
  if (cabem < 9) erro(`${l.id}: só cabe em ${cabem} de 12 tons`);
  // tab e mini-braço geram SVG
  const svg = TS.Desenho.tab(evs, { id: l.id });
  if (!svg.startsWith('<svg') || svg.includes('NaN') || svg.includes('undefined')) erro(`${l.id}: SVG da tab inválido`);
  const b = TS.Desenho.bracoDaFrase(evs, l.tom.raiz, {});
  if (b.includes('NaN') || b.includes('undefined')) erro(`${l.id}: SVG do braço inválido`);
});

// 3) Melodias: cabem nos 5 desenhos de Lá menor / Dó maior
console.log('\n--- Melodias ---');
TS.melodias.forEach((m) => {
  const total = m.notas.reduce((a, n) => a + n[1], 0);
  console.log(`${m.id} ${m.nome}: ${total} tempos (compasso ${m.compasso}, anacruse ${m.anacruse}) -> ${(total - m.anacruse) / m.compasso} compassos`);
  const pcMenor = T.pc(m.tipo === 'maior' ? m.centro - 3 : m.centro);
  for (let d = 1; d <= 5; d++) {
    const enc = T.encaixarMelodia(m.notas.map((n) => n[0]), pcMenor, d);
    if (!enc) { erro(`${m.id}: não cabe no Desenho ${d}`); continue; }
    const forDes = enc.pos.filter((p, i) => p && !enc.inst.pos.some((q) => q.c === p.c && q.f === p.f)).length;
    const tab = enc.pos.filter(Boolean).map((p) => p.c + '/' + p.f).join(' ');
    console.log(`  D${d} (casas ${enc.inst.de}-${enc.inst.ate}, oitava ${enc.oitava}, ${forDes} fora do desenho): ${tab}`);
    const evs = T.eventosMelodia(m, enc.pos);
    const svg = TS.Desenho.tab(evs, { compasso: m.compasso, anacruse: m.anacruse });
    if (svg.includes('NaN') || svg.includes('undefined')) erro(`${m.id} D${d}: SVG inválido`);
    // alturas preservadas
    enc.pos.forEach((p, i) => { if (p && T.altura(p.c, p.f) !== m.notas[i][0] + enc.oitava) erro(`${m.id} D${d}: altura trocada na nota ${i}`); });
  }
});

// 4) Referências do currículo
console.log('\n--- Currículo ---');
const ids = new Set(TS.frases.map((x) => x.id).concat(TS.melodias.map((x) => x.id), TS.desafios.map((x) => x.id)));
TS.fases.forEach((f) => {
  [...f.frases, ...f.melodias, ...f.desafios].forEach((id) => { if (!ids.has(id)) erro(`Fase ${f.n}: id inexistente ${id}`); });
  f.frases.forEach((id) => { const l = TS.frases.find((x) => x.id === id); if (l.fase !== f.n) erro(`Fase ${f.n} lista ${id}, que é da fase ${l.fase}`); });
  if (!TS.estilosBase[f.base.estilo]) erro(`Fase ${f.n}: base desconhecida`);
  f.foco.desenhos.forEach((d) => { if (!T.instanciaPrincipal(T.escala(f.foco.modo, f.foco.tom).pcMenor, d)) erro(`Fase ${f.n}: foco desenho ${d} não cabe`); });
  console.log(`Fase ${f.n}: ${f.exercicios.length} exercícios, ${f.frases.length} frases, ${f.melodias.length} melodias, ${f.desafios.length} desafios, ${f.regras.length} regras, ${f.checkpoint.length} critérios`);
});

// 5) Escalas nos modos e bases
const blues = T.escala('blues', 9), comp = T.escala('completa', 9), mai = T.escala('maior', 9);
console.log('\nBlues Lá extras:', blues.extras.map(T.nome), '| Completa extras:', comp.extras.map(T.nome), '| Lá maior usa desenhos de', T.nome(mai.pcMenor), 'menor; D1 em', T.instanciaPrincipal(mai.pcMenor, 1).de);
const ptsB = T.pontosDesenho(blues, T.instanciaPrincipal(9, 1)).filter((p) => p.tipo === 'extra').map((p) => `c${p.c} f${p.f}`);
console.log('Blue notes no D1 de Lá:', ptsB.join(', '));
for (const est of Object.keys(T.PROGRESSOES)) console.log('Base', est, 'em Lá:', T.compassosBase(est, 9).map((c) => c.nome || '·').join(' '));
console.log('Acordes:', ['Am', 'G', 'A7', 'D7', 'E7', 'C'].join(' '), '=>',
  [T.acorde(9, 'm'), T.acorde(7, 'M'), T.acorde(9, '7'), T.acorde(2, '7'), T.acorde(4, '7'), T.acorde(0, 'M')].map((a) => a.map(T.nome).join('-')).join(' | '));

// 6) Versão publicada (celular): tudo que o index.html e o manifesto carregam precisa existir e estar no sw.js
const html = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(raiz, 'sw.js'), 'utf8');
const manifesto = JSON.parse(fs.readFileSync(path.join(raiz, 'manifest.webmanifest'), 'utf8'));
const listaSw = [...sw.match(/ARQUIVOS = \[([\s\S]*?)\]/)[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
const carregados = [...html.matchAll(/(?:src|href)="([^"#:]+)"/g)].map((m) => m[1]).concat(manifesto.icons.map((i) => i.src));
carregados.forEach((f) => { if (!listaSw.includes(f)) erro(`sw.js: falta '${f}' na lista ARQUIVOS`); });
listaSw.filter((f) => f !== './').forEach((f) => { if (!fs.existsSync(path.join(raiz, f))) erro(`sw.js lista um arquivo que não existe: ${f}`); });
console.log(`\nVersão celular: ${listaSw.length} arquivos guardados para uso sem internet, ${manifesto.icons.length} ícones.`);

console.log(erros ? `\n${erros} ERRO(S)` : '\nTudo certo: nenhum erro.');
process.exit(erros ? 1 : 0);
