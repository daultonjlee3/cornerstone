/**
 * English translations for the request portal.
 * System UI only — do not translate user-entered content.
 */
export const en = {
  // Page
  "requestPortal.title": "Maintenance Request",
  "requestPortal.subtitle": "Submit a request and we'll get back to you.",
  "requestPortal.footer": "Cornerstone OS",

  // Form labels
  "requestPortal.yourName": "Your name",
  "requestPortal.email": "Email",
  "requestPortal.property": "Property",
  "requestPortal.roomOrUnit": "Room / Unit (optional)",
  "requestPortal.location": "Location",
  "requestPortal.asset": "Asset (optional)",
  "requestPortal.priority": "Priority",
  "requestPortal.description": "Description",
  "requestPortal.photoOptional": "Photo (optional)",

  // Placeholders
  "requestPortal.placeholder.fullName": "Full name",
  "requestPortal.placeholder.email": "you@example.com",
  "requestPortal.placeholder.roomOrUnit": "Room number, unit, or suite",
  "requestPortal.placeholder.location": "Building, room, asset, or address",
  "requestPortal.placeholder.assetSearch": "Search or select an asset…",
  "requestPortal.placeholder.description": "Describe the issue and where it is.",

  // Property select
  "requestPortal.selectPropertyOptional": "Select a property (optional)",

  // Priority options (value: label)
  "requestPortal.priority.low": "Low – Not urgent",
  "requestPortal.priority.medium": "Medium – Needs attention soon",
  "requestPortal.priority.high": "High – Urgent issue",
  "requestPortal.priority.urgent": "Urgent – Time-sensitive",
  "requestPortal.priority.emergency": "Emergency – Immediate response required",
  "requestPortal.priorityDescription": "Choose how urgent your request is. Medium is selected by default.",

  // Photo
  "requestPortal.addPhoto": "Add Photo",
  "requestPortal.dragOrTap": "Drag & drop or tap to take a picture",
  "requestPortal.removePhoto": "Remove photo",
  "requestPortal.uploadPreview": "Upload preview",

  // Submit
  "requestPortal.submitRequest": "Submit request",
  "requestPortal.submitting": "Submitting…",

  // Trust / response
  "requestPortal.typicalResponseTime": "Typical response time: 4–24 hours.",
  "requestPortal.emergencyInstruction": "For emergencies please contact your maintenance team directly.",

  // Success
  "requestPortal.successTitle": "Request Submitted",
  "requestPortal.successReceived": "Your request has been received.",
  "requestPortal.successSubmitted": "Your request has been successfully submitted.",
  "requestPortal.successTicketId": "Ticket ID:",
  "requestPortal.successFollowUp": "Our team will review your request and follow up shortly.",

  // Asset search
  "requestPortal.noAssetsMatch": "No assets match",
  "requestPortal.clearSelection": "Clear selection",

  // Validation (used server-side; keys returned so client can translate if needed)
  "validation.requesterNameRequired": "Requester name is required.",
  "validation.emailRequired": "Valid requester email is required.",
  "validation.descriptionRequired": "Description is required.",
  "validation.locationRequired": "Please specify a location (property, room, or address).",
  "validation.assetNotFound": "Selected asset was not found.",
  "validation.portalNotConfigured": "Maintenance request portal is not configured.",
} as const;

export type RequestPortalLocaleEn = typeof en;
