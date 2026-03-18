/**
 * Spanish translations for the request portal.
 */
import type { RequestPortalLocaleEn } from "./en";

export const es: Record<keyof RequestPortalLocaleEn, string> = {
  "requestPortal.title": "Solicitud de mantenimiento",
  "requestPortal.subtitle": "Envíe una solicitud y le responderemos.",
  "requestPortal.subtitleWithPortal": "Envíe una solicitud a este equipo en menos de un minuto.",
  "requestPortal.footer": "Cornerstone OS",
  "requestPortal.trustIntro":
    "Cuéntenos qué está mal y dónde está. Su solicitud se envía directamente al equipo de mantenimiento de esta propiedad.",
  "requestPortal.trustFooter":
    "Revisaremos su solicitud, crearemos una orden de trabajo si es necesario y daremos seguimiento con actualizaciones.",
  "requestPortal.notConfiguredHint": "Contacte a su administrador para habilitar el portal de solicitudes.",
  "requestPortal.portalTemporarilyUnavailable":
    "Este portal de solicitudes de mantenimiento no está aceptando solicitudes nuevas en este momento.",

  "requestPortal.yourName": "Su nombre",
  "requestPortal.email": "Correo electrónico",
  "requestPortal.property": "Propiedad",
  "requestPortal.roomOrUnit": "Habitación / Unidad (opcional)",
  "requestPortal.location": "Ubicación",
  "requestPortal.asset": "Activo (opcional)",
  "requestPortal.priority": "Prioridad",
  "requestPortal.description": "Descripción",
  "requestPortal.photoOptional": "Foto (opcional)",

  "requestPortal.placeholder.fullName": "Nombre completo",
  "requestPortal.placeholder.email": "usted@ejemplo.com",
  "requestPortal.placeholder.roomOrUnit": "Número de habitación, unidad o suite",
  "requestPortal.placeholder.location": "Edificio, habitación, activo o dirección",
  "requestPortal.placeholder.assetSearch": "Buscar o seleccionar un activo…",
  "requestPortal.placeholder.description": "Describa el problema y dónde se encuentra.",

  "requestPortal.selectPropertyOptional": "Seleccione una propiedad (opcional)",

  "requestPortal.priority.low": "Baja — No es urgente",
  "requestPortal.priority.medium": "Media — Requiere atención pronto",
  "requestPortal.priority.high": "Alta — Problema urgente",
  "requestPortal.priority.urgent": "Urgente — Requiere respuesta rápida",
  "requestPortal.priority.emergency": "Emergencia — Requiere atención inmediata",
  "requestPortal.priorityDescription": "Elija la urgencia de su solicitud. Por defecto está seleccionada Media.",

  "requestPortal.addPhoto": "Añadir foto",
  "requestPortal.dragOrTap": "Arrastre y suelte o toque para tomar una foto",
  "requestPortal.removePhoto": "Quitar foto",
  "requestPortal.uploadPreview": "Vista previa",

  "requestPortal.submitRequest": "Enviar solicitud",
  "requestPortal.submitting": "Enviando…",

  "requestPortal.typicalResponseTime": "Tiempo de respuesta habitual: 4–24 horas.",
  "requestPortal.emergencyInstruction": "En caso de emergencia contacte directamente a su equipo de mantenimiento.",

  "requestPortal.successTitle": "Solicitud enviada",
  "requestPortal.successReceived": "Hemos recibido su solicitud.",
  "requestPortal.successSubmitted": "Su solicitud ha sido enviada correctamente.",
  "requestPortal.successTicketId": "ID de ticket:",
  "requestPortal.successFollowUp": "Nuestro equipo la revisará y dará seguimiento pronto.",
  "requestPortal.successStatusNew": "Estado: Nuevo · En espera de revisión por el equipo de mantenimiento.",
  "requestPortal.successSubmitAnother": "Enviar otra solicitud",
  "requestPortal.successViewRecent": "Ver sus solicitudes recientes",

  "requestPortal.noAssetsMatch": "Ningún activo coincide",
  "requestPortal.clearSelection": "Borrar selección",

  "validation.requesterNameRequired": "El nombre del solicitante es obligatorio.",
  "validation.emailRequired": "Se requiere un correo electrónico válido.",
  "validation.descriptionRequired": "La descripción es obligatoria.",
  "validation.locationRequired": "Indique una ubicación (propiedad, habitación o dirección).",
  "validation.assetNotFound": "El activo seleccionado no se encontró.",
  "validation.portalNotConfigured": "El portal de solicitudes no está configurado.",
  "validation.portalDuplicateWorkOrderNumber":
    "No pudimos crear un nuevo número de solicitud esta vez. Vuelva a intentarlo.",
};
