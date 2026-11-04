import { TROOP_TYPES, UNITS, type Army, type BType, type TroopType } from "./config";

const EPSILON = 1e-8;

export const producedUnit = (building: BType): TroopType => building === "speed" ? "fast" : building === "heavy" ? "heavy" : "normal";
export const emptyArmy = (): Army => ({ normal: 0, fast: 0, heavy: 0 });
export const unitCount = (points: number, type: TroopType) => Math.max(0, Math.ceil((points - EPSILON) / UNITS[type].power));
export const armyCount = (army: Army) => TROOP_TYPES.reduce((sum, type) => sum + unitCount(army[type], type), 0);
export const armyPower = (army: Army) => TROOP_TYPES.reduce((sum, type) => sum + Math.max(0, army[type]), 0);

export function createArmy(type: TroopType, count: number): Army {
  const army = emptyArmy();
  army[type] = Math.max(0, Math.floor(count)) * UNITS[type].power;
  return army;
}

export function addUnit(army: Army, type: TroopType, count = 1) {
  army[type] += count * UNITS[type].power;
}

// Split a dispatch proportionally by headcount, never changing a soldier's type.
export function selectArmy(army: Army, requested: number): Army {
  const selected = emptyArmy();
  const total = armyCount(army);
  const amount = Math.max(0, Math.min(total, Math.floor(requested)));
  if (!total || !amount) return selected;
  const shares = TROOP_TYPES.map((type, index) => {
    const count = unitCount(army[type], type);
    const ideal = count * amount / total;
    return { type, count, take: Math.floor(ideal), remainder: ideal - Math.floor(ideal), index };
  });
  let rest = amount - shares.reduce((sum, share) => sum + share.take, 0);
  for (const share of [...shares].sort((a, b) => b.remainder - a.remainder || a.index - b.index)) {
    if (rest && share.take < share.count) { share.take++; rest--; }
  }
  for (const share of shares) selected[share.type] = Math.min(army[share.type], share.take * UNITS[share.type].power);
  return selected;
}

export function takeArmy(army: Army, amount: number): Army {
  const selected = selectArmy(army, amount);
  for (const type of TROOP_TYPES) army[type] = Math.max(0, army[type] - selected[type]);
  return selected;
}

// Preserve partial damage on a surviving soldier instead of rounding it into extra troops.
export function damageArmy(army: Army, damage: number) {
  for (const type of TROOP_TYPES) {
    const hit = Math.min(army[type], Math.max(0, damage));
    army[type] -= hit;
    if (army[type] < EPSILON) army[type] = 0;
    damage -= hit;
    if (damage <= EPSILON) break;
  }
}