// =============================================
// POKÉDEX — app.js
// Consume PokéAPI para mostrar Pokémon
// =============================================

// ===== CONSTANTES Y VARIABLES GLOBALES =====
const API_BASE   = 'https://pokeapi.co/api/v2/pokemon';
const LIMIT      = 20;          // Pokémon por página
let   offset     = 0;           // Posición actual en la lista
let   totalCount = 0;           // Total de Pokémon en la API
let   searchMode = false;       // ¿Estamos buscando uno específico?

// ===== REFERENCIAS AL DOM =====
const grid       = document.getElementById('pokemon-grid');
const searchInput= document.getElementById('search-input');
const searchBtn  = document.getElementById('search-btn');
const resetBtn   = document.getElementById('reset-btn');
const errorMsg   = document.getElementById('error-msg');
const prevBtn    = document.getElementById('prev-btn');
const nextBtn    = document.getElementById('next-btn');
const pageInfo   = document.getElementById('page-info');
const pagination = document.getElementById('pagination');
const modal      = document.getElementById('modal');
const modalBody  = document.getElementById('modal-body');
const modalClose = document.getElementById('modal-close');

// ===== TRADUCCIONES AL ESPAÑOL =====
const TIPOS_ES = {
  fire:     'Fuego',
  water:    'Agua',
  grass:    'Planta',
  electric: 'Eléctrico',
  psychic:  'Psíquico',
  ice:      'Hielo',
  dragon:   'Dragón',
  dark:     'Siniestro',
  fairy:    'Hada',
  normal:   'Normal',
  fighting: 'Lucha',
  flying:   'Volador',
  poison:   'Veneno',
  ground:   'Tierra',
  rock:     'Roca',
  bug:      'Bicho',
  ghost:    'Fantasma',
  steel:    'Acero',
};

const STATS_ES = {
  hp:               'Vida',
  attack:           'Ataque',
  defense:          'Defensa',
  'special-attack': 'Ataque Esp.',
  'special-defense':'Defensa Esp.',
  speed:            'Velocidad',
};

// =============================================
// FUNCIÓN PRINCIPAL: Carga lista de Pokémon
// =============================================
async function loadPokemon() {
  searchMode = false;
  showSkeletons();
  hideError();

  try {
    // Petición a la API con límite y offset para paginación
    const res  = await fetch(`${API_BASE}?limit=${LIMIT}&offset=${offset}`);
    if (!res.ok) throw new Error('Error al conectar con la API');
    const data = await res.json();

    totalCount = data.count; // Total de Pokémon disponibles

    // Obtenemos los detalles de cada Pokémon en paralelo
    const detalles = await Promise.all(
      data.results.map(p => fetch(p.url).then(r => r.json()))
    );

    renderCards(detalles);
    updatePagination();

  } catch (error) {
    showError('Error al cargar los Pokémon. Revisa tu conexión.');
    grid.innerHTML = '';
  }
}

// =============================================
// FUNCIÓN: Buscar Pokémon por nombre o numero
// =============================================
async function searchPokemon() {
  const nombre = searchInput.value.trim().toLowerCase();

  // Validación: input no puede estar vacío
  if (!nombre) {
    showError('Por favor escribe el nombre o número en pokedex de un Pokémon.');
    return;
  }

  searchMode = true;
  showSkeletons(4);
  hideError();
  pagination.classList.add('hidden');

  try {
    const res = await fetch(`${API_BASE}/${nombre}`);

    // Si no existe, la API devuelve 404
    if (!res.ok) throw new Error('No encontrado');

    const pokemon = await res.json();
    renderCards([pokemon]);

  } catch (error) {
    showError(`No se encontró ningún Pokémon con el nombre o número "${nombre}".`);
    grid.innerHTML = '';
  }
}

// =============================================
// FUNCIÓN: Renderizar tarjetas en el DOM
// =============================================
function renderCards(pokemonList) {
  grid.innerHTML = ''; // Limpiamos la cuadrícula

  pokemonList.forEach(pokemon => {
    // Imagen oficial (alta calidad)
    const imagen = pokemon.sprites.other['official-artwork'].front_default
                || pokemon.sprites.front_default
                || 'https://via.placeholder.com/110?text=?';

    // Tipos del Pokémon
    const tipos = pokemon.types
      .map(t => `<span class="type-badge type-${t.type.name}">${TIPOS_ES[t.type.name] || t.type.name}</span>`)
      .join('');

    // Creamos la tarjeta
    const card = document.createElement('div');
    card.classList.add('card');
    card.innerHTML = `
      <p class="card__id">#${String(pokemon.id).padStart(3, '0')}</p>
      <img class="card__img" src="${imagen}" alt="${pokemon.name}" loading="lazy" />
      <p class="card__name">${pokemon.name}</p>
      <div class="types">${tipos}</div>
    `;

    // Al hacer clic en la tarjeta → abrir modal con detalles
    card.addEventListener('click', () => openModal(pokemon));

    grid.appendChild(card);
  });
}

// =============================================
// FUNCIÓN: Abrir modal con estadísticas
// =============================================
function openModal(pokemon) {
  const imagen = pokemon.sprites.other['official-artwork'].front_default
              || pokemon.sprites.front_default;

  const tipos = pokemon.types
    .map(t => `<span class="type-badge type-${t.type.name}">${TIPOS_ES[t.type.name] || t.type.name}</span>`)
    .join('');

  // Estadísticas base (HP, Ataque, Defensa, Velocidad)
  const statsHTML = pokemon.stats.map(s => `
    <p class="modal__stat"><strong>${STATS_ES[s.stat.name] || s.stat.name}:</strong> ${s.base_stat}</p>
    <div class="stat-bar-wrap">
      <div class="stat-bar" style="width: ${Math.min(s.base_stat, 150) / 150 * 100}%"></div>
    </div>
  `).join('');

  modalBody.innerHTML = `
    <img class="modal__img" src="${imagen}" alt="${pokemon.name}" />
    <h2 class="modal__name">${pokemon.name}</h2>
    <p class="modal__id">#${String(pokemon.id).padStart(3, '0')}</p>
    <div class="types" style="justify-content:center; margin-bottom:15px">${tipos}</div>
    <p style="margin-bottom:8px"><strong>Altura:</strong> ${pokemon.height / 10} m &nbsp;|&nbsp;
       <strong>Peso:</strong> ${pokemon.weight / 10} kg</p>
    ${statsHTML}
  `;

  modal.classList.remove('hidden');
}

// =============================================
// FUNCIÓN: Cerrar modal
// =============================================
function closeModal() {
  modal.classList.add('hidden');
}

// =============================================
// FUNCIONES DE PAGINACIÓN
// =============================================
function prevPage() {
  if (offset >= LIMIT) {
    offset -= LIMIT;
    loadPokemon();
    window.scrollTo(0, 0);
  }
}

function nextPage() {
  if (offset + LIMIT < totalCount) {
    offset += LIMIT;
    loadPokemon();
    window.scrollTo(0, 0);
  }
}

function updatePagination() {
  pagination.classList.remove('hidden');
  const currentPage = Math.floor(offset / LIMIT) + 1;
  const totalPages  = Math.ceil(totalCount / LIMIT);

  pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
  prevBtn.disabled = offset === 0;
  nextBtn.disabled = offset + LIMIT >= totalCount;
}

// =============================================
// FUNCIONES DE UI AUXILIARES
// =============================================

// Muestra placeholders mientras carga
function showSkeletons(cantidad = LIMIT) {
  grid.innerHTML = '';
  for (let i = 0; i < cantidad; i++) {
    const sk = document.createElement('div');
    sk.classList.add('skeleton');
    grid.appendChild(sk);
  }
}

function showError(msg) {
  errorMsg.textContent = '❌ ' + msg;
  errorMsg.classList.remove('hidden');
}

function hideError() {
  errorMsg.classList.add('hidden');
}

// =============================================
// EVENTOS
// =============================================
searchBtn.addEventListener('click', searchPokemon);
resetBtn .addEventListener('click', () => {
  searchInput.value = '';
  offset = 0;
  pagination.classList.remove('hidden');
  loadPokemon();
});

// Buscar también al presionar Enter
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') searchPokemon();
});

prevBtn    .addEventListener('click', prevPage);
nextBtn    .addEventListener('click', nextPage);
modalClose .addEventListener('click', closeModal);

// Cerrar modal al hacer clic fuera del contenido
modal.addEventListener('click', (e) => {
  if (e.target === modal) closeModal();
});

// =============================================
// INICIO: Cargar primera página al abrir
// =============================================
loadPokemon();