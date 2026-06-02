exports.handler = async (event, context) => {
  // 1. Accepter uniquement POST
  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      body: JSON.stringify({ ok: false, error: "METHOD_NOT_ALLOWED", message: "Méthode non autorisée." }) 
    };
  }

  // Vérifier la présence des variables d'environnement obligatoires
  if (!process.env.RESEND_API_KEY || !process.env.CASE_REQUEST_TO_EMAIL || !process.env.CASE_REQUEST_FROM_EMAIL) {
    console.error("Missing email configuration: RESEND_API_KEY, CASE_REQUEST_TO_EMAIL or CASE_REQUEST_FROM_EMAIL is missing.");
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: "SERVER_ERROR", message: "L’envoi n’a pas pu aboutir. Merci de réessayer plus tard ou de contacter le cabinet par téléphone." })
    };
  }

  // Refuser les body trop gros (ex: > 50kb pour empêcher les abus)
  if (event.body && event.body.length > 50000) {
    return {
      statusCode: 413,
      body: JSON.stringify({ ok: false, error: "PAYLOAD_TOO_LARGE", message: "La requête est trop volumineuse." })
    };
  }

  let data;
  try {
    data = JSON.parse(event.body || "{}");
  } catch (err) {
    return { 
      statusCode: 400, 
      body: JSON.stringify({ ok: false, error: "INVALID_JSON", message: "Format de requête invalide." }) 
    };
  }

  // --- FONCTIONS DE SANITATION ---
  const sanitizeText = (value, maxLength = 255) => {
    if (typeof value !== 'string') return '';
    return value
      .trim()
      .substring(0, maxLength)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const normalizeBoolean = (value) => {
    return value === true || value === "oui" || value === "on";
  };

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return typeof email === 'string' && emailRegex.test(email);
  };

  const safeJoinArray = (arr, maxLength = 50) => {
    if (!Array.isArray(arr)) return '';
    return arr.map(item => sanitizeText(item, maxLength)).join(', ');
  };

  // --- VALIDATION DES DONNÉES ---
  const acceptedTypes = [
    'implant_unitaire', 'plusieurs_dents_absentes', 'prothese_implant', 
    'greffe_osseuse', 'extraction_complexe', 'dents_sagesse', 
    'second_avis', 'douleur_complication'
  ];

  const type = sanitizeText(data.type, 50);
  if (!type || type === 'soin_courant' || !acceptedTypes.includes(type)) {
    return { 
      statusCode: 400, 
      body: JSON.stringify({ ok: false, error: "INVALID_REQUEST", message: "Motif de consultation non valide." }) 
    };
  }

  const patient = data.patient || {};
  const firstName = sanitizeText(patient.firstName, 50);
  const lastName = sanitizeText(patient.lastName, 50);
  const email = sanitizeText(patient.email, 100);
  const phone = sanitizeText(patient.phone, 20);

  if (!firstName || !lastName) {
    return { 
      statusCode: 400, 
      body: JSON.stringify({ ok: false, error: "INVALID_REQUEST", message: "Le prénom et le nom sont obligatoires." }) 
    };
  }

  if (!email && !phone) {
    return { 
      statusCode: 400, 
      body: JSON.stringify({ ok: false, error: "INVALID_REQUEST", message: "Un email ou numéro de téléphone est requis." }) 
    };
  }

  if (email && !isValidEmail(email)) {
    return { 
      statusCode: 400, 
      body: JSON.stringify({ ok: false, error: "INVALID_REQUEST", message: "L'adresse email n'est pas valide." }) 
    };
  }

  const consent = data.consent || {};
  if (!normalizeBoolean(consent.dataUse) || !normalizeBoolean(consent.noRemoteDiagnosis)) {
    return { 
      statusCode: 400, 
      body: JSON.stringify({ ok: false, error: "INVALID_REQUEST", message: "Les consentements obligatoires n'ont pas été acceptés." }) 
    };
  }

  const message = sanitizeText(data.message, 1500);

  // --- SANITATION DES AUTRES CHAMPS ---
  const clinical = data.clinical || {};
  const teethCount = sanitizeText(clinical.teethCount, 50);
  const area = sanitizeText(clinical.area, 50);
  const missingSince = sanitizeText(clinical.missingSince, 50);
  const pain = sanitizeText(clinical.pain, 10);
  const swelling = sanitizeText(clinical.swelling, 10);
  const previousTreatment = sanitizeText(clinical.previousTreatment, 10);
  const previousQuote = sanitizeText(clinical.previousQuote, 10);

  const docs = data.documents || {};
  const hasPanoramic = normalizeBoolean(docs.panoramic);
  const hasConeBeam = normalizeBoolean(docs.coneBeam);
  const hasQuote = normalizeBoolean(docs.quote);
  const hasReport = normalizeBoolean(docs.report);

  const availability = data.availability || {};
  const urgency = sanitizeText(availability.urgency, 50);
  const preferredMoment = sanitizeText(availability.preferredMoment, 50);
  const preferredDays = safeJoinArray(availability.preferredDays);
  const canBeCalledQuickly = sanitizeText(availability.canBeCalledQuickly, 10);

  // --- SCORING ET SUJET (SERVEUR UNIQUEMENT) ---
  let priority = "LOW";
  if (pain === "oui" && swelling === "oui") priority = "HIGH";
  else if (type === "douleur_complication") priority = "HIGH";
  else if (urgency === "forte") priority = "HIGH";
  else if (priority === "LOW") {
    if (type === "second_avis" && previousQuote === "oui" && (hasPanoramic || hasConeBeam)) {
      priority = "MEDIUM";
    }
    if (["implant_unitaire", "plusieurs_dents_absentes", "prothese_implant", "greffe_osseuse"].includes(type)) {
      if (hasPanoramic || hasConeBeam || hasQuote) {
        priority = "MEDIUM";
      }
    }
  }

  const nameStr = `${lastName.toUpperCase()} ${firstName}`;
  let subject = `[Contact] Nouvelle demande — ${nameStr}`;
  
  switch(type) {
    case "implant_unitaire": subject = `[Implantologie] Nouveau cas — Implant unitaire — ${nameStr}`; break;
    case "plusieurs_dents_absentes": subject = `[Implantologie] Nouveau cas — Plusieurs dents absentes — ${nameStr}`; break;
    case "prothese_implant": subject = `[Prothèse sur implant] Nouveau cas — ${nameStr}`; break;
    case "greffe_osseuse": subject = `[Greffe osseuse] Nouveau cas — ${nameStr}`; break;
    case "extraction_complexe": subject = `[Chirurgie] Extraction complexe — ${nameStr}`; break;
    case "dents_sagesse": subject = `[Chirurgie] Dents de sagesse — ${nameStr}`; break;
    case "second_avis": subject = `[Second avis] Demande d’analyse implantaire — ${nameStr}`; break;
    case "douleur_complication": subject = `[Prioritaire] Douleur ou complication — ${nameStr}`; break;
  }

  // --- CONSTRUCTION DES E-MAILS ---
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <h2 style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #1976d2; margin-top: 0;">
        Nouvelle demande depuis le site Dr Karim El Omri
      </h2>
      
      <h3>Résumé rapide</h3>
      <ul>
        <li><strong>Objet :</strong> ${type}</li>
        <li><strong>Priorité :</strong> <strong style="color: ${priority === 'HIGH' ? 'red' : priority === 'MEDIUM' ? 'orange' : 'green'};">${priority}</strong></li>
        <li><strong>Patient :</strong> ${nameStr}</li>
        <li><strong>Téléphone :</strong> ${phone || 'Non renseigné'}</li>
        <li><strong>Email :</strong> ${email || 'Non renseigné'}</li>
        <li><strong>Urgence ressentie :</strong> ${urgency || 'Non renseigné'}</li>
        <li><strong>Douleur :</strong> ${pain || 'Non'}</li>
        <li><strong>Gonflement :</strong> ${swelling || 'Non'}</li>
      </ul>

      <h3>Détails cliniques déclarés</h3>
      <ul>
        <li><strong>Dents concernées :</strong> ${teethCount || 'Non renseigné'}</li>
        <li><strong>Zone :</strong> ${area || 'Non renseigné'}</li>
        <li><strong>Absente depuis :</strong> ${missingSince || 'Non renseigné'}</li>
        <li><strong>Traitement proposé ailleurs :</strong> ${previousTreatment || 'Non'}</li>
        <li><strong>Devis déjà reçu :</strong> ${previousQuote || 'Non'}</li>
      </ul>

      <h3>Documents disponibles déclarés</h3>
      <ul>
        <li><strong>Radio Panoramique :</strong> ${hasPanoramic ? 'Oui' : 'Non'}</li>
        <li><strong>Cone Beam :</strong> ${hasConeBeam ? 'Oui' : 'Non'}</li>
        <li><strong>Devis :</strong> ${hasQuote ? 'Oui' : 'Non'}</li>
        <li><strong>Compte-rendu :</strong> ${hasReport ? 'Oui' : 'Non'}</li>
      </ul>

      <h3>Disponibilités</h3>
      <ul>
        <li><strong>Moment préféré :</strong> ${preferredMoment || 'Indifférent'}</li>
        <li><strong>Jours préférés :</strong> ${preferredDays || 'Indifférent'}</li>
        <li><strong>Rappel rapide (désistement) :</strong> ${canBeCalledQuickly || 'Non renseigné'}</li>
      </ul>

      <h3>Message complémentaire</h3>
      <p style="background-color: #f1f3f5; padding: 15px; border-radius: 5px;">
        ${message || '<em>Aucun message</em>'}
      </p>

      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #666; text-align: justify;">
        <strong>Avertissement :</strong> Cette demande est une demande d’orientation. Elle ne remplace pas une consultation et ne permet pas d’établir un diagnostic à distance.<br>
        Date : ${new Date().toISOString()}<br>
        Source : Site Web du Cabinet<br>
        Consentements validés : Oui
      </p>
    </div>
  `;

  const textBody = `
Nouvelle demande depuis le site Dr Karim El Omri

RÉSUMÉ RAPIDE
- Objet : ${type}
- Priorité : ${priority}
- Patient : ${nameStr}
- Téléphone : ${phone || 'Non renseigné'}
- Email : ${email || 'Non renseigné'}
- Urgence ressentie : ${urgency || 'Non renseigné'}
- Douleur : ${pain || 'Non'}
- Gonflement : ${swelling || 'Non'}

DÉTAILS CLINIQUES DÉCLARÉS
- Dents concernées : ${teethCount || 'Non renseigné'}
- Zone : ${area || 'Non renseigné'}
- Absente depuis : ${missingSince || 'Non renseigné'}
- Traitement proposé ailleurs : ${previousTreatment || 'Non'}
- Devis déjà reçu : ${previousQuote || 'Non'}

DOCUMENTS DISPONIBLES DÉCLARÉS
- Radio Panoramique : ${hasPanoramic ? 'Oui' : 'Non'}
- Cone Beam : ${hasConeBeam ? 'Oui' : 'Non'}
- Devis : ${hasQuote ? 'Oui' : 'Non'}
- Compte-rendu : ${hasReport ? 'Oui' : 'Non'}

DISPONIBILITÉS
- Moment préféré : ${preferredMoment || 'Indifférent'}
- Jours préférés : ${preferredDays || 'Indifférent'}
- Rappel rapide : ${canBeCalledQuickly || 'Non renseigné'}

MESSAGE COMPLÉMENTAIRE
${message || 'Aucun message'}

AVERTISSEMENT
Cette demande est une demande d’orientation. Elle ne remplace pas une consultation et ne permet pas d’établir un diagnostic à distance.
Date : ${new Date().toISOString()}
  `;

  // --- ENVOI VIA RESEND ---
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: process.env.CASE_REQUEST_FROM_EMAIL,
        to: process.env.CASE_REQUEST_TO_EMAIL,
        reply_to: email || process.env.CASE_REQUEST_REPLY_TO_EMAIL || undefined,
        subject: subject,
        html: htmlBody,
        text: textBody
      })
    });

    if (!response.ok) {
      // Ne pas renvoyer le texte exact de l'erreur au client
      console.error("Resend API Error status:", response.status);
      return { 
        statusCode: 500, 
        body: JSON.stringify({ ok: false, error: "SERVER_ERROR", message: "L’envoi n’a pas pu aboutir. Merci de réessayer plus tard ou de contacter le cabinet par téléphone." }) 
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, message: "Votre demande a bien été transmise au cabinet." })
    };

  } catch (error) {
    console.error("Serverless Function Execution Error.");
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: "SERVER_ERROR", message: "L’envoi n’a pas pu aboutir. Merci de réessayer plus tard ou de contacter le cabinet par téléphone." })
    };
  }
};
