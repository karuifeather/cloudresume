function toggleDarkMode() {
  const htmlEl = document.documentElement;
  htmlEl.classList.toggle('dark');
  const darkModeIcon = document.getElementById('darkModeIcon');

  if (htmlEl.classList.contains('dark')) {
    darkModeIcon.classList.replace('fa-moon', 'fa-sun');
    localStorage.setItem('theme', 'dark');
  } else {
    darkModeIcon.classList.replace('fa-sun', 'fa-moon');
    localStorage.setItem('theme', 'light');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('theme') === 'dark') {
    document.documentElement.classList.add('dark');
    document
      .getElementById('darkModeIcon')
      .classList.replace('fa-moon', 'fa-sun');
  }
});

// Expose the function for inline use
window.toggleDarkMode = toggleDarkMode;
