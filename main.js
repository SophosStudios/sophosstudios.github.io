const modal = document.getElementById('project-modal');
const projectTitle = document.getElementById('project-title');
const projectDesc = document.getElementById('project-desc');
const projectCode = document.getElementById('project-code');
let editingProjectId = null;

document.getElementById('add-project-btn').onclick = () => {
  modal.classList.remove('hidden');
  editingProjectId = null;
  projectTitle.value = '';
  projectDesc.value = '';
  projectCode.value = '';
};

document.getElementById('cancel-project').onclick = () => {
  modal.classList.add('hidden');
};

document.getElementById('save-project').onclick = () => {
  const user = localStorage.getItem('user');
  const tx = db.transaction('projects', 'readwrite');
  const store = tx.objectStore('projects');
  const project = {
    title: projectTitle.value,
    description: projectDesc.value,
    code: projectCode.value,
    owner: user,
    id: editingProjectId || undefined,
  };
  store.put(project);
  tx.oncomplete = () => {
    modal.classList.add('hidden');
    loadProjects();
  };
};

function showDashboard() {
  document.getElementById('auth').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
  loadProjects();
}

function loadProjects() {
  const user = localStorage.getItem('user');
  const tx = db.transaction('projects', 'readonly');
  const store = tx.objectStore('projects');
  const req = store.getAll();
  req.onsuccess = () => {
    const projects = req.result.filter(p => p.owner === user);
    const container = document.getElementById('projects');
    container.innerHTML = '';
    projects.forEach(p => {
      const div = document.createElement('div');
      div.className = 'project-card';
      div.innerHTML = `
        <h3>${p.title}</h3>
        <p>${p.description}</p>
        <pre>${p.code}</pre>
        <button onclick="editProject(${p.id})">✏️ Edit</button>
        <button onclick="deleteProject(${p.id})">🗑️ Delete</button>
      `;
      container.appendChild(div);
    });
  };
}

function editProject(id) {
  const tx = db.transaction('projects', 'readonly');
  const store = tx.objectStore('projects');
  const req = store.get(id);
  req.onsuccess = () => {
    const p = req.result;
    editingProjectId = p.id;
    projectTitle.value = p.title;
    projectDesc.value = p.description;
    projectCode.value = p.code;
    modal.classList.remove('hidden');
  };
}

function deleteProject(id) {
  const tx = db.transaction('projects', 'readwrite');
  const store = tx.objectStore('projects');
  store.delete(id);
  tx.oncomplete = loadProjects;
}
