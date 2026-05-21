import type { ShiftType } from "@/types";

/** Дневная смена — план выручки (Excel). */
export const PLAN_DAY = 15_000;

/** Ночная / доп. смена — план выручки (Excel). */
export const PLAN_NIGHT = 5_000;

/** Максимум базового бонуса P для дневного плана. */
export const BONUS_CAP_DAY = 1_000;

/** Максимум базового бонуса P для плана 5000 (ночь / доп). */
export const BONUS_CAP_NIGHT = 500;

/** Итоговый бонус Q: нижняя и верхняя граница (руб). */
export const BONUS_MIN_TOTAL = 0;
export const BONUS_MAX_TOTAL = 1_500;

/** Множитель O → P: P = MIN(ROUND(O × multiplier), cap). */
export const P_MULTIPLIER_DAY = 10;
export const P_MULTIPLIER_NIGHT = 10;

export interface PlanConfig {
  plan: number;
  pMultiplier: number;
  pCap: number;
}

export const PLAN_CONFIG: Record<ShiftType, PlanConfig> = {
  DAY: {
    plan: PLAN_DAY,
    pMultiplier: P_MULTIPLIER_DAY,
    pCap: BONUS_CAP_DAY,
  },
  NIGHT: {
    plan: PLAN_NIGHT,
    pMultiplier: P_MULTIPLIER_NIGHT,
    pCap: BONUS_CAP_NIGHT,
  },
  EXTRA: {
    plan: PLAN_NIGHT,
    pMultiplier: P_MULTIPLIER_NIGHT,
    pCap: BONUS_CAP_NIGHT,
  },
};

export interface BonusInput {
  revenueTariff: number;
  revenueGoods: number;
  shiftType: ShiftType;
  /** Премия / штраф (ручная корректировка к Q). */
  bonusAdjustment?: number;
  /** Старший админ обнулил отрицательный бонус. */
  bonusManualReset?: boolean;
}

export interface BonusResult {
  totalRevenue: number;
  plan: number;
  shiftType: ShiftType;
  /** O — % перевыполнения / недовыполнения плана */
  percentOverPlan: number;
  /** P — базовый бонус по формуле плана */
  baseBonus: number;
  /** Сырое Q = P + премия/штраф (до обнуления) */
  rawFinalBonus: number;
  /** Итоговый бонус с учётом bonusManualReset */
  finalBonus: number;
  bonusAdjustment: number;
  bonusManualReset: boolean;
  /** Q < 0 и ещё не обнулён — показать кнопку «Обнулить» */
  needsReset: boolean;
}

/**
 * Excel ROUND(value; decimals) — halves away from zero (как в русской Excel).
 */
export function excelRound(value: number, decimals = 0): number {
  const factor = 10 ** decimals;
  const scaled = value * factor;
  const rounded =
    scaled >= 0 ? Math.floor(scaled + 0.5) : Math.ceil(scaled - 0.5);
  return rounded / factor;
}

export function getPlanConfig(shiftType: ShiftType): PlanConfig {
  return PLAN_CONFIG[shiftType];
}

export function getRevenuePlan(shiftType: ShiftType): number {
  return getPlanConfig(shiftType).plan;
}

/**
 * Суммарная выручка смены (тарифы + товары).
 */
export function calculateTotalRevenue(
  revenueTariff: number,
  revenueGoods: number,
): number {
  return revenueTariff + revenueGoods;
}

/**
 * O = ROUND(SUM(выручка) / план × 100; 0) − 100
 */
export function calculatePercentOverPlan(
  totalRevenue: number,
  plan: number,
): number {
  if (plan <= 0) {
    return 0;
  }
  return excelRound((totalRevenue / plan) * 100, 0) - 100;
}

/**
 * P по типу смены:
 * - DAY (15000): MIN(ROUND(O×10;0); 1000)
 * - NIGHT / EXTRA (5000): MIN(ROUND(O×10;0); 500)
 */
export function calculateBaseBonus(
  percentOverPlan: number,
  shiftType: ShiftType,
): number {
  const { pMultiplier, pCap } = getPlanConfig(shiftType);
  const raw = excelRound(percentOverPlan * pMultiplier, 0);
  return Math.min(raw, pCap);
}

/**
 * Q = P + премия/штраф (до обнуления).
 */
export function calculateRawFinalBonus(
  baseBonus: number,
  bonusAdjustment = 0,
): number {
  return baseBonus + bonusAdjustment;
}

/**
 * Итоговый бонус: при обнулении старшим админом сохраняется 0.
 */
export function applyBonusReset(
  rawFinalBonus: number,
  bonusManualReset: boolean,
): number {
  if (bonusManualReset) {
    return 0;
  }
  return rawFinalBonus;
}

/**
 * Ограничение итогового бонуса: 0 … 1500 ₽ (после обнуления всегда 0).
 */
export function clampShiftBonus(
  value: number,
  bonusManualReset: boolean,
): number {
  if (bonusManualReset) {
    return 0;
  }
  return Math.min(BONUS_MAX_TOTAL, Math.max(BONUS_MIN_TOTAL, value));
}

/**
 * Полный расчёт бонуса за смену (O → P → Q + обнуление).
 * @see .cursor/rules/05-kpi-bonus.mdc
 */
export function calculateShiftBonus(input: BonusInput): BonusResult {
  const shiftType = input.shiftType;
  const { plan } = getPlanConfig(shiftType);
  const totalRevenue = calculateTotalRevenue(
    input.revenueTariff,
    input.revenueGoods,
  );
  const percentOverPlan = calculatePercentOverPlan(totalRevenue, plan);
  const baseBonus = calculateBaseBonus(percentOverPlan, shiftType);
  const bonusAdjustment = input.bonusAdjustment ?? 0;
  const bonusManualReset = input.bonusManualReset ?? false;
  const rawFinalBonus = calculateRawFinalBonus(baseBonus, bonusAdjustment);
  const afterReset = applyBonusReset(rawFinalBonus, bonusManualReset);
  const finalBonus = clampShiftBonus(afterReset, bonusManualReset);
  const needsReset = rawFinalBonus < 0 && !bonusManualReset;

  return {
    totalRevenue,
    plan,
    shiftType,
    percentOverPlan,
    baseBonus,
    rawFinalBonus,
    finalBonus,
    bonusAdjustment,
    bonusManualReset,
    needsReset,
  };
}

/** Значение для поля Shift.bonus (0 … 1500 ₽). */
export function getStoredBonusValue(result: BonusResult): number {
  return result.finalBonus;
}
