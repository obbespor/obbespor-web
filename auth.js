/* -------------------------------------------------------
   OBB E-SPOR - MERKEZİ AUTH SİSTEMİ (auth.js)
   -------------------------------------------------------
*/

// 1. Supabase Yapılandırması
const SUPABASE_URL = 'https://zvhtznxretxgofnbcbko.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_6PnSRl0JTSPvdgI0JbP4yw_h4iXEb85';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2. Sayfa Yüklendiğinde Kullanıcıyı Kontrol Et
document.addEventListener('DOMContentLoaded', () => {
    checkUserStatus();
});

async function checkUserStatus() {
    // Mevcut oturumu al
    const { data: { user }, error } = await _supabase.auth.getUser();

    if (user) {
        // Kullanıcı giriş yapmışsa Navbar'ı güncelle
        updateNavbarWithUser(user);
    }
}

// 3. Navbar'ı (Header) Güncelleyen Fonksiyon
function updateNavbarWithUser(user) {
    const username = user.user_metadata.username || "OYUNCU";
    const navBtn = document.querySelector('.nav-btn');
    
    if (navBtn) {
        // ESKİ BASİT YAZI YERİNE PROFESYONEL DROPDOWN MENÜ GELİYOR
        navBtn.parentElement.innerHTML = `
            <div class="user-dropdown">
                <button class="dropdown-trigger">
                    <i class="fas fa-user-circle"></i>
                    <span class="user-name-text">${username.toUpperCase()}</span>
                    <i class="fas fa-chevron-down arrow-icon"></i>
                </button>
                <div class="dropdown-content">
                    <a href="profil.html"><i class="fas fa-user-cog"></i> Profilim</a>
                    <a href="turnuvalarim.html"><i class="fas fa-trophy"></i> Turnuvalarım</a>
                    <hr style="border-color: rgba(255,255,255,0.1); margin: 5px 0;">
                    <a href="#" onclick="logoutAction()" class="logout-link"><i class="fas fa-sign-out-alt"></i> Çıkış Yap</a>
                </div>
            </div>
        `;
    }
}

// 4. Çıkış Yapma Fonksiyonu
async function logoutAction() {
    const { error } = await _supabase.auth.signOut();
    if (!error) {
        alert("Başarıyla çıkış yapıldı!");
        window.location.href = "index.html"; // Çıkıştan sonra ana sayfaya at
    } else {
        console.error("Çıkış hatası:", error.message);
    }
}
