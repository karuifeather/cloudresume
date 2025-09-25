function toggleDarkMode() {
  const htmlEl = document.documentElement;
  htmlEl.classList.toggle("dark");
  const darkModeIcon = document.getElementById("darkModeIcon");

  if (htmlEl.classList.contains("dark")) {
    darkModeIcon.classList.replace("fa-moon", "fa-sun");
    localStorage.setItem("theme", "dark");
  } else {
    darkModeIcon.classList.replace("fa-sun", "fa-moon");
    localStorage.setItem("theme", "light");
  }
}

// Expose the function for inline use
window.toggleDarkMode = toggleDarkMode;

// Initialize everything on page load
document.addEventListener("DOMContentLoaded", async () => {
  // Initialize dark mode
  if (localStorage.getItem("theme") === "dark") {
    document.documentElement.classList.add("dark");
    document
      .getElementById("darkModeIcon")
      .classList.replace("fa-moon", "fa-sun");
  }

  // Fetch visitor data
  const visitorCounterBadge = document.getElementById("visitorCounterBadge");
  const apiUrl = "https://d2m530ny36pyb5.cloudfront.net/visitor";

  try {
    const response = await fetch(apiUrl);
    let data = await response.json();

    // Update the total visitor count badge
    if (visitorCounterBadge) {
      visitorCounterBadge.querySelector("#visitorCounter").textContent =
        data.visitor_count;
    }
  } catch (error) {
    console.error("Error fetching visitor data:", error);
  }
});
