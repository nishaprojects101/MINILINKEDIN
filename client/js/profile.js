// ── Profile Page Logic ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const me = getCurrentUser();
  if (!me) { window.location.href = '/'; return; }

  const myUID = me.firebaseUID;
  const params = new URLSearchParams(window.location.search);
  const viewUID = params.get('uid') || myUID;
  const isOwner = viewUID === myUID;

  let profileData = null;

  // ── Load Profile ────────────────────────────────────────────────
  async function loadProfile() {
    try {
      const res = await fetch(`${API}/api/users/${viewUID}`);
      const user = await res.json();
      if (user.error) { document.getElementById('profileName').textContent = 'User not found'; return; }
      profileData = user;

      const av = avatarUrl(user.profileImage, user.name);
      document.getElementById('profileAvatar').src = av;
      document.getElementById('profileName').textContent = user.name || 'User';
      document.getElementById('profileHeadline').textContent = user.headline || 'Mini LinkedIn member';
      document.getElementById('locationText').textContent = user.location || 'Not specified';
      document.getElementById('profileConnections').textContent = `${user.connections?.length || 0} connections`;
      document.getElementById('profileBio').textContent = user.bio || 'No bio yet. Click "Edit Profile" to add one!';

      // Skills
      const skillsContainer = document.getElementById('skillsList');
      if (user.skills?.length) {
        skillsContainer.innerHTML = user.skills.map(s =>
          `<span class="skill-tag inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-linkedin-50 text-linkedin-600 text-sm font-medium">
            ${escapeHtml(s)}
            ${isOwner ? `<button onclick="removeSkill('${escapeHtml(s)}')" class="ml-1 w-4 h-4 rounded-full hover:bg-linkedin-100 flex items-center justify-center text-linkedin-400 hover:text-linkedin-700 text-xs">×</button>` : ''}
          </span>`
        ).join('');
      } else {
        skillsContainer.innerHTML = '<p class="text-sm text-gray-400">No skills added yet.</p>';
      }

      // Owner-only controls
      if (isOwner) {
        document.getElementById('editProfileBtn')?.classList.remove('hidden');
        document.getElementById('editProfileBtn')?.classList.add('flex');
        document.getElementById('enhanceBioBtn')?.classList.remove('hidden');
        document.getElementById('enhanceBioBtn')?.classList.add('flex');
        document.getElementById('addSkillBtn')?.classList.remove('hidden');
        document.getElementById('avatarUploadLabel')?.classList.remove('hidden');
        document.getElementById('avatarUploadLabel')?.classList.add('flex');
      }

      // Load user's posts
      loadUserPosts();
      loadAlsoViewed();
    } catch (e) { console.error('loadProfile', e); }
  }

  // ── Load User Posts ─────────────────────────────────────────────
  async function loadUserPosts() {
    try {
      const res = await fetch(`${API}/api/posts`);
      const allPosts = await res.json();
      const userPosts = allPosts.filter(p => p.author?.firebaseUID === viewUID);
      const container = document.getElementById('userPosts');

      if (!userPosts.length) {
        container.innerHTML = '<p class="text-sm text-gray-400">No posts yet.</p>';
        return;
      }

      container.innerHTML = userPosts.map(p => `
        <div class="border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-all">
          <p class="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">${escapeHtml(p.caption)}</p>
          ${p.image ? `<img src="${p.image}" class="mt-3 rounded-lg max-h-48 object-cover w-full"/>` : ''}
          <div class="flex items-center gap-4 mt-3 text-xs text-gray-400">
            <span>${p.likes?.length || 0} likes</span>
            <span>${p.comments?.length || 0} comments</span>
            <span>${timeAgo(p.createdAt)}</span>
          </div>
          ${p.detectedSkills?.length ? `<div class="flex flex-wrap gap-1 mt-2">${p.detectedSkills.map(s => `<span class="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-medium">${escapeHtml(s)}</span>`).join('')}</div>` : ''}
        </div>
      `).join('');
    } catch (e) { console.error(e); }
  }

  // ── People Also Viewed ──────────────────────────────────────────
  async function loadAlsoViewed() {
    try {
      const res = await fetch(`${API}/api/users`);
      const users = await res.json();
      const others = users.filter(u => u.firebaseUID !== viewUID).slice(0, 4);
      const container = document.getElementById('alsoViewed');
      if (!others.length) { container.innerHTML = '<p class="text-xs text-gray-400">—</p>'; return; }
      container.innerHTML = others.map(u => `
        <a href="/profile.html?uid=${u.firebaseUID}" class="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors">
          <img src="${avatarUrl(u.profileImage, u.name)}" class="w-10 h-10 rounded-full object-cover"/>
          <div class="flex-1 min-w-0"><p class="text-sm font-semibold text-gray-800 truncate">${escapeHtml(u.name)}</p><p class="text-xs text-gray-500 truncate">${escapeHtml(u.headline || '')}</p></div>
        </a>
      `).join('');
    } catch (e) { console.error(e); }
  }

  // ── Edit Profile Modal ──────────────────────────────────────────
  const editModal = document.getElementById('editModal');

  document.getElementById('editProfileBtn')?.addEventListener('click', () => {
    if (!profileData) return;
    document.getElementById('editName').value = profileData.name || '';
    document.getElementById('editHeadline').value = profileData.headline || '';
    document.getElementById('editBio').value = profileData.bio || '';
    document.getElementById('editLocation').value = profileData.location || '';
    editModal.classList.remove('hidden');
  });

  document.getElementById('closeEdit')?.addEventListener('click', () => editModal.classList.add('hidden'));
  document.getElementById('editOverlay')?.addEventListener('click', () => editModal.classList.add('hidden'));

  document.getElementById('editForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    const formData = new FormData();
    formData.append('name', document.getElementById('editName').value);
    formData.append('headline', document.getElementById('editHeadline').value);
    formData.append('bio', document.getElementById('editBio').value);
    formData.append('location', document.getElementById('editLocation').value);
    if (profileData.skills) formData.append('skills', JSON.stringify(profileData.skills));

    try {
      const res = await fetch(`${API}/api/users/${myUID}`, { method: 'PUT', body: formData });
      const updated = await res.json();
      setCurrentUser({ ...updated, firebaseUID: myUID });
      editModal.classList.add('hidden');
      loadProfile();
    } catch (e) { console.error(e); }
    btn.disabled = false;
    btn.textContent = 'Save Changes';
  });

  // ── Avatar Upload ───────────────────────────────────────────────
  document.getElementById('avatarInput')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('profileImage', file);
    if (profileData?.skills) formData.append('skills', JSON.stringify(profileData.skills));

    try {
      document.getElementById('profileAvatar').style.opacity = '0.5';
      const res = await fetch(`${API}/api/users/${myUID}`, { method: 'PUT', body: formData });
      const updated = await res.json();
      setCurrentUser({ ...updated, firebaseUID: myUID });
      loadProfile();
    } catch (e) { console.error(e); }
    document.getElementById('profileAvatar').style.opacity = '1';
  });

  // ── Skills Management ───────────────────────────────────────────
  document.getElementById('addSkillBtn')?.addEventListener('click', () => {
    document.getElementById('addSkillInput').classList.toggle('hidden');
    document.getElementById('newSkillInput').focus();
  });

  document.getElementById('confirmAddSkill')?.addEventListener('click', addSkill);
  document.getElementById('newSkillInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addSkill(); }
  });

  async function addSkill() {
    const input = document.getElementById('newSkillInput');
    const skill = input.value.trim();
    if (!skill || !profileData) return;

    const skills = [...(profileData.skills || []), skill];
    input.value = '';

    const formData = new FormData();
    formData.append('skills', JSON.stringify(skills));

    try {
      const res = await fetch(`${API}/api/users/${myUID}`, { method: 'PUT', body: formData });
      const updated = await res.json();
      setCurrentUser({ ...updated, firebaseUID: myUID });
      loadProfile();
    } catch (e) { console.error(e); }
  }

  window.removeSkill = async (skill) => {
    if (!profileData) return;
    const skills = (profileData.skills || []).filter(s => s !== skill);

    const formData = new FormData();
    formData.append('skills', JSON.stringify(skills));

    try {
      const res = await fetch(`${API}/api/users/${myUID}`, { method: 'PUT', body: formData });
      const updated = await res.json();
      setCurrentUser({ ...updated, firebaseUID: myUID });
      loadProfile();
    } catch (e) { console.error(e); }
  };

  // ── AI Bio Enhancer ─────────────────────────────────────────────
  document.getElementById('enhanceBioBtn')?.addEventListener('click', async () => {
    const bio = profileData?.bio;
    if (!bio) return alert('Please add a bio first via Edit Profile.');

    const btn = document.getElementById('enhanceBioBtn');
    btn.innerHTML = '<svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg> Enhancing...';

    try {
      const res = await fetch(`${API}/api/ai/enhance-bio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio }),
      });
      const data = await res.json();
      if (data.enhanced) {
        document.getElementById('enhancedBioText').textContent = data.enhanced;
        document.getElementById('aiBioPreview').classList.remove('hidden');
      }
    } catch (e) { console.error(e); }

    btn.innerHTML = '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M7.5 5.6L10 7 8.6 4.5 10 2 7.5 3.4 5 2l1.4 2.5L5 7zm12 9.8L17 14l1.4 2.5L17 19l2.5-1.4L22 19l-1.4-2.5L22 14zM22 2l-2.5 1.4L17 2l1.4 2.5L17 7l2.5-1.4L22 7l-1.4-2.5z"/></svg> AI Enhance Bio';
  });

  document.getElementById('saveBio')?.addEventListener('click', async () => {
    const enhanced = document.getElementById('enhancedBioText').textContent;
    const formData = new FormData();
    formData.append('bio', enhanced);
    if (profileData?.skills) formData.append('skills', JSON.stringify(profileData.skills));

    try {
      const res = await fetch(`${API}/api/users/${myUID}`, { method: 'PUT', body: formData });
      const updated = await res.json();
      setCurrentUser({ ...updated, firebaseUID: myUID });
      document.getElementById('aiBioPreview').classList.add('hidden');
      loadProfile();
    } catch (e) { console.error(e); }
  });

  document.getElementById('dismissBio')?.addEventListener('click', () => {
    document.getElementById('aiBioPreview').classList.add('hidden');
  });

  // ── Logout ──────────────────────────────────────────────────────
  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    try { await auth.signOut(); } catch (e) {}
    clearCurrentUser();
    window.location.href = '/';
  });

  // ── Init ────────────────────────────────────────────────────────
  loadProfile();
});
