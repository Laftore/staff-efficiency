import type { AppRole } from "@/types";

const ROLE_LABELS: Record<AppRole, string> = {
  OWNER: "Владелец",
  SENIOR_ADMIN: "Старший админ",
  ADMIN: "Администратор",
};

export function formatRoleLabel(role: AppRole): string {
  return ROLE_LABELS[role];
}
