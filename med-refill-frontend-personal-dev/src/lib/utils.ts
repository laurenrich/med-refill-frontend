import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Status mapping utilities
export const STATUS_MAPPING = {
  // Database storage format (simple)
  approve: "approve",
  deny: "deny", 
  escalate: "escalate",
  
  // UI display format (past tense)
  approved: "Approved",
  denied: "Denied", 
  pending: "Pending"
} as const;

// Convert any status to database format (simple)
export function normalizeStatusForDatabase(status: string): string {
  const lowerStatus = status?.toLowerCase() || "";
  
  if (lowerStatus.includes("approve") || lowerStatus === "approved") {
    return "approve";
  }
  if (lowerStatus.includes("deny") || lowerStatus === "denied") {
    return "deny";
  }
  if (lowerStatus.includes("escalate") || lowerStatus === "pending") {
    return "escalate";
  }
  
  return status; // fallback
}

// Convert database status to UI display format
export function formatStatusForUI(status: string): string {
  const normalized = normalizeStatusForDatabase(status);
  
  switch (normalized) {
    case "approve":
      return "Approved";
    case "deny":
      return "Denied";
    case "escalate":
      return "Pending";
    default:
      return status;
  }
}

// Check if status is approved (for filtering/analytics)
export function isApprovedStatus(status: string): boolean {
  const normalized = normalizeStatusForDatabase(status);
  return normalized === "approve";
}

// Check if status is denied (for filtering/analytics)
export function isDeniedStatus(status: string): boolean {
  const normalized = normalizeStatusForDatabase(status);
  return normalized === "deny";
}

// Check if status is escalated (for filtering/analytics)
export function isEscalatedStatus(status: string): boolean {
  const normalized = normalizeStatusForDatabase(status);
  return normalized === "escalate";
}
