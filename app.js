const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const header = document.getElementById('header');
const menuButton = document.getElementById('menu-button');
const mobileNav = document.getElementById('mobile-nav');
const serviceSelect = document.getElementById('contact-service');

function setMenu(open) {
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  mobileNav.hidden = !open;
  header.classList.toggle('menu-open', open);
}
menuButton.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
mobileNav.addEventListener('click', event => { if (event.target.closest('a')) setMenu(false); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !mobileNav.hidden) { setMenu(false); menuButton.focus(); } });
window.matchMedia('(min-width: 761px)').addEventListener('change', event => { if (event.matches) setMenu(false); });
let scrollQueued = false;
function updateHeader() { header.classList.toggle('is-scrolled', window.scrollY > 48); scrollQueued = false; }
window.addEventListener('scroll', () => { if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(updateHeader); } }, { passive: true });
updateHeader();

const revealElements = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && !reducedMotion.matches) {
  document.documentElement.classList.add('js-motion');
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); revealObserver.unobserve(entry.target); } });
  }, { threshold: 0.08 });
  revealElements.forEach(element => revealObserver.observe(element));
}
reducedMotion.addEventListener('change', event => { if (event.matches) document.documentElement.classList.remove('js-motion'); });

document.querySelectorAll('[data-service]').forEach(link => {
  link.addEventListener('click', () => { serviceSelect.value = link.dataset.service; });
});
document.getElementById('contact-form').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const topic = String(data.get('service'));
  const body = `Hello Kyrion,\n\n${String(data.get('message')).trim()}\n\nService: ${topic}\nName: ${String(data.get('name')).trim()}\nEmail: ${String(data.get('email')).trim()}`;
  const emailUrl = `mailto:info@kyrion.net?subject=${encodeURIComponent('Website enquiry — ' + topic)}&body=${encodeURIComponent(body)}`;
  window.location.href = emailUrl;
  document.getElementById('form-status').textContent = 'Your email draft is ready to open. Review it in your email app and send when you are ready. You can also email info@kyrion.net directly.';
});
document.getElementById('year').textContent = String(new Date().getFullYear());

// The photo is split into real pieces, moved into place, then left still.
// The same motion can be replayed explicitly; no continuous animation loop.
const backdrop = document.getElementById('hero-backdrop');
const puzzle = document.getElementById('puzzle-grid');
const replay = document.getElementById('puzzle-replay');
const heroPhoto = document.querySelector('.hero-photo');
let pieces = [];
let columns = 0;
let positions = [];
let solveTimer;
let settleTimer;
let resizeQueued = false;
let lastWidth = 0;
let lastHeight = 0;
const rows = 4;

function layoutPieces() {
  const width = backdrop.clientWidth;
  const height = backdrop.clientHeight;
  const tileWidth = width / columns;
  const tileHeight = height / rows;
  const scale = Math.max(width / 1672, height / 941);
  const imageWidth = 1672 * scale;
  const imageHeight = 941 * scale;
  const imageX = (width - imageWidth) * .68;
  const imageY = (height - imageHeight) * .28;
  pieces.forEach((piece, index) => {
    piece.style.width = `${tileWidth + .4}px`;
    piece.style.height = `${tileHeight + .4}px`;
    piece.style.backgroundSize = `${imageWidth}px ${imageHeight}px`;
    piece.style.backgroundPosition = `${imageX - (index % columns) * tileWidth}px ${imageY - Math.floor(index / columns) * tileHeight}px`;
    piece.style.transform = `translate3d(${(positions[index] % columns) * tileWidth}px, ${Math.floor(positions[index] / columns) * tileHeight}px, 0)`;
  });
  lastWidth = width;
  lastHeight = height;
}

function solvePicture(animate = true) {
  positions = pieces.map((_, index) => index);
  pieces.forEach((piece, index) => { piece.style.transitionDuration = animate ? '.85s' : '0s'; piece.style.transitionDelay = animate ? `${(index % 5) * 45}ms` : '0s'; });
  layoutPieces();
  clearTimeout(settleTimer);
  settleTimer = setTimeout(() => { replay.disabled = false; puzzle.classList.add('is-static'); }, animate ? 1150 : 0);
}

function animatePicture(initial = false) {
  if (reducedMotion.matches) return;
  clearTimeout(solveTimer);
  clearTimeout(settleTimer);
  replay.disabled = true;
  puzzle.classList.remove('is-static');
  positions = pieces.map((_, index) => index);
  // Adjacent swaps keep the scene recognisable while the pieces move.
  [[1, 2], [columns + 1, columns + 2], [columns * 2, columns * 2 + 1], [pieces.length - 2, pieces.length - 1]].forEach(([a, b]) => { [positions[a], positions[b]] = [positions[b], positions[a]]; });
  pieces.forEach(piece => { piece.style.transitionDuration = initial ? '0s' : '.55s'; piece.style.transitionDelay = '0s'; });
  layoutPieces();
  solveTimer = setTimeout(() => solvePicture(true), initial ? 650 : 700);
}

function createPuzzle() {
  clearTimeout(solveTimer);
  clearTimeout(settleTimer);
  columns = backdrop.clientWidth <= 760 ? 3 : 5;
  pieces = Array.from({ length: columns * rows }, () => {
    const piece = document.createElement('div');
    piece.className = 'puzzle-piece';
    return piece;
  });
  puzzle.replaceChildren(...pieces);
  puzzle.classList.add('is-ready');
  replay.hidden = reducedMotion.matches;
  animatePicture(true);
}

function startPuzzle() { if (!reducedMotion.matches && heroPhoto.naturalWidth) createPuzzle(); }
if (heroPhoto.complete) startPuzzle();
else heroPhoto.addEventListener('load', startPuzzle, { once: true });
replay.addEventListener('click', () => animatePicture(false));
if ('ResizeObserver' in window) {
  const resizeObserver = new ResizeObserver(() => {
    if (!pieces.length || resizeQueued || (lastWidth === backdrop.clientWidth && lastHeight === backdrop.clientHeight)) return;
    resizeQueued = true;
    requestAnimationFrame(() => {
      resizeQueued = false;
      const nextColumns = backdrop.clientWidth <= 760 ? 3 : 5;
      if (nextColumns !== columns) { createPuzzle(); clearTimeout(solveTimer); solvePicture(false); }
      else { clearTimeout(solveTimer); solvePicture(false); }
    });
  });
  resizeObserver.observe(backdrop);
}
reducedMotion.addEventListener('change', event => {
  clearTimeout(solveTimer);
  clearTimeout(settleTimer);
  replay.hidden = event.matches;
  if (event.matches) { if (pieces.length) solvePicture(false); }
  else startPuzzle();
});
