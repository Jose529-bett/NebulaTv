const firebaseConfig = { databaseURL: "https://nebula-plus-app-default-rtdb.firebaseio.com/" };
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let users = []; let movies = []; let currentBrand = 'disney'; let currentType = 'pelicula';
let datosSerieActual = []; let videoActualUrl = ""; let hlsInstance = null;

// FIREBASE
db.ref('users').on('value', snap => {
    const data = snap.val();
    users = [];
    if(data) { for(let id in data) { users.push({ ...data[id], firebaseId: id }); } }
});

db.ref('movies').on('value', snap => {
    const data = snap.val();
    movies = [];
    if(data) { for(let id in data) { movies.push({ ...data[id], firebaseId: id }); } }
    actualizarVista();
});

// LOGIN
function entrar() {
    const u = document.getElementById('log-u').value;
    const p = document.getElementById('log-p').value;
    const user = users.find(x => x.u === u && x.p === p);
    if(user) {
        document.getElementById('u-name').innerText = "Perfil: " + u;
        document.getElementById('sc-login').classList.add('hidden');
        document.getElementById('sc-main').classList.remove('hidden');
    } else { alert("Acceso denegado"); }
}

function cerrarSesion() {
    document.getElementById('sc-main').classList.add('hidden');
    document.getElementById('sc-login').classList.remove('hidden');
    document.getElementById('drop-menu').classList.add('hidden');
}

// CATALOGO
function seleccionarMarca(b) { currentBrand = b; actualizarVista(); }

function cambiarTipo(t) { 
    currentType = t; 
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(t === 'pelicula' ? 't-peli' : 't-serie').classList.add('active');
    actualizarVista(); 
}

function actualizarVista() {
    const grid = document.getElementById('grid');
    if(!grid) return;
    document.getElementById('cat-title').innerText = currentBrand + " > " + currentType;
    const filtrados = movies.filter(m => m.brand === currentBrand && m.type === currentType);
    grid.innerHTML = filtrados.map(m => `
        <div class="poster tv-focusable" tabindex="0" style="background-image:url('${m.poster}')" onclick="reproducir('${m.video}', '${m.title}')"></div>
    `).join('');
}

function buscar() {
    const q = document.getElementById('search-box').value.toLowerCase();
    const filtered = movies.filter(m => m.title.toLowerCase().includes(q));
    document.getElementById('grid').innerHTML = filtered.map(m => `
        <div class="poster tv-focusable" tabindex="0" style="background-image:url('${m.poster}')" onclick="reproducir('${m.video}', '${m.title}')"></div>
    `).join('');
}

// REPRODUCTOR
function reproducir(cadenaVideo, titulo) {
    const player = document.getElementById('video-player');
    document.getElementById('player-title').innerText = titulo;
    player.classList.remove('hidden');

    const item = movies.find(m => m.title === titulo && m.video === cadenaVideo);
    
    if(item && item.type === 'serie') {
        document.getElementById('serie-controls').classList.remove('hidden');
        document.getElementById('btn-expand').classList.remove('hidden');
        document.querySelector('.video-preview-top').style.height = "50vh";

        const temporadas = item.video.split('|');
        datosSerieActual = temporadas.map(t => t.split(','));
        document.getElementById('season-selector').innerHTML = datosSerieActual.map((_, i) => `<option value="${i}">Temporada ${i+1}</option>`).join('');
        cargarTemporada(0); 
    } else {
        document.getElementById('serie-controls').classList.add('hidden');
        document.getElementById('btn-expand').classList.add('hidden');
        document.querySelector('.video-preview-top').style.height = "100vh";
        videoActualUrl = cadenaVideo;
        gestionarFuenteVideo(cadenaVideo, '#mini-player-frame');
    }
}

function cargarTemporada(idx) {
    const grid = document.getElementById('episodes-grid');
    const capitulos = datosSerieActual[idx];
    grid.innerHTML = capitulos.map((link, i) => `<button class="btn-ep tv-focusable" onclick="cambiarEpisodio('${link.trim()}')">EP. ${i+1}</button>`).join('');
    cambiarEpisodio(capitulos[0].trim());
}

function cambiarEpisodio(url) {
    videoActualUrl = url;
    gestionarFuenteVideo(url, '#mini-player-frame');
}

function agrandarPantalla() {
    if(!videoActualUrl) return;
    document.getElementById('fullscreen-overlay').classList.remove('hidden');
    gestionarFuenteVideo(videoActualUrl, '#full-video-frame');
}

function achicarPantalla() { document.getElementById('fullscreen-overlay').classList.add('hidden'); }

function gestionarFuenteVideo(url, containerId) {
    const videoFrame = document.querySelector(containerId);
    if(hlsInstance) { hlsInstance.destroy(); hlsInstance = null; }
    videoFrame.innerHTML = ''; 
    const urlLimpia = url.trim();
    const esDirecto = urlLimpia.toLowerCase().includes('.m3u8') || urlLimpia.toLowerCase().includes('.mp4');

    if (esDirecto) {
        videoFrame.innerHTML = `<video id="v-core" controls autoplay style="width:100%; height:100%; background:#000;"></video>`;
        const video = document.getElementById('v-core');
        if (urlLimpia.toLowerCase().includes('.m3u8') && Hls.isSupported()) {
            hlsInstance = new Hls(); hlsInstance.loadSource(urlLimpia); hlsInstance.attachMedia(video);
        } else { video.src = urlLimpia; }
    } else {
        videoFrame.innerHTML = `<iframe src="${urlLimpia}" frameborder="0" allowfullscreen style="width:100%; height:100%;"></iframe>`;
    }
}

function cerrarReproductor() {
    if(hlsInstance) { hlsInstance.destroy(); hlsInstance = null; }
    document.getElementById('video-player').classList.add('hidden');
}

function toggleMenu() { document.getElementById('drop-menu').classList.toggle('hidden'); }
