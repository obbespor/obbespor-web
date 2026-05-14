async function loadComponent(id, url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Dosya bulunamadı: " + url);
        document.getElementById(id).innerHTML = await response.text();
    } catch (error) {
        console.error(`Bileşen Yükleme Hatası (${id}):`, error);
    }
}

async function initCore() {
    // 1. Header ve Footer'ı bekle ve yükle
    await Promise.all([
        loadComponent("header-alani", "components/header.html"),
        loadComponent("footer-alani", "components/footer.html")
    ]);

    // *** YENİ: Header yüklendiği için duyuruyu anında tetikliyoruz ***
    initAnnouncement();

    // 2. Scroll Efektini Başlat
    let lastScrollTop = 0;
    const header = document.getElementById("mainHeader");
    if (header) {
        window.addEventListener("scroll", function() {
            let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            if (scrollTop > lastScrollTop && scrollTop > 100) header.classList.add("nav-hidden");
            else header.classList.remove("nav-hidden");
            lastScrollTop = scrollTop <= 0 ? 0 : scrollTop; 
        }, false);
    }

    // 3. Auth ve Bildirim Sistemini Tetikle
    if (typeof checkUserStatus === "function") await checkUserStatus();
    if (typeof initNotifications === "function") initNotifications();

    // 4. Dışarı Tıklayınca Bildirim Panelini Kapatma
    document.addEventListener("click", function(event) {
        const isClickInsideBell = event.target.closest('.nav-bell') || event.target.closest('.floating-bell');
        const isClickInsidePanel = event.target.closest('.notif-panel');
        if (!isClickInsideBell && !isClickInsidePanel) {
            document.querySelectorAll('.notif-panel').forEach(p => p.classList.remove('active'));
        }
    });
}

// Tüm çekirdek sistemi başlat
document.addEventListener('DOMContentLoaded', initCore);


// ==========================================
// --- GLOBAL DUYURU ÇUBUĞU KONTROLÜ ---
// ==========================================
window.closeAnnouncement = function() {
    const banner = document.getElementById('global-announcement');
    if (banner) {
        banner.style.display = 'none';
        // Kullanıcı kapattı, oturum boyunca bir daha gösterme
        sessionStorage.setItem('obb_announcement_closed', 'true');
    }
};

function initAnnouncement() {
    const banner = document.getElementById('global-announcement');
    // Eğer element HTML'de varsa ve kullanıcı daha önce kapatmadıysa göster
    if (banner && !sessionStorage.getItem('obb_announcement_closed')) {
        banner.style.display = 'flex';
    }
}
