window.preselectCase = function(caseValue) {
  const formSection = document.getElementById('contact');
  if (formSection) {
    formSection.scrollIntoView({ behavior: 'smooth' });
    const radio = document.querySelector(`input[name="caseType"][value="${caseValue}"]`);
    if (radio) {
      radio.checked = true;
      // Déclencher l'événement change pour mettre à jour l'UI (bordure bleue, etc.)
      radio.dispatchEvent(new Event('change', { bubbles: true }));
      
      // On passe automatiquement à l'étape suivante après 600ms pour plus de fluidité
      setTimeout(() => {
        const nextBtn = document.getElementById('nextBtn');
        if (nextBtn && nextBtn.style.display !== 'none') {
          nextBtn.click();
        }
      }, 600);
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('smartContactForm');
  if (!form) return;

  // Initialize anti-spam timestamp
  const startedAtInput = document.getElementById('startedAt');
  if (startedAtInput) {
    startedAtInput.value = Date.now().toString();
  }

  const steps = Array.from(form.querySelectorAll('.smart-form-step'));
  const nextBtn = document.getElementById('nextBtn');
  const prevBtn = document.getElementById('prevBtn');
  const submitBtn = document.getElementById('submitBtn');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  const doctolibRedirect = document.getElementById('doctolibRedirect');
  const formMessage = document.getElementById('formMessage');
  
  let currentStep = 1;
  const totalSteps = steps.length;
  let isDoctolibFlow = false;

  // Init Case Types Selection
  const caseTypeCards = form.querySelectorAll('.case-type-card');
  const caseTypeInputs = form.querySelectorAll('input[name="caseType"]');
  
  caseTypeInputs.forEach(input => {
    input.addEventListener('change', (e) => {
      // Update UI
      caseTypeCards.forEach(card => card.classList.remove('is-selected'));
      input.closest('.case-type-card').classList.add('is-selected');

      const selectedType = e.target.value;
      if (selectedType === 'soin_courant') {
        isDoctolibFlow = true;
        doctolibRedirect.style.display = 'block';
        nextBtn.style.display = 'none';
      } else {
        isDoctolibFlow = false;
        doctolibRedirect.style.display = 'none';
        nextBtn.style.display = 'block';
        updateConditionalFields(selectedType);
      }
    });
  });

  // Manage Conditional Fields
  function updateConditionalFields(type) {
    const conditionals = form.querySelectorAll('.conditional-group');
    conditionals.forEach(group => {
      const showFor = group.getAttribute('data-show-for');
      if (showFor && showFor.includes(type)) {
        group.style.display = 'block';
      } else {
        group.style.display = 'none';
        // Clear value when hidden
        const select = group.querySelector('select');
        if (select) select.value = '';
      }
    });
  }

  // Handle Radio interactions (docs)
  const docsCheckboxes = form.querySelectorAll('input[name="docs"]');
  const docsNoneRadio = document.getElementById('docsNone');
  const docsUnknownRadio = document.getElementById('docsUnknown');
  
  docsCheckboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) {
        if(docsNoneRadio) docsNoneRadio.checked = false;
        if(docsUnknownRadio) docsUnknownRadio.checked = false;
      }
    });
  });

  const clearDocsCheckboxes = () => {
    docsCheckboxes.forEach(cb => cb.checked = false);
  };
  if(docsNoneRadio) docsNoneRadio.addEventListener('change', clearDocsCheckboxes);
  if(docsUnknownRadio) docsUnknownRadio.addEventListener('change', clearDocsCheckboxes);

  // Textarea char count
  const messageEl = document.getElementById('message');
  const charCountEl = document.querySelector('.char-count');
  if (messageEl && charCountEl) {
    messageEl.addEventListener('input', () => {
      charCountEl.textContent = `${messageEl.value.length} / 500`;
    });
  }

  // Navigation Logic
  function updateUI() {
    steps.forEach(step => {
      step.classList.remove('is-active');
      if (parseInt(step.getAttribute('data-step')) === currentStep) {
        step.classList.add('is-active');
      }
    });

    // Update Progress
    const progressPercentage = ((currentStep) / totalSteps) * 100;
    progressFill.style.width = `${progressPercentage}%`;
    progressText.textContent = `Étape ${currentStep} sur ${totalSteps}`;

    // Update Buttons
    if (currentStep === 1) {
      prevBtn.style.display = 'none';
      if (!isDoctolibFlow) nextBtn.style.display = 'block';
      submitBtn.style.display = 'none';
    } else if (currentStep === totalSteps) {
      prevBtn.style.display = 'block';
      nextBtn.style.display = 'none';
      submitBtn.style.display = 'block';
    } else {
      prevBtn.style.display = 'block';
      nextBtn.style.display = 'block';
      submitBtn.style.display = 'none';
    }
  }

  function validateStep(stepIndex) {
    const step = form.querySelector(`.smart-form-step[data-step="${stepIndex}"]`);
    let isValid = true;
    
    // Clear old errors
    step.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    formMessage.style.display = 'none';

    if (stepIndex === 1) {
      const checked = form.querySelector('input[name="caseType"]:checked');
      if (!checked) {
        isValid = false;
        showError("Veuillez sélectionner un motif de consultation.");
      } else if (checked.value === 'soin_courant') {
        isValid = false; // Block going next
      }
    } else if (stepIndex === 5) {
      const fname = form.querySelector('#firstName');
      const lname = form.querySelector('#lastName');
      const email = form.querySelector('#email');
      const phone = form.querySelector('#phone');

      if (!fname.value.trim()) { isValid = false; fname.classList.add('error'); }
      if (!lname.value.trim()) { isValid = false; lname.classList.add('error'); }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email.value.trim() || !emailRegex.test(email.value)) { 
        isValid = false; 
        email.classList.add('error'); 
      }
      
      // Basic phone check (allow some formats like +33, spaces, dots)
      if (!phone.value.trim() || phone.value.replace(/[^0-9\+]/g, '').length < 9) { 
        isValid = false; 
        phone.classList.add('error'); 
      }
      
      if (!isValid) showError("Merci de compléter les champs obligatoires (Prénom, Nom, Email, Téléphone valide).");
    } else if (stepIndex === 6) {
      const consent1 = form.querySelector('input[name="consentData"]');
      const consent2 = form.querySelector('input[name="consentDiagnosis"]');
      if (!consent1.checked || !consent2.checked) {
        isValid = false;
        showError("Veuillez accepter les conditions pour soumettre votre demande.");
      }
    }

    return isValid;
  }

  function showError(msg) {
    formMessage.textContent = msg;
    formMessage.className = 'form-message form-alert error';
    formMessage.style.display = 'flex';
  }

  nextBtn.addEventListener('click', () => {
    if (validateStep(currentStep)) {
      currentStep++;
      updateUI();
    }
  });

  prevBtn.addEventListener('click', () => {
    currentStep--;
    updateUI();
  });

  // Submit Handler
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateStep(6)) return;

    // Honeypot check
    const website = form.querySelector('#website')?.value;
    if (website) {
      // Bot detected, silently ignore
      showSuccessMessage();
      return;
    }

    // Timer check (too fast)
    const startedAt = parseInt(form.querySelector('#startedAt')?.value || "0", 10);
    const now = Date.now();
    if (now - startedAt < 4000) { // Under 4 seconds
      showSuccessMessage(); // Pretend it worked
      return;
    }

    // Build the request object
    const formData = new FormData(form);
    const type = formData.get('caseType');

    // Reject soin_courant just in case
    if (type === 'soin_courant') {
      showError("Ce motif relève d’une prise de rendez-vous classique. Merci de passer par Doctolib.");
      return;
    }

    const preferredDays = [];
    form.querySelectorAll('input[name="preferredDays"]:checked').forEach(el => preferredDays.push(el.value));

    const docs = {
      panoramic: false, coneBeam: false, quote: false, report: false, none: false, unknown: false
    };
    form.querySelectorAll('input[name="docs"]:checked').forEach(el => {
      if (el.value === 'panoramique') docs.panoramic = true;
      if (el.value === 'conebeam') docs.coneBeam = true;
      if (el.value === 'devis') docs.quote = true;
      if (el.value === 'compte_rendu') docs.report = true;
    });
    if (form.querySelector('#docsNone')?.checked) docs.none = true;
    if (form.querySelector('#docsUnknown')?.checked) docs.unknown = true;

    const caseRequest = {
      type: type,
      patient: {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        email: formData.get('email'),
        phone: formData.get('phone')
      },
      clinical: {
        teethCount: formData.get('teethCount') || "",
        area: formData.get('area') || "",
        missingSince: formData.get('missingSince') || "",
        pain: formData.get('pain') || "",
        swelling: formData.get('swelling') || "",
        previousTreatment: formData.get('previousTreatment') || "",
        previousQuote: formData.get('previousQuote') || "",
        imagingAvailable: docs.panoramic || docs.coneBeam ? "oui" : "non"
      },
      documents: docs,
      availability: {
        preferredMoment: formData.get('preferredMoment') || "",
        preferredDays: preferredDays,
        urgency: formData.get('urgency') || "",
        canBeCalledQuickly: formData.get('canBeCalledQuickly') || ""
      },
      consent: {
        dataUse: formData.get('consentData') === 'on',
        noRemoteDiagnosis: formData.get('consentDiagnosis') === 'on'
      },
      message: formData.get('message') || ""
    };

    // UI Loading state
    const originalText = submitBtn.innerText;
    submitBtn.innerText = 'Envoi en cours...';
    submitBtn.disabled = true;
    prevBtn.disabled = true;

    try {
      const response = await fetch('/api/send-case-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(caseRequest)
      });

      const result = await response.json().catch(() => ({ ok: false, error: "SERVER_ERROR", message: "Une erreur inattendue s'est produite." }));

      if (!response.ok || !result.ok) {
        throw new Error(result.message || "Erreur réseau ou serveur");
      }

      showSuccessMessage(result.message);

    } catch (error) {
      console.error('Erreur lors de l\'envoi de la demande.');
      submitBtn.innerText = originalText;
      submitBtn.disabled = false;
      prevBtn.disabled = false;
      showError(error.message || "L’envoi n’a pas pu aboutir. Vous pouvez contacter le cabinet par téléphone ou réessayer plus tard.");
    }
  });

  function showSuccessMessage(customMessage) {
    const msg = customMessage || "Votre demande a bien été transmise au cabinet.";
    formMessage.innerHTML = `<i class="fas fa-check-circle" style="font-size:2rem; color:var(--color-success); margin-bottom:1rem; display:block;"></i>
    <strong style="font-size:1.1rem;">${msg}</strong><br><br>Elle sera étudiée afin de déterminer l’orientation la plus adaptée. Cette demande ne remplace pas une consultation.`;
    formMessage.className = 'form-message form-alert success';
    formMessage.style.display = 'flex';
    formMessage.style.flexDirection = 'column';
    formMessage.style.alignItems = 'center';
    formMessage.style.textAlign = 'center';
    
    form.reset();
    currentStep = 1;
    
    steps.forEach(step => step.style.display = 'none');
    document.querySelector('.smart-form-progress').style.display = 'none';
    submitBtn.style.display = 'none';
    prevBtn.style.display = 'none';
    nextBtn.style.display = 'none';
  }

  // Init
  updateUI();
});
