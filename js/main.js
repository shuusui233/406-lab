document.addEventListener('DOMContentLoaded', function() {
    const fullpageContainer = document.getElementById('fullpageContainer');
    const navLinks = document.querySelectorAll('.nav-link');
    const scrollDots = document.querySelectorAll('.scroll-dot');
    const sections = document.querySelectorAll('.section-item');
    
    let currentIndex = 0;
    let isAnimating = false;
    const totalSections = sections.length;

    function goToSection(index) {
        if (index < 0 || index >= totalSections || isAnimating) return;
        
        isAnimating = true;
        currentIndex = index;
        
        fullpageContainer.style.transform = 'translateY(-' + (currentIndex * 100) + 'vh)';
        
        updateActiveState();
        
        setTimeout(function() {
            isAnimating = false;
        }, 1000);
    }

    function updateActiveState() {
        navLinks.forEach(function(link, i) {
            link.classList.remove('active');
            if (i === currentIndex) {
                link.classList.add('active');
            }
        });

        scrollDots.forEach(function(dot, i) {
            dot.classList.remove('active');
            if (i === currentIndex) {
                dot.classList.add('active');
            }
        });
    }

    navLinks.forEach(function(link) {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const index = parseInt(this.getAttribute('data-index'));
            goToSection(index);
        });
    });

    scrollDots.forEach(function(dot) {
        dot.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            goToSection(index);
        });
    });

    let wheelTimeout;
    document.addEventListener('wheel', function(e) {
        e.preventDefault();
        
        clearTimeout(wheelTimeout);
        wheelTimeout = setTimeout(function() {
            if (isAnimating) return;
            
            if (e.deltaY > 0) {
                goToSection(currentIndex + 1);
            } else {
                goToSection(currentIndex - 1);
            }
        }, 50);
    }, { passive: false });

    document.addEventListener('keydown', function(e) {
        if (isAnimating) return;
        
        if (e.key === 'ArrowDown' || e.key === 'PageDown') {
            e.preventDefault();
            goToSection(currentIndex + 1);
        } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
            e.preventDefault();
            goToSection(currentIndex - 1);
        }
    });
});
