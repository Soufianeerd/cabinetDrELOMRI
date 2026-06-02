# Configuration de l'envoi d'e-mails — Formulaire Dr Karim El Omri

Ce document explique comment mettre en place la réception des demandes qualifiées depuis le formulaire intelligent, en utilisant une architecture serverless sécurisée (Netlify Functions + Resend).

## 1. Prérequis
- Le site doit être déployé sur un hébergeur supportant les fonctions serverless. Actuellement, le projet est pré-configuré pour **Netlify**.
- Il vous faut un compte gratuit sur [Resend](https://resend.com) (ou un autre fournisseur d'e-mails transactionnels).

## 2. Création d'un compte Resend et vérification du domaine
1. Créez un compte sur Resend.
2. Allez dans l'onglet **Domains** et ajoutez le nom de domaine du cabinet (ex: `cabinet-dentaire-montplaisir.fr`).
3. Resend vous donnera des enregistrements DNS (TXT, MX) à ajouter chez votre registraire (ex: OVH, Gandi, Ionos).
4. Une fois le domaine vérifié, allez dans l'onglet **API Keys** et créez une nouvelle clé avec les permissions d'envoi.

## 3. Variables d'environnement à configurer
Sur le tableau de bord Netlify de votre projet, allez dans **Site configuration > Environment variables**, et ajoutez les clés suivantes :

- `RESEND_API_KEY` : `re_votre_cle_secrete`
- `CASE_REQUEST_TO_EMAIL` : `contact@votre-cabinet.fr` (l'adresse qui recevra les demandes)
- `CASE_REQUEST_FROM_EMAIL` : `noreply@votre-domaine.fr` (l'adresse vérifiée sur Resend)
- `SITE_URL` : `https://www.votre-site.fr`

> **Note de sécurité :** Ces clés sont injectées uniquement côté serveur (dans la fonction Netlify) et ne sont jamais visibles dans le navigateur du patient.

## 4. Déploiement et Test Local (Netlify CLI)
Pour tester le formulaire en local avant de le mettre en ligne, vous pouvez utiliser la CLI de Netlify :

1. Installez la CLI globale : `npm install -g netlify-cli`
2. Copiez le fichier `.env.example` vers `.env` et remplissez vos vraies informations.
3. Lancez le serveur local : `netlify dev` (Le serveur sera accessible sur `http://localhost:8888`)
4. Testez le formulaire via la checklist ci-dessous.

## 5. Checklist de Tests Manuels
Avant de mettre en production, effectuez ces tests pour vérifier la robustesse du formulaire :

- [ ] **Mise en page "Soin Courant"** : Vérifiez que l'option redirige vers Doctolib et masque le bouton "Suivant". Aucun e-mail ne doit partir.
- [ ] **Flux "Implant unitaire" valide** : Remplissez le formulaire entièrement, validez. Vérifiez que l'e-mail arrive avec un sujet type `[Implantologie] Nouveau cas — Implant unitaire — NOM Prénom`.
- [ ] **Priorité HIGH (Urgences)** : Cochez "Douleur" + "Gonflement", ou "Urgence : forte". L'e-mail reçu doit afficher "Priorité: HIGH" en rouge.
- [ ] **Priorité MEDIUM (Second avis documenté)** : Choisissez "Second avis", cochez "Radio Panoramique" et "Devis déjà reçu". L'e-mail doit afficher "Priorité: MEDIUM".
- [ ] **Consentement obligatoire** : Essayez de soumettre sans cocher les cases finales. Le formulaire doit afficher une erreur locale.
- [ ] **Validation d'email** : Entrez `test@test` sans `.com`. Le formulaire doit bloquer (erreur locale). Si forcé, l'API doit renvoyer une erreur `INVALID_REQUEST`.
- [ ] **Honeypot anti-spam** : Via les outils de développement (F12), affichez le champ caché `website` et remplissez-le. Le formulaire simulera un succès, mais la requête API ne sera pas déclenchée (ou ignorée).
- [ ] **Anti-spam de vitesse** : Remplissez très vite (via un script ou auto-fill) en moins de 4 secondes. Même comportement : succès simulé pour piéger le bot, sans envoi réel.
- [ ] **Méthode GET** : Tapez directement `http://localhost:8888/api/send-case-request` dans votre navigateur. Vous devriez obtenir une réponse propre indiquant `METHOD_NOT_ALLOWED`.

## 6. Limites actuelles (RGPD & Stockage)
- **Pas de base de données :** Les demandes sont envoyées par e-mail uniquement. Si Resend ou votre boîte mail rencontre un problème, la demande n'est sauvegardée nulle part.
- **Pas de pièces jointes médicales :** Envoyer des radios (données de santé sensibles) en pièce jointe d'un e-mail classique n'est pas conforme à la certification HDS (Hébergeur de Données de Santé) requise en France. Les patients déclarent simplement *posséder* les documents.
- **Pas de diagnostic à distance :** Conformément à la déontologie, le formulaire indique clairement qu'il s'agit d'une orientation, et non d'un avis médical définitif.

## 7. Prochaines améliorations possibles (Phase 6+)
- **Base de données sécurisée (ex: Supabase, Firebase) :** Remplacer le simple envoi d'e-mail par un enregistrement dans une base sécurisée, couplé à un Dashboard Administrateur pour le cabinet.
- **Upload sécurisé :** Permettre le dépôt de Cone Beam via un composant de téléversement chiffré de bout en bout (stockage compatible HDS).
- **Suivi SMS/Email :** Informer automatiquement le patient du statut de sa demande (ex: "En cours d'étude par le Dr El Omri").
