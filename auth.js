document.getElementById('signin').addEventListener('click', () => {
    const user = username.value.trim();
    const pass = password.value.trim();
    const tx = db.transaction('users', 'readonly');
    const store = tx.objectStore('users');
    const req = store.get(user);
    req.onsuccess = () => {
      if (req.result && req.result.password === pass) {
        localStorage.setItem('user', user);
        showDashboard();
      } else {
        alert('Invalid login');
      }
    };
  });
  
  document.getElementById('signup').addEventListener('click', () => {
    const user = username.value.trim();
    const pass = password.value.trim();
    const tx = db.transaction('users', 'readwrite');
    const store = tx.objectStore('users');
    const req = store.get(user);
    req.onsuccess = () => {
      if (req.result) return alert('Username taken');
      store.put({ username: user, password: pass });
      alert('Account created!');
    };
  });
  