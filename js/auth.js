// js/auth.js
async function checkUserStatus() {
    try {
        const { data: { user }, error } = await window.supabaseClient.auth.getUser();
        if (user && !error) {
            updateNavbarWithUser(user);
            if(typeof initGlobalInviteSystem === "function") initGlobalInviteSystem(user.id);
        }
    } catch (err) { console.error("Auth hatası:", err); }
}

async function updateNavbarWithUser(user) {
    const authAction = document.getElementById('authAction');
    if (!authAction) return;

    const { data: profileData } = await window.supabaseClient.from('profiles').select('username, role').eq('id', user.id).maybeSingle();
    const username = profileData?.username || user.user_metadata?.username || "OYUNCU";
    const isAdmin = profileData?.role === 'admin';

    let adminLinkHTML = isAdmin ? `<a href="admin.html" style="color: var(--neon-mor); font-weight: 900; border-bottom: 1px solid #222; margin-bottom: 5px;"><i class="fas fa-shield-alt"></i> YÖNETİM PANELİ</a>` : '';

    authAction.innerHTML = `
        <div class="user-dropdown">
            <button class="dropdown-trigger">
                <i class="fas fa-user"></i>
                <span class="user-name-text">${username.toUpperCase()}</span>
                <i class="fas fa-chevron-down arrow-icon"></i>
            </button>
            <div class="dropdown-content">
                ${adminLinkHTML}
                <a href="profil.html"><i class="fas fa-user-circle"></i> Profil</a>
                <a href="my-tournaments.html"><i class="fas fa-trophy"></i> Turnuvalarım</a>
                <a href="#" onclick="handleLogoutGlobal(); return false;" class="logout-link"><i class="fas fa-sign-out-alt"></i> Çıkış</a>
            </div>
        </div>`;
}

window.handleLogoutGlobal = async function() {
    await window.supabaseClient.auth.signOut();
    window.location.reload(); 
}