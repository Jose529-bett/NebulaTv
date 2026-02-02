// --- CONFIGURACIÓN Y ESTADO ---
const firebaseConfig = { databaseURL: "https://nebula-plus-app-default-rtdb.firebaseio.com/" };
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let movies = []; let users = [];
let currentBrand = 'disney'; let currentType = 'pelicula';
let datosSerieActual = [];

// --- MOTOR DE NAVEGACIÓN SMART TV (D-PAD) ---
document.addEventListener('keydown', (e) => {
    const active = document.activeElement;
    
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        // La navegación nativa del navegador del Smart TV suele funcionar si usamos .focus()
        // Pero forzamos que el usuario sepa que puede navegar
    }

    if (e.key === 'Enter') {
        active.click(); // Simula el click al presionar OK en el mando
    }

    if (e.key === 'Backspeed' || e.key === 'Escape') {
        cerrarReproductor();
    }
});

// Función para actualizar los elementos que pueden recibir foco
function refrescarFoco() {
    document.querySelectorAll('button, input, .poster, select').forEach(el => {
        el.classList.add('focusable');
        if (!el.tabIndex) el.tabIndex = 0;
    });
}

// --- LÓGICA DE REPRODUCCIÓN (TU REQUERIMIENTO DE SERIES) ---
function reproducir(cadenaVideo, titulo) {
    const player = document.getElementById('video-player');
    document.getElementById('player-title').innerText = titulo;
    player.classList.remove('hidden');
    
    const item = movies.find(m => m.title === titulo && m.video === cadenaVideo);
    
    if(item && item.type === 'serie') {
        document.getElementById('serie-controls').classList.remove('hidden');
        const temporadas = item.video.split('|');
        datosSerieActual = temporadas.map(t => t.split(','));
        
        // Generar selector de temporadas
        const selector = document.getElementById('season-selector');
        selector.innerHTML = datosSerieActual.map((_, i) => `<option value="${i}">Temporada ${i+1}</option>`).join('');
        
        // CARGA AUTOMÁTICA CAP 1 (Como pediste)
        cargarTemporada(0); 
    } else {
        document.getElementById('serie-controls').classList.add('hidden');
        gestionarFuenteVideo(cadenaVideo);
    }
    
    setTimeout(refrescarFoco, 500);
}

function cargarTemporada(idx) {
    const grid = document.getElementById('episodes-grid');
    const capitulos = datosSerieActual[idx];
    
    // Generar botones de capítulos horizontales
    grid.innerHTML = capitulos.map((link, i) => `
        <button class="btn-ep focusable" onclick="gestionarFuenteVideo('${link.trim()}')">
            EPISODIO ${i+1}
        </button>
    `).join('');
    
    // REPRODUCE EL PRIMERO AUTOMÁTICAMENTE
    gestionarFuenteVideo(capitulos[0].trim());
    refrescarFoco();
}

// --- MANTENER TUS FUNCIONES EXISTENTES ---

function seleccionarMarca(b) { 
    currentBrand = b; 
    actualizarVista(); 
}

function cambiarTipo(t) { 
    currentType = t; 
    document.getElementById('t-peli').classList.toggle('active', t === 'pelicula');
    document.getElementById('t-serie').classList.toggle('active', t === 'serie');
    actualizarVista(); 
}

function actualizarVista() {
    const grid = document.getElementById('grid');
    if(!grid) return;
    const filtrados = movies.filter(m => m.brand === currentBrand && m.type === currentType);
    grid.innerHTML = filtrados.map(m => `
        <div class="poster focusable" 
             style="background-image:url('${m.poster}')" 
             onclick="reproducir('${m.video}', '${m.title}')"
             tabindex="0">
        </div>
    `).join('');
    refrescarFoco();
}

// Lógica del buscador (Mantenida)
function buscar() {
    const q = document.getElementById('search-box').value.toLowerCase();
    const filtered = movies.filter(m => m.title.toLowerCase().includes(q));
    document.getElementById('grid').innerHTML = filtered.map(m => `
        <div class="poster focusable" style="background-image:url('${m.poster}')" onclick="reproducir('${m.video}', '${m.title}')" tabindex="0"></div>
    `).join('');
    refrescarFoco();
}

// Escuchador de Firebase (Mantenido)
db.ref('movies').on('value', snap => {
    const data = snap.val();
    movies = [];
    if(data) { for(let id in data) { movies.push({ ...data[id], firebaseId: id }); } }
    actualizarVista();
});
