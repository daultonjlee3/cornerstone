export type TechnicianPortalJob = {
  id: string;
  workOrderNumber: string | null;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  completedAt: string | null;
  scheduledDate: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  assetName: string | null;
  location: string | null;
  assignmentScope: "direct" | "crew";
  assignedCrewName: string | null;
  assignedTechnicianName: string | null;
  isPm: boolean;
};

export type TechnicianPortalLaborEntry = {
  id: string;
  technician_id: string | null;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  notes?: string | null;
  is_active: boolean;
  created_at: string;
};

export type TechnicianPortalAttachment = {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  caption: string | null;
  technician_id: string | null;
  uploaded_at?: string | null;
  created_at: string;
};
