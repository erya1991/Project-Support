import { fmtDate } from './date'

export function matchesKeyword (keyword, values) {
  const text = (keyword || '').trim().toLocaleLowerCase()
  return !text || values.some(value => String(value == null ? '' : value).toLocaleLowerCase().includes(text))
}

export function inDateRange (value, range) {
  if (!range || range.length !== 2) return true
  const date = (value || '').slice(0, 10)
  return !!date && date >= fmtDate(range[0]) && date <= fmtDate(range[1])
}
