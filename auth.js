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
    // Supabase'den gelen kullanıcı adı veya varsayılan isim
    const username = user.user_metadata.username || "OYUNCU";
    
    // Header'daki "KATIL" veya "GİRİŞ" butonunu hedef al
    const navBtn = document.querySelector('.nav-btn');
    
    if (navBtn) {
        // Butonu modern bir karşılama alanına dönüştür
        navBtn.parentElement.innerHTML = `
            <div class="user-welcome-area">
                <div class="user-info">
                    <span class="welcome-text">HOŞ GELDİN,</span>
                    <span class="user-nickname">${username.toUpperCase()}</span>
                </div>
                <button onclick="logoutAction()" class="logout-minimal-btn" title="Güvenli Çıkış">
                    <i class="fas fa-sign-out-alt"></i>
                </button>
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
