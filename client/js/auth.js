// ── Auth Page Logic ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const showSignup = document.getElementById('showSignup');
  const showLogin = document.getElementById('showLogin');
  const loginPanel = document.getElementById('loginPanel');
  const signupPanel = document.getElementById('signupPanel');
  const errorMsg = document.getElementById('errorMsg');

  // Toggle forms
  showSignup?.addEventListener('click', (e) => {
    e.preventDefault();
    loginPanel.classList.add('hidden');
    signupPanel.classList.remove('hidden');
    errorMsg.textContent = '';
  });

  showLogin?.addEventListener('click', (e) => {
    e.preventDefault();
    signupPanel.classList.add('hidden');
    loginPanel.classList.remove('hidden');
    errorMsg.textContent = '';
  });

  function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.classList.remove('hidden');
    setTimeout(() => errorMsg.classList.add('hidden'), 5000);
  }

  // Sign up
  signupForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const btn = signupForm.querySelector('button[type="submit"]');

    if (!name || !email || !password) return showError('All fields are required');
    if (password.length < 6) return showError('Password must be at least 6 characters');

    btn.disabled = true;
    btn.innerHTML = '<svg class="animate-spin h-5 w-5 mx-auto" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>';

    try {
      const cred = await auth.createUserWithEmailAndPassword(email, password);
      // Create user in MongoDB
      const res = await fetch(`${API}/api/users/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firebaseUID: cred.user.uid, name, email }),
      });
      const userData = await res.json();
      setCurrentUser({ ...userData, firebaseUID: cred.user.uid });
      window.location.href = '/feed.html';
    } catch (err) {
      showError(err.message);
      btn.disabled = false;
      btn.textContent = 'Create Account';
    }
  });

  // Log in
  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const btn = loginForm.querySelector('button[type="submit"]');

    if (!email || !password) return showError('Please enter email and password');

    btn.disabled = true;
    btn.innerHTML = '<svg class="animate-spin h-5 w-5 mx-auto" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>';

    try {
      const cred = await auth.signInWithEmailAndPassword(email, password);
      const res = await fetch(`${API}/api/users/${cred.user.uid}`);
      const userData = await res.json();
      setCurrentUser({ ...userData, firebaseUID: cred.user.uid });
      window.location.href = '/feed.html';
    } catch (err) {
      showError(err.message);
      btn.disabled = false;
      btn.textContent = 'Sign In';
    }
  });

  // If already logged in, redirect
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      const u = getCurrentUser();
      if (u) {
        window.location.href = '/feed.html';
      }
    }
  });
});
