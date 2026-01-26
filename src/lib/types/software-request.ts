export type SoftwareRequestStatus = "new" | "reviewing" | "accepted" | "rejected";

export type SoftwareRequest = {
  id: string;
  name: string;
  websiteUrl?: string | null;
  notes?: string | null;
  status: SoftwareRequestStatus;
  createdAt: string;
  updatedAt: string;
};
