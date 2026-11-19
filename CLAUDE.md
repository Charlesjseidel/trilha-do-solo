# Trilha do Solo — instruções para o Claude

App pessoal (uso de um único usuário, leigo em programação) para aprender solo/improviso no violão.
O usuário abre `index.html` com dois cliques: **não pode haver build, npm, servidor nem módulos ES** (file:// bloqueia `import` e `fetch`).

## Arquitetura (scripts clássicos, namespace global `window.TS`)

Ordem de carga em `index.html` (importa):
1. `data/curriculo.js` — TS.fases (7 fases), TS.principios, TS.diagnostico, TS.violao, TS.gruposBase, TS.estilosBase, TS.proximoNivel. **Todo o texto do método mora aqui.**
2. `data/frases.js` — TS.frases (licks originais; os que têm `estilo` são "no estilo de" um guitarrista, também originais), TS.melodias (domínio público, em alturas MIDI), TS.desafios (solos e riffs famosos: só pistas + links + `base` no tom, **nunca tab nem sequência de notas**, por direitos autorais).
3. `js/teoria.js` — TS.T: notas, 5 desenhos (offsets relativos à tônica menor na 6ª corda), escalas, encaixe de melodia em desenho, transposição, acordes (M, m, 7, m7, 5) e T.PROGRESSOES das bases.
4. `js/audio.js` — TS.Audio: Karplus-Strong (nylon/aço), tocador de frases (h, p, slide, bend, vibrato), reverberação gerada (sala), teto de saída (WaveShaper) e TS.Audio.Base: agendador com lookahead, `LEVADAS` (bateria, baixo e violão de cada base, em grade de 4 tempos × `div` passos; `div: 3` = tercinas), contagem de entrada (compasso -1).
5. `js/desenho.js` — TS.Desenho: SVG do braço e da tablatura, com o nome de cada corda e a espessura crescendo da 1ª para a 6ª (devolvem string; cores via classes CSS).
6. `js/estado.js` — TS.Estado: localStorage `trilha-do-solo:v1` (mescla com o padrão para compatibilidade), aulas numeradas por fase (`aulas`, `aulasFeitas`), revisão espaçada (caixas 1–6: 1,2,4,7,14,30 dias), sessões, backup JSON.
7. `js/app.js` — telas por hash (#hoje #trilha #braco #frases #base #diario #ajustes), templates em string + delegação de eventos via `data-acao`.

**Uma base nova** precisa da mesma chave em três lugares: `T.PROGRESSOES` (teoria.js), `LEVADAS` (audio.js) e `TS.estilosBase` (curriculo.js). Os testes conferem os três e o tamanho de cada padrão da levada.

**Aulas.** O conteúdo de cada aula (exercício, repertório, regra do improviso) sai do número da aula (`E.aulaAtual()`), não do dia do calendário. Concluir a aula libera a próxima na hora; no dia seguinte ela abre sozinha (`E.abrirAulaDoDia`, uma vez por dia). O checkpoint e o botão de passar de fase ficam na aba Hoje; passar sem fechar o checkpoint é permitido e não marca a fase como concluída.

## Versão celular (site publicado)

O mesmo código também roda como site no GitHub Pages (https://charlesjseidel.github.io/trilha-do-solo/, repositório `Charlesjseidel/trilha-do-solo`).
O usuário usa no celular (instalado na tela inicial) e espelha para a TV. O clique duplo continua sendo suportado: nada pode depender de servidor.

- `manifest.webmanifest` + `icones/` (PNGs gerados a partir da palheta do logo): instalação na tela inicial.
- `sw.js`: rede primeiro, cópia em cache para uso offline. Só registra em http(s) (ver fim de `js/app.js`). **Arquivo novo carregado pelo app → acrescentar em `ARQUIVOS`** (o `validar.js` confere).
- Progresso fica no localStorage de cada aparelho; levar entre aparelhos é pelo backup JSON (Ajustes).
- Até 640px a marca some e as 7 abas dividem a largura (conferir em 360px depois de mexer na navegação).
- Para publicar uma mudança: rodar os testes, `git add -A && git commit && git push` (só quando o usuário pedir). Os commits usam o e-mail noreply do GitHub, configurado só neste repositório.

## Convenções

- Cordas: 1 = Mi aguda … 6 = Mi grave. Tons: 0–11 (0 = Dó, 9 = Lá). Desenhos numerados pela convenção menor (Desenho 1 = tônica menor na 6ª corda, dedo 1).
- Frase: `{c, f, d}` + `lig: 'h'|'p'|'s'`, `b` (semitons), `rel`, `v`; pausa `{p:1, d}`; duas cordas `{n:[...], d}`. Duração em tempos. Nota fora da pentatônica de propósito: declarar em `extras` (semitons acima da raiz do tom), senão o `validar.js` acusa.
- Orientação das cordas: o usuário já se confundiu com isso. Todo braço e toda tab mostram o nome da corda (1ª Mi … 6ª Mi) e dizem qual é a grossa. "Subir a escala" = do grave (6ª) para o agudo (1ª). Ao escrever texto novo, diga "6ª corda, a mais grossa", nunca só "a de cima" ou "a de baixo".
- Braço limitado às casas 0–15 (`T.MAX_CASA`). Sem cutaway, avisar acima da 12.
- Interface e conteúdo em português do Brasil, frases curtas e diretas, sem jargão sem explicação.
- Pedagogia: prática antes de teoria; um desenho por vez; frases antes de escalas; avanço por checkpoint; revisão espaçada; sempre com base. Ao criar conteúdo novo, manter essa linha.

## Testes (rodar depois de qualquer mudança)

```
node testes/validar.js       # notas na escala, melodias nos 5 desenhos, referências do currículo, SVG sem NaN
node testes/testar-audio.js  # motor de áudio contra um AudioContext falso que valida cada chamada, levadas e contagem
```
Os testes não ouvem o som. Depois de mexer em volumes ou timbres, meça a mistura renderizando num `OfflineAudioContext`
(pico abaixo de 1,0 e nenhum instrumento cobrindo os outros). Em novembro de 2026 o baixo novo saiu 17 dB acima do violão
e os estalos da bateria passavam do máximo; os dois só apareceram na medição, não nos testes.
Para ver as telas: Edge headless com `--screenshot` (ver histórico do projeto) ou abrir o index.html.
