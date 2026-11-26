import * as XLSX from 'xlsx-js-style'
import { beijingNow, todayStr } from './date'
import { buildDailyReport, buildWeeklyReport } from './reportData'
import store from '../store'

const THIN = { style: 'thin', color: { rgb: '9AAABB' } }
const BORDER = { top: THIN, left: THIN, bottom: THIN, right: THIN }

const STYLE = {
  title: {
    font: { name: '微软雅黑', sz: 16, bold: true, color: { rgb: '17324D' } },
    alignment: { horizontal: 'center', vertical: 'center' }
  },
  summary: {
    font: { name: '微软雅黑', sz: 9.5, color: { rgb: '33475B' } },
    alignment: { horizontal: 'left', vertical: 'top', wrapText: true },
    border: BORDER
  },
  section: {
    font: { name: '微软雅黑', sz: 11, bold: true, color: { rgb: '17324D' } },
    fill: { fgColor: { rgb: 'E9F2FC' } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: BORDER
  },
  header: {
    font: { name: '微软雅黑', sz: 9.5, bold: true, color: { rgb: '233B52' } },
    fill: { fgColor: { rgb: 'D8E8F9' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: BORDER
  },
  body: {
    font: { name: '微软雅黑', sz: 9 },
    alignment: { horizontal: 'left', vertical: 'top', wrapText: true },
    border: BORDER
  },
  center: {
    font: { name: '微软雅黑', sz: 9 },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: BORDER
  }
}

function put (ws, r, c, value, style) {
  const cell = {
    v: value === undefined || value === null ? '' : value,
    t: typeof value === 'number' ? 'n' : 's'
  }
  if (style) cell.s = style
  ws[XLSX.utils.encode_cell({ r, c })] = cell
}

function finish (ws, rows, cols) {
  if (!rows || !cols) return
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows - 1, c: cols - 1 } })
}

function merge (ws, r1, c1, r2, c2) {
  if (!ws['!merges']) ws['!merges'] = []
  ws['!merges'].push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } })
}

function setCols (ws, widths) {
  ws['!cols'] = widths.map(w => ({ wch: w }))
}

function setRowHeight (ws, r, hpt) {
  if (!ws['!rows']) ws['!rows'] = []
  ws['!rows'][r] = { hpt }
}

function download (wb, filename) {
  const data = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 3000)
}

function newBook () {
  return XLSX.utils.book_new()
}

function addSheet (wb, ws, name) {
  XLSX.utils.book_append_sheet(wb, ws, name)
}

export function exportAppealProgress (appeals) {
  const date = beijingNow()
  const title = '基层诉求问题解决进展汇总'
  const headers = ['序号', '发起人', '所属部门／项目', '需协调解决问题', '主责部门', '是否销项闭环',
    '截至' + date.format('M月D日') + '问题解决进展']
  const ws = {}
  put(ws, 0, 0, title, STYLE.title)
  merge(ws, 0, 0, 0, headers.length - 1)
  setRowHeight(ws, 0, 32)
  const headerStyle = { ...STYLE.header, fill: { patternType: 'solid', fgColor: { rgb: 'D9D9D9' } } }
  headers.forEach((label, col) => put(ws, 1, col, label, headerStyle))
  setRowHeight(ws, 1, 28)
  setCols(ws, [7, 13, 30, 52, 22, 15, 58])

  // 工具栏传入已生效筛选的全部记录。分组后沿用各组在列表中的出现顺序。
  const groups = new Map()
  for (const appeal of appeals) {
    const key = JSON.stringify([appeal.creatorId, appeal.company, appeal.type, appeal.unitId])
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(appeal)
  }
  let row = 2
  for (const group of groups.values()) {
    const start = row
    for (const appeal of group) {
      const first = row === start
      const values = [row - 1, first ? appeal.creatorName : '', first ? appeal.company + ' · ' + appeal.unitName : '',
        appeal.desc, appeal.deptName, appeal.status === '已销项' ? '是' : '否', appeal.progressContent || '—']
      values.forEach((value, col) => put(ws, row, col, value, col === 3 || col === 6 ? STYLE.body : STYLE.center))
      row++
    }
    if (row - start > 1) {
      merge(ws, start, 1, row - 1, 1)
      merge(ws, start, 2, row - 1, 2)
    }
  }
  finish(ws, row, headers.length)
  const wb = newBook()
  addSheet(wb, ws, title)
  wb.Workbook = { Names: [{ Name: '_xlnm.Print_Titles', Sheet: 0, Ref: "'" + title + "'!$1:$2" }] }
  download(wb, title + '_' + date.format('YYYYMMDD') + '.xlsx')
}

export function exportWorksExcel (works) {
  const headers = ['所属体系', '归属部门', '重点工作名称', '重点工作内容', '事项状态', '所属分公司', '项目名称', '帮扶人员',
    '项目落实情况', '填报状态', '统计范围', '首次填报人', '首次录入时间', '最后修改人', '最后修改时间']
  const ws = {}
  put(ws, 0, 0, '重点工作及项目执行情况', STYLE.title)
  merge(ws, 0, 0, 0, headers.length - 1)
  setRowHeight(ws, 0, 30)
  headers.forEach((label, i) => put(ws, 1, i, label, STYLE.header))
  let row = 2
  for (const work of works) {
    // 无有效项目时仍导出命中的事项本身。
    for (const e of work.executions.length ? work.executions : [{}]) {
      const values = [work.system, work.deptName, work.title, work.content, work.status, e.company, e.projectName, e.helperNames,
        e.content, e.status, e.scope, e.firstName, e.firstAt, e.lastName, e.lastAt]
      values.forEach((value, i) => put(ws, row, i, value, STYLE.body))
      setRowHeight(ws, row++, 42)
    }
  }
  setCols(ws, [12, 22, 26, 44, 12, 18, 25, 25, 45, 12, 12, 14, 23, 14, 23])
  finish(ws, row, headers.length)
  const wb = newBook()
  addSheet(wb, ws, '重点工作执行情况')
  download(wb, '重点工作执行情况_' + todayStr() + '.xlsx')
}

/* ---------- 附件4 日报 ---------- */
export function exportDailyExcel (date) {
  const report = buildDailyReport(store.db, date)
  const headersAbsent = ['序号', '姓名', '部门', '月份', '项目', '项目层面服务需求\n(动态调整)', '是否到岗', '未到岗原因']
  const headersService = ['序号', '姓名', '部门', '月份', '项目', '项目层面服务需求\n(动态调整)', '是否到岗', '当日工作开展情况', '今日项目反馈\n需协调解决问题']
  const ws = {}
  put(ws, 0, 0, report.title, STYLE.title)
  merge(ws, 0, 0, 0, 8)
  setRowHeight(ws, 0, 32)
  put(ws, 1, 0, report.summary, STYLE.summary)
  merge(ws, 1, 0, 1, 8)
  setRowHeight(ws, 1, 58)

  let r = 2
  put(ws, r, 0, '未到岗人员情况', STYLE.section)
  merge(ws, r, 0, r, 8)
  setRowHeight(ws, r, 22)
  r += 1
  headersAbsent.forEach((h, c) => put(ws, r, c, h, STYLE.header))
  for (let c = headersAbsent.length; c < 9; c++) put(ws, r, c, '', STYLE.header)
  setRowHeight(ws, r, 32)
  r += 1
  report.absentRows.forEach((row, index) => {
    put(ws, r, 0, index + 1, STYLE.center)
    put(ws, r, 1, row.personName, STYLE.center)
    put(ws, r, 2, row.deptName, STYLE.center)
    put(ws, r, 3, row.month, STYLE.center)
    put(ws, r, 4, row.projectName, STYLE.body)
    put(ws, r, 5, row.needs, STYLE.body)
    put(ws, r, 6, row.attend, STYLE.center)
    put(ws, r, 7, row.reason, STYLE.body)
    put(ws, r, 8, '', STYLE.body)
    setRowHeight(ws, r, 46)
    r += 1
  })

  r += 1
  put(ws, r, 0, '服务项目人员情况', STYLE.section)
  merge(ws, r, 0, r, 8)
  setRowHeight(ws, r, 22)
  r += 1
  headersService.forEach((h, c) => put(ws, r, c, h, STYLE.header))
  setRowHeight(ws, r, 32)
  r += 1
  report.serviceRows.forEach((row, index) => {
    put(ws, r, 0, index + 1, STYLE.center)
    put(ws, r, 1, row.personName, STYLE.center)
    put(ws, r, 2, row.deptName, STYLE.center)
    put(ws, r, 3, row.month, STYLE.center)
    put(ws, r, 4, row.projectName, STYLE.body)
    put(ws, r, 5, row.needs, STYLE.body)
    put(ws, r, 6, row.attend, STYLE.center)
    put(ws, r, 7, row.workContent, STYLE.body)
    put(ws, r, 8, row.issues, STYLE.body)
    setRowHeight(ws, r, 58)
    r += 1
  })
  setCols(ws, [6, 10, 20, 7, 20, 40, 7, 30, 28])
  finish(ws, r, 9)
  const wb = newBook()
  addSheet(wb, ws, '日报')
  download(wb, `公司总部人员服务项目日报_${date.replace(/-/g, '')}.xlsx`)
}

/* ---------- 附件5 周报 ---------- */
function mergeGroups (ws, rows, startRow, colsToMerge) {
  if (!rows.length) return
  let groupStart = 0
  const applyMerge = (start, end) => {
    if (end <= start) return
    const group = rows.slice(start, end + 1)
    if (new Set(group.map(r => r.needs)).size > 1) {
      const notes = group.filter(r => r.needs).map(r => r.date + '　' + r.needs)
      put(ws, startRow + start, 5, notes.join('\n'), STYLE.body)
    }
    colsToMerge.forEach(c => merge(ws, startRow + start, c, startRow + end, c))
  }
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].personId !== rows[i - 1].personId || rows[i].projectName !== rows[i - 1].projectName) {
      applyMerge(groupStart, i - 1)
      groupStart = i
    }
  }
  applyMerge(groupStart, rows.length - 1)
}

export function exportWeeklyExcel (start, end) {
  const report = buildWeeklyReport(store.db, start, end)
  const headersAbsent = ['序号', '姓名', '部门', '日期', '项目', '项目层面服务需求\n(动态调整)', '是否到岗', '未到岗原因']
  const headersService = ['序号', '姓名', '部门', '日期', '项目', '项目层面服务需求\n(动态调整)', '是否到岗', '当日工作开展情况', '今日项目反馈\n需协调解决问题']
  const ws = {}
  put(ws, 0, 0, report.title, STYLE.title)
  merge(ws, 0, 0, 0, 8)
  setRowHeight(ws, 0, 32)
  put(ws, 1, 0, report.summary, STYLE.summary)
  merge(ws, 1, 0, 1, 8)
  setRowHeight(ws, 1, 52)

  let r = 2
  put(ws, r, 0, '未到岗人员情况', STYLE.section)
  merge(ws, r, 0, r, 8)
  setRowHeight(ws, r, 22)
  r += 1
  headersAbsent.forEach((h, c) => put(ws, r, c, h, STYLE.header))
  for (let c = headersAbsent.length; c < 9; c++) put(ws, r, c, '', STYLE.header)
  setRowHeight(ws, r, 32)
  r += 1
  const absentStart = r
  let lastPerson = null
  let personSeq = 0
  report.absentRows.forEach((row) => {
    if (row.personId !== lastPerson) {
      personSeq += 1
      lastPerson = row.personId
    }
    put(ws, r, 0, personSeq, STYLE.center)
    put(ws, r, 1, row.personName, STYLE.center)
    put(ws, r, 2, row.deptName, STYLE.center)
    put(ws, r, 3, row.date, STYLE.center)
    put(ws, r, 4, row.projectName, STYLE.body)
    put(ws, r, 5, row.needs, STYLE.body)
    put(ws, r, 6, row.attend, STYLE.center)
    put(ws, r, 7, row.reason, STYLE.body)
    put(ws, r, 8, '', STYLE.body)
    setRowHeight(ws, r, 44)
    r += 1
  })
  mergeGroups(ws, report.absentRows, absentStart, [0, 1, 2, 4, 5, 6])

  r += 1
  put(ws, r, 0, '服务项目人员情况', STYLE.section)
  merge(ws, r, 0, r, 8)
  setRowHeight(ws, r, 22)
  r += 1
  headersService.forEach((h, c) => put(ws, r, c, h, STYLE.header))
  setRowHeight(ws, r, 32)
  r += 1
  const serviceStart = r
  lastPerson = null
  personSeq = 0
  report.serviceRows.forEach((row) => {
    if (row.personId !== lastPerson) {
      personSeq += 1
      lastPerson = row.personId
    }
    put(ws, r, 0, personSeq, STYLE.center)
    put(ws, r, 1, row.personName, STYLE.center)
    put(ws, r, 2, row.deptName, STYLE.center)
    put(ws, r, 3, row.date, STYLE.center)
    put(ws, r, 4, row.projectName, STYLE.body)
    put(ws, r, 5, row.needs, STYLE.body)
    put(ws, r, 6, row.attend, STYLE.center)
    put(ws, r, 7, row.workContent, STYLE.body)
    put(ws, r, 8, row.issues, STYLE.body)
    setRowHeight(ws, r, 52)
    r += 1
  })
  mergeGroups(ws, report.serviceRows, serviceStart, [0, 1, 2, 4, 5, 6])
  setCols(ws, [6, 10, 20, 12, 20, 40, 7, 32, 28])
  finish(ws, r, 9)
  const wb = newBook()
  addSheet(wb, ws, '周报')
  download(wb, `公司总部人员服务项目周报_${start.replace(/-/g, '')}_${end.replace(/-/g, '')}.xlsx`)
}

export function exportDailyByDate (date) {
  exportDailyExcel(date)
}

export function exportWeeklyByRange (start, end) {
  exportWeeklyExcel(start, end)
}
