/* -------------------------------------------------------
   OBB E-SPOR - MERKEZİ ŞIK BİLDİRİM SİSTEMİ
   ------------------------------------------------------- */

const style = document.createElement('style');
style.textContent = `
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

    .custom-toast.show {
        transform: translateX(0);
        opacity: 1;
    }

    .custom-toast.hide {
        transform: translateX(120%);
        opacity: 0;
    }

    .toast-icon {
        font-size: 20px;
    }

    /* Durumlara Göre Tasarım */
    .toast-success { border-left: 4px solid #00d2ff; }
    .toast-success .toast-icon { color: #00d2ff; }

    .toast-error { border-left: 4px solid #ff4b4b; }
    .toast-error .toast-icon { color: #ff4b4b; }

    .toast-info { border-left: 4px solid #601dc2; }
    .toast-info .toast-icon { color: #601dc2; }
`;
document.head.appendChild(style);

// Sayfa yüklendiğinde container'ı oluştur
document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('toast-container')) {
        const container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
});

// Bildirim Gösterme Fonksiyonu (type: 'success', 'error', 'info')
window.showNotification = function(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `custom-toast toast-${type}`;

    // İkon belirleme
    let iconClass = 'fas fa-info-circle';
    if (type === 'success') iconClass = 'fas fa-check-circle';
    if (type === 'error') iconClass = 'fas fa-exclamation-circle';

    toast.innerHTML = `
        <i class="${iconClass} toast-icon"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    // Animasyonla girişi tetikle
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // 4 saniye sonra animasyonla çıkışı tetikle ve sil
    setTimeout(() => {
        toast.classList.replace('show', 'hide');
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 400); // CSS transition süresi kadar bekle
    }, 4000);
};
