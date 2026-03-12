/* -------------------------------------------------------
   OBB E-SPOR - BİLDİRİM SİSTEMİ (TOAST & BİLDİRİM ZİLİ)
   ------------------------------------------------------- */

// 1. TÜM CSS KODLARINI (TOAST + ZİL PANELİ) DİNAMİK EKLİYORUZ
const style = document.createElement('style');
style.textContent = `
    /* ================= TOAST (ANLIK BİLDİRİM) CSS ================= */
    #toast-container {
        position: fixed;
        bottom: 30px;
        right: 30px;
        z-index: 999999;
        display: flex;
        flex-direction: column;
        gap: 15px;
        pointer-events: none;
    }

    .custom-toast {
        background: rgba(15, 15, 15, 0.95);
        color: #fff;
        padding: 16px 24px;
        border-radius: 12px;
        font-family: 'Poppins', sans-serif;
        font-size: 14px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 15px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.8);
        min-width: 300px;
        max-width: 400px;
        transform: translateX(120%);
        opacity: 0;
        transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.4s ease;
        backdrop-filter: blur(10px);
        pointer-events: auto;
    }

    .custom-toast.show { transform: translateX(0); opacity: 1; }
    .custom-toast.hide { transform: translateX(120%); opacity: 0; }
    .toast-icon { font-size: 20px; }

    .toast-success { border-left: 4px solid #00d2ff; }
    .toast-success .toast-icon { color: #00d2ff; }
    .toast-error { border-left: 4px solid #ff4b4b; }
    .toast-error .toast-icon { color: #ff4b4b; }
    .toast-info { border-left: 4px solid #601dc2; }
    .toast-info .toast-icon { color: #601dc2; }

    /* ================= BİLDİRİM MERKEZİ (ZİL VE PANEL) CSS ================= */
    .desktop-only { display: block; }
    .mobile-only { display: none; }
    
    .nav-bell { position: relative; margin-right: 10px; }
    .nav-bell a { font-size: 20px; position: relative; display: flex; align-items: center; color: var(--yazi-beyaz); text-decoration: none; transition: 0.3s; }
    .nav-bell a:hover { color: var(--neon-mor); }
    .notif-badge { position: absolute; top: -8px; right: -12px; background: #ff0000; color: white; font-size: 10px; font-weight: 900; padding: 2px 6px; border-radius: 50%; display: none; }
    
    /* Mobil Sabit Buton (Zil) */
    .floating-bell { position: fixed; bottom: 30px; right: 20px; width: 55px; height: 55px; background: #0d0d0d; border: 2px solid var(--neon-mor); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 22px; box-shadow: 0 0 20px rgba(96, 29, 194, 0.5); z-index: 2000; cursor: pointer; transition: 0.3s; }
    .floating-bell:hover { background: var(--neon-mor); transform: scale(1.1); }
    .floating-bell .notif-badge { top: -5px; right: -5px; font-size: 11px; padding: 3px 7px; border: 2px solid #0a0a0a; }
    
    /* Açılır Panel */
    .notif-panel { position: absolute; top: 120%; right: 0; width: 320px; background: #0a0a0a; border: 1px solid var(--neon-mor); border-radius: 12px; box-shadow: 0 15px 35px rgba(0,0,0,0.9); z-index: 2001; display: none; flex-direction: column; overflow: hidden; animation: menuFadeIn 0.2s ease-out; cursor: default;}
    .notif-panel.active { display: flex; }
    .notif-header { padding: 15px 20px; border-bottom: 1px solid #222; display: flex; justify-content: space-between; align-items: center; background: #111; }
    .notif-header h4 { font-size: 14px; color: var(--yazi-beyaz); margin: 0; }
    .clear-btn { background: none; border: none; color: #ff4b4b; font-size: 12px; cursor: pointer; font-family: 'Poppins', sans-serif; font-weight: bold; transition: 0.3s; }
    .clear-btn:hover { text-decoration: underline; color: #ff0000; }
    .notif-body { max-height: 300px; overflow-y: auto; }
    .notif-item { padding: 15px 20px; border-bottom: 1px solid #1a1a1a; display: flex; gap: 15px; font-size: 13px; color: #ccc; transition: 0.3s; cursor: pointer;}
    .notif-item:hover { background: rgba(96, 29, 194, 0.1); }
    .notif-item i { color: var(--neon-mor); font-size: 18px; margin-top: 3px; }
    .notif-item-content strong { color: white; display: block; margin-bottom: 3px; }
    .notif-empty { padding: 40px 20px; text-align: center; color: var(--gri-yazi); font-size: 13px; }
    
    @keyframes menuFadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

    @media (max-width: 768px) {
        .desktop-only { display: none !important; }
        .mobile-only { display: flex !important; }
        /* Toast ve mobil zilin üst üste binmemesi için */
        #toast-container { bottom: 100px; right: 20px; } 
        .notif-panel.mobile-panel { position: fixed; top: auto; bottom: 100px; right: 20px; width: calc(100% - 40px); max-width: 350px; }
    }
`;
document.head.appendChild(style);

// 2. SAYFA YÜKLENDİĞİNDE DOM ELEMENTLERİNİ OLUŞTUR
document.addEventListener('DOMContentLoaded', () => {
    
    // --- TOAST CONTAINER OLUŞTURMA ---
    if (!document.getElementById('toast-container')) {
        const container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    // --- MASAÜSTÜ ZİLİNİ NAVBAR'A EKLEME ---
    const navUl = document.querySelector('header nav ul');
    if (navUl) {
        const authLi = document.getElementById('authAction'); // Profil/Giriş butonunu bul
        const desktopBellLi = document.createElement('li');
        desktopBellLi.className = 'nav-bell desktop-only';
        desktopBellLi.innerHTML = `
            <a href="#" onclick="toggleNotifPanel('desktopPanel', event)">
                <i class="fas fa-bell"></i>
                <span class="notif-badge" id="badge-desktop">0</span>
            </a>
            <div class="notif-panel" id="desktopPanel" onclick="event.stopPropagation()">
                <div class="notif-header">
                    <h4>Bildirimler</h4>
                    <button class="clear-btn" onclick="clearNotifications(event)">Tümünü Temizle</button>
                </div>
                <div class="notif-body" id="notif-list-desktop"></div>
            </div>
        `;
        // KATIL butonundan hemen önceye ekle
        if (authLi) {
            navUl.insertBefore(desktopBellLi, authLi);
        } else {
            navUl.appendChild(desktopBellLi);
        }
    }

    // --- MOBİL BİLDİRİM BUTONUNU BODY'YE EKLEME ---
    const mobileBellDiv = document.createElement('div');
    mobileBellDiv.className = 'floating-bell mobile-only';
    mobileBellDiv.setAttribute('onclick', "toggleNotifPanel('mobilePanel', event)");
    mobileBellDiv.innerHTML = `
        <i class="fas fa-bell"></i>
        <span class="notif-badge" id="badge-mobile">0</span>
        <div class="notif-panel mobile-panel" id="mobilePanel" onclick="event.stopPropagation()">
            <div class="notif-header">
                <h4>Bildirimler</h4>
                <button class="clear-btn" onclick="clearNotifications(event)">Tümünü Temizle</button>
            </div>
            <div class="notif-body" id="notif-list-mobile"></div>
        </div>
    `;
    document.body.appendChild(mobileBellDiv);

    // Sayfa açıldığında panel listesini çiz
    if(typeof window.renderNotifications === 'function'){
        window.renderNotifications();
    }
});


// 3. FONKSİYONLAR (GLOBAL ERİŞİM İÇİN)

// A. Anlık Toast Bildirimi Gösterme Fonksiyonu
window.showNotification = function(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `custom-toast toast-${type}`;

    let iconClass = 'fas fa-info-circle';
    if (type === 'success') iconClass = 'fas fa-check-circle';
    if (type === 'error') iconClass = 'fas fa-exclamation-circle';

    toast.innerHTML = `
        <i class="${iconClass} toast-icon"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    setTimeout(() => {
        toast.classList.replace('show', 'hide');
        setTimeout(() => {
            if (toast.parentElement) toast.remove();
        }, 400); 
    }, 4000);
};

// B. Panel Bildirim Verileri
window.myNotifications = [
    { icon: "fa-users", title: "Takım Daveti", text: "BOSSESPOR takımından davet aldın!" },
    { icon: "fa-trophy", title: "Turnuva", text: "Valorant Turnuvası kayıtları açıldı." }
];

// C. Paneli Render Etme Fonksiyonu
window.renderNotifications = function() {
    const deskList = document.getElementById("notif-list-desktop");
    const mobList = document.getElementById("notif-list-mobile");
    const deskBadge = document.getElementById("badge-desktop");
    const mobBadge = document.getElementById("badge-mobile");

    let htmlContent = "";

    if (window.myNotifications.length === 0) {
        htmlContent = `<div class="notif-empty">Şu an yeni bir bildiriminiz yok.</div>`;
        if (deskBadge) deskBadge.style.display = "none";
        if (mobBadge) mobBadge.style.display = "none";
    } else {
        window.myNotifications.forEach(notif => {
            htmlContent += `
                <div class="notif-item">
                    <i class="fas ${notif.icon}"></i>
                    <div class="notif-item-content">
                        <strong>${notif.title}</strong>
                        <span>${notif.text}</span>
                    </div>
                </div>
            `;
        });
        if (deskBadge) { deskBadge.style.display = "block"; deskBadge.innerText = window.myNotifications.length; }
        if (mobBadge) { mobBadge.style.display = "block"; mobBadge.innerText = window.myNotifications.length; }
    }

    if (deskList) deskList.innerHTML = htmlContent;
    if (mobList) mobList.innerHTML = htmlContent;
};

// D. Paneli Aç/Kapa Fonksiyonu
window.toggleNotifPanel = function(panelId, event) {
    event.preventDefault();
    const panel = document.getElementById(panelId);
    const isActive = panel.classList.contains("active");
    
    // Açık olan tüm panelleri kapat
    document.querySelectorAll('.notif-panel').forEach(p => p.classList.remove('active'));
    
    // Eğer zaten açık değilse tıklandığında aç
    if (!isActive && panel) {
        panel.classList.add("active");
    }
};

// E. Tüm Bildirimleri Temizleme
window.clearNotifications = function(event) {
    if(event) event.stopPropagation(); // Butona tıklayınca panelin kapanmasını engeller
    window.myNotifications = [];
    window.renderNotifications();
};

// Dışarı tıklanınca açık panelleri kapat
document.addEventListener("click", function(event) {
    const isClickInsideBell = event.target.closest('.nav-bell') || event.target.closest('.floating-bell');
    if (!isClickInsideBell) {
        document.querySelectorAll('.notif-panel').forEach(p => p.classList.remove('active'));
    }
});
