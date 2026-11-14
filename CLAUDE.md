# Trilha do Solo — instruções para o Claude

App pessoal (uso de um único usuário, leigo em programação) para aprender solo/improviso no violão.
O usuário abre `index.html` com dois cliques: **não pode haver build, npm, servidor nem módulos ES** (file:// bloqueia `import` e `fetch`).

## Arquitetura (scripts clássicos, namespace global `window.TS`)

Ordem de carga em `index.html` (importa):
1. `data/curriculo.js` — TS.fases (7 fases), TS.principios, TS.diagnostico, TS.violao, TS.estilosBase, TS.proximoNivel. **Todo o texto do método mora aqui.**
2. `data/frases.js` — TS.frases (licks originais), TS.melodias (domínio público, em alturas MIDI), TS.desafios (solos famosos: só pistas + links, nunca tab, por direitos autorais).
3. `js/teoria.js` — TS.T: notas, 5 desenhos (offsets relativos à tônica menor na 6ª corda), escalas, encaixe de melodia em desenho, transposição, acordes e progressões das bases.
4. `js/audio.js` — TS.Audio: Karplus-Strong (nylon/aço), tocador de frases (h, p, slide, bend, vibrato), TS.Audio.Base (agendador com lookahead, 8 colcheias/compasso, swing no blues).
5. `js/desenho.js` — TS.Desenho: SVG do braço e da tablatura (devolvem string; cores via classes CSS).
6. `js/estado.js` — TS.Estado: localStorage `trilha-do-solo:v1` (mescla com o padrão para compatibilidade), revisão espaçada (caixas 1–6: 1,2,4,7,14,30 dias), sessões, backup JSON.
7. `js/app.js` — telas por hash (#hoje #trilha #braco #frases #base #diario #ajustes), templates em string + delegação de eventos via `data-acao`.

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
- Frase: `{c, f, d}` + `lig: 'h'|'p'|'s'`, `b` (semitons), `rel`, `v`; pausa `{p:1, d}`; duas cordas `{n:[...], d}`. Duração em tempos.
- Braço limitado às casas 0–15 (`T.MAX_CASA`). Sem cutaway, avisar acima da 12.
- Interface e conteúdo em português do Brasil, frases curtas e diretas, sem jargão sem explicação.
- Pedagogia: prática antes de teoria; um desenho por vez; frases antes de escalas; avanço por checkpoint; revisão espaçada; sempre com base. Ao criar conteúdo novo, manter essa linha.

## Testes (rodar depois de qualquer mudança)

```
node testes/validar.js       # notas na escala, melodias nos 5 desenhos, referências do currículo, SVG sem NaN
node testes/testar-audio.js  # motor de áudio contra um AudioContext falso que valida cada chamada
```
Para ver as telas: Edge headless com `--screenshot` (ver histórico do projeto) ou abrir o index.html.
