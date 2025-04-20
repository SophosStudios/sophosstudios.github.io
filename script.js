const projects = [
  {
    name: "Z-Coin System",
    description: "Virtual economy system with daily rewards and balance tracking.",
    link: "#"
  },
  {
    name: "Flashlight Script",
    description: "Roblox first-person horror flashlight script for immersive gameplay.",
    link: "#"
  },
  {
    name: "Voice Channel Logger",
    description: "Discord bot that logs voice state updates with duration tracking.",
    link: "#"
  }
];

// Terminal-style intro
const introLines = [
  "Sophos Studios OS v1.0.0",
  "Booting up your portfolio...",
  "Loading projects...",
  "Welcome back, Sophos 👋"
];

let lineIndex = 0;
let charIndex = 0;

function typeIntro() {
  const terminal = document.getElementById("terminal-text");

  if (lineIndex < introLines.length) {
    const line = introLines[lineIndex];
    terminal.textContent += line[charIndex++] || "";

    if (charIndex < line.length) {
      setTimeout(typeIntro, 50);
    } else {
      terminal.textContent += "\n";
      lineIndex++;
      charIndex = 0;
      setTimeout(typeIntro, 500);
    }
  } else {
    // After intro, show main content
    setTimeout(() => {
      document.getElementById("terminal").style.display = "none";
      document.getElementById("main-content").style.display = "block";
    }, 1000);
  }
}

typeIntro();

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

// Render Projects
function renderProjects(filter = "") {
  const container = document.getElementById("projects");
  container.innerHTML = "";

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(filter.toLowerCase())
  );

  filtered.forEach(proj => {
    const el = document.createElement("div");
    el.className = "project";
    el.innerHTML = `
      <h2>${proj.name}</h2>
      <p>${proj.description}</p>
      <button onclick="location.href='${proj.link}'">View Project</button>
    `;
    container.appendChild(el);
  });
}

document.getElementById("search").addEventListener("input", (e) => {
  renderProjects(e.target.value);
});

renderProjects();
