# Skill: Bonus Calculation
Description: Используй этот skill при любой работе с расчётом бонуса за смену (O, P, Q, clamp 0-1500, ночной план 5000, обнуление).

Ключевые формулы:
- O = ROUND(SUM(выручка) / план * 100) - 100
- P = min(ROUND(O*10), 1000) для дня / 500 для ночи
- Q = clamp(P + adjustment, 0, 1500)