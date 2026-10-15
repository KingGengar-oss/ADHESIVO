// iniciar-aplicacion.js
// Se carga desde el index.html con: <script type="module" src="./iniciar-aplicacion.js"></script>

// Registra el service worker (lo que permite abrir la app sin internet)
async function registrarServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  try {
    await navigator.serviceWorker.register('./service-worker.js');
  } catch (error) {
    console.error('No se pudo registrar el service worker:', error);
  }
}

// Pide al navegador que no borre los datos de la app cuando el teléfono ande corto de espacio
async function pedirAlmacenamientoPermanente() {
  if (navigator.storage && navigator.storage.persist) {
    await navigator.storage.persist();
  }
}

registrarServiceWorker();
pedirAlmacenamientoPermanente();
