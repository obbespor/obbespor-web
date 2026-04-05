// js/auth.js

// 1. SAYFA YÜKLENDİĞİ AN (SUPABASE'İ BEKLEMEDEN) ÖNBELLEKTEN PROFİLİ ÇİZ
function renderCachedHeader() {
    const authAction = document.getElementById('authAction');
    if (!authAction) return;

    const cachedUser = localStorage.getItem('obb_user_cache');
    
    // Eğer önbellekte kullanıcı varsa, beklemeden direkt profili göster
    if (cachedUser) {
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
        // Önbellekte kimse yoksa, varsayılan KATIL butonunu göster
        authAction.innerHTML = `<a href="kayit.html" class="nav-btn">KAYIT / GİRİŞ</a>`;
    }
    
    // Yükleme bittikten sonra görünürlüğü aç (FOUC engellemesi için)
    authAction.style.opacity = "1"; 
}

// 2. SUPABASE KONTROLÜ (Arka planda sessizce çalışır)
async function checkUserStatus() {
    // Önce hafızadaki profili milisaniyeler içinde çiz
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

// 3. VERİTABANINDAN GÜNCEL VERİLERİ ALIP ÖNBELLEĞİ YENİLEME
async function updateNavbarWithUser(user) {
    const authAction = document.getElementById('authAction');
    if (!authAction) return;

    const { data: profileData } = await window.supabaseClient.from('profiles').select('username, role').eq('id', user.id).maybeSingle();
    
    const username = profileData?.username || user.user_metadata?.username || "OYUNCU";
    const isAdmin = profileData?.role === 'admin';

    // GELECEK SEFER İÇİN BİLGİLERİ ÖNBELLEĞE KAYDET (Sıfır gecikme için)
    localStorage.setItem('obb_user_cache', JSON.stringify({
        username: username,
        isAdmin: isAdmin
    }));

    // İlk defa giriş yaptıysa ekranı güncelle
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
document.addEventListener("DOMContentLoaded", async () => {
    // 1. Önce kullanıcının bir oturumu (token) var mı ona bakıyoruz
    const { data: { user }, error: authErr } = await window.supabaseClient.auth.getUser();

    // Eğer hiç giriş yapmamışsa anında kapı dışarı et
    if (authErr || !user) {
        window.location.replace("kayit.html");
        return;
    }

    // 2. LOCAL STORAGE'I BOŞVER! Gerçek yetkiyi veritabanından (profiles) çek.
    const { data: profile, error: profileErr } = await window.supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    // 3. Eğer Supabase bu kişinin rolüne 'admin' diyorsa geçiş izni ver
    if (profile && profile.role === 'admin') {
        document.documentElement.style.visibility = 'visible'; // Işıkları aç!
    } else {
        // Değilse, hafızayı ne kadar manipüle ederse etsin ana sayfaya fırlat!
        window.location.replace("index.html"); 
    }
});
// ÇIKIŞ YAPMA İŞLEMİ
window.handleLogoutGlobal = async function() {
    // Çıkış yaparken önbelleği silmeyi unutma ki başkası görürse eski hesabı görmesin
    localStorage.removeItem('obb_user_cache');
    await window.supabaseClient.auth.signOut();
    window.location.reload(); 
}
