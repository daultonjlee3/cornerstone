/**
 * French translations for the request portal.
 */
import type { RequestPortalLocaleEn } from "./en";

export const fr: Record<keyof RequestPortalLocaleEn, string> = {
  "requestPortal.title": "Demande de maintenance",
  "requestPortal.subtitle": "Soumettez une demande et nous vous recontacterons.",
  "requestPortal.subtitleWithPortal": "Soumettez une demande à cette équipe en moins d'une minute.",
  "requestPortal.chooseOrgTitle": "Choisissez votre organisation",
  "requestPortal.chooseOrgSubtitle": "Sélectionnez le portail de maintenance de votre site ou propriété.",
  "requestPortal.footer": "Cornerstone OS",
  "requestPortal.trustIntro":
    "Dites-nous ce qui ne va pas et où c'est situé. Votre demande est envoyée directement à l'équipe de maintenance de cette propriété.",
  "requestPortal.trustFooter":
    "Nous examinerons votre demande, créerons un ordre de travail si nécessaire, puis ferons un suivi avec des mises à jour.",
  "requestPortal.notConfiguredHint": "Contactez votre administrateur pour activer le portail de demandes.",
  "requestPortal.portalTemporarilyUnavailable":
    "Ce portail de demandes de maintenance n'accepte pas de nouvelles demandes pour le moment.",

  "requestPortal.yourName": "Votre nom",
  "requestPortal.email": "E-mail",
  "requestPortal.property": "Propriété",
  "requestPortal.roomOrUnit": "Pièce / Unité (facultatif)",
  "requestPortal.location": "Emplacement",
  "requestPortal.asset": "Actif (facultatif)",
  "requestPortal.priority": "Priorité",
  "requestPortal.description": "Description",
  "requestPortal.photoOptional": "Photo (facultatif)",

  "requestPortal.placeholder.fullName": "Nom complet",
  "requestPortal.placeholder.email": "vous@exemple.fr",
  "requestPortal.placeholder.roomOrUnit": "Numéro de pièce, unité ou suite",
  "requestPortal.placeholder.location": "Bâtiment, pièce, actif ou adresse",
  "requestPortal.placeholder.assetSearch": "Rechercher ou sélectionner un actif…",
  "requestPortal.placeholder.description": "Décrivez le problème et son emplacement.",

  "requestPortal.selectPropertyOptional": "Sélectionner une propriété (facultatif)",

  "requestPortal.priority.low": "Faible — Pas urgent",
  "requestPortal.priority.medium": "Moyenne — Nécessite une attention rapide",
  "requestPortal.priority.high": "Élevée — Problème urgent",
  "requestPortal.priority.urgent": "Urgent — Sensible au facteur temps",
  "requestPortal.priority.emergency": "Urgence — Intervention immédiate requise",
  "requestPortal.priorityDescription": "Choisissez le degré d'urgence. Moyenne est sélectionnée par défaut.",

  "requestPortal.addPhoto": "Ajouter une photo",
  "requestPortal.dragOrTap": "Glissez-déposez ou touchez pour prendre une photo",
  "requestPortal.removePhoto": "Supprimer la photo",
  "requestPortal.uploadPreview": "Aperçu",

  "requestPortal.submitRequest": "Soumettre la demande",
  "requestPortal.submitting": "Envoi en cours…",

  "requestPortal.typicalResponseTime": "Délai de réponse habituel : 4–24 heures.",
  "requestPortal.emergencyInstruction": "En cas d'urgence, contactez directement votre équipe de maintenance.",

  "requestPortal.successTitle": "Demande soumise",
  "requestPortal.successReceived": "Nous avons bien reçu votre demande.",
  "requestPortal.successSubmitted": "Votre demande a bien été envoyée.",
  "requestPortal.successTicketId": "N° de ticket :",
  "requestPortal.successFollowUp": "Notre équipe l'examinera et assurera le suivi rapidement.",
  "requestPortal.successStatusNew":
    "Statut : Nouveau · En attente de validation par l'équipe de maintenance.",
  "requestPortal.successSubmitAnother": "Soumettre une autre demande",
  "requestPortal.successViewRecent": "Voir vos demandes récentes",

  "requestPortal.noAssetsMatch": "Aucun actif ne correspond",
  "requestPortal.clearSelection": "Effacer la sélection",

  "validation.requesterNameRequired": "Le nom du demandeur est obligatoire.",
  "validation.emailRequired": "Une adresse e-mail valide est requise.",
  "validation.descriptionRequired": "La description est obligatoire.",
  "validation.locationRequired": "Veuillez indiquer un emplacement (propriété, pièce ou adresse).",
  "validation.assetNotFound": "L'actif sélectionné est introuvable.",
  "validation.portalNotConfigured": "Le portail de demandes n'est pas configuré.",
  "validation.portalDuplicateWorkOrderNumber":
    "Nous n'avons pas pu créer un nouveau numéro de demande cette fois-ci. Veuillez réessayer.",
};
