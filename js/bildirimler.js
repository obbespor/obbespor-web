// js/bildirimler.js
window.myNotifications = [];

function initNotifications() {
    fetchRealNotifications();
    listenRealtimeNotifications();
}

// --- OTOMATİK ÇEVİRMEN FONKSİYONU ---
function cevirSupabaseHatasi(hataMesaji) {
    if (!hataMesaji) return "Bilinmeyen bir hata oluştu.";
    
    const msg = hataMesaji.toLowerCase();

    // Dinamik Hatalar (18 saniye vb.)
    const saniyeElesmesi = msg.match(/after (\d+) seconds/i);
    if (saniyeElesmesi) {
        return `Güvenlik gereği, yeni bir istek yapmadan önce ${saniyeElesmesi[1]} saniye beklemelisiniz.`;
    }

    // Sabit Hatalar Sözlüğü
    if (msg.includes("invalid login credentials")) return "E-posta adresi veya şifre hatalı.";
    if (msg.includes("email not confirmed")) return "Giriş yapmadan önce e-posta adresinize gelen linkten hesabınızı onaylamalısınız.";
    if (msg.includes("user already registered")) return "Bu e-posta adresi sistemimizde zaten kayıtlı.";
    if (msg.includes("password should be at least")) return "Şifreniz çok kısa, en az 6 karakter olmalıdır.";
    if (msg.includes("email link is invalid or has expired")) return "Doğrulama linkinin süresi dolmuş veya geçersiz. Lütfen yeni bir şifre sıfırlama isteği gönderin.";
    if (msg.includes("too many requests") || msg.includes("rate limit")) return "Çok fazla deneme yaptınız. Lütfen birkaç dakika bekleyip tekrar deneyin.";
    if (msg.includes("network error") || msg.includes("failed to fetch")) return "Bağlantı hatası! Lütfen internetinizi kontrol edin.";
    
    // Eğer sözlükte yoksa gereksiz İngilizce ön ekleri temizleyip yolla
    return hataMesaji.replace('Hata: ', '').replace('Error: ', ''); 
}

window.showNotification = function(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    // MESAJI EKRANA BASMADAN ÖNCE TÜRKÇEYE ÇEVİR
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

window.fetchRealNotifications = async function() {
    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) return;

        const { data } = await window.supabaseClient.from('bildirimler').select('*').eq('kullanici_id', user.id).eq('okundu', false).order('created_at', { ascending: false });
        
        window.myNotifications = data ? data.map(item => {
            const styleObj = getIconForType(item.tip);
            return { id: item.id, tip: item.tip, icon: styleObj.icon, color: styleObj.color, title: item.baslik, text: item.mesaj };
        }) : [];
        renderNotifications();
    } catch (err) { console.error("Bildirim çekilemedi:", err); }
};

window.listenRealtimeNotifications = async function() {
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (!user) return;

    window.supabaseClient.channel('realtime-bildirimler')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bildirimler', filter: `kullanici_id=eq.${user.id}` },
        (payload) => {
            const yeni = payload.new;
            const styleObj = getIconForType(yeni.tip);
            window.myNotifications.unshift({ id: yeni.id, tip: yeni.tip, icon: styleObj.icon, color: styleObj.color, title: yeni.baslik, text: yeni.mesaj });
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
        htmlContent += `
            <div class="notif-item" onclick="window.location.href='profil.html'">
                <i class="fas ${notif.icon}" style="color: ${notif.color};"></i>
                <div class="notif-item-content"><strong>${notif.title}</strong><span>${notif.text}</span></div>
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

window.clearNotifications = async function(event) {
    if(event) event.stopPropagation();
    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) return;
        await window.supabaseClient.from('bildirimler').update({ okundu: true }).eq('kullanici_id', user.id).eq('okundu', false);
        window.myNotifications = [];
        renderNotifications();
        showNotification("Tüm bildirimler temizlendi.", "success");
    } catch (err) { console.error("Temizleme hatası:", err); }
};

// Global Davet Sistemi (Canlı Dinleyici Eklendi)
window.initGlobalInviteSystem = async function(userId) {
    // 1. Sayfa yüklendiğinde birikmiş davetleri kontrol et
    const { data: pendingInvites } = await window.supabaseClient
        .from('application_members')
        .select('id, tournament_applications(team_name)')
        .eq('user_id', userId)
        .eq('status', 'pending');

    if (pendingInvites && pendingInvites.length > 0) {
        let alertedInvites = JSON.parse(sessionStorage.getItem('alertedInvites') || '[]');
        let newAlertsFound = false;
        pendingInvites.forEach(invite => {
            if (!alertedInvites.includes(invite.id)) {
                const teamName = invite.tournament_applications?.team_name || "Bir takım";
                showNotification(`🔔 ${teamName} takımından davet aldın!`, "info");
                alertedInvites.push(invite.id);
                newAlertsFound = true;
            }
        });
        if (newAlertsFound) sessionStorage.setItem('alertedInvites', JSON.stringify(alertedInvites));
    }

    // 2. KULLANICI SİTEDE AKTİFKEN (Canlı) DAVET GELİRSE EKRANA DÜŞÜR
    window.supabaseClient.channel('global-invite-listener')
        .on('postgres_changes', {
            event: 'INSERT', 
            schema: 'public',
            table: 'application_members',
            filter: `user_id=eq.${userId}`
        }, async (payload) => {
            // Takım ID'sinden takım adını bul
            const appId = payload.new.application_id;
            const { data: teamData } = await window.supabaseClient
                .from('tournament_applications')
                .select('team_name')
                .eq('id', appId)
                .single();

            const teamName = teamData ? teamData.team_name : "Bir takım";
            
            // Aktif anlık bildirimi çıkar
            if (typeof showNotification === "function") {
                showNotification(`🔔 YENİ DAVET: ${teamName} seni takımına çağırıyor! Hemen profiline göz at.`, "success");
            }

            // Sayfa yenilenirse tekrar göstermesin diye kaydet
            let alertedInvites = JSON.parse(sessionStorage.getItem('alertedInvites') || '[]');
            alertedInvites.push(payload.new.id);
            sessionStorage.setItem('alertedInvites', JSON.stringify(alertedInvites));
            
            // Zili / Bildirim Panelini anlık güncelle
            window.myNotifications.unshift({ 
                id: payload.new.id, 
                tip: 'davet', 
                icon: 'fa-envelope-open-text', 
                color: '#f39c12', 
                title: 'Yeni Davet!', 
                text: `${teamName} seni çağırıyor.` 
            });
            window.renderNotifications();
        })
        .subscribe();
}
