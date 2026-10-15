// service-worker.js
// Guarda los archivos de la app en el teléfono para que abra sin internet.

// IMPORTANTE: cada vez que cambies algún archivo de la app, sube el número (v1 -> v2)
// para que los teléfonos descarguen la versión nueva.
const NOMBRE_DE_LA_MEMORIA = 'registro-compartido-v2';

// Todos los archivos que la app necesita para funcionar sin internet.
// Aquí hay que agregar también el CSS y demás archivos que haga la interfaz.
// Si alguno de la lista no existe, la instalación falla, así que revisa los nombres.
const ARCHIVOS_PARA_GUARDAR = [
  './',
  './index.html',
  './iniciar-aplicacion.js',
  './registro-local.js',
  './manifest.json',
  './estilos.css',
  './interfaz.js',
  './icono-192.png',
  './icono-512.png',
];

// Al instalarse, descarga y guarda todos los archivos
self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(NOMBRE_DE_LA_MEMORIA).then((memoria) => memoria.addAll(ARCHIVOS_PARA_GUARDAR))
  );
  self.skipWaiting();
});

// Al activarse, borra las memorias de versiones anteriores
self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys().then((nombresDeMemorias) =>
      Promise.all(
        nombresDeMemorias
          .filter((nombreDeMemoria) => nombreDeMemoria !== NOMBRE_DE_LA_MEMORIA)
          .map((nombreDeMemoria) => caches.delete(nombreDeMemoria))
      )
    )
  );
  self.clients.claim();
});

// Cada vez que la app pide un archivo: primero busca en lo guardado, y si no está, va a internet
self.addEventListener('fetch', (evento) => {
  const peticion = evento.request;

  // Solo se manejan lecturas de archivos propios; las llamadas a Supabase pasan directo
  if (peticion.method !== 'GET') return;
  if (new URL(peticion.url).origin !== self.location.origin) return;

  evento.respondWith(
    caches.match(peticion).then(
      (respuestaGuardada) =>
        respuestaGuardada ||
        fetch(peticion).catch(() => caches.match('./index.html'))
    )
  );
});
