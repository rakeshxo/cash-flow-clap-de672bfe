// Shared option lists for both onboarding and admin targeting.
// Keep these in sync with src/pages/Onboarding.tsx.

export const AGE_RANGES = ["Under 18", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"];
export const GENDERS = ["Female", "Male", "Non-binary", "Prefer not to say"];
export const EMPLOYMENT = ["Employed full-time", "Employed part-time", "Self-employed", "Student", "Unemployed", "Retired", "Homemaker"];
export const INCOME = ["Under $25k", "$25k-$50k", "$50k-$75k", "$75k-$100k", "$100k-$150k", "$150k+", "Prefer not to say"];
export const MARITAL = ["Single", "In a relationship", "Married", "Divorced", "Widowed"];
export const EDUCATION = ["High school", "Some college", "Bachelor's", "Master's", "Doctorate", "Other"];

export type ProfileLite = {
  age_range?: string | null;
  gender?: string | null;
  country?: string | null;
  employment_status?: string | null;
  income_range?: string | null;
  marital_status?: string | null;
  has_kids?: boolean | null;
  education?: string | null;
};

export type SurveyTargeting = {
  target_age_ranges?: string[] | null;
  target_genders?: string[] | null;
  target_countries?: string[] | null;
  target_employment_statuses?: string[] | null;
  target_marital_statuses?: string[] | null;
  target_education?: string[] | null;
  target_income_ranges?: string[] | null;
  target_has_kids?: string | null; // 'any' | 'yes' | 'no'
};

const norm = (s?: string | null) => (s ?? "").trim().toLowerCase();

const allows = (allowed: string[] | null | undefined, value?: string | null) => {
  if (!allowed || allowed.length === 0) return true; // no restriction
  if (!value) return false; // restricted but respondent didn't answer
  const v = norm(value);
  return allowed.some((a) => norm(a) === v);
};

/** Returns true if the respondent profile matches all of the survey's targeting constraints. */
export const matchesProfile = (s: SurveyTargeting, p: ProfileLite | null | undefined): boolean => {
  if (!p) return false;
  if (!allows(s.target_age_ranges, p.age_range)) return false;
  if (!allows(s.target_genders, p.gender)) return false;
  if (!allows(s.target_countries, p.country)) return false;
  if (!allows(s.target_employment_statuses, p.employment_status)) return false;
  if (!allows(s.target_marital_statuses, p.marital_status)) return false;
  if (!allows(s.target_education, p.education)) return false;
  if (!allows(s.target_income_ranges, p.income_range)) return false;
  const hk = s.target_has_kids ?? "any";
  if (hk === "yes" && p.has_kids !== true) return false;
  if (hk === "no" && p.has_kids !== false) return false;
  return true;
};

/** True if the survey has any targeting constraint set. */
export const hasAnyTargeting = (s: SurveyTargeting): boolean => {
  return Boolean(
    (s.target_age_ranges?.length ?? 0) ||
    (s.target_genders?.length ?? 0) ||
    (s.target_countries?.length ?? 0) ||
    (s.target_employment_statuses?.length ?? 0) ||
    (s.target_marital_statuses?.length ?? 0) ||
    (s.target_education?.length ?? 0) ||
    (s.target_income_ranges?.length ?? 0) ||
    (s.target_has_kids && s.target_has_kids !== "any"),
  );
};
