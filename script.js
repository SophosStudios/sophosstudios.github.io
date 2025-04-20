// Theme Toggle
const toggle = document.getElementById("theme-toggle");
const userTheme = localStorage.getItem("theme");

if (userTheme === "light") {
  document.body.classList.add("light");
  toggle.textContent = "🌞";
}

toggle.addEventListener("click", () => {
  document.body.classList.toggle("light");
  const isLight = document.body.classList.contains("light");
  localStorage.setItem("theme", isLight ? "light" : "dark");
  toggle.textContent = isLight ? "🌞" : "🌙";
});

// Projects logic
let allProjects = [];

async function loadProjects() {
  try {
    const res = await fetch("./data/projects.json");
    allProjects = await res.json();
    renderProjects();
  } catch (error) {
    console.error("Failed to fetch projects.json", error);
  }
}

function renderProjects(filter = "") {
  const container = document.getElementById("projects");
  container.innerHTML = "";

  const filtered = allProjects.filter(p =>
    p.name.toLowerCase().includes(filter.toLowerCase())
  );

  filtered.forEach(proj => {
    const el = document.createElement("div");
    el.className = "project";
    el.innerHTML = `
      <div style="display: flex; align-items: center; gap: 1rem;">
        <img src="${proj.gif}" alt="${proj.name} gif" class="gif-icon" />
        <div>
          <h2>${proj.name}</h2>
          <p>${proj.description}</p>
          <button onclick="location.href='${proj.link}'">View Project</button>
        </div>
      </div>
    `;
    container.appendChild(el);
  });
}

// DOMContentLoaded init
window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("search").addEventListener("input", (e) => {
    renderProjects(e.target.value);
  });

  loadProjects(); // Load projects from JSON
});
