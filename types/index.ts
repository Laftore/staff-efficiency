/** Application role — mirrors Prisma `Role` enum. */
export type AppRole = "OWNER" | "SENIOR_ADMIN" | "ADMIN";

export type ShiftType = "DAY" | "NIGHT" | "EXTRA";

export interface SessionUser {
  id: string;
  email: string;
  role: AppRole;
  branchId: string | null;
  displayName: string;
}
