// =============================================
// POKÉDEX — app.js
// =============================================

const API_BASE = 'https://pokeapi.co/api/v2/pokemon';
const PAGE_SIZE = 20;

// ===== ESTADO GLOBAL =====
let allPokemon   = [];      // Todos los pokémon cargados
let filtered     = [];      // Resultado de aplicar filtros
let currentPage  = 1;
let activeType   = 'all';
let activeLetter = 'all';
let searchQuery  = '';

// ===== DOM =====
const grid        = document.getElementById('pokemon-grid');
const searchInput = document.getElementById('search-input');
const searchBtn   = document.getElementById('search-btn');
const resetBtn    = document.getElementById('reset-btn');
const errorMsg    = document.getElementById('error-msg');
const prevBtn     = document.getElementById('prev-btn');
const nextBtn     = document.getElementById('next-btn');
const pageInfo    = document.getElementById('page-info');
const pagination  = document.getElementById('pagination');
const modal       = document.getElementById('modal');
const modalBody   = document.getElementById('modal-body');
const modalClose  = document.getElementById('modal-close');
const typeFilter  = document.getElementById('type-filter');
const alphaFilter = document.getElementById('alpha-filter');
const pokemonList = document.getElementById('pokemon-list');

// ===== TRADUCCIONES =====
const TIPOS_ES = {
  fire: 'Fuego', water: 'Agua', grass: 'Planta', electric: 'Eléctrico',
  psychic: 'Psíquico', ice: 'Hielo', dragon: 'Dragón', dark: 'Siniestro',
  fairy: 'Hada', normal: 'Normal', fighting: 'Lucha', flying: 'Volador',
  poison: 'Veneno', ground: 'Tierra', rock: 'Roca', bug: 'Bicho',
  ghost: 'Fantasma', steel: 'Acero',
};

const STATS_ES = {
  hp: 'Vida', attack: 'Ataque', defense: 'Defensa',
  'special-attack': 'Ataque Esp.', 'special-defense': 'Defensa Esp.', speed: 'Velocidad',
};

// =============================================
// CARGA INICIAL — trae todos los pokémon
// =============================================
async function init() {
  showSkeletons();
  pokemonList.innerHTML = '<li class="list-loading">Cargando...</li>';

  try {
    // Traemos los primeros 151 con sus detalles completos
    const res  = await fetch(`${API_BASE}?limit=151&offset=0`);
    const data = await res.json();

    allPokemon = await Promise.all(
      data.results.map(p => fetch(p.url).then(r => r.json()))
    );

    buildTypeFilter();
    buildAlphaFilter();
    applyFilters(); // Renderiza grid + lista con el estado inicial

  } catch {
    showError('Error al cargar los Pokémon. Revisa tu conexión.');
    grid.innerHTML = '';
  }
}

// =============================================
// MOTOR DE FILTROS — fuente única de verdad
// =============================================
function applyFilters() {
  hideError();

  filtered = allPokemon.filter(p => {
    const matchType   = activeType   === 'all' || p.types.some(t => t.type.name === activeType);
    const matchLetter = activeLetter === 'all' || p.name.toUpperCase().startsWith(activeLetter);
    const matchSearch = searchQuery  === ''    || p.name.includes(searchQuery) || String(p.id) === searchQuery;
    return matchType && matchLetter && matchSearch;
  });

  currentPage = 1; // Resetear a página 1 al cambiar filtros

  if (filtered.length === 0) {
    showError('No se encontraron Pokémon con esos filtros.');
    grid.innerHTML = '';
    pagination.classList.add('hidden');
  } else {
    renderPage();
  }

  renderPokemonList(filtered);
}

// =============================================
// RENDERIZA LA PÁGINA ACTUAL DEL GRID
// =============================================
function renderPage() {
  const start = (currentPage - 1) * PAGE_SIZE;
  const end   = start + PAGE_SIZE;
  renderCards(filtered.slice(start, end));
  updatePagination();
}

// =============================================
// PANEL IZQUIERDO: FILTRO POR TIPO
// =============================================
function buildTypeFilter() {
  const tipos = new Set();
  allPokemon.forEach(p => p.types.forEach(t => tipos.add(t.type.name)));

  tipos.forEach(tipo => {
    const btn = document.createElement('button');
    btn.className = 'type-btn';
    btn.dataset.type = tipo;
    btn.textContent = TIPOS_ES[tipo] || tipo;
    btn.style.borderLeft = `4px solid ${getTypeColor(tipo)}`;
    typeFilter.appendChild(btn);
  });

  typeFilter.addEventListener('click', (e) => {
    const btn = e.target.closest('.type-btn');
    if (!btn) return;
    document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeType = btn.dataset.type;
    applyFilters();
  });
}

function getTypeColor(type) {
  const colors = {
    fire: '#F08030', water: '#6890F0', grass: '#78C850', electric: '#F8D030',
    psychic: '#F85888', ice: '#98D8D8', dragon: '#7038F8', dark: '#705848',
    fairy: '#EE99AC', normal: '#A8A878', fighting: '#C03028', flying: '#A890F0',
    poison: '#A040A0', ground: '#E0C068', rock: '#B8A038', bug: '#A8B820',
    ghost: '#705898', steel: '#B8B8D0',
  };
  return colors[type] || '#aaa';
}

// =============================================
// PANEL DERECHO: FILTRO ALFABÉTICO + LISTA
// =============================================
function buildAlphaFilter() {
  const allBtn = document.createElement('button');
  allBtn.className = 'alpha-btn active';
  allBtn.dataset.letter = 'all';
  allBtn.textContent = '*';
  alphaFilter.appendChild(allBtn);

  for (let i = 65; i <= 90; i++) {
    const letter = String.fromCharCode(i);
    const btn = document.createElement('button');
    btn.className = 'alpha-btn';
    btn.dataset.letter = letter;
    btn.textContent = letter;
    alphaFilter.appendChild(btn);
  }

  alphaFilter.addEventListener('click', (e) => {
    const btn = e.target.closest('.alpha-btn');
    if (!btn) return;
    document.querySelectorAll('.alpha-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeLetter = btn.dataset.letter;
    applyFilters();
  });
}

function renderPokemonList(list) {
  pokemonList.innerHTML = '';

  if (list.length === 0) {
    pokemonList.innerHTML = '<li class="list-loading">Sin resultados</li>';
    return;
  }

  list.forEach(p => {
    const li = document.createElement('li');
    li.dataset.id = p.id;
    li.innerHTML = `<span class="list-num">#${String(p.id).padStart(3, '0')}</span>${p.name}`;

    // Clic en lista → resalta en grid y hace scroll
    li.addEventListener('click', () => {
      highlightInGrid(p.id);
      openModal(p);
    });

    pokemonList.appendChild(li);
  });
}

// Resalta la tarjeta en el grid y navega a su página si es necesario
function highlightInGrid(pokemonId) {
  const idx = filtered.findIndex(p => p.id === pokemonId);
  if (idx === -1) return;

  const targetPage = Math.floor(idx / PAGE_SIZE) + 1;
  if (targetPage !== currentPage) {
    currentPage = targetPage;
    renderPage();
  }

  // Espera al siguiente frame para que el DOM esté actualizado
  requestAnimationFrame(() => {
    const card = grid.querySelector(`[data-pokemon-id="${pokemonId}"]`);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('card--highlight');
      setTimeout(() => card.classList.remove('card--highlight'), 1200);
    }
  });
}

// =============================================
// BÚSQUEDA
// =============================================
function handleSearch() {
  const val = searchInput.value.trim().toLowerCase();
  searchQuery = val;

  // Si la búsqueda es un nombre exacto o número, resalta en lista
  applyFilters();

  // Sincroniza la lista lateral: resalta el ítem si hay coincidencia exacta
  if (val !== '') {
    const match = allPokemon.find(p => p.name === val || String(p.id) === val);
    if (match) highlightListItem(match.id);
  }
}

function highlightListItem(pokemonId) {
  document.querySelectorAll('#pokemon-list li').forEach(li => {
    li.classList.toggle('list-item--active', Number(li.dataset.id) === pokemonId);
  });
}

// =============================================
// RENDERIZAR TARJETAS EN EL GRID
// =============================================
function renderCards(list) {
  grid.innerHTML = '';

  list.forEach(pokemon => {
    const imagen = pokemon.sprites.other['official-artwork'].front_default
                || pokemon.sprites.front_default
                || 'https://via.placeholder.com/110?text=?';

    const tipos = pokemon.types
      .map(t => `<span class="type-badge type-${t.type.name}">${TIPOS_ES[t.type.name] || t.type.name}</span>`)
      .join('');

    const card = document.createElement('div');
    card.classList.add('card');
    card.dataset.pokemonId = pokemon.id;
    card.innerHTML = `
      <p class="card__id">#${String(pokemon.id).padStart(3, '0')}</p>
      <img class="card__img" src="${imagen}" alt="${pokemon.name}" loading="lazy" />
      <p class="card__name">${pokemon.name}</p>
      <div class="types">${tipos}</div>
    `;

    // Clic en tarjeta → resalta en lista lateral también
    card.addEventListener('click', () => {
      highlightListItem(pokemon.id);
      openModal(pokemon);
    });

    grid.appendChild(card);
  });
}

// =============================================
// MODAL
// =============================================
function openModal(pokemon) {
  const imagen = pokemon.sprites.other['official-artwork'].front_default
              || pokemon.sprites.front_default;

  const tipos = pokemon.types
    .map(t => `<span class="type-badge type-${t.type.name}">${TIPOS_ES[t.type.name] || t.type.name}</span>`)
    .join('');

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

function closeModal() {
  modal.classList.add('hidden');
}

// =============================================
// PAGINACIÓN
// =============================================
function prevPage() {
  if (currentPage > 1) { currentPage--; renderPage(); window.scrollTo(0, 0); }
}

function nextPage() {
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  if (currentPage < totalPages) { currentPage++; renderPage(); window.scrollTo(0, 0); }
}

function updatePagination() {
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  pagination.classList.remove('hidden');
  pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages;
}

// =============================================
// UI AUXILIAR
// =============================================
function showSkeletons(cantidad = PAGE_SIZE) {
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
searchBtn.addEventListener('click', handleSearch);
searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSearch(); });

resetBtn.addEventListener('click', () => {
  searchInput.value = '';
  searchQuery  = '';
  activeType   = 'all';
  activeLetter = 'all';
  document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.type-btn[data-type="all"]')?.classList.add('active');
  document.querySelectorAll('.alpha-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.alpha-btn[data-letter="all"]')?.classList.add('active');
  applyFilters();
});

prevBtn.addEventListener('click', prevPage);
nextBtn.addEventListener('click', nextPage);
modalClose.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

// =============================================
// INICIO
// =============================================
init();
