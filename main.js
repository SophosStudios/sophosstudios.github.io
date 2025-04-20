initDB();

const modal = document.getElementById('project-modal');
const addBtn = document.getElementById('add-project-btn');
const cancelBtn = document.getElementById('cancel-project');
const saveBtn = document.getElementById('save-project');

addBtn.addEventListener('click', () => modal.classList.remove('hidden'));
cancelBtn.addEventListener('click', () => modal.classList.add('hidden'));

saveBtn.addEventListener('click', () => {
  const title = document.getElementById('project-title').value;
  const desc = document.getElementById('project-desc').value;
  const code = document.getElementById('project-code').value;
  if (title && desc) {
    saveProject(title, desc, code);
    modal.classList.add('hidden');
    document.getElementById('project-title').value = '';
    document.getElementById('project-desc').value = '';
    document.getElementById('project-code').value = '';
  }
});

function displayProjects() {
  getAllProjects(projects => {
    const container = document.getElementById('projects');
    container.innerHTML = '';
    projects.forEach(p => {
      const div = document.createElement('div');
      div.className = 'project-card';
      div.innerHTML = `<h3>${p.title}</h3><p>${p.description}</p><pre>${p.code || ''}</pre>`;
      container.appendChild(div);
    });
  });
}
