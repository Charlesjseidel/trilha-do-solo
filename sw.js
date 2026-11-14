/* Trilha do Solo — service worker (só roda quando o app está publicado em https; no clique duplo ele fica de fora).
   Estratégia "rede primeiro": com internet, sempre pega a versão mais nova e guarda uma cópia;
   sem internet, usa a cópia guardada. Assim uma atualização publicada aparece na próxima vez que o app abrir.
   Ao criar um arquivo novo que o app carrega, acrescente-o em ARQUIVOS (o teste testes/validar.js confere). */
const CACHE = 'trilha-do-solo';
const ARQUIVOS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'data/curriculo.js',
  'data/frases.js',
  'js/teoria.js',
  'js/audio.js',
  'js/desenho.js',
  'js/estado.js',
  'js/app.js',
  'icones/icone-192.png',
  'icones/icone-512.png',
  'icones/icone-maskable-512.png',
  'icones/apple-touch-icon.png'
];
const FONTES = ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'];

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (ev) => {
  const req = ev.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const proprio = url.origin === self.location.origin;
  if (!proprio && !FONTES.includes(url.origin)) return;
  ev.respondWith(
    fetch(req)
      .then((resp) => {
        if (resp && (resp.ok || resp.type === 'opaque')) {
          const copia = resp.clone();
          caches.open(CACHE).then((c) => c.put(req, copia));
        }
        return resp;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || (req.mode === 'navigate' ? caches.match('index.html') : undefined)))
  );
});
