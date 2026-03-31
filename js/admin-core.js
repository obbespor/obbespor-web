// admin-core.js - Tüm admin sayfaları için ortak işlevler

async function loadAdminComponents(activeTabId) {
    // 1. Header'ı Yükle
    try {
        const headerRes = await fetch("components/adminheader.html");
        if (headerRes.ok) {
            document.getElementById("header-alani").innerHTML = await headerRes.text();
            // Aktif sekmeyi renklendir
            if (activeTabId) {
                const activeTab = document.getElementById(activeTabId);
                if (activeTab) activeTab.classList.add('active-admin-tab');
            }
        }
    } catch (e) { console.error("Admin Header yüklenemedi", e); }

    // 2. Footer'ı Yükle
    try {
        const footerRes = await fetch("components/footer.html");
        if (footerRes.ok) document.getElementById("footer-alani").innerHTML = await footerRes.text();
    } catch (e) { console.error("Footer yüklenemedi", e); }

    // 3. Ortak Olayları Başlat (Scroll ve Bildirim tıklamaları)
    setupAdminEvents();
}

function setupAdminEvents() {
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

    document.addEventListener("click", function(event) {
        const isClickInsideBell = event.target.closest('.nav-bell') || event.target.closest('.floating-bell');
        const isClickInsidePanel = event.target.closest('.notif-panel');
        if (!isClickInsideBell && !isClickInsidePanel) {
            document.querySelectorAll('.notif-panel').forEach(p => p.classList.remove('active'));
        }
    });
}

// Güvenlik ve Yetki Kontrolü
async function checkAdminAuthAndInit(pageInitCallback) {
    try {
        if (typeof checkUserStatus === "function") await checkUserStatus();
        if (typeof initNotifications === "function") initNotifications();

        const { data: { user }, error: authError } = await window.supabaseClient.auth.getUser();
        if (authError || !user) throw new Error("Giriş yapılmadı.");

        const { data: profile, error: profileError } = await window.supabaseClient.from('profiles').select('role').eq('id', user.id).single();
        if (profileError || profile.role !== 'admin') throw new Error("Yetkisiz erişim.");

        const loader = document.getElementById('loadingScreen');
        if (loader) loader.style.display = 'none';

        // Güvenlik onaylandıktan sonra sayfanın kendi özel kodunu çalıştır
        if (typeof pageInitCallback === "function") {
            pageInitCallback();
        }
    } catch (err) {
        window.location.replace("index.html");
    }
}
