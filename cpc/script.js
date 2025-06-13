document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => {
  new bootstrap.Tooltip(el);
});

const toggleButton = document.getElementById('modeToggle');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const storedMode = localStorage.getItem('dark-mode');
const shouldEnableDark = storedMode === 'true' || (storedMode === null && prefersDark);

if (shouldEnableDark) {
  document.body.classList.add('dark-mode');
  toggleButton.innerHTML = '<i class="material-symbols-outlined">light_mode</i>';
}

toggleButton.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  toggleButton.innerHTML = isDark
    ? '<i class="material-symbols-outlined">light_mode</i>'
    : '<i class="material-symbols-outlined">dark_mode</i>';
  localStorage.setItem('dark-mode', isDark);
});
