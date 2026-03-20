/**
 * English translations for the request portal.
 * System UI only — do not translate user-entered content.
 */
export const en = {
  // Page
  "requestPortal.title": "Maintenance Request",
  "requestPortal.subtitle": "Submit a maintenance request in under a minute.",
  "requestPortal.subtitleWithPortal": "Submit a maintenance request to this team in under a minute.",
  "requestPortal.chooseOrgTitle": "Choose your organization",
  "requestPortal.chooseOrgSubtitle": "Select the maintenance portal for your site or property.",
  "requestPortal.footer": "Powered by Cornerstone OS",
  "requestPortal.trustIntro": "Tell us what’s wrong and where it is. Your request goes straight to the maintenance team for this property.",
  "requestPortal.trustFooter": "We’ll review your request, create a work order if needed, and follow up with updates.",
  "requestPortal.notConfiguredHint": "This maintenance portal isn’t available yet. Contact your administrator if you believe this is an error.",
  "requestPortal.portalTemporarilyUnavailable": "This maintenance request portal is not currently accepting new requests.",

  // Form labels
  "requestPortal.yourName": "Your name",
  "requestPortal.email": "Email",
  "requestPortal.property": "Property",
  "requestPortal.roomOrUnit": "Room / Unit (optional)",
  "requestPortal.location": "Location",
  "requestPortal.asset": "Asset (optional)",
  "requestPortal.priority": "Priority",
  "requestPortal.description": "Description",
  "requestPortal.photoOptional": "Add photo (optional)",

  // Placeholders
  "requestPortal.placeholder.fullName": "Full name (so we know who to follow up with)",
  "requestPortal.placeholder.email": "you@example.com",
  "requestPortal.placeholder.roomOrUnit": "Room number, unit, or suite",
  "requestPortal.placeholder.location": "Building, room, area, or address",
  "requestPortal.placeholder.assetSearch": "Search or select an asset…",
  "requestPortal.placeholder.description": "Example: “Water leaking under sink in kitchen, cabinet is damp and floor is slippery.”",

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
  "requestPortal.successFollowUp": "Your request has been logged as a new work item. The maintenance team will review it and follow up with next steps.",
  "requestPortal.successStatusNew": "Status: New · Waiting to be reviewed by the maintenance team.",
  "requestPortal.successSubmitAnother": "Submit another request",
  "requestPortal.successViewRecent": "View your recent requests",

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
  "validation.portalDuplicateWorkOrderNumber": "We were not able to create a new request number this time. Please try submitting again.",
} as const;

export type RequestPortalLocaleEn = typeof en;
