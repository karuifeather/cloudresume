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

// View Counter
document.addEventListener('DOMContentLoaded', async () => {
  const apiUrl =
    'https://i55go67nkd.execute-api.us-east-1.amazonaws.com/prod/visitor';
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    // Update the total visitor count badge
    document.getElementById('visitorCounter').textContent = data.visitor_count;

    // Update the popup with the top countries
    const countryListContainer = document.getElementById('countryList');
    countryListContainer.innerHTML = ''; // Clear any previous entries
    data.countries.forEach((country) => {
      // For flag images, we’ll use a free flag CDN (country codes are assumed to be 2-letter ISO codes)
      const lowerCode = country.country.toLowerCase();
      const flagUrl = `https://flagcdn.com/24x18/${lowerCode}.png`;

      const countryRow = document.createElement('div');
      countryRow.className = 'flex items-center space-x-2';
      countryRow.innerHTML = `
        <img src="${flagUrl}" alt="${country.country} Flag" class="w-6 h-auto">
        <span class="text-sm text-gray-800 dark:text-gray-100">${country.count}</span>
      `;
      countryListContainer.appendChild(countryRow);
    });
  } catch (error) {
    console.error('Error fetching visitor data:', error);
  }
});
