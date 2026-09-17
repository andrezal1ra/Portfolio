const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');
const navLinks = [...document.querySelectorAll('.nav a')];

menuButton.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', open);
  menuButton.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
});

navLinks.forEach(link => link.addEventListener('click', () => {
  nav.classList.remove('open');
  menuButton.setAttribute('aria-expanded', 'false');
}));

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

const sections = [...document.querySelectorAll('main section[id]')];
const sectionObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(link => link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`));
    }
  });
}, { rootMargin: '-35% 0px -55% 0px' });
sections.forEach(section => sectionObserver.observe(section));

const dot = document.querySelector('.cursor-dot');
const ring = document.querySelector('.cursor-ring');
let mouseX = 0, mouseY = 0, ringX = 0, ringY = 0;
window.addEventListener('mousemove', event => {
  mouseX = event.clientX; mouseY = event.clientY;
  dot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
});
function animateCursor() {
  ringX += (mouseX - ringX) * .14; ringY += (mouseY - ringY) * .14;
  ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
  requestAnimationFrame(animateCursor);
}
animateCursor();
document.querySelectorAll('a, button, .chips span').forEach(el => {
  el.addEventListener('mouseenter', () => ring.classList.add('hover'));
  el.addEventListener('mouseleave', () => ring.classList.remove('hover'));
});

const role = document.getElementById('typed-role');
const fullRole = role.textContent;
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  role.textContent = '';
  let i = 0;
  const type = () => {
    role.textContent = fullRole.slice(0, i++);
    if (i <= fullRole.length) setTimeout(type, 42);
  };
  setTimeout(type, 650);
}

const githubRepos = document.getElementById('github-repos');
const githubStatus = document.getElementById('github-api-status');

const escapeHTML = value => String(value ?? '').replace(/[&<>'"]/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[char]));

async function loadGitHubRepos() {
  try {
    const response = await fetch('https://api.github.com/users/andrezal1ra/repos?sort=updated&direction=desc&per_page=6', {
      headers: { Accept: 'application/vnd.github+json' }
    });
    if (!response.ok) throw new Error(`GitHub API: ${response.status}`);
    const repos = await response.json();
    const visibleRepos = repos.filter(repo => !repo.fork).slice(0, 6);

    githubRepos.setAttribute('aria-busy', 'false');
    githubStatus.textContent = `${visibleRepos.length.toString().padStart(2, '0')} REPOS ONLINE`;

    if (!visibleRepos.length) {
      githubRepos.innerHTML = '<p class="api-message">Nenhum repositório público encontrado.</p>';
      return;
    }

    githubRepos.innerHTML = visibleRepos.map((repo, index) => `
      <article class="repo-card">
        <div class="repo-index">${String(index + 1).padStart(2, '0')}</div>
        <div class="repo-top"><span>REPOSITORY</span><span>UPDATED ${new Date(repo.updated_at).toLocaleDateString('pt-BR')}</span></div>
        <h4>${escapeHTML(repo.name)}</h4>
        <p>${escapeHTML(repo.description || 'Projeto disponível no GitHub de Andreza Lira.')}</p>
        <div class="repo-footer">
          <span><i style="--repo-color:${languageColor(repo.language)}"></i>${escapeHTML(repo.language || 'Code')}</span>
          <span>★ ${repo.stargazers_count}</span>
          <a href="${escapeHTML(repo.html_url)}" target="_blank" rel="noreferrer" aria-label="Abrir ${escapeHTML(repo.name)} no GitHub">OPEN ↗</a>
        </div>
      </article>`).join('');
  } catch (error) {
    githubRepos.setAttribute('aria-busy', 'false');
    githubStatus.textContent = 'CONNECTION FAILED';
    githubRepos.innerHTML = '<p class="api-message">Não foi possível carregar os projetos agora. <button type="button" id="retry-github">RETRY CONNECTION ↻</button></p>';
    document.getElementById('retry-github')?.addEventListener('click', loadGitHubRepos);
  }
}

function languageColor(language) {
  const colors = { JavaScript: '#f7df1e', TypeScript: '#3178c6', HTML: '#e34f26', CSS: '#1572b6', Python: '#54efea' };
  return colors[language] || '#ec00f0';
}

loadGitHubRepos();


// Progressive Web App: register the service worker and expose installation when supported.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(error => {
      console.warn('PWA service worker registration failed:', error);
    });
  });
}

let deferredInstallPrompt = null;
const installButton = document.getElementById('pwa-install');

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  if (installButton) installButton.hidden = false;
});

installButton?.addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  installButton.hidden = true;
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  if (installButton) installButton.hidden = true;
});

// Device feature: browser geolocation (GPS/location services).
const locationButton = document.getElementById('location-button');
const locationStatus = document.getElementById('location-status');
const locationData = document.getElementById('location-data');
const latitude = document.getElementById('latitude');
const longitude = document.getElementById('longitude');
const accuracy = document.getElementById('accuracy');

function setLocationStatus(message) {
  if (locationStatus) locationStatus.textContent = message;
}

locationButton?.addEventListener('click', () => {
  if (!('geolocation' in navigator)) {
    setLocationStatus('LOCATION // NOT SUPPORTED');
    return;
  }

  setLocationStatus('LOCATION // REQUESTING ACCESS...');
  locationButton.disabled = true;

  navigator.geolocation.getCurrentPosition(
    position => {
      const { latitude: lat, longitude: lon, accuracy: meters } = position.coords;
      latitude.textContent = `${lat.toFixed(5)}°`;
      longitude.textContent = `${lon.toFixed(5)}°`;
      accuracy.textContent = `${Math.round(meters)} m`;
      locationData.hidden = false;
      setLocationStatus('LOCATION // SIGNAL ACQUIRED');
      locationButton.disabled = false;
    },
    error => {
      const messages = {
        1: 'PERMISSION DENIED',
        2: 'POSITION UNAVAILABLE',
        3: 'REQUEST TIMED OUT'
      };
      setLocationStatus(`LOCATION // ${messages[error.code] || 'ERROR'}`);
      locationButton.disabled = false;
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
  );
});
