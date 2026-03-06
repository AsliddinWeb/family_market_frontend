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

export function formatTime(dateStr: string): string {
  return formatDate(dateStr, 'HH:mm')
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