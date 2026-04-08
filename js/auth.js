// js/auth.js

function renderCachedHeader() {
    const authAction = document.getElementById('authAction');
    
    // Çan elementlerini HTML'den buluyoruz
    const mobileBell = document.querySelector('.floating-bell.mobile-only');
    const desktopBell = document.querySelector('.nav-bell.desktop-only');

    if (!authAction) return;

    const cachedUser = localStorage.getItem('obb_user_cache');
    
    if (cachedUser) {
        // KULLANICI GİRİŞ YAPMIŞSA ÇANLARI GÖSTER (CSS varsayılanına döner)
        if (mobileBell) mobileBell.style.display = ''; 
        if (desktopBell) desktopBell.style.display = '';

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
        // KULLANICI GİRİŞ YAPMAMIŞSA ÇANLARI KÖKÜNDEN GİZLE
        if (mobileBell) mobileBell.style.display = 'none';
        if (desktopBell) desktopBell.style.display = 'none';

        authAction.innerHTML = `<a href="kayit.html" class="nav-btn">KAYIT / GİRİŞ</a>`;
    }
    
    authAction.style.opacity = "1"; 
}

async function checkUserStatus() {
    renderCachedHeader(); 

    try {
        const { data: { user }, error } = await window.supabaseClient.auth.getUser();
        
        if (user && !error) {
            updateNavbarWithUser(user);
            if(typeof initGlobalInviteSystem === "function") initGlobalInviteSystem(user.id);
        } else {
            // Supabase "Giriş yapmamış" derse ve hafızada biri takılı kalmışsa temizle
            localStorage.removeItem('obb_user_cache');
            renderCachedHeader();
        }
    } catch (err) { console.error("Auth hatası:", err); }
}

async function updateNavbarWithUser(user) {
    const authAction = document.getElementById('authAction');
    const mobileBell = document.querySelector('.floating-bell.mobile-only');
    const desktopBell = document.querySelector('.nav-bell.desktop-only');

    if (!authAction) return;

    const { data: profileData } = await window.supabaseClient.from('profiles').select('username, role').eq('id', user.id).maybeSingle();
    
    const username = profileData?.username || user.user_metadata?.username || "OYUNCU";
    const isAdmin = profileData?.role === 'admin';

    localStorage.setItem('obb_user_cache', JSON.stringify({
        username: username,
        isAdmin: isAdmin
    }));

    // Veritabanı onayı gelince çanları kesin olarak açık tut
    if (mobileBell) mobileBell.style.display = '';
    if (desktopBell) desktopBell.style.display = '';

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
                <a href="my-tournaments.html"><i class="fas fa-trophy"></i> Turnuvalarım</a>
                <a href="#" onclick="handleLogoutGlobal(); return false;" class="logout-link"><i class="fas fa-sign-out-alt"></i> Çıkış</a>
            </div>
        </div>`;
}

window.handleLogoutGlobal = async function() {
    localStorage.removeItem('obb_user_cache');
    await window.supabaseClient.auth.signOut();
    window.location.reload(); 
}

// =========================================================================
// SADECE ADMİN SAYFALARINDA ÇAĞRILACAK GÜVENLİK BEKÇİSİ (FRONTEND BOUNCER)
// =========================================================================
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

        // KONTROL BAŞARILI: Işıkları aç ve yükleme ekranını gizle
        document.documentElement.style.visibility = 'visible';
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) loadingScreen.style.display = 'none';

        return true; // Sayfanın geri kalan kodlarının çalışması için onay ver
        
    } catch (err) {
        // KONTROL BAŞARISIZ: Anında ana sayfaya fırlat
        console.error("Güvenlik Engeli:", err.message);
        window.location.replace("index.html");
        return false;
    }
}
