export interface PublicHoliday {
  name: string;
  month: number;
  day: number;
  isRecurring: boolean;
}

export const GHANA_PUBLIC_HOLIDAYS_2024: PublicHoliday[] = [
  { name: "New Year's Day", month: 1, day: 1, isRecurring: true },
  { name: "Constitution Day", month: 1, day: 7, isRecurring: true },
  { name: "Independence Day", month: 3, day: 6, isRecurring: true },
  { name: "Good Friday", month: 3, day: 29, isRecurring: false },
  { name: "Easter Saturday", month: 3, day: 30, isRecurring: false },
  { name: "Easter Monday", month: 4, day: 1, isRecurring: false },
  { name: "May Day", month: 5, day: 1, isRecurring: true },
  { name: "Eid al-Fitr", month: 4, day: 10, isRecurring: false },
  { name: "Eid al-Adha", month: 6, day: 17, isRecurring: false },
  { name: "Founders' Day", month: 8, day: 4, isRecurring: true },
  { name: "Kwame Nkrumah Memorial Day", month: 9, day: 21, isRecurring: true },
  { name: "Farmers' Day", month: 12, day: 6, isRecurring: true },
  { name: "Christmas Day", month: 12, day: 25, isRecurring: true },
  { name: "Boxing Day", month: 12, day: 26, isRecurring: true },
];

export const GHANA_PUBLIC_HOLIDAYS_2025: PublicHoliday[] = [
  { name: "New Year's Day", month: 1, day: 1, isRecurring: true },
  { name: "Constitution Day", month: 1, day: 7, isRecurring: true },
  { name: "Independence Day", month: 3, day: 6, isRecurring: true },
  { name: "Good Friday", month: 4, day: 18, isRecurring: false },
  { name: "Easter Saturday", month: 4, day: 19, isRecurring: false },
  { name: "Easter Monday", month: 4, day: 21, isRecurring: false },
  { name: "May Day", month: 5, day: 1, isRecurring: true },
  { name: "Eid al-Fitr", month: 3, day: 31, isRecurring: false },
  { name: "Eid al-Adha", month: 6, day: 7, isRecurring: false },
  { name: "Founders' Day", month: 8, day: 4, isRecurring: true },
  { name: "Kwame Nkrumah Memorial Day", month: 9, day: 21, isRecurring: true },
  { name: "Farmers' Day", month: 12, day: 5, isRecurring: true },
  { name: "Christmas Day", month: 12, day: 25, isRecurring: true },
  { name: "Boxing Day", month: 12, day: 26, isRecurring: true },
];

export const GHANA_PUBLIC_HOLIDAYS_2026: PublicHoliday[] = [
  { name: "New Year's Day", month: 1, day: 1, isRecurring: true },
  { name: "Constitution Day", month: 1, day: 7, isRecurring: true },
  { name: "Independence Day", month: 3, day: 6, isRecurring: true },
  { name: "Good Friday", month: 4, day: 3, isRecurring: false },
  { name: "Easter Saturday", month: 4, day: 4, isRecurring: false },
  { name: "Easter Monday", month: 4, day: 6, isRecurring: false },
  { name: "May Day", month: 5, day: 1, isRecurring: true },
  { name: "Eid al-Fitr", month: 3, day: 20, isRecurring: false },
  { name: "Eid al-Adha", month: 5, day: 27, isRecurring: false },
  { name: "Founders' Day", month: 8, day: 4, isRecurring: true },
  { name: "Kwame Nkrumah Memorial Day", month: 9, day: 21, isRecurring: true },
  { name: "Farmers' Day", month: 12, day: 4, isRecurring: true },
  { name: "Christmas Day", month: 12, day: 25, isRecurring: true },
  { name: "Boxing Day", month: 12, day: 26, isRecurring: true },
];

export function getHolidaysForYear(year: number): PublicHoliday[] {
  switch (year) {
    case 2024:
      return GHANA_PUBLIC_HOLIDAYS_2024;
    case 2025:
      return GHANA_PUBLIC_HOLIDAYS_2025;
    case 2026:
      return GHANA_PUBLIC_HOLIDAYS_2026;
    default:
      return GHANA_PUBLIC_HOLIDAYS_2026;
  }
}

export function isPublicHoliday(date: Date, holidays: PublicHoliday[]): PublicHoliday | null {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  return holidays.find(h => h.month === month && h.day === day) || null;
}

export function getHolidayDates(year: number): Date[] {
  const holidays = getHolidaysForYear(year);
  return holidays.map(h => new Date(year, h.month - 1, h.day));
}
