const firebaseConfig = { databaseURL: "https://nebula-plus-app-default-rtdb.firebaseio.com/" };
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let users = []; let movies = []; let currentBrand = 'disney'; let currentType = 'pelicula';
let datosSerieActual = []; let videoActualUrl = ""; let hlsInstance = null;

// --- GESTIÓN DE FOCO PARA SMART TV ---
document.addEventListener('keydown', function(e) {
    const focusables = Array.from(document.querySelectorAll('.tv-focusable:not(.hidden)'));
    let index = focusables.indexOf(document.activeElement);

    if (e.keyCode === 13) { // ENTER
        if (document.activeElement.tagName === 'INPUT') {
            document.activeElement.focus(); // Re-enfocar para forzar teclado
            return;
        }
        document.activeElement.click();
        return;
    }

    if (index > -1) {
        let nextIndex = index;
        const columns = 6; 

        if (e.keyCode === 39) nextIndex++; 
        if (e.keyCode === 37) nextIndex--; 
        if (e.keyCode === 40) nextIndex += columns; 
        if (e.keyCode === 38) nextIndex -= columns; 

        if (nextIndex >= 0 && nextIndex < focusables.length) {
            focusables[nextIndex].focus();
            e.preventDefault();
        }
    } else {
        if(focusables.length > 0) focusables[0].focus();
    }
});

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
        setTimeout(() => document.querySelector('.brand-bar .tv-focusable').focus(), 100);
    } else { alert("Acceso denegado"); }
}

function cerrarSesion() {
    location.reload(); // Recarga para limpiar todo el estado en la TV
}

// CATALOGO
function seleccionarMarca(b) { 
    currentBrand = b; 
    actualizarVista(); 
    setTimeout(() => {
        const primerPoster = document.querySelector('#grid .poster');
        if(primerPoster) primerPoster.focus();
    }, 200);
}

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
    setTimeout(() => document.getElementById('btn-expand').focus(), 500);
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
    setTimeout(() => document.querySelector('.btn-back-to-panel').focus(), 500);
}

function achicarPantalla() { 
    document.getElementById('fullscreen-overlay').classList.add('hidden'); 
    document.getElementById('btn-expand').focus();
}

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
    const primerPoster = document.querySelector('#grid .poster');
    if(primerPoster) primerPoster.focus();
}

function toggleMenu() { 
    document.getElementById('drop-menu').classList.toggle('hidden'); 
    if(!document.getElementById('drop-menu').classList.contains('hidden')){
        document.querySelector('.btn-logout').focus();
    }
}
