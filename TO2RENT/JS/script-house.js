document.addEventListener('DOMContentLoaded', function() {
    // Проверяем существование контейнеров перед добавлением обработчиков
    const containers = ['apartmentsContainer', 'housesContainer'];
    containers.forEach(containerId => {
        const container = document.getElementById(containerId);
        if (container) {
            container.addEventListener('click', function(e) {
                if (e.target.classList.contains('card-image')) {
                    const card = e.target.closest('.appart--card');
                    card.classList.toggle('active');
                }
            });
        }
    });
});