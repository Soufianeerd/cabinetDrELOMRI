document.addEventListener('DOMContentLoaded', () => {
    // --- 1. NAVIGATION & MOBILE MENU ---
    const header = document.querySelector('.header');
    const navToggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.nav-links');
    const navItems = document.querySelectorAll('.nav-links a');
  
    // Header scroll effect
    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        header.classList.add('is-scrolled');
      } else {
        header.classList.remove('is-scrolled');
      }
    });

    // Mobile menu toggle
    if (navToggle) {
      navToggle.addEventListener('click', () => {
        navToggle.classList.toggle('is-open');
        const mainNav = document.querySelector('.main-nav');
        const navActions = document.querySelector('.nav-actions');
        if (mainNav) mainNav.classList.toggle('is-open');
        if (navActions) navActions.classList.toggle('is-open');
        
        const isExpanded = navToggle.getAttribute('aria-expanded') === 'true' || false;
        navToggle.setAttribute('aria-expanded', !isExpanded);
      });
    }

    // Close mobile menu on link click
    const allNavLinks = document.querySelectorAll('.nav-links a, .nav-actions a');
    allNavLinks.forEach(item => {
      item.addEventListener('click', () => {
        if (document.querySelector('.main-nav').classList.contains('is-open')) {
          navToggle.classList.remove('is-open');
          document.querySelector('.main-nav').classList.remove('is-open');
          document.querySelector('.nav-actions').classList.remove('is-open');
          navToggle.setAttribute('aria-expanded', 'false');
        }
      });
    });

    // Active link highlighting on scroll
    const sections = document.querySelectorAll('section[id]');
    
    function highlightNav() {
      const scrollY = window.scrollY;
      sections.forEach(current => {
        const sectionHeight = current.offsetHeight;
        const sectionTop = current.offsetTop - 100;
        const sectionId = current.getAttribute('id');
        const navItem = document.querySelector(`.nav-links a[href*=${sectionId}]`);
        
        if (navItem && scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
          navItems.forEach(n => n.classList.remove('active'));
          navItem.classList.add('active');
        }
      });
    }
    
    window.addEventListener('scroll', highlightNav);

    // --- 2. STATS ANIMATION (Compteurs) ---
    const stats = document.querySelectorAll('.proof-value.numeric[data-target]');
    let hasAnimatedStats = false;
    
    function animateStats() {
      if (hasAnimatedStats) return;
      
      const statsSection = document.querySelector('.proof-strip');
      if (!statsSection) return;
      
      const rect = statsSection.getBoundingClientRect();
      const isVisible = (rect.top <= (window.innerHeight || document.documentElement.clientHeight) * 0.8);
      
      if (isVisible) {
        hasAnimatedStats = true;
        stats.forEach(stat => {
          const target = +stat.getAttribute('data-target');
          const duration = 2000; // 2 seconds
          const increment = target / (duration / 16); // 60fps
          
          let current = 0;
          const updateCounter = () => {
            current += increment;
            if (current < target) {
              stat.innerText = Math.ceil(current);
              requestAnimationFrame(updateCounter);
            } else {
              stat.innerText = target;
            }
          };
          updateCounter();
        });
      }
    }
    
    window.addEventListener('scroll', animateStats);
    animateStats(); // Check on load

    // --- 3. SCROLL REVEAL (fade-up) ---
    const revealElements = document.querySelectorAll('.fade-up');
    
    const revealCallback = (entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    };
    
    const revealOptions = {
      threshold: 0.15,
      rootMargin: "0px 0px -50px 0px"
    };
    
    const revealObserver = new IntersectionObserver(revealCallback, revealOptions);
    
    revealElements.forEach(el => {
      revealObserver.observe(el);
    });
});
