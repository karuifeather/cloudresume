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

// Fetch visitor data
document.addEventListener('DOMContentLoaded', async () => {
  const visitorCounterBadge = document.getElementById('visitorCounterBadge');
  const visitorCountryPopup = document.getElementById('visitorCountryPopup');

  // Function to hide the popup
  const hidePopup = () => {
    visitorCountryPopup.classList.remove('opacity-100', 'visible', 'scale-100');
    visitorCountryPopup.classList.add('opacity-0', 'invisible', 'scale-95');
  };

  // Toggle popup visibility on click
  visitorCounterBadge.addEventListener('click', (event) => {
    event.stopPropagation(); // Prevent the click from propagating to the document
    const isVisible = visitorCountryPopup.classList.contains('opacity-100');
    if (isVisible) {
      hidePopup();
    } else {
      visitorCountryPopup.classList.remove(
        'opacity-0',
        'invisible',
        'scale-95'
      );
      visitorCountryPopup.classList.add('opacity-100', 'visible', 'scale-100');
    }
  });

  // Hide the popup when clicking outside
  document.addEventListener('click', (event) => {
    if (
      !visitorCountryPopup.contains(event.target) &&
      !visitorCounterBadge.contains(event.target)
    ) {
      hidePopup();
    }
  });

  // Fetch visitor data
  const apiUrl =
    'https://i55go67nkd.execute-api.us-east-1.amazonaws.com/prod/visitor';
  try {
    const response = await fetch(apiUrl);
    let data = await response.json();

    // Update the total visitor count badge
    if (visitorCounterBadge) {
      visitorCounterBadge.querySelector('#visitorCounter').textContent =
        data.visitor_count;
    }

    // Update the popup with the top countries
    const countryListContainer = document.getElementById('countryList');

    if (countryListContainer) {
      countryListContainer.innerHTML = ''; // Clear previous entries
      data.countries.forEach((country) => {
        const lowerCode = country.country.toLowerCase().replace(' ', '-');
        const flagUrl = `https://flagcdn.com/24x18/${lowerCode}.png`;

        const countryRow = document.createElement('div');
        countryRow.className = 'flex items-center space-x-2 sm:space-x-3';

        countryRow.innerHTML = `
          <img src="${flagUrl}" alt="${country.country} Flag" class="w-5 sm:w-6 h-auto">
          <span class="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-100">
            ${country.count}
          </span>
        `;

        countryListContainer.appendChild(countryRow);
      });
    }
  } catch (error) {
    console.error('Error fetching visitor data:', error);
  }
});
