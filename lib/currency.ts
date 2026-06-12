export interface HotelSetting {
  id: string
  baseCurrency: string
  altCurrency: string
  fxRate: number
  fxRates?: unknown // Json column: { CODE: units of baseCurrency per 1 CODE }
}

function ratesTable(setting: HotelSetting): Record<string, number> {
  const raw = setting.fxRates
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {}
  const out: Record<string, number> = {}
  for (const [code, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'number' && v > 0) out[code] = v
  }
  return out
}

/** House rate to base for a currency: 1 for base, table entry, or the legacy
 *  single fxRate for the alt currency. Null when no rate is configured. */
export function rateFor(setting: HotelSetting, code: string): number | null {
  if (code === setting.baseCurrency) return 1
  const table = ratesTable(setting)
  if (table[code] !== undefined) return table[code]
  if (code === setting.altCurrency && setting.fxRate > 0) return setting.fxRate
  return null
}

/** Currencies a guest can pay in: base + everything with a configured rate. */
export function payableCurrencies(setting: HotelSetting): string[] {
  const set = new Set<string>([setting.baseCurrency, ...Object.keys(ratesTable(setting))])
  if (setting.fxRate > 0) set.add(setting.altCurrency)
  return Array.from(set)
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
