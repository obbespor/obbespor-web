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
    if (msg.includes("email not confirmed")) return "Giriş yapmadan önce e-postayı onaylamalısınız.";
    if (msg.includes("user already registered")) return "Bu e-posta zaten kayıtlı.";
    if (msg.includes("too many requests")) return "Çok fazla deneme yaptınız. Lütfen bekleyin.";
    if (msg.includes("network error")) return "Bağlantı hatası oluştu.";
    
    return hataMesaji.replace('Hata: ', '').replace('Error: ', ''); 
}

// --- BİLDİRİM BALONCUĞU (TOAST) ---
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

// --- KİŞİSEL BİLDİRİMLERİ ÇEKME ---
window.fetchRealNotifications = async function() {
    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) return;

        const { data: kisiselData } = await window.supabaseClient.from('bildirimler').select('*').eq('kullanici_id', user.id); 

        let harmanlanmisList = [];
        if (kisiselData) {
            kisiselData.forEach(item => {
                if (item.baslik && item.baslik.toLowerCase().includes("davet")) return;

                harmanlanmisList.push({
                    id: item.id, tablo: 'bildirimler', tip: item.tip,
                    title: item.baslik, text: item.mesaj, created_at: item.created_at
                });
            });
        }
        initGlobalInviteSystem(user.id, harmanlanmisList);
    } catch (err) { console.error("Bildirim çekilemedi:", err); }
};

// --- REALTIME DİNLEME ---
window.listenRealtimeNotifications = async function() {
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (!user) return;

    window.supabaseClient.channel('kisisel-bildirimler-' + user.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bildirimler', filter: `kullanici_id=eq.${user.id}` },
        (payload) => {
            const yeni = payload.new;
            
            if (yeni.baslik && yeni.baslik.toLowerCase().includes("davet")) return;

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
};

window.renderNotifications = function() {
    const deskList = document.getElementById("notif-list-desktop");
    const mobList = document.getElementById("notif-list-mobile");
    const deskBadge = document.getElementById("badge-desktop");
    const mobBadge = document.getElementById("badge-mobile");

    let htmlContent = window.myNotifications.length === 0 ? `<div class="notif-empty">Şu an yeni bir bildiriminiz yok.</div>` : "";

    window.myNotifications.forEach(notif => {
        // HEDEF URL DÜZELTİLDİ: Davet, Onay veya Red gelirse doğrudan takimim.html'e yönlendirir.
        let targetUrl = (notif.tip === 'davet' || notif.tip === 'onay' || notif.tip === 'red') ? "takimim.html" : "javascript:void(0)";
        let onClickAttr = targetUrl !== "javascript:void(0)" ? `onclick="window.location.href='${targetUrl}'"` : "";

        htmlContent += `
            <div class="notif-item" ${onClickAttr} style="${targetUrl !== "javascript:void(0)" ? 'cursor:pointer' : 'cursor:default'}">
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

window.clearNotifications = async function(event) {
    if(event) event.stopPropagation();
    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) return;
        await window.supabaseClient.from('bildirimler').delete().eq('kullanici_id', user.id);
        window.myNotifications = [];
        renderNotifications();
        showNotification("Tüm bildirimler temizlendi.", "success");
    } catch (err) { console.error("Temizleme hatası:", err); }
};

// --- GLOBAL DAVET SİSTEMİ (Tek Kaynak) ---
window.initGlobalInviteSystem = async function(userId, mevcutHarmanlanmisList = []) {
    const { data: pendingInvites } = await window.supabaseClient
        .from('team_members')
        .select('id, created_at, teams(name)')
        .eq('user_id', userId)
        .eq('status', 'pending');

    let alertedInvites = JSON.parse(sessionStorage.getItem('alertedInvites') || '[]');
    let newAlertsFound = false;

    if (pendingInvites) {
        pendingInvites.forEach(invite => {
            const teamName = invite.teams?.name || "Bir takım";
            if (!alertedInvites.includes(invite.id)) {
                showNotification(`🔔 ${teamName} seni takıma çağırıyor!`, "info");
                alertedInvites.push(invite.id);
                newAlertsFound = true;
            }
            mevcutHarmanlanmisList.push({
                id: invite.id, tablo: 'team_members', tip: 'davet',
                title: 'Yeni Takım Daveti!', text: `${teamName} seni takıma çağırıyor.`,
                created_at: invite.created_at || new Date().toISOString()
            });
        });
        if (newAlertsFound) sessionStorage.setItem('alertedInvites', JSON.stringify(alertedInvites));
    }

    mevcutHarmanlanmisList.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    window.myNotifications = mevcutHarmanlanmisList.map(item => {
        const styleObj = getIconForType(item.tip);
        return { ...item, icon: styleObj.icon, color: styleObj.color };
    });
    renderNotifications();

    if (window.globalInviteChannel) {
        window.supabaseClient.removeChannel(window.globalInviteChannel);
    }

    // TAKIM ÜYELERİ CANLI DİNLEYİCİSİ
    window.globalInviteChannel = window.supabaseClient.channel('global-invite-' + userId);
    window.globalInviteChannel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'team_members', filter: `user_id=eq.${userId}` }, 
        async (payload) => {
            const tId = payload.new.team_id;
            const status = payload.new.status; 
            
            const { data: teamData } = await window.supabaseClient.from('teams').select('name').eq('id', tId).single();
            const teamName = teamData ? teamData.name : "Bir takım";
            
            if (status === 'pending') {
                showNotification(`🔔 YENİ DAVET: ${teamName} seni takıma çağırıyor!`, "info");

                let alerted = JSON.parse(sessionStorage.getItem('alertedInvites') || '[]');
                alerted.push(payload.new.id);
                sessionStorage.setItem('alertedInvites', JSON.stringify(alerted));
                
                window.myNotifications.unshift({ 
                    id: payload.new.id, tablo: 'team_members', tip: 'davet', icon: 'fa-envelope-open-text', color: '#f39c12', 
                    title: 'Yeni Davet!', text: `${teamName} seni takıma çağırıyor.`,
                    created_at: payload.new.created_at || new Date().toISOString()
                });
            } else if (status === 'accepted') {
                showNotification(`✅ BAŞARILI: ${teamName} takımınız kuruldu!`, "success");
                
                window.myNotifications.unshift({ 
                    id: payload.new.id, tablo: 'team_members', tip: 'onay', icon: 'fa-check-circle', color: '#00e676', 
                    title: 'Takım Kuruldu!', text: `${teamName} takımınız başarıyla oluşturuldu.`,
                    created_at: payload.new.created_at || new Date().toISOString()
                });
            }

            window.myNotifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            window.renderNotifications();
        }).subscribe();
};

// ==========================================
// KVKK OPT-IN ÇEREZ (COOKIE) YÖNETİM SİSTEMİ
// ==========================================

const cookiePolicyContent = `
    <h4>Çerez Nedir ve Hangi Amaçlarla Kullanıyoruz?</h4>
    <p>Çerezler, OBB E-Spor platformunu ziyaret ettiğinizde tarayıcınız aracılığıyla cihazınıza yerleştirilen küçük metin dosyalarıdır. Platformumuzda çerezleri; kullanıcı hesaplarına güvenli girişi sağlamak, platform performansını ölçmek ve sponsorlarımızın/iş ortaklarımızın kişiselleştirilmiş içeriklerini sunmak amacıyla kullanmaktayız.</p>
    
    <h4>Sitemizde Kullanılan Çerez Türleri ve Hukuki Sebepleri</h4>
    <ul>
        <li><strong>Kesinlikle Gerekli (Zorunlu) Çerezler:</strong> Kullanıcı hesaplarına güvenli girişin sağlanması, turnuva kayıt formlarının çalışması ve siber güvenlik duvarlarının (anti-DDoS) asgari düzeyde yönetimi için teknik olarak zorunludur. Kapatılması sistemin çökmesine neden olabilir. KVKK m. 5/2-f kapsamında "veri sorumlusunun meşru menfaati"ne dayanılarak açık rızanız aranmaksızın işlenir.</li>
        <li><strong>İşlevsellik (Fonksiyonel) Çerezleri:</strong> Dil seçimlerinizi, görsel tema tercihlerinizi ve oyun içi hesap entegrasyonlarınızı hatırlayarak kişiselleştirilmiş bir arayüz sunar. Yalnızca "Açık Rıza" vermeniz halinde kullanılır.</li>
        <li><strong>Performans ve Analitik Çerezleri:</strong> Platformdaki turnuva fikstür sayfalarındaki yoğunluğun analizi ve hata kayıtlarının tutulması amacıyla istatistiksel veri üretir. Yalnızca "Açık Rıza" vermeniz halinde kullanılır.</li>
        <li><strong>Pazarlama ve Hedefleme Çerezleri:</strong> E-spor etkinlik sponsorlarının ve iş ortaklarımızın kişiselleştirilmiş reklamlar sunmasını sağlar. Yalnızca "Açık Rıza" vermeniz halinde kullanılır.</li>
    </ul>

    <h4>Çerezlerin Teknik Güvenliği</h4>
    <p>Hesap güvenliğinizi en üst düzeyde tutmak amacıyla, zorunlu çerezler şifrelenmiş HTTPS bağlantıları üzerinden iletilmesini garanti eden "Secure" ve istemci tarafındaki yetkisiz erişimleri engelleyen "HTTPOnly" güvenlik özellikleriyle yapılandırılmıştır.</p>

    <h4>Çerez Tercihlerinin Yönetimi</h4>
    <p>Veri minimizasyonu ilkesi gereği, çerez tercihlerinizi tarayıcınızın ayarlar menüsünden tamamen silebilirsiniz. Çerez yönetimindeki değişiklikleriniz anında işleme alınır.</p>

    <h4>Haklarınız</h4>
    <p>KVKK'nın 11. maddesi kapsamındaki haklarınızı kullanmak ve taleplerinizi iletmek için, aydınlatma metnimizde belirtilen iletişim kanallarımız üzerinden bize dilediğiniz zaman ulaşabilirsiniz.</p>
`;

function initCookieConsent() {
    const consentStatus = localStorage.getItem('obb_cookie_consent');

    if (consentStatus === 'accepted') {
        injectGoogleAnalytics();
    } else if (!consentStatus) {
        renderCookieBanner();
    }
}

function renderCookieBanner() {
    const style = document.createElement('style');
    style.innerHTML = `
        .cookie-banner-wrapper { position: fixed; bottom: 0; left: 0; width: 100%; background: rgba(10,10,10,0.98); border-top: 2px solid var(--neon-mor); z-index: 9999; padding: 25px 5%; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 20px; box-shadow: 0 -10px 40px rgba(0,0,0,0.9); transform: translateY(100%); transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
        .cookie-banner-wrapper.show { transform: translateY(0); }
        .cookie-text { flex: 1; min-width: 300px; }
        .cookie-text h3 { color: white; margin: 0 0 8px 0; font-size: 16px; font-weight: 900; text-transform: uppercase; }
        .cookie-text p { color: var(--gri-yazi); font-size: 12px; margin: 0; line-height: 1.5; }
        .cookie-text a { color: var(--neon-mor); text-decoration: underline; cursor: pointer; font-weight: bold; }
        .cookie-actions { display: flex; gap: 12px; flex-shrink: 0; }
        .cookie-btn { padding: 10px 20px; border-radius: 8px; font-weight: 900; font-size: 13px; cursor: pointer; transition: 0.3s; text-transform: uppercase; border: none; }
        .cookie-btn.accept { background: var(--neon-mor); color: white; box-shadow: 0 0 15px rgba(96, 29, 194, 0.3); }
        .cookie-btn.accept:hover { transform: translateY(-2px); box-shadow: 0 0 25px rgba(96, 29, 194, 0.6); }
        .cookie-btn.reject { background: transparent; color: var(--gri-yazi); border: 1px solid #444; }
        .cookie-btn.reject:hover { background: #222; color: white; border-color: #555; }
        
        .cookie-modal-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); z-index: 10000; justify-content: center; align-items: center; backdrop-filter: blur(5px); padding: 20px; }
        .cookie-modal-overlay.active { display: flex; animation: fadeIn 0.3s; }
        .cookie-modal { background: #0a0a0a; border: 1px solid #333; border-top: 4px solid var(--neon-mor); border-radius: 12px; width: 100%; max-width: 650px; max-height: 80vh; display: flex; flex-direction: column; position: relative; box-shadow: 0 20px 60px rgba(0,0,0,0.8); }
        .cookie-modal-close { position: absolute; top: 15px; right: 20px; font-size: 24px; color: var(--gri-yazi); cursor: pointer; transition: 0.3s; }
        .cookie-modal-close:hover { color: var(--kirmizi-iptal); }
        .cookie-modal-header { padding: 25px 25px 15px; border-bottom: 1px solid #222; }
        .cookie-modal-header h2 { font-size: 18px; color: var(--neon-mor); margin: 0; font-weight: 900; }
        .cookie-modal-body { padding: 25px; overflow-y: auto; font-size: 13px; color: #ddd; line-height: 1.6; }
        .cookie-modal-body h4 { color: var(--neon-mor); margin-top: 20px; margin-bottom: 10px; font-size: 14px; border-left: 3px solid var(--neon-mor); padding-left: 10px; }
        .cookie-modal-body h4:first-child { margin-top: 0; }
        .cookie-modal-body::-webkit-scrollbar { width: 6px; }
        .cookie-modal-body::-webkit-scrollbar-thumb { background: var(--neon-mor); border-radius: 4px; }
        @media (max-width: 768px) { .cookie-actions { width: 100%; justify-content: space-between; } .cookie-btn { flex: 1; text-align: center; } }
    `;
    document.head.appendChild(style);

    const banner = document.createElement('div');
    banner.id = 'obbCookieBanner';
    banner.className = 'cookie-banner-wrapper';
    banner.innerHTML = `
        <div class="cookie-text">
            <h3>Gizliliğinize Önem Veriyoruz</h3>
            <p>OBB E-SPORTS deneyiminizi geliştirmek, site trafiğini analiz etmek ve size özel içerikler sunmak için çerezler kullanıyoruz. Sadece zorunlu çerezleri kullanmayı tercih edebilir veya tümüne izin vererek deneyiminizi üst seviyeye taşıyabilirsiniz. Daha fazla bilgi için <a onclick="openCookiePolicyModal()">Çerez Politikamızı</a> inceleyin.</p>
        </div>
        <div class="cookie-actions">
            <button class="cookie-btn reject" onclick="handleCookieConsent('rejected')">Sadece Zorunlu Çerezler</button>
            <button class="cookie-btn accept" onclick="handleCookieConsent('accepted')">Tümünü Kabul Et</button>
        </div>
    `;
    document.body.appendChild(banner);

    const modal = document.createElement('div');
    modal.id = 'obbCookieModal';
    modal.className = 'cookie-modal-overlay';
    modal.innerHTML = `
        <div class="cookie-modal" onclick="event.stopPropagation()">
            <span class="cookie-modal-close" onclick="closeCookiePolicyModal()">&times;</span>
            <div class="cookie-modal-header">
                <h2>OBB E-SPOR ÇEREZ (COOKIE) POLİTİKASI</h2>
            </div>
            <div class="cookie-modal-body">${cookiePolicyContent}</div>
        </div>
    `;
    modal.onclick = closeCookiePolicyModal;
    document.body.appendChild(modal);

    setTimeout(() => { banner.classList.add('show'); }, 500);
}

window.handleCookieConsent = function(status) {
    localStorage.setItem('obb_cookie_consent', status);
    const banner = document.getElementById('obbCookieBanner');
    if (banner) {
        banner.classList.remove('show');
        setTimeout(() => { banner.remove(); }, 600);
    }
    if (status === 'accepted') {
        injectGoogleAnalytics();
    }
};

window.openCookiePolicyModal = function() {
    const modal = document.getElementById('obbCookieModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
};

window.closeCookiePolicyModal = function() {
    const modal = document.getElementById('obbCookieModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
};

function injectGoogleAnalytics() {
    if (document.getElementById('ga-script-inject')) return;

    const script1 = document.createElement('script');
    script1.id = 'ga-script-inject';
    script1.async = true;
    script1.src = 'https://www.googletagmanager.com/gtag/js?id=G-9VH0LHNCS3';
    document.head.appendChild(script1);

    const script2 = document.createElement('script');
    script2.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-9VH0LHNCS3');
    `;
    document.head.appendChild(script2);
}

window.addEventListener('DOMContentLoaded', () => {
    initCookieConsent();
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
