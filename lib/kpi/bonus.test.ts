import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BONUS_CAP_DAY,
  BONUS_CAP_NIGHT,
  BONUS_MAX_TOTAL,
  PLAN_DAY,
  PLAN_NIGHT,
  applyBonusReset,
  calculateBaseBonus,
  calculatePercentOverPlan,
  calculateShiftBonus,
  excelRound,
} from "./bonus";

describe("excelRound", () => {
  it("matches Excel ROUND halves away from zero", () => {
    assert.equal(excelRound(1.5), 2);
    assert.equal(excelRound(-1.5), -2);
    assert.equal(excelRound(110.4), 110);
  });
});

describe("O — percent over plan", () => {
  it("0% when revenue equals day plan", () => {
    assert.equal(calculatePercentOverPlan(PLAN_DAY, PLAN_DAY), 0);
  });

  it("+10% when day revenue is 110% of plan", () => {
    assert.equal(calculatePercentOverPlan(16_500, PLAN_DAY), 10);
  });

  it("+50% when night revenue is 150% of 5000 plan", () => {
    assert.equal(calculatePercentOverPlan(7_500, PLAN_NIGHT), 50);
  });

  it("negative when under plan", () => {
    assert.equal(calculatePercentOverPlan(12_000, PLAN_DAY), -20);
  });
});

describe("P — base bonus", () => {
  it("day: O=10 → P=100", () => {
    assert.equal(calculateBaseBonus(10, "DAY"), 100);
  });

  it("day: caps P at 1000", () => {
    assert.equal(calculateBaseBonus(150, "DAY"), BONUS_CAP_DAY);
  });

  it("night: caps P at 500 (second plan formula)", () => {
    assert.equal(calculateBaseBonus(100, "NIGHT"), BONUS_CAP_NIGHT);
    assert.equal(calculateBaseBonus(100, "EXTRA"), BONUS_CAP_NIGHT);
  });

  it("night: O=10 → P=100", () => {
    assert.equal(calculateBaseBonus(10, "NIGHT"), 100);
  });

  it("negative O reduces P", () => {
    assert.equal(calculateBaseBonus(-20, "DAY"), -200);
  });
});

describe("Q — final bonus and reset", () => {
  it("Q = P + adjustment", () => {
    const r = calculateShiftBonus({
      revenueTariff: 16_000,
      revenueGoods: 500,
      shiftType: "DAY",
      bonusAdjustment: 50,
    });
    assert.equal(r.baseBonus, 100);
    assert.equal(r.rawFinalBonus, 150);
    assert.equal(r.finalBonus, 150);
    assert.equal(r.needsReset, false);
  });

  it("needsReset when Q < 0, stored bonus clamped to 0", () => {
    const r = calculateShiftBonus({
      revenueTariff: 10_000,
      revenueGoods: 0,
      shiftType: "DAY",
      bonusAdjustment: -500,
    });
    assert.ok(r.rawFinalBonus < 0);
    assert.equal(r.needsReset, true);
    assert.equal(r.finalBonus, 0);
  });

  it("caps final bonus at 1500", () => {
    const r = calculateShiftBonus({
      revenueTariff: 30_000,
      revenueGoods: 0,
      shiftType: "DAY",
      bonusAdjustment: 600,
    });
    assert.equal(r.baseBonus, BONUS_CAP_DAY);
    assert.equal(r.finalBonus, BONUS_MAX_TOTAL);
  });

  it("manual reset forces bonus to 0", () => {
    const r = calculateShiftBonus({
      revenueTariff: 10_000,
      revenueGoods: 0,
      shiftType: "DAY",
      bonusAdjustment: -500,
      bonusManualReset: true,
    });
    assert.equal(r.finalBonus, 0);
    assert.equal(r.needsReset, false);
    assert.equal(applyBonusReset(-800, true), 0);
  });
});
