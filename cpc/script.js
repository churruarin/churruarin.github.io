document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => {
  new bootstrap.Tooltip(el);
});

document.body.classList.add('js-enabled');

// const toggleBtn = document.getElementById('darkModeToggle');
// const rootElement = document.documentElement; // or document.body

// // On page load, read saved theme
// const savedTheme = localStorage.getItem('theme');
// if (savedTheme === 'dark') {
//   rootElement.classList.add('dark-mode');
// } else if (savedTheme === 'light') {
//   rootElement.classList.remove('dark-mode');
// }

// // Toggle function
// toggleBtn.addEventListener('click', () => {
//   if (rootElement.classList.contains('dark-mode')) {
//     rootElement.classList.remove('dark-mode');
//     localStorage.setItem('theme', 'light');
//   } else {
//     rootElement.classList.add('dark-mode');
//     localStorage.setItem('theme', 'dark');
//   }
// });

const getSectionBg = (id) =>
  getComputedStyle(document.documentElement).getPropertyValue(`--${id}-bg`).trim();

const container = document.querySelector('.snap-container');

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      container.style.backgroundColor = getComputedStyle(entry.target).backgroundColor;
      entry.target.classList.add('visible');
    } else {
      entry.target.classList.remove('visible');
    }
  });
}, {
  threshold: 0.2, // lower threshold makes triggering easier on mobile
  rootMargin: '0px 0px -20% 0px' // trigger a bit earlier when scrolling up
});



document.querySelectorAll('.snap-section').forEach(section => {
  observer.observe(section);
});

// const myCarouselElement = document.querySelector('#carouselGuardaAlimentos')

// const carousel = new bootstrap.Carousel(myCarouselElement, {
//   interval: 2000,
//   touch: false
// })


document.body.classList.add('js-enabled');

document.querySelectorAll('.scrolling-cards-wrapper').forEach(wrapper => {
  const container = wrapper.querySelector('.scrolling-cards-container');
  const leftBtn = wrapper.querySelector('.scroll-left');
  const rightBtn = wrapper.querySelector('.scroll-right');

  leftBtn.addEventListener('click', () => {
    container.scrollBy({ left: -250, behavior: 'smooth' });
  });

  rightBtn.addEventListener('click', () => {
    container.scrollBy({ left: 250, behavior: 'smooth' });
  });
});

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('estacionamientoModal');
  modal.addEventListener('show.bs.modal', () => {
    const tbody = document.querySelector('#tabla-estacionamientos tbody');
    const loader = document.getElementById('tabla-loading');
    tbody.innerHTML = '';
    loader.style.display = 'block';

    fetch("https://docs.google.com/spreadsheets/d/1T32oH5vm0p9BGYICw8pe4tu_Q1FYzcoDm778ClFXyFY/gviz/tq?tqx=out:json&tq&gid=0")
      .then(res => res.text())
      .then(text => {
        const json = JSON.parse(text.substring(47).slice(0, -2));
        const rows = json.table.rows;

        console.log(text)

        for (const row of rows) {
          const c = row.c;
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${c[0]?.v || ''}<br>${c[1]?.v || ''}</td>
            <td>${c[2]?.v || ''} cuadras</td>
            <td>$ ${c[3]?.v || ''}</td>
            <td>
            <button class="btn btn-sm btn-outline-primary" onclick="abrirMapa('${c[5]?.v || ''}','${c[0]?.v || ''}')">
  <i class="bi bi-geo-alt-fill"></i> Ver en mapa
</button>
           
          `;
          tbody.appendChild(tr);
        }

        loader.style.display = 'none';
      })
      .catch(err => {
        loader.innerHTML = "Error al cargar los datos.";
        console.error("Error fetching estacionamientos:", err);
      });
  });
});

function abrirMapa(rawCoords, nombre = '') {
  // Clean up coordinates
  const [lat, lng] = rawCoords.trim().split(/\s*,\s*/);
  if (!lat || !lng) {
    alert('Coordenadas no válidas');
    return;
  }

  // Sanitize label
  const label = encodeURIComponent(nombre.trim());

  const geoUri = `geo:${lat},${lng}?q=${lat},${lng}(${label})`; // for Android
  const gmapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}(${label})`;

  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (isMobile) {
    window.location.href = geoUri;

    setTimeout(() => {
      window.open(gmapsUrl, '_blank');
    }, 800);
  } else {
    window.open(gmapsUrl, '_blank');
  }
}


