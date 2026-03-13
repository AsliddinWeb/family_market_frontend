import { format, parseISO } from 'date-fns'
import { uz } from 'date-fns/locale'

export function formatDate(dateStr: string, fmt = 'dd.MM.yyyy'): string {
  try {
    return format(parseISO(dateStr), fmt, { locale: uz })
  } catch {
    return dateStr
  }
}

export function formatDateTime(dateStr: string): string {
  return formatDate(dateStr, 'dd.MM.yyyy HH:mm')
}

export function formatTime(timeStr: string): string {
  if (!timeStr) return '—'
  // "18:19:38.857928" yoki "18:19:38" → "18:19"
  if (/^\d{2}:\d{2}/.test(timeStr)) {
    return timeStr.slice(0, 5)
  }
  // ISO datetime string bo'lsa date-fns bilan parse qilamiz
  return formatDate(timeStr, 'HH:mm')
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`
  const km = meters / 1000
  return km < 10
    ? `${km.toFixed(1)} km`   // 1.4 km
    : `${Math.round(km)} km`  // 12 km
}

export function formatMoney(amount: number, currency = 'so\'m'): string {
  return `${new Intl.NumberFormat('uz-UZ').format(amount)} ${currency}`
}

export function formatMonth(year: number, month: number): string {
  const months = [
    'Yanvar','Fevral','Mart','Aprel','May','Iyun',
    'Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr',
  ]
  return `${months[month - 1]} ${year}`
}

export function currentYearMonth() {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}