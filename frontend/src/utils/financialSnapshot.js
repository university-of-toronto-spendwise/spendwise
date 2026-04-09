function toNumber(value) {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function buildFinancialSnapshot(profile = {}) {
  const revenue = toNumber(profile.total_earnings);
  const expenses = toNumber(profile.total_expenses);
  const parentalSupport = toNumber(profile.parental_support);
  const scholarshipAid = toNumber(profile.scholarship_aid_amount);
  const effectiveIncome = revenue + parentalSupport + scholarshipAid;
  const balance = effectiveIncome - expenses;

  return {
    revenue,
    expenses,
    parentalSupport,
    scholarshipAid,
    effectiveIncome,
    balance,
    deficit: Math.max(expenses - effectiveIncome, 0),
    surplus: Math.max(effectiveIncome - expenses, 0),
  };
}

export function scholarshipAwardAmount(scholarship = {}) {
  // Prefer max over min; falls back to 0 if both are null (card won't render coverage)
  const rawAmount = scholarship.amount_max ?? scholarship.amount_min ?? 0;
  return toNumber(rawAmount);
}

export function coverageAmount(deficit, amount) {
  return Math.min(Math.max(toNumber(deficit), 0), Math.max(toNumber(amount), 0));
}

export function coveragePercent(deficit, coveredAmount) {
  const safeDeficit = Math.max(toNumber(deficit), 0);
  if (!safeDeficit) return 0;
  return Math.min(Math.round((Math.max(toNumber(coveredAmount), 0) / safeDeficit) * 100), 100);
}
