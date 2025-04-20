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
  