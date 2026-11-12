import moment from 'moment'
import 'moment/locale/zh-cn'

moment.locale('zh-cn')

// 业务日期统一按北京时间（UTC+8）自然日计算
export function beijingNow () {
  return moment().utcOffset(8)
}

export function todayStr () {
  return beijingNow().format('YYYY-MM-DD')
}

export function nowStr () {
  return beijingNow().format('YYYY-MM-DD HH:mm')
}

export function fmtDate (value) {
  return value ? moment(value).format('YYYY-MM-DD') : ''
}

export function fmtDateTime (value) {
  return value ? moment(value).format('YYYY-MM-DD HH:mm') : ''
}

export function cnDate (value) {
  return value ? moment(value).format('YYYY年MM月DD日') : ''
}

export function monthLabel (value) {
  return value ? moment(value, 'YYYY-MM-DD').format('M月') : ''
}

export function isFrozen (date) {
  if (!date) return false
  return date < todayStr()
}

export function isWeekend (date) {
  const d = moment(date, 'YYYY-MM-DD').day()
  return d === 0 || d === 6
}

export function weekdayLabel (date) {
  return moment(date, 'YYYY-MM-DD').format('dddd')
}

export function recentReportDays (count = 7) {
  const days = []
  const cursor = beijingNow().startOf('day')
  while (days.length < count) {
    if (cursor.day() !== 0 && cursor.day() !== 6) {
      days.unshift(cursor.format('YYYY-MM-DD'))
    }
    cursor.subtract(1, 'day')
  }
  const today = todayStr()
  if (days.indexOf(today) === -1) days.push(today)
  return days
}

export function weekRange (offset = 0) {
  const start = beijingNow().startOf('isoWeek').add(offset, 'week')
  return [start.format('YYYY-MM-DD'), start.clone().add(6, 'day').format('YYYY-MM-DD')]
}

export function datesBetween (start, end) {
  const list = []
  if (!start || !end) return list
  const cursor = moment(start, 'YYYY-MM-DD')
  const last = moment(end, 'YYYY-MM-DD')
  while (cursor.isSameOrBefore(last, 'day')) {
    list.push(cursor.format('YYYY-MM-DD'))
    cursor.add(1, 'day')
  }
  return list
}

export function workdaysBetween (start, end) {
  return datesBetween(start, end).filter(d => !isWeekend(d))
}

export function daysBetween (start, end) {
  return moment(end, 'YYYY-MM-DD').diff(moment(start, 'YYYY-MM-DD'), 'day')
}

export function isOverdue (dueDate, status) {
  if (!dueDate || status === '已销项') return false
  return moment(dueDate, 'YYYY-MM-DD').isBefore(moment().startOf('day'))
}
