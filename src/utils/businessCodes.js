import { todayStr } from './date'

export function nextCode (records, prefix, date = todayStr()) {
  const start = prefix + date.slice(0, 4)
  const highest = records.reduce((max, row) => {
    if (!row.id.startsWith(start)) return max
    return Math.max(max, Number(row.id.slice(start.length)))
  }, 0)
  return start + String(highest + 1).padStart(4, '0')
}
