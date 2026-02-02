// CONFIGURACIÓN FIREBASE
const firebaseConfig = { databaseURL: "https://nebula-plus-app-default-rtdb.firebaseio.com/" };
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let users = []; let movies = []; let currentBrand = 'disney'; let currentType = 'pelicula';
let datosSerieActual = []; let hlsInstance = null;

// CARGAR DATOS
db.ref('users').on('value', snap => {
    const data = snap.val();
    users = [];
    if(data) { for(let id in data) { users.push({ ...data[id], firebaseId: id }); } }
    renderUserTable();
});

db.ref('movies').on('value', snap => {
    const data = snap.val();
    movies = [];
    if(data) { for(let id in data) { movies.push({ ...data[id], firebaseId: id }); } }
    actualizarVista(); renderMovieTable();
});

// NAVEGACIÓN SMART TV (D-PAD)
document.addEventListener('keydown', (e) => {
    const items = Array.from(document.querySelectorAll('.tv-focusable, .poster, input, select, .btn-ep'));
    const visibleItems = items.filter(i => i.offsetParent !== null);
    let index = visibleItems.indexOf(document.activeElement);

    if (e.keyCode === 39) { // Derecha
        index = (index + 1) % visibleItems.length;
        visibleItems[index].focus();
    } else if (e.keyCode === 37) { // Izquierda
        index = (index - 1 + visibleItems.length) % visibleItems.length;
        visibleItems[index].focus();
    } else if (e.keyCode === 40) { // Abajo
        index = Math.min(index + 5, visibleItems.length - 1); // Salto aproximado de fila
        visibleItems[index].focus();
    } else if (e.keyCode === 38) { // Arriba
        index = Math.max(index - 5, 0);
        visibleItems[index].focus();
    } else if (e.keyCode === 13) { // OK
        // El clic se ejecuta solo
    } else if (e.keyCode === 27 || e.keyCode === 10009 || e.keyCode === 461) { // BACK
        if (!document.getElementById('video-player').classList.contains('hidden')) {
            cerrarReproductor();
        }
    }
});

// LOGICA APP
function entrar() {
    const u = document.getElementById('log-u').value;
    const p = document.getElementById('log-p').value;
    const user = users.find(x => x.u === u && x.p === p);
    if(user || (u === 'admin' && p === '1234')) {
        document.getElementById('u-name').innerText = u;
        switchScreen('sc-main');
        setTimeout(() => document.querySelector('.brand-bar button').focus(), 500);
    } else { alert("Acceso denegado"); }
}

function switchScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

function actualizarVista() {
    const grid = document.getElementById('grid');
    if(!grid) return;
    const filtrados = movies.filter(m => m.brand === currentBrand && m.type === currentType);
    grid.innerHTML = filtrados.map(m => `
        <div class="poster" tabindex="0" 
             style="background-image:url('${m.poster}')" 
             onclick="reproducir('${m.video}', '${m.title}')">
        </div>`).join('');
}

function reproducir(cadenaVideo, titulo) {
    const player = document.getElementById('video-player');
    document.getElementById('player-title').innerText = titulo;
    player.classList.remove('hidden');
    
    if(cadenaVideo.includes('|')) { // Es serie
        document.getElementById('serie-controls').classList.remove('hidden');
        const temporadas = cadenaVideo.split('|');
        datosSerieActual = temporadas.map(t => t.split(','));
        document.getElementById('season-selector').innerHTML = datosSerieActual.map((_, i) => `<option value="${i}">Temporada ${i+1}</option>`).join('');
        cargarTemporada(0);
    } else {
        document.getElementById('serie-controls').classList.add('hidden');
        gestionarFuenteVideo(cadenaVideo);
    }
    document.getElementById('btn-cerrar-v').focus();
}

function gestionarFuenteVideo(url) {
    const videoFrame = document.querySelector('.video-frame');
    if(hlsInstance) hlsInstance.destroy();
    videoFrame.innerHTML = ''; 
    const u = url.trim();
    if (u.includes('.m3u8') || u.includes('.mp4')) {
        videoFrame.innerHTML = `<video id="main-v" controls autoplay style="width:100%; height:100%;"></video>`;
        const video = document.getElementById('main-v');
        if (u.includes('.m3u8') && Hls.isSupported()) {
            hlsInstance = new Hls(); hlsInstance.loadSource(u); hlsInstance.attachMedia(video);
        } else { video.src = u; }
    } else {
        videoFrame.innerHTML = `<iframe src="${u}" allowfullscreen></iframe>`;
    }
}

function cargarTemporada(idx) {
    const grid = document.getElementById('episodes-grid');
    grid.innerHTML = datosSerieActual[idx].map((link, i) => `
        <button class="btn-ep" onclick="gestionarFuenteVideo('${link.trim()}')">E${i+1}</button>
    `).join('');
}

function cerrarReproductor() {
    if(hlsInstance) hlsInstance.destroy();
    document.getElementById('video-player').classList.add('hidden');
    document.querySelector('.video-frame').innerHTML = '';
}

function seleccionarMarca(b) { currentBrand = b; actualizarVista(); }
function cambiarTipo(t) { currentType = t; actualizarVista(); }
function cerrarSesion() { switchScreen('sc-login'); }
function abrirAdmin() { if(prompt("PIN:") === "2026") switchScreen('sc-admin'); }

// Iniciar foco
window.onload = () => document.getElementById('log-u').focus();
