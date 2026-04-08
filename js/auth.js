
function updateBellVisibility(isLoggedIn) {
    let styleEl = document.getElementById('bell-visibility-style');
    if (!isLoggedIn) {
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'bell-visibility-style';
            styleEl.innerHTML = '.floating-bell, .nav-bell { display: none !important; }';
            document.head.appendChild(styleEl);
        }
    } else {
        if (styleEl) {
            styleEl.remove();
        }
    }
}

function renderCachedHeader() {
    const authAction = document.getElementById('authAction');
    const cachedUser = localStorage.getItem('obb_user_cache');
    
    if (cachedUser) {
        updateBellVisibility(true); 
        
        if (!authAction) return;

        const user = JSON.parse(cachedUser);
        const adminLinkHTML = user.isAdmin ? `<a href="admin.html" style="color: var(--neon-mor); font-weight: 900; border-bottom: 1px solid #222; margin-bottom: 5px;"><i class="fas fa-shield-alt"></i> YÖNETİM PANELİ</a>` : '';

        authAction.innerHTML = `
            <div class="user-dropdown">
                <button class="dropdown-trigger">
                    <i class="fas fa-user"></i>
                    <span class="user-name-text">${user.username.toUpperCase()}</span>
                    <i class="fas fa-chevron-down arrow-icon"></i>
                </button>
                <div class="dropdown-content">
                    ${adminLinkHTML}
                    <a href="profil.html"><i class="fas fa-user-circle"></i> Profil</a>
                    <a href="turnuvalarim.html"><i class="fas fa-trophy"></i> Turnuvalarım</a>
                    <a href="#" onclick="handleLogoutGlobal(); return false;" class="logout-link"><i class="fas fa-sign-out-alt"></i> Çıkış</a>
                </div>
            </div>`;
    } else {
        updateBellVisibility(false); 

        if (!authAction) return;

        authAction.innerHTML = `<a href="kayit.html" class="nav-btn">KAYIT / GİRİŞ</a>`;
    }
    
    if (authAction) authAction.style.opacity = "1"; 
}

async function checkUserStatus() {
    renderCachedHeader(); 

    try {
        const { data: { user }, error } = await window.supabaseClient.auth.getUser();
        
        if (user && !error) {
            updateNavbarWithUser(user);
            if(typeof initGlobalInviteSystem === "function") initGlobalInviteSystem(user.id);
        } else {
            localStorage.removeItem('obb_user_cache');
            renderCachedHeader();
        }
    } catch (err) { console.error("Auth hatası:", err); }
}

async function updateNavbarWithUser(user) {
    updateBellVisibility(true); 
    const authAction = document.getElementById('authAction');
    if (!authAction) return;

    const { data: profileData } = await window.supabaseClient.from('profiles').select('username, role').eq('id', user.id).maybeSingle();
    
    const username = profileData?.username || user.user_metadata?.username || "OYUNCU";
    const isAdmin = profileData?.role === 'admin';

    localStorage.setItem('obb_user_cache', JSON.stringify({
        username: username,
        isAdmin: isAdmin
    }));

    const adminLinkHTML = isAdmin ? `<a href="admin.html" style="color: var(--neon-mor); font-weight: 900; border-bottom: 1px solid #222; margin-bottom: 5px;"><i class="fas fa-shield-alt"></i> YÖNETİM PANELİ</a>` : '';

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
                <a href="turnuvalarim.html"><i class="fas fa-trophy"></i> Turnuvalarım</a>
                <a href="#" onclick="handleLogoutGlobal(); return false;" class="logout-link"><i class="fas fa-sign-out-alt"></i> Çıkış</a>
            </div>
        </div>`;
}

window.handleLogoutGlobal = async function() {
    localStorage.removeItem('obb_user_cache');
    await window.supabaseClient.auth.signOut();
    window.location.reload(); 
}


async function requireAdminAccess() {
    try {
        if (!window.supabaseClient) throw new Error("Supabase bağlantısı yok.");
        
        const { data: { user }, error: authError } = await window.supabaseClient.auth.getUser();
        if (authError || !user) throw new Error("Kullanıcı girişi yok.");

        const { data: profile, error: profileError } = await window.supabaseClient
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError || profile.role !== 'admin') throw new Error("Admin yetkisi yok.");

        document.documentElement.style.visibility = 'visible';
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) loadingScreen.style.display = 'none';

        return true; 
        
    } catch (err) {
        console.error("Güvenlik Engeli:", err.message);
        window.location.replace("index.html");
        return false;
    }
}
