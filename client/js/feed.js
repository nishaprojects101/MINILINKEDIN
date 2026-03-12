// ── Feed Page Logic ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const user = getCurrentUser();
  if (!user) { window.location.href = '/'; return; }

  const uid = user.firebaseUID;
  let selectedFile = null;

  // ── Populate user info in UI ─────────────────────────────────────
  async function loadUserInfo() {
    try {
      const res = await fetch(`${API}/api/users/${uid}`);
      const u = await res.json();
      if (u._id) setCurrentUser({ ...u, firebaseUID: uid });

      const av = avatarUrl(u.profileImage, u.name);
      document.getElementById('navAvatar').src = av;
      document.getElementById('sidebarAvatar').src = av;
      document.getElementById('createPostAvatar').src = av;
      document.getElementById('modalAvatar').src = av;
      document.getElementById('sidebarName').textContent = u.name || 'User';
      document.getElementById('sidebarHeadline').textContent = u.headline || 'New member';
      document.getElementById('modalName').textContent = u.name;
      document.getElementById('modalHeadline').textContent = u.headline || 'Member';
    } catch (e) { console.error('loadUserInfo', e); }
  }

  // ── Load Posts ───────────────────────────────────────────────────
  async function loadPosts() {
    const container = document.getElementById('feedPosts');
    try {
      const res = await fetch(`${API}/api/posts`);
      const posts = await res.json();
      if (!posts.length) {
        container.innerHTML = `<div class="card p-8 text-center"><p class="text-gray-400 text-sm">No posts yet. Be the first to share something!</p></div>`;
        return;
      }
      container.innerHTML = posts.map(postHTML).join('');
    } catch (e) {
      container.innerHTML = `<div class="card p-8 text-center text-red-400 text-sm">Failed to load posts</div>`;
    }
  }

  function postHTML(post) {
    const author = post.author || {};
    const av = avatarUrl(author.profileImage, author.name);
    const liked = post.likes?.some(id => {
      const cu = getCurrentUser();
      return cu && id === cu._id;
    });
    const likeCount = post.likes?.length || 0;
    const commentCount = post.comments?.length || 0;

    const commentsHtml = (post.comments || []).slice(-3).map(c => {
      const cu = c.user || {};
      return `<div class="flex gap-2 py-2">
        <img src="${avatarUrl(cu.profileImage, cu.name)}" class="w-8 h-8 rounded-full object-cover flex-shrink-0"/>
        <div class="bg-gray-50 rounded-xl px-3 py-2 flex-1">
          <p class="text-xs font-semibold text-gray-800">${escapeHtml(cu.name || 'User')}</p>
          <p class="text-xs text-gray-600 mt-0.5">${escapeHtml(c.text)}</p>
          <p class="text-[10px] text-gray-400 mt-1">${timeAgo(c.createdAt)}</p>
        </div>
      </div>`;
    }).join('');

    const skillBadges = (post.detectedSkills || []).map(s =>
      `<span class="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-medium">${escapeHtml(s)}</span>`
    ).join('');

    return `<div class="card card-hover fade-in" data-post-id="${post._id}">
      <div class="p-4">
        <div class="flex items-start gap-3">
          <a href="/profile.html?uid=${author.firebaseUID || ''}"><img src="${av}" class="w-12 h-12 rounded-full object-cover border border-gray-200 flex-shrink-0"/></a>
          <div class="flex-1 min-w-0">
            <a href="/profile.html?uid=${author.firebaseUID || ''}" class="font-semibold text-gray-800 text-sm hover:underline hover:text-linkedin-500">${escapeHtml(author.name || 'User')}</a>
            <p class="text-xs text-gray-500 truncate">${escapeHtml(author.headline || '')}</p>
            <p class="text-[11px] text-gray-400">${timeAgo(post.createdAt)}</p>
          </div>
        </div>
        <p class="mt-3 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">${escapeHtml(post.caption)}</p>
        ${skillBadges ? `<div class="flex flex-wrap gap-1 mt-2">${skillBadges}</div>` : ''}
      </div>
      ${post.image ? `<img src="${post.image}" class="w-full max-h-96 object-cover"/>` : ''}
      <div class="px-4 py-2 border-t border-gray-100">
        <div class="flex items-center justify-between text-xs text-gray-500">
          <span>${likeCount} like${likeCount !== 1 ? 's' : ''}</span>
          <span>${commentCount} comment${commentCount !== 1 ? 's' : ''}</span>
        </div>
      </div>
      <div class="px-4 py-1 border-t border-gray-100 flex">
        <button onclick="toggleLike('${post._id}')" class="like-btn flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg hover:bg-gray-50 text-sm transition-colors ${liked ? 'liked text-linkedin-500' : 'text-gray-500'}">
          <svg class="w-5 h-5" fill="${liked?'currentColor':'none'}" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 9V5a3 3 0 00-6 0v4H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2h-5z"/></svg>
          Like
        </button>
        <button onclick="toggleComments('${post._id}')" class="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg hover:bg-gray-50 text-sm text-gray-500 transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          Comment
        </button>
      </div>
      <!-- Comments Section -->
      <div class="comments-section hidden px-4 pb-3 border-t border-gray-50">
        ${commentsHtml}
        <div class="flex gap-2 mt-2">
          <img src="${avatarUrl(getCurrentUser()?.profileImage, getCurrentUser()?.name)}" class="w-8 h-8 rounded-full object-cover flex-shrink-0"/>
          <div class="flex-1 flex items-center bg-gray-50 rounded-full px-3">
            <input type="text" placeholder="Add a comment..." class="comment-input flex-1 bg-transparent text-sm outline-none py-2" onkeydown="if(event.key==='Enter')addComment('${post._id}',this)"/>
            <button onclick="addComment('${post._id}',this.previousElementSibling)" class="text-linkedin-500 text-xs font-semibold hover:text-linkedin-700 ml-2">Post</button>
          </div>
        </div>
      </div>
    </div>`;
  }

  // ── Like / Comment globals ───────────────────────────────────────
  window.toggleLike = async (postId) => {
    try {
      const res = await fetch(`${API}/api/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userUID: uid }),
      });
      await res.json();
      loadPosts();
    } catch (e) { console.error(e); }
  };

  window.toggleComments = (postId) => {
    const card = document.querySelector(`[data-post-id="${postId}"]`);
    const sec = card?.querySelector('.comments-section');
    if (sec) sec.classList.toggle('hidden');
  };

  window.addComment = async (postId, input) => {
    const text = input?.value?.trim();
    if (!text) return;
    input.value = '';
    try {
      await fetch(`${API}/api/posts/${postId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userUID: uid, text }),
      });
      loadPosts();
    } catch (e) { console.error(e); }
  };

  // ── Create Post Modal ───────────────────────────────────────────
  const modal = document.getElementById('createPostModal');
  const captionInput = document.getElementById('postCaption');
  const submitBtn = document.getElementById('submitPost');

  document.getElementById('openCreatePost')?.addEventListener('click', () => modal.classList.remove('hidden'));
  document.getElementById('openCreatePostPhoto')?.addEventListener('click', () => { modal.classList.remove('hidden'); document.getElementById('postImage').click(); });
  document.getElementById('closeModal')?.addEventListener('click', () => modal.classList.add('hidden'));
  document.getElementById('modalOverlay')?.addEventListener('click', () => modal.classList.add('hidden'));

  captionInput?.addEventListener('input', () => {
    submitBtn.disabled = !captionInput.value.trim();
  });

  // Image handling
  document.getElementById('postImage')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    selectedFile = file;
    const reader = new FileReader();
    reader.onload = (ev) => {
      document.getElementById('previewImg').src = ev.target.result;
      document.getElementById('imagePreview').classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('removeImage')?.addEventListener('click', () => {
    selectedFile = null;
    document.getElementById('imagePreview').classList.add('hidden');
    document.getElementById('postImage').value = '';
  });

  // AI Caption Enhance
  document.getElementById('enhanceCaptionBtn')?.addEventListener('click', async () => {
    const caption = captionInput.value.trim();
    if (!caption) return;
    const btn = document.getElementById('enhanceCaptionBtn');
    btn.innerHTML = '<svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg> Enhancing...';
    try {
      const res = await fetch(`${API}/api/ai/enhance-caption`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption }),
      });
      const data = await res.json();
      if (data.enhanced) {
        document.getElementById('enhancedCaption').textContent = data.enhanced;
        document.getElementById('aiCaptionSection').classList.remove('hidden');
      }
    } catch (e) { console.error(e); }
    btn.innerHTML = '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M7.5 5.6L10 7 8.6 4.5 10 2 7.5 3.4 5 2l1.4 2.5L5 7zm12 9.8L17 14l1.4 2.5L17 19l2.5-1.4L22 19l-1.4-2.5L22 14zM22 2l-2.5 1.4L17 2l1.4 2.5L17 7l2.5-1.4L22 7l-1.4-2.5zm-7.63 5.29a1 1 0 00-1.41 0L1.29 18.96a1 1 0 000 1.41l2.34 2.34a1 1 0 001.41 0L16.71 11.04a1 1 0 000-1.41l-2.34-2.34zM5.71 20.59L3.41 18.3 11 10.71l2.3 2.3-7.59 7.58z"/></svg> AI Enhance';
  });

  document.getElementById('useEnhanced')?.addEventListener('click', () => {
    captionInput.value = document.getElementById('enhancedCaption').textContent;
    document.getElementById('aiCaptionSection').classList.add('hidden');
    submitBtn.disabled = false;
  });

  document.getElementById('dismissEnhanced')?.addEventListener('click', () => {
    document.getElementById('aiCaptionSection').classList.add('hidden');
  });

  // Submit Post
  submitBtn?.addEventListener('click', async () => {
    const caption = captionInput.value.trim();
    if (!caption) return;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Posting...';

    const formData = new FormData();
    formData.append('caption', caption);
    formData.append('authorUID', uid);
    if (selectedFile) formData.append('image', selectedFile);

    try {
      await fetch(`${API}/api/posts`, { method: 'POST', body: formData });
      captionInput.value = '';
      selectedFile = null;
      document.getElementById('imagePreview').classList.add('hidden');
      document.getElementById('postImage').value = '';
      modal.classList.add('hidden');
      loadPosts();
    } catch (e) { console.error(e); }
    submitBtn.disabled = false;
    submitBtn.textContent = 'Post';
  });

  // ── Notifications ───────────────────────────────────────────────
  const notifBtn = document.getElementById('notifBtn');
  const notifDropdown = document.getElementById('notifDropdown');
  const notifBadge = document.getElementById('notifBadge');

  notifBtn?.addEventListener('click', () => notifDropdown.classList.toggle('show'));
  document.addEventListener('click', (e) => {
    if (!notifBtn?.contains(e.target) && !notifDropdown?.contains(e.target)) {
      notifDropdown?.classList.remove('show');
    }
  });

  async function loadNotifications() {
    try {
      const res = await fetch(`${API}/api/notifications/${uid}`);
      const notifs = await res.json();
      const unread = notifs.filter(n => !n.read).length;
      if (unread > 0) {
        notifBadge.textContent = unread > 9 ? '9+' : unread;
        notifBadge.classList.remove('hidden');
      } else {
        notifBadge.classList.add('hidden');
      }
      const list = document.getElementById('notifList');
      if (!notifs.length) {
        list.innerHTML = '<div class="p-4 text-center text-gray-400 text-sm">No notifications</div>';
        return;
      }
      list.innerHTML = notifs.map(n => {
        const ru = n.relatedUser || {};
        return `<div class="p-3 flex gap-3 hover:bg-gray-50 transition-colors ${n.read?'':'bg-blue-50/50'}" onclick="markRead('${n._id}',this)">
          <img src="${avatarUrl(ru.profileImage, ru.name)}" class="w-10 h-10 rounded-full object-cover flex-shrink-0"/>
          <div class="flex-1 min-w-0">
            <p class="text-xs text-gray-700 leading-relaxed">${escapeHtml(n.message)}</p>
            <p class="text-[10px] text-gray-400 mt-1">${timeAgo(n.createdAt)}</p>
          </div>
        </div>`;
      }).join('');
    } catch (e) { console.error(e); }
  }

  window.markRead = async (id, el) => {
    try {
      await fetch(`${API}/api/notifications/read/${id}`, { method: 'PUT' });
      el?.classList.remove('bg-blue-50/50');
      loadNotifications();
    } catch (e) { console.error(e); }
  };

  // ── Suggested people ────────────────────────────────────────────
  async function loadSuggested() {
    try {
      const res = await fetch(`${API}/api/users`);
      const users = await res.json();
      const others = users.filter(u => u.firebaseUID !== uid).slice(0, 5);
      const container = document.getElementById('suggestedPeople');
      if (!others.length) {
        container.innerHTML = '<p class="text-xs text-gray-400">No suggestions yet</p>';
        return;
      }
      container.innerHTML = others.map(u => `
        <a href="/profile.html?uid=${u.firebaseUID}" class="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors">
          <img src="${avatarUrl(u.profileImage, u.name)}" class="w-10 h-10 rounded-full object-cover"/>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-gray-800 truncate">${escapeHtml(u.name)}</p>
            <p class="text-xs text-gray-500 truncate">${escapeHtml(u.headline || '')}</p>
          </div>
        </a>
      `).join('');
    } catch (e) { console.error(e); }
  }

  // ── Logout ──────────────────────────────────────────────────────
  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    try { await auth.signOut(); } catch (e) {}
    clearCurrentUser();
    window.location.href = '/';
  });

  // ── Init ────────────────────────────────────────────────────────
  loadUserInfo();
  loadPosts();
  loadNotifications();
  loadSuggested();
  // Refresh notifications every 30s
  setInterval(loadNotifications, 30000);
});
