// CONFIGURACIÓN FIREBASE
const firebaseConfig = {
    databaseURL: "https://nebula-plus-app-default-rtdb.firebaseio.com/"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let movies = [];
let users = [];
let currentBrand = 'disney';
let currentType = 'pelicula';
let datosSerieActual = [];
let hlsInstance = null;

// ESCUCHAR DATOS
db.ref('movies').on('value', snap => {
    const data = snap.val();
    movies = [];
    if(data) {
        for(let id in data) movies.push({ ...data[id], firebaseId: id });
    }
    actualizarVista();
    renderMovieTable();
});

db.ref('users').on('value', snap => {
    const data = snap.val();
    users = [];
    if(data) {
        for(let id in data) users.push({ ...data[id], firebaseId: id });
    }
});

// LOGICA DE ACCESO
function entrar() {
    const u = document.getElementById('log-u').value;
    const p = document.getElementById('log-p').value;
    const user = users.find(x => x.u === u && x.p === p);

    if(user || (u === 'admin' && p === '2026')) {
        document.getElementById('u-name').innerText = "Usuario: " + u;
        switchScreen('sc-main');
    } else {
        alert("Credenciales incorrectas");
    }
}

function switchScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

// RENDERIZADO
function actualizarVista() {
    const grid = document.getElementById('grid');
    if(!grid) return;
    
    document.getElementById('cat-title').innerText = currentBrand.toUpperCase() + " > " + currentType.toUpperCase();
    
    const filtrados = movies.filter(m => m.brand === currentBrand && m.type === currentType);
    
    grid.innerHTML = filtrados.map((m, index) => `
        <div class="poster" 
             tabindex="${index + 20}" 
             style="background-image:url('${m.poster}')" 
             onclick="reproducir('${m.video}', '${m.title}')"
             onkeypress="if(event.key==='Enter') reproducir('${m.video}', '${m.title}')">
        </div>
    `).join('');
}

// MOTOR DE VIDEO
function reproducir(url, titulo) {
    const player = document.getElementById('video-player');
    document.getElementById('player-title').innerText = titulo;
    player.classList.remove('hidden');

    const item = movies.find(m => m.title === titulo);

    if(item && item.type === 'serie') {
        document.getElementById('serie-controls').classList.remove('hidden');
        const temporadas = item.video.split('|');
        datosSerieActual = temporadas.map(t => t.split(','));
        
        const selector = document.getElementById('season-selector');
        selector.innerHTML = datosSerieActual.map((_, i) => `<option value="${i}">Temporada ${i+1}</option>`).join('');
        cargarTemporada(0);
    } else {
        document.getElementById('serie-controls').classList.add('hidden');
        gestionarFuente(url);
    }
}

function gestionarFuente(url) {
    const container = document.querySelector('.video-frame');
    if(hlsInstance) hlsInstance.destroy();
    container.innerHTML = '';

    const link = url.trim();
    if(link.includes('.m3u8') || link.includes('.mp4')) {
        container.innerHTML = `<video id="vid" controls autoplay style="width:100%; height:100%"></video>`;
        const video = document.getElementById('vid');
        if(link.includes('.m3u8') && Hls.isSupported()) {
            hlsInstance = new Hls();
            hlsInstance.loadSource(link);
            hlsInstance.attachMedia(video);
        } else {
            video.src = link;
        }
    } else {
        container.innerHTML = `<iframe src="${link}" frameborder="0" allowfullscreen style="width:100%; height:100%"></iframe>`;
    }
}

function cargarTemporada(idx) {
    const grid = document.getElementById('episodes-grid');
    grid.innerHTML = datosSerieActual[idx].map((link, i) => `
        <button class="btn-ep" onclick="gestionarFuente('${link.trim()}')" tabindex="${200+i}">EP ${i+1}</button>
    `).join('');
    gestionarFuente(datosSerieActual[idx][0]);
}

function cerrarReproductor() {
    if(hlsInstance) hlsInstance.destroy();
    document.getElementById('video-player').classList.add('hidden');
    document.querySelector('.video-frame').innerHTML = '';
}

// ADMIN ACCIONES
function abrirAdmin() {
    if(prompt("PIN ADMIN:") === "2026") switchScreen('sc-admin');
}

function guardarContenido() {
    const data = {
        title: document.getElementById('c-title').value,
        poster: document.getElementById('c-post').value,
        video: document.getElementById('c-video').value,
        brand: document.getElementById('c-brand').value,
        type: document.getElementById('c-type').value
    };
    if(data.title && data.video) {
        db.ref('movies').push(data).then(() => alert("Publicado"));
    }
}

function borrarMovie(id) {
    if(confirm("¿Borrar?")) db.ref('movies/' + id).remove();
}

function renderMovieTable() {
    const table = document.getElementById('movie-list');
    table.innerHTML = `<tr><th>Título</th><th>Acción</th></tr>` + 
        movies.map(m => `<tr><td>${m.title}</td><td><button onclick="borrarMovie('${m.firebaseId}')">Eliminar</button></td></tr>`).join('');
}

function seleccionarMarca(m) { currentBrand = m; actualizarVista(); }
function cambiarTipo(t) { currentType = t; actualizarVista(); }
function cerrarSesion() { location.reload(); }
