import * as XLSX from 'xlsx-js-style'
import { todayStr } from './date'
import {
  buildWorkList,
  buildAppealList,
  buildSuggestionList,
  buildDailyReport,
  buildWeeklyReport
} from './reportData'
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

function safeName (name) {
  return String(name).replace(/[\\/:*?"<>|]/g, '')
}

function newBook () {
  return XLSX.utils.book_new()
}

function addSheet (wb, ws, name) {
  XLSX.utils.book_append_sheet(wb, ws, name)
}

/* ---------- 附件1 重点工作梳理清单 ---------- */
export function exportWorksExcel () {
  const db = store.db
  const rows = buildWorkList(db)
  const headers = ['序号', '体系', '部门', '重点工作', '项目落实情况', '存在问题', '改进建议']
  const ws = {}
  put(ws, 0, 0, '重点工作梳理清单', STYLE.title)
  merge(ws, 0, 0, 0, 6)
  setRowHeight(ws, 0, 30)
  headers.forEach((h, c) => put(ws, 1, c, h, STYLE.header))
  setRowHeight(ws, 1, 28)

  let sysSeq = 0
  let lastSystem = null
  let systemStart = 2
  let deptStart = 2
  let lastDept = null

  rows.forEach((row, index) => {
    const r = index + 2
    if (row.system !== lastSystem) {
      sysSeq += 1
      if (index > 0) {
        if (r - 1 > systemStart) merge(ws, systemStart, 0, r - 1, 0)
        if (r - 1 > systemStart) merge(ws, systemStart, 1, r - 1, 1)
      }
      systemStart = r
      lastSystem = row.system
      put(ws, r, 0, sysSeq, STYLE.center)
      put(ws, r, 1, row.system, STYLE.center)
    } else {
      put(ws, r, 0, '', STYLE.center)
      put(ws, r, 1, '', STYLE.center)
    }
    if (row.deptName !== lastDept || index === 0) {
      if (index > 0 && r - 1 > deptStart) merge(ws, deptStart, 2, r - 1, 2)
      deptStart = r
      lastDept = row.deptName
      put(ws, r, 2, row.deptName, STYLE.center)
    } else {
      put(ws, r, 2, '', STYLE.center)
    }
    put(ws, r, 3, row.title, STYLE.body)
    put(ws, r, 4, row.result, STYLE.body)
    put(ws, r, 5, row.problem, STYLE.body)
    put(ws, r, 6, row.suggestion, STYLE.body)
    setRowHeight(ws, r, 34)
  })
  if (rows.length) {
    const last = rows.length + 1
    if (last > systemStart) {
      merge(ws, systemStart, 0, last, 0)
      merge(ws, systemStart, 1, last, 1)
    }
    if (last > deptStart) merge(ws, deptStart, 2, last, 2)
  }
  setCols(ws, [6, 10, 18, 34, 42, 28, 30])
  finish(ws, rows.length + 2, 7)
  const wb = newBook()
  addSheet(wb, ws, '重点工作梳理清单')
  download(wb, `重点工作梳理清单_${todayStr().replace(/-/g, '')}.xlsx`)
}

/* ---------- 附件2 项目诉求办理清单 ---------- */
export function exportAppealsExcel (projectId) {
  const db = store.db
  const rows = buildAppealList(db, projectId)
  const project = projectId ? store.getProject(projectId) : null
  const headers = ['序号', '诉求事项', '具体描述', '主责部门', '责任人', '推进计划', '完成时限']
  const ws = {}
  put(ws, 0, 0, '项目诉求办理清单', STYLE.title)
  merge(ws, 0, 0, 0, 6)
  setRowHeight(ws, 0, 30)
  put(ws, 1, 0, `项目：${project ? project.name : '全部项目'}　　导出日期：${todayStr()}`, STYLE.summary)
  merge(ws, 1, 0, 1, 6)
  setRowHeight(ws, 1, 22)
  headers.forEach((h, c) => put(ws, 2, c, h, STYLE.header))
  setRowHeight(ws, 2, 28)
  rows.forEach((row, index) => {
    const r = index + 3
    put(ws, r, 0, index + 1, STYLE.center)
    put(ws, r, 1, row.title, STYLE.body)
    put(ws, r, 2, row.desc, STYLE.body)
    put(ws, r, 3, row.deptName, STYLE.center)
    put(ws, r, 4, row.personName, STYLE.center)
    put(ws, r, 5, row.plan, STYLE.body)
    put(ws, r, 6, row.dueDate, STYLE.center)
    setRowHeight(ws, r, 40)
  })
  setCols(ws, [6, 26, 46, 16, 9, 42, 12])
  finish(ws, rows.length + 3, 7)
  const wb = newBook()
  addSheet(wb, ws, '项目诉求办理清单')
  download(wb, `项目诉求办理清单_${safeName(project ? project.name : '全部项目')}_${todayStr().replace(/-/g, '')}.xlsx`)
}

/* ---------- 附件3 制度改进建议清单 ---------- */
export function exportSuggestionsExcel () {
  const db = store.db
  const rows = buildSuggestionList(db)
  const headers = ['序号', '建议事项', '涉及制度/流程', '问题描述', '提出人/部门', '主责部门', '回复意见', '整改计划', '完成时限']
  const ws = {}
  put(ws, 0, 0, '制度改进建议清单', STYLE.title)
  merge(ws, 0, 0, 0, 8)
  setRowHeight(ws, 0, 30)
  headers.forEach((h, c) => put(ws, 1, c, h, STYLE.header))
  setRowHeight(ws, 1, 30)
  rows.forEach((row, index) => {
    const r = index + 2
    put(ws, r, 0, index + 1, STYLE.center)
    put(ws, r, 1, row.title, STYLE.body)
    put(ws, r, 2, row.flow, STYLE.body)
    put(ws, r, 3, row.desc, STYLE.body)
    put(ws, r, 4, row.proposer, STYLE.center)
    put(ws, r, 5, row.deptName, STYLE.center)
    put(ws, r, 6, row.replyText, STYLE.body)
    put(ws, r, 7, row.plan, STYLE.body)
    put(ws, r, 8, row.deadline, STYLE.center)
    setRowHeight(ws, r, 40)
  })
  setCols(ws, [6, 26, 24, 44, 18, 18, 32, 34, 12])
  finish(ws, rows.length + 2, 9)
  const wb = newBook()
  addSheet(wb, ws, '制度改进建议清单')
  download(wb, `制度改进建议清单_${todayStr().replace(/-/g, '')}.xlsx`)
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
    colsToMerge.forEach(c => merge(ws, startRow + start, c, startRow + end, c))
  }
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].personName !== rows[i - 1].personName || rows[i].projectName !== rows[i - 1].projectName) {
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
    if (row.personName !== lastPerson) {
      personSeq += 1
      lastPerson = row.personName
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
    if (row.personName !== lastPerson) {
      personSeq += 1
      lastPerson = row.personName
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
