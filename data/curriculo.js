/* Trilha do Solo — conteúdo pedagógico (fases, princípios, dicas).
   Todo o texto do método mora aqui. O código (js/) só exibe.
   Tons: número de 0 a 11 (0 = Dó, 9 = Lá, 4 = Mi). */
window.TS = window.TS || {};

TS.diagnostico = {
  titulo: 'Por que você parou das outras vezes',
  itens: [
    'Decorar os 5 desenhos de uma vez dá umas 60 posições para guardar sem tocar nenhuma música. Esforço sem recompensa é o que mais faz a gente desistir.',
    'Subir e descer escala não é solar. A escala é o alfabeto e o solo é feito de frases. Ninguém aprende a falar uma língua decorando o alfabeto.',
    'Sem base para acompanhar e sem metas curtas você não percebe o próprio progresso, e sem progresso visível a motivação some em poucos dias.'
  ],
  virada: 'Aqui você improvisa já na primeira semana, com 3 notas, sobre uma base, e já soa como solo. Cada desenho novo só chega quando o anterior já virou música.'
};

TS.principios = [
  { t: 'Pouco, todo dia', d: '20 minutos por dia rendem mais que 2 horas no domingo. Em dia corrido, faça a versão de 5 minutos. O que importa é não zerar.' },
  { t: 'Um desenho por vez', d: 'O próximo desenho só entra quando o atual soa como música. Você avança pelo checkpoint da fase, não pelo calendário.' },
  { t: 'Frases antes de escalas', d: 'Cada fase traz frases curtas (licks), que são o vocabulário do solo. A escala vira o lugar onde essas frases moram.' },
  { t: 'Imitar, variar, criar', d: 'Toda frase nova passa por 3 etapas: toque igual, depois mude o ritmo, depois mude o final. Você já está improvisando.' },
  { t: 'Devagar e limpo', d: 'O metrônomo só sobe 5 bpm depois de 3 vezes seguidas sem erro. Tocar rápido e errado só ensina o erro.' },
  { t: 'De memória primeiro', d: 'Antes de olhar a tab, tente tocar de cabeça. O esforço de lembrar é o que fixa. O app traz cada frase de volta no dia certo para revisar.' },
  { t: 'Sempre com base', d: 'Improvisar no silêncio não ensina a soar bem. O app tem bases prontas: aperte o play no rodapé.' },
  { t: 'Grave 1 minuto por semana', d: 'Use o celular. Daqui a 2 meses, compare com a primeira gravação. Esse é o seu medidor de progresso.' }
];

TS.violao = {
  nylon: [
    'Bend no nylon: ¼ a ½ tom já é muito. Empurre a corda de lado com 2 ou 3 dedos juntos.',
    'Vibrato no nylon: balance o dedo ao longo da corda, como no violão clássico. Funciona muito bem.',
    'No nylon, a voz do solo vem de slides, martelos e puxadas. Capriche neles.',
    'Dedos ou palheta: com dedos, alterne indicador e médio (i–m) com apoio na corda de cima. O som fica mais forte.'
  ],
  aco: [
    'Bend no aço: meio tom é tranquilo nas cordas 1, 2 e 3. Um tom inteiro fica mais fácil com cordas .010 ou .011.',
    'Vibrato no aço: empurre a corda levemente para cima e para baixo, em pulsos regulares. Comece com 2 pulsos por tempo.',
    'Palheta média (0,6 a 0,8 mm) costuma ser o melhor meio-termo para solar no aço.',
    'Abafe com a palma da mão direita as cordas que não estão tocando. Ajuda já no violão e é essencial na guitarra.'
  ],
  semCutaway: 'Seu violão não tem cutaway, então as casas acima da 12 ficam desconfortáveis. Quando uma frase passar da casa 12, use o botão Transpor para trazê-la para baixo. O desenho é o mesmo em qualquer casa.',
  guitarra: 'Quando chegar a guitarra: as cordas são mais finas (bends fáceis) e o som sustenta mais. Com distorção, qualquer corda solta faz barulho, então abafar vira prioridade. O mapa, as frases e o ouvido que você treinou aqui servem inteiros na guitarra.'
};

TS.estilosBase = {
  metronomo: { nome: 'Só metrônomo', curto: 'Metrônomo', quando: 'Para o aquecimento e para medir o seu bpm limpo.' },
  drone: { nome: 'Nota pedal', curto: 'Pedal', quando: 'Uma nota só, sem troca de acorde. Ótimo para ouvir como cada nota soa contra a tônica.' },
  menor: { nome: 'Menor: i – ♭VII', curto: 'i–♭VII', quando: 'Clima de rock e pop menor (ex.: Lám – Sol). A base principal das fases 1 e 2.' },
  menor2: { nome: 'Menor: i – iv', curto: 'i–iv', quando: 'Clima de balada menor (ex.: Lám – Rém).' },
  blues: { nome: 'Blues de 12 compassos', curto: 'Blues', quando: 'A forma mais usada no mundo para aprender a solar (ex.: Lá7 – Ré7 – Mi7).' },
  pop: { nome: 'Pop maior: I – V – vi – IV', curto: 'Pop maior', quando: 'O clima alegre de pop, MPB e country (ex.: Dó – Sol – Lám – Fá). Para a pentatônica maior.' }
};

TS.fases = [
  {
    n: 1, semanas: '1–2', titulo: 'Três notas já são um solo',
    objetivo: 'Improvisar sobre uma base usando só 4 notas, com ritmo e pausas. Ainda sem escala nenhuma.',
    porque: 'Ritmo e repetição fazem mais pela música do que a quantidade de notas. Com poucas notas, sua atenção vai para o que importa: soar bem.',
    foco: { modo: 'menor', tom: 9, desenhos: [1], cordas: [1, 2] },
    focoTexto: 'Só as cordas 1 e 2 do Desenho 1, na casa 5: Mi, Sol, Lá e Dó. Dedo 1 na casa 5, dedo 4 na casa 8.',
    aquecimento: 'Toque as 4 notas subindo e descendo, devagar, com o metrônomo a 60 bpm: 2ª corda casas 5 e 8, depois 1ª corda casas 5 e 8.',
    base: { estilo: 'menor', tom: 9, bpm: 70 },
    exercicios: [
      { id: 'f1e1', t: 'Uma nota, mil ritmos', passos: ['Ligue a base Lám – Sol.', 'Toque só o Lá (1ª corda, casa 5).', 'Varie apenas o ritmo: notas curtas, longas, repetidas e com pausas.', 'Faça 2 minutos sem parar.'], meta: 'Perceber que ritmo, sozinho, já é música.' },
      { id: 'f1e2', t: 'Pergunta e resposta', passos: ['Toque uma frase curta, de 2 a 4 notas.', 'Fique em silêncio pelo mesmo tempo que a frase durou.', 'Responda à sua frase: comece igual e termine diferente.', 'Termine as respostas no Lá.'], meta: 'Frases com começo, meio e fim, e espaço para respirar.' },
      { id: 'f1e3', t: 'Repetir é estilo (AAB)', passos: ['Crie uma frase curta.', 'Toque-a 2 vezes exatamente igual.', 'Na 3ª vez, mude só o final.', 'Repita o ciclo com uma frase nova.'], meta: 'A forma AAB está em quase todo blues e rock.' },
      { id: 'f1e4', t: 'Vibrato na nota longa', passos: ['Escolha a última nota de cada frase.', 'Segure a nota e faça vibrato em pulsos regulares, devagar.', 'Compare a mesma nota com e sem vibrato.'], meta: 'A nota longa "canta" em vez de morrer.', violao: true }
    ],
    frases: ['l01', 'l02', 'l03'],
    melodias: [],
    desafios: ['d01'],
    regras: [
      'Só 3 notas hoje: Mi, Sol e Lá.',
      'Frases de no máximo 4 notas, sempre seguidas de silêncio.',
      'Toda frase termina no Lá.',
      'Comece cada frase no tempo 2, não no 1.',
      'Repita cada frase 2 vezes antes de criar a próxima.',
      'Cada frase tem uma nota longa com vibrato.'
    ],
    checkpoint: [
      'Improviso 1 minuto inteiro sobre a base, sem parar, só com as 4 notas.',
      'Minhas frases têm pausas: não toco o tempo todo.',
      'Termino frases no Lá e sinto que "cheguei em casa".',
      'Toco as 3 frases desta fase de memória.',
      'Gravei 1 minuto de improviso no celular. É a minha foto do início.'
    ]
  },
  {
    n: 2, semanas: '3–5', titulo: 'O Desenho 1 inteiro',
    objetivo: 'Ter o Desenho 1 nos dedos e no ouvido: achar as tônicas, tocar melodias conhecidas nele e improvisar usando o desenho todo.',
    porque: 'Tocar uma melodia que você já sabe cantar obriga o ouvido a conversar com o desenho. É assim que ele deixa de ser um mapa e vira linguagem.',
    foco: { modo: 'menor', tom: 9, desenhos: [1] },
    focoTexto: 'Desenho 1 de Lá menor, casas 5 a 8. As 3 tônicas (Lá) estão em destaque.',
    aquecimento: 'Desenho 1 subindo e descendo com metrônomo, em colcheias (2 notas por clique). Comece a 60 bpm. Saiu 3 vezes limpo? Suba 5 bpm.',
    base: { estilo: 'menor', tom: 9, bpm: 70 },
    exercicios: [
      { id: 'f2e1', t: 'Caça às tônicas', passos: ['Ache os 3 Lás do desenho: 6ª corda casa 5, 4ª corda casa 7, 1ª corda casa 5.', 'Toque só os Lás sobre a base, variando o ritmo.', 'Agora toque a escala sempre começando e terminando num Lá.'], meta: 'Saber onde é "casa" em qualquer ponto do desenho.' },
      { id: 'f2e2', t: 'Melodia no desenho', passos: ['Abra Seu Lobato na aba Frases e toque pela tab.', 'Toque de novo cantando junto.', 'Agora toque sem olhar.', 'Repita com Amazing Grace.'], meta: 'O desenho passa a ter som, e não só posição.' },
      { id: 'f2e3', t: 'Grupos de três', passos: ['Toque a frase Grupos de três a 50–60 bpm.', 'Depois invente o caminho inverso, subindo em grupos de 3.'], meta: 'Quebrar o hábito de só subir e descer, e conhecer o desenho por dentro.' },
      { id: 'f2e4', t: 'Tire de ouvido', passos: ['Escolha uma melodia simples que você canta: cantiga, hino, refrão.', 'Ache a primeira nota no desenho, por tentativa.', 'Siga nota por nota. Se uma nota não existir na escala, pule.'], meta: 'O passo mais importante para um dia solar de ouvido.' },
      { id: 'f2e5', t: 'Improviso com vocabulário', passos: ['Ligue a base.', 'Cada frase sua deve começar com uma das frases que você aprendeu.', 'Depois do começo, vá para onde quiser.'], meta: 'Juntar o que você decorou com o que você cria.' }
    ],
    frases: ['l04', 'l05', 'l06', 'l07'],
    melodias: ['m1', 'm2'],
    desafios: ['d02'],
    regras: [
      'Cada frase começa com um lick que você já sabe.',
      'Use os 3 Lás: uma frase no grave, uma no meio e uma no agudo.',
      'Suba devagar, desça rápido.',
      'Só as cordas 3, 4 e 5 neste improviso.',
      'Uma frase com martelo ou puxada a cada duas.',
      'Comece com a melodia de Seu Lobato e vá mudando, nota por nota.'
    ],
    checkpoint: [
      'Toco o Desenho 1 de memória, subindo e descendo, a 70 bpm em colcheias, sem erro.',
      'Acho os 3 Lás do desenho sem pensar.',
      'Toco Seu Lobato e Amazing Grace de memória no Desenho 1.',
      'Meus martelos e puxadas soam limpos.',
      'Improviso 2 minutos usando pelo menos 3 frases aprendidas, com variações.'
    ]
  },
  {
    n: 3, semanas: '6–8', titulo: 'Dar voz às notas',
    objetivo: 'Aprender as técnicas que fazem a nota falar (slide, bend, vibrato, duas cordas juntas) e a blue note. Primeiro blues de 12 compassos.',
    porque: 'A mesma nota pode soar como pergunta, lamento ou grito. O que separa um solo de um exercício é a expressão, não a velocidade.',
    foco: { modo: 'blues', tom: 9, desenhos: [1] },
    focoTexto: 'Desenho 1 com a blue note (Mi♭, em azul): 5ª corda casa 6 e 3ª corda casa 8. É a nota que dá o som "sujo" do blues.',
    aquecimento: 'Escala blues no Desenho 1, devagar, com metrônomo. A blue note é de passagem: nunca pare nela.',
    base: { estilo: 'blues', tom: 9, bpm: 75 },
    exercicios: [
      { id: 'f3e1', t: 'Slide de chegada', passos: ['Escolha uma nota-alvo, por exemplo o Lá na 4ª corda casa 7.', 'Toque 2 casas abaixo e deslize até ela sem soltar a pressão.', 'Faça o mesmo chegando por cima (deslizando para baixo).'], meta: 'Chegar nas notas importantes com estilo.' },
      { id: 'f3e2', t: 'Bend afinado', passos: ['Toque a nota de destino primeiro (3ª corda, casa 8) e guarde o som.', 'Faça o bend na casa 7 até chegar nesse mesmo som.', 'Use 2 ou 3 dedos empurrando juntos.', 'Alterne: nota de destino, bend, nota de destino, bend.'], meta: 'Um bend que chega na nota certa. Bend desafinado soa como erro.', violao: true },
      { id: 'f3e3', t: 'Duas cordas juntas', passos: ['Toque as cordas 1 e 2 juntas na casa 8, com um dedo deitado ou com dois dedos.', 'Depois na casa 5.', 'Use esse som como resposta forte depois de uma frase de notas soltas.'], meta: 'O som de Chuck Berry, presente em todo rock.' },
      { id: 'f3e4', t: 'A forma do blues', passos: ['Ligue a base Blues em Lá e conte os 12 compassos em voz alta, olhando a grade na aba Base.', 'Toque o tema Blues da Trilha (aba Frases).', 'Improvise: compassos 1 a 4 de pergunta, 5 a 8 de resposta, 9 a 12 de conclusão.'], meta: 'Nunca mais se perder no blues.' },
      { id: 'f3e5', t: 'Uma técnica por frase', passos: ['Improvise sobre o blues.', 'Cada frase deve usar uma técnica diferente: slide, martelo, bend, vibrato, duas cordas.'], meta: 'As técnicas viram reflexo, não enfeite.' }
    ],
    frases: ['l08', 'l09', 'l10', 'l11'],
    melodias: ['m3'],
    desafios: ['d03', 'd04'],
    regras: [
      'Use a blue note em toda frase, só de passagem.',
      'Uma técnica diferente por frase.',
      'Comece cada volta de 12 compassos com o mesmo lick e mude o resto.',
      'Nos 2 últimos compassos de cada volta, termine no Lá ou no Mi.',
      'No máximo 4 notas por compasso: só notas longas e expressivas.'
    ],
    checkpoint: [
      'Faço slide, martelo, puxada e vibrato soando limpos.',
      'Meu bend chega na nota certa: conferi com a nota de destino.',
      'Sei onde estão as blue notes do Desenho 1.',
      'Conto os 12 compassos do blues sem me perder.',
      'Improviso 3 voltas de blues usando pelo menos 3 técnicas diferentes.'
    ]
  },
  {
    n: 4, semanas: '9–11', titulo: 'Os vizinhos: Desenhos 5 e 2',
    objetivo: 'Expandir o mapa para os dois lados sem decorar caixas do zero. Os Desenhos 5 e 2 dividem notas com o Desenho 1.',
    porque: 'Cada desenho novo reaproveita metade do anterior. Aprender pelos vizinhos, conectando, é muito mais fácil do que decorar 5 caixas isoladas, que foi onde você travou antes.',
    foco: { modo: 'menor', tom: 9, desenhos: [5, 1, 2] },
    focoTexto: 'Desenhos 5, 1 e 2 lado a lado. O lado direito do Desenho 1 é o lado esquerdo do Desenho 2, e o lado esquerdo do Desenho 1 é o lado direito do Desenho 5. Você já sabe metade de cada um.',
    aquecimento: 'Suba o Desenho 1, deslize na 3ª corda da casa 7 para a 9 e desça pelo Desenho 2. Depois faça o caminho inverso indo para o Desenho 5.',
    base: { estilo: 'menor2', tom: 9, bpm: 75 },
    exercicios: [
      { id: 'f4e1', t: 'A metade que você já sabe', passos: ['Na aba Braço, compare os Desenhos 1 e 2.', 'Toque só as notas que os dois têm em comum.', 'Acrescente as notas novas do Desenho 2, uma corda por vez.', 'Repita com o Desenho 5.'], meta: 'Ver que o desenho novo é meio velho.' },
      { id: 'f4e2', t: 'Melodia em outro lugar', passos: ['Na aba Frases, abra Seu Lobato e escolha Desenho 2.', 'Toque pela tab, depois de memória.', 'Repita no Desenho 5.', 'Faça o mesmo com Amazing Grace.'], meta: 'A mesma música em outro lugar grava o desenho mais rápido do que qualquer exercício.' },
      { id: 'f4e3', t: 'Teste de memória', passos: ['Na aba Braço, use Monte o desenho com os Desenhos 2 e 5.', 'Repita até acertar tudo de primeira.'], meta: 'Lembrar sem ver, que é como você vai precisar na hora de tocar.' },
      { id: 'f4e4', t: 'Frase que atravessa', passos: ['Ligue a base.', 'Regra: toda frase passa de um desenho para o outro pelo menos uma vez.', 'Use slides para mudar de região.'], meta: 'Parar de ficar preso numa caixa.' },
      { id: 'f4e5', t: 'Tônicas em toda parte', passos: ['Ache os Lás nos Desenhos 5, 1 e 2.', 'Toque um Lá em cada região, de baixo para cima e de volta.'], meta: 'Saber onde é casa em qualquer lugar entre as casas 2 e 10.' }
    ],
    frases: ['l12', 'l13', 'l14', 'l15'],
    melodias: ['m1', 'm2'],
    desafios: [],
    regras: [
      'Toda frase cruza de um desenho para outro.',
      'Comece no Desenho 5 e termine no Desenho 2.',
      'Toque a mesma frase em dois desenhos diferentes.',
      'Só as cordas 1, 2 e 3, mas passando pelos três desenhos.',
      'Pergunta no grave do Desenho 5, resposta no agudo do Desenho 2.'
    ],
    checkpoint: [
      'Monto os Desenhos 5 e 2 de memória no teste do app.',
      'Toco Seu Lobato em 3 desenhos diferentes.',
      'Passo do Desenho 5 ao 2 e volto sem parar, usando slides.',
      'Improviso 2 minutos usando os 3 desenhos.'
    ]
  },
  {
    n: 5, semanas: '12–13', titulo: 'Mesmo mapa, outro clima',
    objetivo: 'Descobrir que você já sabe a pentatônica maior: são as mesmas notas com outro centro. Solar em músicas alegres, de pop, MPB e country.',
    porque: 'As notas de Lá menor pentatônica são as mesmas de Dó maior pentatônica. O que muda é a nota onde as frases pousam. Seu Lobato e Amazing Grace, que você já toca, são pentatônica maior.',
    foco: { modo: 'maior', tom: 0, desenhos: [1] },
    focoTexto: 'O mesmo Desenho 1 da casa 5, agora com o Dó como centro (em destaque). Mesmas notas, outro sentimento.',
    aquecimento: 'Desenho 1 começando e terminando no Dó (3ª corda casa 5 e 6ª corda casa 8), não no Lá.',
    base: { estilo: 'pop', tom: 0, bpm: 80 },
    exercicios: [
      { id: 'f5e1', t: 'Mude a casa, mude o clima', passos: ['Base Pop maior em Dó: improvise terminando as frases no Dó.', 'Troque para a base Menor i – ♭VII em Lá e termine no Lá.', 'Compare: mesmas notas, sentimentos opostos.'], meta: 'Entender, tocando, o que é tonalidade.' },
      { id: 'f5e2', t: 'O truque das 3 casas', passos: ['Para solar em Lá MAIOR, pegue o Desenho 1 e desça 3 casas: casa 2.', 'Teste com a base Pop maior em Lá.', 'Funciona para qualquer tom: desenho menor 3 casas abaixo da tônica maior.'], meta: 'Solar em tom maior sem aprender nada novo.' },
      { id: 'f5e3', t: 'A terça doce', passos: ['O Mi (3ª nota do Dó) é o coração do som maior.', 'Faça frases que deslizam do Ré para o Mi (3ª corda, casa 7 para a 9).', 'Pouse nesse Mi com vibrato e depois resolva no Dó.'], meta: 'O som "feliz" que falta na pentatônica menor.' },
      { id: 'f5e4', t: 'Melodia de ouvido, versão alegre', passos: ['Escolha uma música alegre e simples que você canta.', 'Tente tocá-la no Desenho 1, centrado no Dó.'], meta: 'Treinar o ouvido no som maior.' }
    ],
    frases: ['l16', 'l17', 'l18'],
    melodias: ['m1', 'm2'],
    desafios: ['d05'],
    regras: [
      'Termine toda frase no Dó.',
      'Use o slide Ré → Mi em toda frase.',
      'Alterne: uma frase pousando no Dó, outra no Lá. Sinta a diferença.',
      'Toque a melodia de Seu Lobato e depois improvise variações dela.'
    ],
    checkpoint: [
      'Sei explicar com minhas palavras por que Lá menor e Dó maior usam o mesmo desenho.',
      'Improviso na base Pop maior em Dó soando alegre, pousando no Dó.',
      'Uso o truque das 3 casas para solar em Lá maior.'
    ]
  },
  {
    n: 6, semanas: '14–16', titulo: 'O braço inteiro',
    objetivo: 'Completar o mapa com os Desenhos 3 e 4 e usar a primeira posição com cordas soltas, que é onde o violão mais brilha.',
    porque: 'Em Lá menor, os 5 desenhos cabem entre a casa 0 e a 13, ótimo para o violão. E em Mi menor, o Desenho 1 vira a primeira posição, com cordas soltas.',
    foco: { modo: 'menor', tom: 9, desenhos: [4, 5, 1, 2, 3] },
    focoTexto: 'Os 5 desenhos de Lá menor encaixados, da posição aberta (Desenho 4, casas 0 a 3) até a casa 13 (Desenho 3).',
    aquecimento: 'A escada: toque uma frase curta no Desenho 4 (casa 0) e repita no 5, no 1, no 2 e no 3. Suba e desça o braço.',
    base: { estilo: 'blues', tom: 4, bpm: 80 },
    exercicios: [
      { id: 'f6e1', t: 'Lá menor com cordas soltas', passos: ['Toque o Desenho 4 na posição aberta (casas 0 a 3).', 'Repare em como as cordas soltas ressoam.', 'Toque a frase Cordas soltas.'], meta: 'O som mais violão possível.' },
      { id: 'f6e2', t: 'Desenho 3 sem sofrimento', passos: ['Se o seu violão não tem cutaway, estude o Desenho 3 em Mi menor, nas casas 4 a 8.', 'Na frase Desenho 3, use Transpor até Mi menor.'], meta: 'Aprender o desenho onde o braço é confortável.' },
      { id: 'f6e3', t: 'Mi menor na primeira posição', passos: ['Ligue a base Blues em Mi.', 'Improvise com o Desenho 1 em Mi (casas 0 a 3).', 'Use martelos e puxadas com as cordas soltas.'], meta: 'O território clássico do blues no violão.' },
      { id: 'f6e4', t: 'Mesma frase, cinco lugares', passos: ['Escolha uma frase curta, por exemplo Chegando em casa.', 'Ache e toque essa frase nos 5 desenhos de Lá menor.'], meta: 'Provar que o mapa está inteiro na sua cabeça.' },
      { id: 'f6e5', t: 'Teste final de memória', passos: ['Na aba Braço, monte os 5 desenhos em Lá.', 'Depois troque o tom para Mi e monte de novo.'], meta: 'Os 5 desenhos em qualquer tom.' }
    ],
    frases: ['l19', 'l20', 'l21'],
    melodias: [],
    desafios: ['d06'],
    regras: [
      'Comece no Desenho 4 e termine no Desenho 3.',
      'Pelo menos uma corda solta por frase.',
      'Mude de desenho a cada 4 compassos.',
      'Toque a mesma frase em 3 desenhos seguidos.'
    ],
    checkpoint: [
      'Monto os 5 desenhos de memória no teste do app.',
      'Improviso em Mi menor na primeira posição usando cordas soltas.',
      'Toco uma mesma frase nos 5 desenhos.',
      'Improviso 3 minutos passando por pelo menos 3 desenhos.'
    ]
  },
  {
    n: 7, semanas: '17–20', titulo: 'Mirar o acorde e duas notas a mais',
    objetivo: 'Fazer o solo acompanhar a harmonia, terminando frases em notas do acorde da vez. Depois, transformar a pentatônica em escala completa, de 7 notas.',
    porque: 'A escala maior (ou menor) completa é só a pentatônica com 2 notas extras. Com o mapa pentatônico pronto, ela vem quase de graça, e por isso fica para o fim.',
    foco: { modo: 'completa', tom: 9, desenhos: [1] },
    focoTexto: 'Desenho 1 com as 2 notas novas (vazadas): Si e Fá. Lá menor natural tem as mesmas 7 notas de Dó maior.',
    aquecimento: 'Desenho 1 com as 2 notas novas, subindo e descendo devagar. Veja na aba Braço, modo Escala completa.',
    base: { estilo: 'blues', tom: 9, bpm: 80 },
    exercicios: [
      { id: 'f7e1', t: 'Siga os acordes', passos: ['Base Blues em Lá.', 'No Lá7, termine as frases no Lá. No Ré7, no Ré. No Mi7, no Mi.', 'Diga o nome do acorde em voz alta quando ele mudar.'], meta: 'O solo para de flutuar e passa a conversar com a música.' },
      { id: 'f7e2', t: 'Duas notas a mais', passos: ['Na aba Braço, modo Escala completa, veja o Desenho 1 com Si e Fá.', 'Toque a frase Duas notas a mais sobre a base Menor i – ♭VII.', 'Improvise usando Si e Fá como notas de passagem.'], meta: 'A escala menor natural sem decorar nada do zero.' },
      { id: 'f7e3', t: 'A escala maior de presente', passos: ['As 7 notas de Lá menor natural são as de Dó maior.', 'Na base Pop maior em Dó, use o mesmo desenho com as 2 notas novas, pousando no Dó.'], meta: 'Responder, tocando, à pergunta "escala maior ou pentatônica?".' },
      { id: 'f7e4', t: 'Tirar um solo inteiro', passos: ['Escolha um solo da lista de desafios.', 'Para cada frase: ouça, cante, ache no braço e só então confira a tab.', 'Uma frase por dia já é ótimo.'], meta: 'Aprender com os mestres, frase a frase.' }
    ],
    frases: ['l22', 'l23', 'l24'],
    melodias: [],
    desafios: ['d07', 'd08', 'd09'],
    regras: [
      'Diga em voz alta o nome do acorde enquanto sola.',
      'Toda frase termina na tônica do acorde da vez.',
      'Use Si ou Fá uma vez por frase.',
      'Comece cada volta do blues com uma frase de um solo que você aprendeu.'
    ],
    checkpoint: [
      'No blues, minhas frases acompanham a troca dos acordes.',
      'Uso as 2 notas novas sem soar "errado".',
      'Aprendi um solo famoso inteiro, frase por frase.',
      'Gravei 2 minutos de improviso e comparei com a gravação da Fase 1.'
    ]
  }
];

TS.proximoNivel = [
  'Modos começando pelo dórico, o som de Santana e de muito funk e soul: escala menor com a 6ª maior.',
  'Arpejos: tocar as notas do acorde da vez, no lugar da escala inteira.',
  'Sistema CAGED: ligar os desenhos aos acordes que você já conhece.',
  'Transcrição: tirar solos de ouvido, do começo ao fim.',
  'Guitarra: bends maiores, sustentação e abafamento.'
];
