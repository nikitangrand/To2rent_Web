document.addEventListener('DOMContentLoaded', function() {
    const mainImage = document.getElementById('main-image');
    const thumbnails = document.querySelectorAll('.thumbnail');
    
    // Проверка элементов
    if (!mainImage || thumbnails.length === 0) return;

    thumbnails.forEach(thumbnail => {
        thumbnail.addEventListener('click', function() {
            // Плавное переключение
            mainImage.style.opacity = '0';
            
            setTimeout(() => {
                mainImage.src = this.src;
                mainImage.alt = this.alt;
                thumbnails.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                mainImage.style.opacity = '1';
            }, 300);
        });
    });
});