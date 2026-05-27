import { describe, it, expect } from 'vitest';
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
} from './bonus';

describe('excelRound', () => {
  it('matches Excel ROUND halves away from zero', () => {
    expect(excelRound(1.5)).toBe(2);
    expect(excelRound(-1.5)).toBe(-2);
    expect(excelRound(110.4)).toBe(110);
  });
});

describe('O — percent over plan', () => {
  it('0% when revenue equals day plan', () => {
    expect(calculatePercentOverPlan(PLAN_DAY, PLAN_DAY)).toBe(0);
  });

  it('+10% when day revenue is 110% of plan', () => {
    expect(calculatePercentOverPlan(16_500, PLAN_DAY)).toBe(10);
  });

  it('+50% when night revenue is 150% of 5000 plan', () => {
    expect(calculatePercentOverPlan(7_500, PLAN_NIGHT)).toBe(50);
  });

  it('negative when under plan', () => {
    expect(calculatePercentOverPlan(12_000, PLAN_DAY)).toBe(-20);
  });
});

describe('P — base bonus', () => {
  it('day: O=10 → P=100', () => {
    expect(calculateBaseBonus(10, 'DAY')).toBe(100);
  });

  it('day: caps P at 1000', () => {
    expect(calculateBaseBonus(150, 'DAY')).toBe(BONUS_CAP_DAY);
  });

  it('night: caps P at 500 (second plan formula)', () => {
    expect(calculateBaseBonus(100, 'NIGHT')).toBe(BONUS_CAP_NIGHT);
    expect(calculateBaseBonus(100, 'EXTRA')).toBe(BONUS_CAP_NIGHT);
  });

  it('night: O=10 → P=100', () => {
    expect(calculateBaseBonus(10, 'NIGHT')).toBe(100);
  });

  it('negative O reduces P', () => {
    expect(calculateBaseBonus(-20, 'DAY')).toBe(-200);
  });
});

describe('Q — final bonus and reset', () => {
  it('Q = P + adjustment', () => {
    const r = calculateShiftBonus({
      revenueTariff: 16_000,
      revenueGoods: 500,
      shiftType: 'DAY',
      bonusAdjustment: 50,
    });
    expect(r.baseBonus).toBe(100);
    expect(r.rawFinalBonus).toBe(150);
    expect(r.finalBonus).toBe(150);
    expect(r.needsReset).toBe(false);
  });

  it('needsReset when Q < 0, stored bonus clamped to 0', () => {
    const r = calculateShiftBonus({
      revenueTariff: 10_000,
      revenueGoods: 0,
      shiftType: 'DAY',
      bonusAdjustment: -500,
    });
    expect(r.rawFinalBonus).toBeLessThan(0);
    expect(r.needsReset).toBe(true);
    expect(r.finalBonus).toBe(0);
  });

  it('caps final bonus at 1500', () => {
    const r = calculateShiftBonus({
      revenueTariff: 30_000,
      revenueGoods: 0,
      shiftType: 'DAY',
      bonusAdjustment: 600,
    });
    expect(r.baseBonus).toBe(BONUS_CAP_DAY);
    expect(r.finalBonus).toBe(BONUS_MAX_TOTAL);
  });

  it('manual reset forces bonus to 0', () => {
    const r = calculateShiftBonus({
      revenueTariff: 10_000,
      revenueGoods: 0,
      shiftType: 'DAY',
      bonusAdjustment: -500,
      bonusManualReset: true,
    });
    expect(r.finalBonus).toBe(0);
    expect(r.needsReset).toBe(false);
    expect(applyBonusReset(-800, true)).toBe(0);
  });
});

// =====================================================
// ДОПОЛНИТЕЛЬНЫЕ РЕАЛЬНЫЕ КЕЙСЫ
// =====================================================

describe('Дополнительные реальные кейсы', () => {
  it('должен учитывать revenueGoods при расчёте', () => {
    const result = calculateShiftBonus({
      revenueTariff: 12000,
      revenueGoods: 4500,
      shiftType: 'DAY',
    });

    expect(result.totalRevenue).toBe(16500);
    expect(result.percentOverPlan).toBe(10);
    expect(result.finalBonus).toBe(100);
  });

  it('должен правильно считать EXTRA смену (как NIGHT)', () => {
    const result = calculateShiftBonus({
      revenueTariff: 7500,
      revenueGoods: 0,
      shiftType: 'EXTRA',
    });

    expect(result.plan).toBe(5000);
    expect(result.percentOverPlan).toBe(50);
    expect(result.finalBonus).toBe(500);
  });

  it('должен применять bonusAdjustment и не превышать 1500', () => {
    const result = calculateShiftBonus({
      revenueTariff: 30000,
      revenueGoods: 5000,
      shiftType: 'DAY',
      bonusAdjustment: 800,
    });

    expect(result.finalBonus).toBe(1500);
  });

  it('должен обнулять бонус при manualReset даже если Q положительный', () => {
    const result = calculateShiftBonus({
      revenueTariff: 20000,
      revenueGoods: 0,
      shiftType: 'DAY',
      bonusManualReset: true,
    });

    expect(result.finalBonus).toBe(0);
    expect(result.bonusManualReset).toBe(true);
  });

  it('должен показывать needsReset только когда Q < 0 и manualReset = false', () => {
    const result = calculateShiftBonus({
      revenueTariff: 3000,
      revenueGoods: 0,
      shiftType: 'NIGHT',
      bonusManualReset: false,
    });

    expect(result.needsReset).toBe(true);
    expect(result.finalBonus).toBe(0);
  });
});

// =====================================================
// ФАЗА 1 — МАКСИМАЛЬНОЕ ПОКРЫТИЕ БОНУСА (12 тестов)
// =====================================================

describe('Полное покрытие calculateShiftBonus', () => {
  it('должен считать 0 при нулевой выручке в дневную смену', () => {
    const result = calculateShiftBonus({
      revenueTariff: 0,
      revenueGoods: 0,
      shiftType: 'DAY',
    });
    expect(result.finalBonus).toBe(0);
    expect(result.needsReset).toBe(true);
  });

  it('должен считать ровно 1000 при O=100 в дневную смену', () => {
    const result = calculateShiftBonus({
      revenueTariff: 30000,
      revenueGoods: 0,
      shiftType: 'DAY',
    });
    expect(result.percentOverPlan).toBe(100);
    expect(result.finalBonus).toBe(1000);
  });

  it('должен считать ровно 500 при O=100 в ночную смену', () => {
    const result = calculateShiftBonus({
      revenueTariff: 10000,
      revenueGoods: 0,
      shiftType: 'NIGHT',
    });
    expect(result.finalBonus).toBe(500);
  });

  it('должен применять отрицательную корректировку и показывать needsReset', () => {
    const result = calculateShiftBonus({
      revenueTariff: 16000,
      revenueGoods: 0,
      shiftType: 'DAY',
      bonusAdjustment: -300,
    });
    expect(result.rawFinalBonus).toBe(-230);
    expect(result.finalBonus).toBe(0);
    expect(result.needsReset).toBe(true);
  });

  it('должен сохранять 0 при manualReset даже с большой выручкой', () => {
    const result = calculateShiftBonus({
      revenueTariff: 50000,
      revenueGoods: 10000,
      shiftType: 'DAY',
      bonusManualReset: true,
    });
    expect(result.finalBonus).toBe(0);
    expect(result.bonusManualReset).toBe(true);
  });

  it('должен правильно считать смешанную выручку (тариф + товары)', () => {
    const result = calculateShiftBonus({
      revenueTariff: 14000,
      revenueGoods: 2500,
      shiftType: 'DAY',
    });
    expect(result.totalRevenue).toBe(16500);
    expect(result.percentOverPlan).toBe(10);
  });

  it('должен ограничивать бонус 1500 даже при очень большой корректировке', () => {
    const result = calculateShiftBonus({
      revenueTariff: 40000,
      revenueGoods: 0,
      shiftType: 'DAY',
      bonusAdjustment: 2000,
    });
    expect(result.finalBonus).toBe(1500);
  });

  it('должен правильно работать с EXTRA сменой при низкой выручке', () => {
    const result = calculateShiftBonus({
      revenueTariff: 2500,
      revenueGoods: 0,
      shiftType: 'EXTRA',
    });
    expect(result.plan).toBe(5000);
    expect(result.needsReset).toBe(true);
  });

  it('должен возвращать needsReset = false когда Q >= 0', () => {
    const result = calculateShiftBonus({
      revenueTariff: 18000,
      revenueGoods: 0,
      shiftType: 'DAY',
    });
    expect(result.needsReset).toBe(false);
  });

  it('должен корректно обрабатывать одновременный adjustment и manualReset', () => {
    const result = calculateShiftBonus({
      revenueTariff: 12000,
      revenueGoods: 0,
      shiftType: 'DAY',
      bonusAdjustment: -500,
      bonusManualReset: true,
    });
    expect(result.finalBonus).toBe(0);
    expect(result.bonusManualReset).toBe(true);
  });

  it('должен считать бонус 0 при выручке ровно равной плану', () => {
    const result = calculateShiftBonus({
      revenueTariff: 15000,
      revenueGoods: 0,
      shiftType: 'DAY',
    });
    expect(result.percentOverPlan).toBe(0);
    expect(result.finalBonus).toBe(0);
  });

  it('должен правильно считать при очень большой выручке в ночную смену', () => {
    const result = calculateShiftBonus({
      revenueTariff: 25000,
      revenueGoods: 5000,
      shiftType: 'NIGHT',
    });
    expect(result.percentOverPlan).toBe(500);
    expect(result.finalBonus).toBe(500);
  });
});