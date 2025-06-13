document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => {
  new bootstrap.Tooltip(el);
});

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
}, { threshold: 0.5 });

document.querySelectorAll('.snap-section').forEach(section => {
  observer.observe(section);
});


document.body.classList.add('js-enabled');
