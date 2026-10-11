// JS/script.js
document.addEventListener('DOMContentLoaded', function() {
    // Подсветка активной страницы в меню
    document.querySelectorAll('.nav-link').forEach(link => {
        const currentPage = window.location.href.split('/').pop();
        const linkPage = link.href.split('/').pop();
        
        if (currentPage === linkPage || 
           (currentPage === 'index.html' && linkPage === '')) {
            link.classList.add('active');
        }
    });

    // Слайдер изображений
    const leftArrow = document.querySelector('.slider-arrow--left');
    const rightArrow = document.querySelector('.slider-arrow--right');
    const mainImage = document.getElementById('mainImage');
    
    const images = [
        'Images/Terr1.jpg',
        'Images/Terr2.jpg',
        'Images/Terr3.jpg'
    ];
    
    let currentImageIndex = 0;

    // Обработчики для стрелок
    leftArrow.addEventListener('click', () => {
        currentImageIndex = (currentImageIndex - 1 + images.length) % images.length;
        mainImage.src = images[currentImageIndex];
    });

    rightArrow.addEventListener('click', () => {
        currentImageIndex = (currentImageIndex + 1) % images.length;
        mainImage.src = images[currentImageIndex];
    });

    // Предзагрузка изображений
    images.forEach(imgSrc => {
        const img = new Image();
        img.src = imgSrc;
    });
});