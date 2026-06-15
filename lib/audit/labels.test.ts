import { describe, expect, it } from "vitest";
import {
  formatAuditEntity,
  formatDetailsPreview,
  getAuditActionLabel,
  getBranchLabel,
  getRoleLabel,
} from "./labels";

describe("audit labels", () => {
  it("translates actions and roles", () => {
    expect(getAuditActionLabel("SHIFT_BONUS_RESET")).toBe("Бонус обнулён");
    expect(getRoleLabel("SENIOR_ADMIN")).toBe("Старший администратор");
  });

  it("shows branch name instead of technical id", () => {
    expect(
      getBranchLabel("branch_central", { branch_central: "Центральный" }),
    ).toBe("Центральный");
  });

  it("formats entity without technical ids", () => {
    expect(
      formatAuditEntity({
        entityType: "EMPLOYEE",
        details: { name: "Кирилл Новиков" },
      }),
    ).toBe("Сотрудник: Кирилл Новиков");
  });

  it("formats bonus reset details in Russian", () => {
    expect(
      formatDetailsPreview({ previousBonus: -150, newBonus: 0 }),
    ).toBe("Бонус: -150 ₽ → 0 ₽");
  });
});