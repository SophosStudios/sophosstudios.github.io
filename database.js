const dbName = 'SophosProjects';
const storeName = 'projects';
let db;

function initDB() {
  const request = indexedDB.open(dbName, 1);
  request.onerror = () => console.error('Database failed to open');
  request.onsuccess = () => {
    db = request.result;
    displayProjects();
  };
  request.onupgradeneeded = e => {
    db = e.target.result;
    db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
  };
}

function saveProject(title, description, code) {
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  store.add({ title, description, code });
  tx.oncomplete = displayProjects;
}

function getAllProjects(callback) {
  const tx = db.transaction(storeName, 'readonly');
  const store = tx.objectStore(storeName);
  const request = store.getAll();
  request.onsuccess = () => callback(request.result);
}
