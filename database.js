let db;
const request = indexedDB.open('SophosDB', 1);

request.onupgradeneeded = e => {
  db = e.target.result;
  db.createObjectStore('users', { keyPath: 'username' });
  db.createObjectStore('projects', { keyPath: 'id', autoIncrement: true });
};
request.onsuccess = () => {
  db = request.result;
  if (localStorage.getItem('user')) showDashboard();
};
