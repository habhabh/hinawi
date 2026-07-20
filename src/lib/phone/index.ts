const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

export function toEnglishDigits(value: string): string {
  return [...value]
    .map((char) => {
      const arabicIndex = ARABIC_DIGITS.indexOf(char);
      if (arabicIndex >= 0) return String(arabicIndex);
      const persianIndex = PERSIAN_DIGITS.indexOf(char);
      return persianIndex >= 0 ? String(persianIndex) : char;
    })
    .join("");
}

export function normalizePhone(value: string, defaultCountryCode = "966"): string | null {
  let digits = toEnglishDigits(value).trim().replace(/[^\d+]/g, "");
  if (digits.startsWith("00")) digits = `+${digits.slice(2)}`;
  if (!digits.startsWith("+")) {
    digits = digits.startsWith("0") ? `+${defaultCountryCode}${digits.slice(1)}` : `+${digits}`;
  }
  return /^\+[1-9]\d{7,14}$/.test(digits) ? digits : null;
}
