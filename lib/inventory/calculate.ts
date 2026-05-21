export interface InventoryLineInput {
  productName: string;
  /** Остаток на начало смены (прошлая инвентаризация) */
  previousStock: number;
  /** Доставлено за смену (Smartshell) */
  delivered: number;
  /** Выставлено на полку (Smartshell) */
  displayed: number;
  /** Факт на полках — единственный ручной ввод */
  fact: number;
}

export interface InventoryLineCalculated extends InventoryLineInput {
  /** Разница: было + доставлено − выставлено − факт */
  difference: number;
  /** Продано */
  sold: number;
  /** Склад (остаток не на полке) */
  warehouse: number;
}

/**
 * Ожидаемый остаток на полке до ввода факта.
 */
export function expectedOnShelf(input: Pick<InventoryLineInput, "previousStock" | "delivered" | "displayed">): number {
  return input.previousStock + input.delivered - input.displayed;
}

/**
 * Авторасчёт по формулам инвентаризации (Excel).
 * - разница = было + доставлено − выставлено − факт
 * - продано = max(0, было + доставлено − факт)
 * - склад = max(0, факт − выставлено)
 */
export function calculateInventoryLine(
  input: InventoryLineInput,
): InventoryLineCalculated {
  const sold = Math.max(0, input.previousStock + input.delivered - input.fact);
  const difference = input.previousStock + input.delivered - input.displayed - input.fact;
  const warehouse = Math.max(0, input.fact - input.displayed);

  return {
    ...input,
    difference,
    sold,
    warehouse,
  };
}

export type DifferenceTone = "positive" | "negative" | "zero";

export function getDifferenceTone(difference: number): DifferenceTone {
  if (difference > 0) return "positive";
  if (difference < 0) return "negative";
  return "zero";
}
