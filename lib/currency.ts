export interface HotelSetting {
  id: string
  baseCurrency: string
  altCurrency: string
  fxRate: number
}

export const CURRENCY_SYMBOLS: Record<string, string> = {
  THB: '฿',
  MMK: 'K',
  USD: '$',
  EUR: '€',
  SGD: 'S$',
  CNY: '¥',
}

export function currencySymbol(code: string): string {
  return CURRENCY_SYMBOLS[code] ?? code + ' '
}

export function formatMoney(amount: number, code: string): string {
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: code === 'USD' || code === 'EUR' ? 2 : 0,
  }).format(amount)
  return `${currencySymbol(code)}${formatted}`
}

/** Convert an amount entered in the alt currency to base currency at the house rate. */
export function altToBase(amount: number, fxRate: number): number {
  return Math.round(amount * fxRate * 100) / 100
}

/** Base-currency amount expressed in the alt currency at the house rate. */
export function baseToAlt(amount: number, fxRate: number): number {
  if (fxRate <= 0) return 0
  return Math.round((amount / fxRate) * 100) / 100
}
