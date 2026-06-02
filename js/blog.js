document.addEventListener('DOMContentLoaded', () => {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const blogCards = document.querySelectorAll('.blog-card');
  const blogLinks = document.querySelectorAll('.blog-link');
  const blogLinkBacks = document.querySelectorAll('.blog-link-back');

  // Gérer le retournement interactif de la carte
  blogLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      // Sélectionne l'élément .blog-card parent le plus proche
      const card = e.target.closest('.blog-card');
      if (card) {
        card.classList.add('flipped');
      }
    });
  });

  // Gérer le bouton retour sur le verso de la carte
  blogLinkBacks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const card = e.target.closest('.blog-card');
      if (card) {
        card.classList.remove('flipped');
      }
    });
  });

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active class from all buttons
      filterBtns.forEach(b => b.classList.remove('active'));
      // Add active class to clicked button
      btn.classList.add('active');

      const filterValue = btn.getAttribute('data-filter');

      blogCards.forEach(card => {
        const category = card.getAttribute('data-category');
        
        if (filterValue === 'all' || category === filterValue) {
          card.style.display = 'flex';
          // Trigger reflow for animation if needed
          void card.offsetWidth;
          card.style.opacity = '1';
          card.style.transform = 'translateY(0)';
        } else {
          card.style.opacity = '0';
          card.style.transform = 'translateY(10px)';
          setTimeout(() => {
            if (!card.classList.contains('showing')) {
              card.style.display = 'none';
            }
          }, 300); // Wait for transition
        }
      });
    });
  });
});
