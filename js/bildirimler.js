window.myNotifications = [];

function initNotifications() {
    fetchRealNotifications();
    listenRealtimeNotifications();
}

// --- OTOMATİK ÇEVİRMEN FONKSİYONU ---
function cevirSupabaseHatasi(hataMesaji) {
    if (!hataMesaji) return "Bilinmeyen bir hata oluştu.";
    
    const msg = hataMesaji.toLowerCase();

    const saniyeElesmesi = msg.match(/after (\d+) seconds/i);
    if (saniyeElesmesi) return `Güvenlik gereği, yeni bir istek yapmadan önce ${saniyeElesmesi[1]} saniye beklemelisiniz.`;

    if (msg.includes("invalid login credentials")) return "E-posta adresi veya şifre hatalı.";
    if (msg.includes("email not confirmed")) return "Giriş yapmadan önce e-posta adresinize gelen linkten hesabınızı onaylamalısınız.";
    if (msg.includes("user already registered")) return "Bu e-posta adresi sistemimizde zaten kayıtlı.";
    if (msg.includes("password should be at least")) return "Şifreniz çok kısa, en az 6 karakter olmalıdır.";
    if (msg.includes("email link is invalid or has expired")) return "Doğrulama linkinin süresi dolmuş veya geçersiz. Lütfen yeni bir şifre sıfırlama isteği gönderin.";
    if (msg.includes("too many requests") || msg.includes("rate limit")) return "Çok fazla deneme yaptınız. Lütfen birkaç dakika bekleyip tekrar deneyin.";
    if (msg.includes("network error") || msg.includes("failed to fetch")) return "Bağlantı hatası! Lütfen internetinizi kontrol edin.";
    
    return hataMesaji.replace('Hata: ', '').replace('Error: ', ''); 
}

// --- BİLDİRİM BALONCUĞU (TOAST) GÖSTERİMİ ---
window.showNotification = function(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const turkceMesaj = cevirSupabaseHatasi(message);
    const toast = document.createElement('div');
    toast.className = `custom-toast toast-${type}`;
    let iconClass = type === 'success' ? 'fas fa-check-circle' : type === 'error' ? 'fas fa-exclamation-circle' : 'fas fa-info-circle';

    toast.innerHTML = `<i class="${iconClass} toast-icon"></i><span>${turkceMesaj}</span>`;
    container.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.replace('show', 'hide');
        setTimeout(() => { if (toast.parentElement) toast.remove(); }, 400); 
    }, 4000);
};

function getIconForType(tip) {
    switch(tip) {
        case 'onay': return { icon: 'fa-check-circle', color: '#00e676' }; 
        case 'red': return { icon: 'fa-times-circle', color: '#ff4b4b' }; 
        case 'sistem': return { icon: 'fa-bullhorn', color: '#601dc2' };
        case 'davet': return { icon: 'fa-envelope-open-text', color: '#f39c12' }; 
        default: return { icon: 'fa-bell', color: '#00d2ff' }; 
    }
}

// --- HİBRİT VERİ ÇEKME VE HARMANLAMA SİSTEMİ ---
window.fetchRealNotifications = async function() {
    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) return;

        // 1. Kişisel Bildirimleri Çek
        const { data: kisiselData } = await window.supabaseClient
            .from('bildirimler')
            .select('*')
            .eq('kullanici_id', user.id); 

        // 2. Genel Duyuruları Çek
        const { data: duyuruData } = await window.supabaseClient
            .from('duyurular')
            .select('*'); 

        let gizlenenDuyurular = JSON.parse(localStorage.getItem('gizlenenDuyurular') || '[]');
        let harmanlanmisList = [];

        if (kisiselData) {
            kisiselData.forEach(item => {
                harmanlanmisList.push({
                    id: item.id,
                    tablo: 'bildirimler',
                    tip: item.tip,
                    title: item.baslik,
                    text: item.mesaj,
                    created_at: item.created_at
                });
            });
        }

        if (duyuruData) {
            duyuruData.forEach(item => {
                if (!gizlenenDuyurular.includes(item.id)) {
                    harmanlanmisList.push({
                        id: item.id,
                        tablo: 'duyurular',
                        tip: 'sistem', 
                        title: item.baslik,
                        text: item.mesaj,
                        created_at: item.created_at
                    });
                }
            });
        }

        // Global Davetleri de çekmek için fonksiyonu burada tetikliyoruz
        initGlobalInviteSystem(user.id, harmanlanmisList);
        
    } catch (err) { console.error("Bildirim çekilemedi:", err); }
};

// --- İKİ KANALDAN GERÇEK ZAMANLI (REALTIME) DİNLEME ---
window.listenRealtimeNotifications = async function() {
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (!user) return;

    window.supabaseClient.channel('kisisel-bildirimler')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bildirimler', filter: `kullanici_id=eq.${user.id}` },
        (payload) => {
            const yeni = payload.new;
            const styleObj = getIconForType(yeni.tip);
            window.myNotifications.unshift({
                id: yeni.id, tablo: 'bildirimler', tip: yeni.tip, icon: styleObj.icon, color: styleObj.color,
                title: yeni.baslik, text: yeni.mesaj, created_at: yeni.created_at
            });
            window.myNotifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            renderNotifications();
            showNotification(yeni.baslik, "info");
        }
      ).subscribe();

    window.supabaseClient.channel('genel-duyurular')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'duyurular' },
        (payload) => {
            const yeni = payload.new;
            const styleObj = getIconForType('sistem');
            window.myNotifications.unshift({
                id: yeni.id, tablo: 'duyurular', tip: 'sistem', icon: styleObj.icon, color: styleObj.color,
                title: yeni.baslik, text: yeni.mesaj, created_at: yeni.created_at
            });
            window.myNotifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            renderNotifications();
            showNotification(yeni.baslik, "info"); 
        }
      ).subscribe();
};

window.renderNotifications = function() {
    const deskList = document.getElementById("notif-list-desktop");
    const mobList = document.getElementById("notif-list-mobile");
    const deskBadge = document.getElementById("badge-desktop");
    const mobBadge = document.getElementById("badge-mobile");

    let htmlContent = window.myNotifications.length === 0 ? `<div class="notif-empty">Şu an yeni bir bildiriminiz yok.</div>` : "";

    window.myNotifications.forEach(notif => {
        let targetUrl = "javascript:void(0)"; 
        let cursorStyle = "cursor: default;";
        
        // YÖNLENDİRME MANTIĞI: Sadece davetler profil/davet sekmesine gider. Genel duyurular gitmez.
        if (notif.tip === 'davet') {
            targetUrl = "profil.html#davetler"; 
            cursorStyle = "cursor: pointer;";
        } else if (notif.tip === 'onay' || notif.tip === 'red') {
            targetUrl = "profil.html"; 
            cursorStyle = "cursor: pointer;";
        }

        let onClickAttr = targetUrl !== "javascript:void(0)" ? `onclick="window.location.href='${targetUrl}'"` : "";

        htmlContent += `
            <div class="notif-item" ${onClickAttr} style="${cursorStyle}">
                <i class="fas ${notif.icon}" style="color: ${notif.color};"></i>
                <div class="notif-item-content">
                    <strong>${notif.title}</strong>
                    <span>${notif.text}</span>
                </div>
            </div>`;
    });

    if (deskList) deskList.innerHTML = htmlContent;
    if (mobList) mobList.innerHTML = htmlContent;
    
    [deskBadge, mobBadge].forEach(badge => {
        if(badge) {
            badge.style.display = window.myNotifications.length > 0 ? "block" : "none";
            badge.innerText = window.myNotifications.length;
        }
    });
};

window.toggleNotifPanel = function(panelId, event) {
    if(event) { event.preventDefault(); event.stopPropagation(); }
    const panel = document.getElementById(panelId);
    if (!panel) return;
    const isActive = panel.classList.contains("active");
    document.querySelectorAll('.notif-panel').forEach(p => p.classList.remove('active'));
    if (!isActive) panel.classList.add("active");
};

// --- ÇİFT KARAKTERLİ SİLME İŞLEMİ (Veritabanı + Önbellek) ---
window.clearNotifications = async function(event) {
    if(event) event.stopPropagation();
    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) return;

        await window.supabaseClient.from('bildirimler').delete().eq('kullanici_id', user.id);

        let gizlenenDuyurular = JSON.parse(localStorage.getItem('gizlenenDuyurular') || '[]');
        
        // Zili sıfırlarken, "davet" olanları veritabanından silmiyoruz ama ekrandan uçuruyoruz
        window.myNotifications.forEach(notif => {
            if (notif.tablo === 'duyurular' && !gizlenenDuyurular.includes(notif.id)) {
                gizlenenDuyurular.push(notif.id);
            }
        });
        localStorage.setItem('gizlenenDuyurular', JSON.stringify(gizlenenDuyurular));

        window.myNotifications = [];
        renderNotifications();
        showNotification("Tüm bildirimler temizlendi.", "success");
    } catch (err) { console.error("Temizleme hatası:", err); }
};

// --- GLOBAL DAVET SİSTEMİ ---
window.initGlobalInviteSystem = async function(userId, mevcutHarmanlanmisList = []) {
    // 1. Bekleyen davetleri 'created_at' verisiyle birlikte çekiyoruz ki zilde doğru sıralansın
    const { data: pendingInvites } = await window.supabaseClient
        .from('application_members')
        .select('id, created_at, tournament_applications(team_name)')
        .eq('user_id', userId)
        .eq('status', 'pending');

    let alertedInvites = JSON.parse(sessionStorage.getItem('alertedInvites') || '[]');
    let newAlertsFound = false;

    if (pendingInvites && pendingInvites.length > 0) {
        pendingInvites.forEach(invite => {
            const teamName = invite.tournament_applications?.team_name || "Bir takım";
            
            // 2. Baloncuğu (toast) oturum boyunca sadece 1 kez göster
            if (!alertedInvites.includes(invite.id)) {
                showNotification(`🔔 ${teamName} takımından davet aldın!`, "info");
                alertedInvites.push(invite.id);
                newAlertsFound = true;
            }

            // 3. EKSİK OLAN KISIM: ZİLE (PANEL) EKLEME MANTIĞI
            mevcutHarmanlanmisList.push({
                id: invite.id,
                tablo: 'application_members',
                tip: 'davet',
                title: 'Yeni Takım Daveti!',
                text: `${teamName} seni takımına davet ediyor.`,
                created_at: invite.created_at || new Date().toISOString()
            });
        });

        if (newAlertsFound) sessionStorage.setItem('alertedInvites', JSON.stringify(alertedInvites));
    }

    // Listeyi tarihe göre sıralayıp ana değişkene atıyoruz ve ekrana basıyoruz
    mevcutHarmanlanmisList.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    window.myNotifications = mevcutHarmanlanmisList.map(item => {
        const styleObj = getIconForType(item.tip);
        return { ...item, icon: styleObj.icon, color: styleObj.color };
    });
    
    renderNotifications();

    // 4. Real-time Dinleme
    window.supabaseClient.channel('global-invite-listener')
        .on('postgres_changes', {
            event: 'INSERT', 
            schema: 'public',
            table: 'application_members',
            filter: `user_id=eq.${userId}`
        }, async (payload) => {
            const appId = payload.new.application_id;
            const { data: teamData } = await window.supabaseClient
                .from('tournament_applications')
                .select('team_name')
                .eq('id', appId)
                .single();

            const teamName = teamData ? teamData.team_name : "Bir takım";
            
            if (typeof showNotification === "function") {
                showNotification(`🔔 YENİ DAVET: ${teamName} seni takımına çağırıyor! Hemen profiline göz at.`, "success");
            }

            let currentAlerts = JSON.parse(sessionStorage.getItem('alertedInvites') || '[]');
            currentAlerts.push(payload.new.id);
            sessionStorage.setItem('alertedInvites', JSON.stringify(currentAlerts));
            
            // Anlık gelen daveti zile ekleme ve tıklanabilir yapma
            window.myNotifications.unshift({ 
                id: payload.new.id, 
                tablo: 'application_members', 
                tip: 'davet', 
                icon: 'fa-envelope-open-text', 
                color: '#f39c12', 
                title: 'Yeni Davet!', 
                text: `${teamName} seni çağırıyor.`,
                created_at: payload.new.created_at || new Date().toISOString()
            });
            window.myNotifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            window.renderNotifications();
        })
        .subscribe();
}

// --- URL KONTROLÜ: E-POSTA ONAYI, OTOMATİK GİRİŞ VE HATA YAKALAMA ---
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const isVerified = urlParams.get('verified') === 'true';

    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const isSupabaseSignup = hashParams.get('type') === 'signup';
    const isPasswordRecovery = hashParams.get('type') === 'recovery';
    
    const errorDescription = hashParams.get('error_description');

    if (errorDescription) {
        setTimeout(() => {
            if (errorDescription.includes('expired')) {
                showNotification("Bu onay bağlantısının süresi dolmuş veya daha önce kullanılmış. Lütfen yeni bir bağlantı isteyin.", "error");
            } else {
                showNotification("Bir hata oluştu: " + decodeURIComponent(errorDescription).replace(/\+/g, ' '), "error");
            }
        }, 500);
        
        window.history.replaceState({}, document.title, window.location.pathname);
        
        if (window.location.pathname.includes('sifre-yenile')) {
            const authCard = document.querySelector('.auth-card');
            const form = document.querySelector('form');
            if(authCard) authCard.style.display = 'none';
            else if(form) form.style.display = 'none';

            setTimeout(() => { window.location.href = 'index.html'; }, 3000);
        }
        return; 
    }

    if (isVerified || isSupabaseSignup) {
        setTimeout(() => {
            if (typeof showNotification === 'function') {
                showNotification("E-postanız başarıyla onaylandı ve giriş yapıldı!", "success");
            }
        }, 500);
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    if (isPasswordRecovery) {
        setTimeout(() => {
            if (typeof showNotification === 'function') {
                showNotification("Lütfen yeni şifrenizi belirleyin.", "success");
            }
        }, 500);
        window.history.replaceState({}, document.title, window.location.pathname);
    }
});
