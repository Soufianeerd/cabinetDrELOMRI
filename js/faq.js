document.addEventListener('DOMContentLoaded', () => {
  const faqQuestions = document.querySelectorAll('.faq-question');

  faqQuestions.forEach(question => {
    question.addEventListener('click', () => {
      const isExpanded = question.getAttribute('aria-expanded') === 'true';
      const answer = question.nextElementSibling;
      
      // Close all other questions
      faqQuestions.forEach(otherQ => {
        if (otherQ !== question) {
          otherQ.setAttribute('aria-expanded', 'false');
          if (otherQ.nextElementSibling) {
            otherQ.nextElementSibling.style.maxHeight = null;
          }
        }
      });
      
      // Toggle current question
      if (isExpanded) {
        question.setAttribute('aria-expanded', 'false');
        answer.style.maxHeight = null;
      } else {
        question.setAttribute('aria-expanded', 'true');
        answer.style.maxHeight = answer.scrollHeight + 'px';
      }
    });
  });

  // Handle resize to adjust max-height of open accordion
  window.addEventListener('resize', () => {
    faqQuestions.forEach(question => {
      if (question.getAttribute('aria-expanded') === 'true') {
        const answer = question.nextElementSibling;
        answer.style.maxHeight = answer.scrollHeight + 'px';
      }
    });
  });
});
