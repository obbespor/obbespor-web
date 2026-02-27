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
            
            // YENİ: Kullanıcı giriş yaptıysa GLOBAL DAVET SİSTEMİNİ başlat
            initGlobalInviteSystem(user.id);
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

/* ===================================================================
   YENİ: GLOBAL DAVET VE BİLDİRİM SİSTEMİ (HER SAYFADA ÇALIŞIR)
   =================================================================== */
async function initGlobalInviteSystem(userId) {
    // DURUM 1: Oyuncu çevrimdışıyken davet atılmış ve siteye yeni girmiş (veya sayfayı yenilemiş)
    const { data: pendingInvites } = await supabase
        .from('application_members')
        .select('id, tournament_applications(team_name)')
        .eq('user_id', userId)
        .eq('status', 'pending');

    if (pendingInvites && pendingInvites.length > 0) {
        // Spam koruması: Hangi bildirimleri zaten gösterdiğimizi oturum hafızasında tutuyoruz
        let alertedInvites = JSON.parse(sessionStorage.getItem('alertedInvites') || '[]');
        let newAlertsFound = false;

        pendingInvites.forEach(invite => {
            if (!alertedInvites.includes(invite.id)) {
                const teamName = invite.tournament_applications?.team_name || "Bir takım";
                // bildirimler.js dosyasındaki global fonksiyonu çağırıyoruz
                if (typeof showNotification === "function") {
                    showNotification(`🔔 ${teamName} takımından davet aldın! Yanıtlamak için profiline git.`, "info", 6000);
                }
                alertedInvites.push(invite.id);
                newAlertsFound = true;
            }
        });

        // Yeni bildirim gösterdiysek hafızayı güncelle
        if (newAlertsFound) {
            sessionStorage.setItem('alertedInvites', JSON.stringify(alertedInvites));
        }
    }

    // DURUM 2: Oyuncu zaten sitede geziyor (Aktif) ve o an bir kaptan onu davet ediyor
    supabase.channel('global-invite-listener')
        .on('postgres_changes', {
            event: 'INSERT', // Sadece yeni bir davet EKLENDİĞİNDE tetiklenir
            schema: 'public',
            table: 'application_members',
            filter: `user_id=eq.${userId}`
        }, async (payload) => {
            
            // Gelen veride takım adı yok, sadece ID var. Takım adını öğrenmek için hızlı bir sorgu atıyoruz:
            const appId = payload.new.application_id;
            const { data: teamData } = await supabase
                .from('tournament_applications')
                .select('team_name')
                .eq('id', appId)
                .single();

            const teamName = teamData ? teamData.team_name : "Bir takım";
            
            // Aktif anlık bildirimi gönder
            if (typeof showNotification === "function") {
                showNotification(`🔔 YENİ DAVET: ${teamName} seni takımına çağırıyor! Hemen profiline göz at.`, "success", 8000);
            }

            // Sayfa yenilenirse aynı bildirimi tekrar görmemesi için hafızaya kaydet
            let alertedInvites = JSON.parse(sessionStorage.getItem('alertedInvites') || '[]');
            alertedInvites.push(payload.new.id);
            sessionStorage.setItem('alertedInvites', JSON.stringify(alertedInvites));
            
        })
        .subscribe();
}
