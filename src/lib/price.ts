/**
 * واحد قیمت: ریال (IRR) طبق استاندارد ISO 4217
 * 
 * قرارداد:
 * - تمام مبالغ در Database به ریال (عدد صحیح) ذخیره می‌شوند
 * - تبدیل به تومان فقط در لایه‌ی UI انجام می‌شود
 * - سازگار با درگاه‌های پرداخت ایرانی (زرین‌پال، پی‌پینگ، سامان)
 */

export type PriceInRials = number;

/**
 * تبدیل تومان به ریال (×۱۰)
 */
export function tomanToRial(toman: number): PriceInRials {
  return Math.floor(toman * 10);
}

/**
 * تبدیل ریال به تومان (÷۱۰)
 */
export function rialToToman(rial: PriceInRials): number {
  return Math.floor(rial / 10);
}

/**
 * فرمت نمایش قیمت به تومان با جداکننده‌ی هزارگان فارسی
 * 
 * @example
 * formatPrice(750000) // "۷۵,۰۰۰ تومان"
 */
export function formatPrice(rials: PriceInRials): string {
  const toman = rialToToman(rials);
  return new Intl.NumberFormat('fa-IR').format(toman) + ' تومان';
}

/**
 * فرمت نمایش قیمت به تومان (بدون واحد)
 * 
 * @example
 * formatPriceNumber(750000) // "۷۵,۰۰۰"
 */
export function formatPriceNumber(rials: PriceInRials): string {
  const toman = rialToToman(rials);
  return new Intl.NumberFormat('fa-IR').format(toman);
}

/**
 * Parse کردن مقدار تومان وارد شده توسط کاربر به ریال
 * 
 * @example
 * parseTomanInput("75000") // 750000
 * parseTomanInput("۷۵۰۰۰") // 750000
 * parseTomanInput("75,000") // 750000
 */
export function parseTomanInput(input: string): PriceInRials {
  const normalized = input
    .replace(/[,٬]/g, '')
    .replace(/[۰-۹]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1728));
  
  const toman = parseFloat(normalized);
  
  if (isNaN(toman) || toman < 0) {
    throw new Error('مقدار قیمت نامعتبر است');
  }
  
  return tomanToRial(toman);
}
