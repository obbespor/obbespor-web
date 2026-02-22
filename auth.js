/* -------------------------------------------------------
   OBB E-SPOR - MERKEZİ AUTH SİSTEMİ (auth.js)
   ------------------------------------------------------- */

const SUPABASE_URL = 'https://zvhtznxretxgofnbcbko.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_6PnSRl0JTSPvdgI0JbP4yw_h4iXEb85';

// 1. Çakışmayı önleyen global başlatma (Global değişken: _supabase)
if (!window._supabase) {
    window._supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
// Diğer scriptler için de erişilebilir yapalım
window.supabaseClient = window._supabase;

document.addEventListener('DOMContentLoaded', () => {
    checkUserStatus();
});

async function checkUserStatus() {
    try {
        // user_metadata içinden verileri almak için getUser kullanıyoruz
        const { data: { user }, error } = await window._supabase.auth.getUser();
        
        if (user) {
            updateNavbarWithUser(user);
        }
    } catch (err) {
        console.error("Auth kontrolü sırasında hata:", err);
    }
}

function updateNavbarWithUser(user) {
    // Nav butonunu senin orijinal querySelector yapınla buluyoruz
    const navBtn = document.querySelector('.nav-btn');
    const username = user.user_metadata?.username || user.email.split('@')[0] || "OYUNCU";

    if (navBtn && navBtn.parentElement) {
        // Orijinal HTML yapını ve CSS sınıflarını koruyarak dropdown'ı enjekte ediyoruz
        navBtn.parentElement.innerHTML = `
            <div class="user-dropdown">
                <button class="dropdown-trigger">
                    <i class="fas fa-user-circle"></i>
                    <span class="user-name-text">${username.toUpperCase()}</span>
                    <i class="fas fa-chevron-down arrow-icon"></i>
                </button>
                <div class="dropdown-content">
                    <a href="profil.html"><i class="fas fa-user-cog"></i> Profilim</a>
                    <a href="my-tournaments.html"><i class="fas fa-trophy"></i> Turnuvalarım</a>
                    <hr style="border-color: rgba(255,255,255,0.1); margin: 5px 0;">
                    <a href="#" onclick="logoutAction()" class="logout-link"><i class="fas fa-sign-out-alt"></i> Çıkış Yap</a>
                </div>
            </div>
        `;
    }
}

async function logoutAction() {
    const { error } = await window._supabase.auth.signOut();
    if (!error) {
        window.location.href = "index.html";
    } else {
        console.error("Çıkış hatası:", error.message);
    }
}
