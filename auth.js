/* -------------------------------------------------------
   OBB E-SPOR - MERKEZİ AUTH SİSTEMİ (auth.js)
   ------------------------------------------------------- */

const SUPABASE_URL = 'https://zvhtznxretxgofnbcbko.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_6PnSRl0JTSPvdgI0JbP4yw_h4iXEb85';

// 1. Supabase client'ı oluşturuyoruz ve tüm sayfaların tanıdığı 
// eski standart ismiyle (supabase) globale eşitliyoruz.
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.supabase = supabaseClient;

document.addEventListener('DOMContentLoaded', () => {
    checkUserStatus();
});

async function checkUserStatus() {
    try {
        // Artık standart supabase ismini kullanıyoruz
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (user) {
            updateNavbarWithUser(user);
        }
    } catch (err) {
        console.error("Auth kontrolü sırasında hata:", err);
    }
}

function updateNavbarWithUser(user) {
    // Nav butonunu orijinal querySelector yapınla buluyoruz
    const navBtn = document.querySelector('.nav-btn');
    const username = user.user_metadata?.username || user.email.split('@')[0] || "OYUNCU";

    if (navBtn && navBtn.parentElement) {
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
    const { error } = await supabase.auth.signOut();
    if (!error) {
        window.location.href = "index.html";
    } else {
        console.error("Çıkış hatası:", error.message);
    }
}
