// app.js
const addBtn = document.getElementById('addBtn');
const episodesList = document.getElementById('episodes');
const audio = document.getElementById('audio');
const nowPlaying = document.getElementById('nowPlaying');

const requestPermissionBtn = document.getElementById('requestPermission');
const testNotifyBtn = document.getElementById('testNotify');
const scheduleNotifyBtn = document.getElementById('scheduleNotify');

async function renderEpisodes() {
  episodesList.innerHTML = '';
  const episodes = await getAllEpisodes();
  if (!episodes.length) {
    episodesList.innerHTML = '<li>No hay episodios guardados.</li>';
    return;
  }
  episodes.forEach(ep => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div>
        <strong>${ep.title}</strong><br/><small>${ep.author}</small>
      </div>
      <div>
        <button data-id="${ep.id}" class="play">Reproducir</button>
        <button data-id="${ep.id}" class="delete">Eliminar</button>
      </div>
    `;
    episodesList.appendChild(li);
  });
}

addBtn.addEventListener('click', async () => {
  const title = document.getElementById('title').value || 'Sin título';
  const author = document.getElementById('author').value || 'Desconocido';
  const fileInput = document.getElementById('file');
  if (!fileInput.files.length) { alert('Selecciona un archivo de audio'); return; }
  const file = fileInput.files[0];
  // Guardar blob en IndexedDB
  const reader = new FileReader();
  reader.onload = async (e) => {
    const blob = new Blob([e.target.result], { type: file.type });
    await addEpisode({ title, author, blob, created: Date.now() });
    fileInput.value = '';
    document.getElementById('title').value = '';
    document.getElementById('author').value = '';
    await renderEpisodes();
  };
  reader.readAsArrayBuffer(file);
});

episodesList.addEventListener('click', async (e) => {
  const el = e.target;
  const id = el.dataset.id;
  if (!id) return;
  if (el.classList.contains('play')) {
    const ep = await getEpisode(id);
    if (!ep || !ep.blob) return;
    const blobUrl = URL.createObjectURL(ep.blob);
    audio.src = blobUrl;
    audio.play();
    nowPlaying.textContent = `Reproduciendo: ${ep.title} — ${ep.author}`;
  } else if (el.classList.contains('delete')) {
    if (confirm('Eliminar episodio?')) {
      await deleteEpisode(id);
      await renderEpisodes();
    }
  }
});

// registro del service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').then(reg => {
    console.log('SW registrado', reg);
  }).catch(console.error);
}

// Notificaciones: pedir permiso
requestPermissionBtn.addEventListener('click', async () => {
  if (!('Notification' in window)) { alert('Notificaciones no soportadas'); return; }
  const perm = await Notification.requestPermission();
  alert('Permiso: ' + perm);
});

// Pedir al service worker que muestre notificación ahora
testNotifyBtn.addEventListener('click', async () => {
  if (!navigator.serviceWorker.controller) {
    alert('La PWA debe estar activa y con Service Worker.');
    return;
  }
  navigator.serviceWorker.controller.postMessage({ type: 'SHOW_NOTIFICATION', title: 'Notificación de prueba', body: '¡Esto es una notificación desde SW!' });
});

// Programar notificación de ejemplo en 30s (se usa setTimeout; no funciona si la PWA está cerrada)
scheduleNotifyBtn.addEventListener('click', () => {
  if (Notification.permission !== 'granted') { alert('Concede permiso primero'); return; }
  alert('Se programará una notificación en 30 segundos (requiere la PWA abierta).');
  setTimeout(() => {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SHOW_NOTIFICATION', title: 'Recordatorio de Podcast', body: 'Tu episodio guardado está listo para escuchar.' });
    } else {
      new Notification('Recordatorio de Podcast', { body: 'Tu episodio guardado está listo para escuchar.' });
    }
  }, 30000);
});
async function suscribirUsuario() {
    const registro = await navigator.serviceWorker.ready;

    const suscripcion = await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array("BE8bR5ohmXms2L1bCmligkLcDJdWlDlnv7LkGP1gI-4wOkSEjOmcgaEDEsaatVJkFV57a_5YNtQj2HhG_v_8_XA")
    });

    console.log("Suscripción:", JSON.stringify(suscripcion));

    // Enviar al servidor la suscripción
    await fetch("/suscribir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(suscripcion)
    });
}

// Función para convertir el Base64 a Uint8Array
function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, "+")
        .replace(/_/g, "/");

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}
// inicializar UI
renderEpisodes();