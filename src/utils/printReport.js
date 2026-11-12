import store from '../store'
import {
  buildWorkList,
  buildAppealList,
  buildSuggestionList,
  buildDailyReport,
  buildWeeklyReport
} from './reportData'
import { todayStr } from './date'

function esc (value) {
  if (value === undefined || value === null) return ''
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function cell (value, center) {
  return `<td class="${center ? 'c' : ''}">${esc(value)}</td>`
}

function row (cells, centerIndexes = []) {
  return `<tr>${cells.map((v, i) => cell(v, centerIndexes.indexOf(i) > -1)).join('')}</tr>`
}

const PRINT_CSS = `
  @page { size: A4 landscape; margin: 10mm 9mm; }
  * { box-sizing: border-box; }
  body { font-family: "Microsoft YaHei", "SimSun", Arial, sans-serif; font-size: 9pt; color: #111; margin: 0; padding: 0; }
  h1 { font-size: 16pt; text-align: center; margin: 0 0 8px; font-weight: 700; letter-spacing: 1px; }
  h2 { font-size: 11pt; margin: 12px 0 5px; font-weight: 700; }
  .summary { border: 1px solid #666; padding: 7px 9px; font-size: 9pt; line-height: 1.65; white-space: pre-line; margin-bottom: 8px; }
  table { border-collapse: collapse; width: 100%; table-layout: fixed; }
  th, td { border: 1px solid #555; padding: 3px 4px; font-size: 8.2pt; vertical-align: top; word-break: break-all; white-space: pre-line; line-height: 1.45; }
  th { background: #e8f1fb; font-weight: 700; text-align: center; vertical-align: middle; }
  td.c { text-align: center; vertical-align: middle; white-space: nowrap; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  .meta { font-size: 9pt; margin-bottom: 5px; }
  .foot { margin-top: 10px; font-size: 8pt; color: #666; text-align: right; }
`

function buildHtml (title, body) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<style>${PRINT_CSS}</style>
</head>
<body>
${body}
<div class="foot">导出时间：${todayStr()}　中建八局第三建设有限公司</div>
</body>
</html>`
}

function openPrintWindow (title, body) {
  const html = buildHtml(title, body)
  const win = window.open('', '_blank', 'width=1280,height=900')
  if (win) {
    win.document.open()
    win.document.write(html)
    win.document.close()
    win.document.title = title
    setTimeout(() => {
      win.focus()
      win.print()
    }, 600)
    return
  }
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)
  const doc = iframe.contentWindow.document
  doc.open()
  doc.write(html)
  doc.close()
  setTimeout(() => {
    iframe.contentWindow.focus()
    iframe.contentWindow.print()
    setTimeout(() => {
      if (document.body.contains(iframe)) document.body.removeChild(iframe)
    }, 60000)
  }, 500)
}

function emptyRow (cols) {
  return `<tr><td class="c" colspan="${cols}" style="color:#888;padding:12px;">暂无数据</td></tr>`
}

/* ---------- 附件1 ---------- */
export function printWorksList () {
  const rows = buildWorkList(store.db)
  const body = `
    <h1>重点工作梳理清单</h1>
    <div class="meta">导出日期：${todayStr()}　　共 ${rows.length} 项重点工作</div>
    <table>
      <colgroup><col style="width:5%"><col style="width:8%"><col style="width:12%"><col style="width:27%"><col style="width:26%"><col style="width:11%"><col style="width:11%"></colgroup>
      <thead><tr><th>序号</th><th>体系</th><th>部门</th><th>重点工作</th><th>项目落实情况</th><th>存在问题</th><th>改进建议</th></tr></thead>
      <tbody>
        ${rows.length ? rows.map((r, i) => row([i + 1, r.system, r.deptName, r.title, r.result, r.problem, r.suggestion], [0, 1, 2])).join('') : emptyRow(7)}
      </tbody>
    </table>`
  openPrintWindow('重点工作梳理清单', body)
}

/* ---------- 附件2 ---------- */
export function printAppealsList (projectId) {
  const project = projectId ? store.getProject(projectId) : null
  const rows = buildAppealList(store.db, projectId)
  const body = `
    <h1>项目诉求办理清单</h1>
    <div class="meta">项目：${esc(project ? project.name : '全部项目')}　　导出日期：${todayStr()}　　共 ${rows.length} 条</div>
    <table>
      <colgroup><col style="width:5%"><col style="width:17%"><col style="width:32%"><col style="width:10%"><col style="width:7%"><col style="width:22%"><col style="width:7%"></colgroup>
      <thead><tr><th>序号</th><th>诉求事项</th><th>具体描述</th><th>主责部门</th><th>责任人</th><th>推进计划</th><th>完成时限</th></tr></thead>
      <tbody>
        ${rows.length ? rows.map((r, i) => row([i + 1, r.title, r.desc, r.deptName, r.personName, r.plan, r.dueDate], [0, 3, 4, 6])).join('') : emptyRow(7)}
      </tbody>
    </table>`
  openPrintWindow('项目诉求办理清单', body)
}

/* ---------- 附件3 ---------- */
export function printSuggestionsList () {
  const rows = buildSuggestionList(store.db)
  const body = `
    <h1>制度改进建议清单</h1>
    <div class="meta">导出日期：${todayStr()}　　共 ${rows.length} 条</div>
    <table>
      <colgroup><col style="width:5%"><col style="width:15%"><col style="width:13%"><col style="width:25%"><col style="width:10%"><col style="width:10%"><col style="width:12%"><col style="width:14%"><col style="width:6%"></colgroup>
      <thead><tr><th>序号</th><th>建议事项</th><th>涉及制度/流程</th><th>问题描述</th><th>提出人/部门</th><th>主责部门</th><th>回复意见</th><th>整改计划</th><th>完成时限</th></tr></thead>
      <tbody>
        ${rows.length ? rows.map((r, i) => row([i + 1, r.title, r.flow, r.desc, r.proposer, r.deptName, r.replyText, r.plan, r.deadline], [0, 4, 5, 8])).join('') : emptyRow(9)}
      </tbody>
    </table>`
  openPrintWindow('制度改进建议清单', body)
}

/* ---------- 附件4 ---------- */
export function printDailyReport (date) {
  const report = buildDailyReport(store.db, date)
  const absent = report.absentRows.length
    ? report.absentRows.map((r, i) => row([i + 1, r.personName, r.deptName, r.month, r.projectName, r.needs, r.attend, r.reason], [0, 1, 2, 3, 6])).join('')
    : emptyRow(8)
  const service = report.serviceRows.length
    ? report.serviceRows.map((r, i) => row([i + 1, r.personName, r.deptName, r.month, r.projectName, r.needs, r.attend, r.workContent, r.issues], [0, 1, 2, 3, 6])).join('')
    : emptyRow(9)
  const body = `
    <h1>${esc(report.title)}</h1>
    <div class="summary">${esc(report.summary)}</div>
    <h2>未到岗人员情况</h2>
    <table>
      <colgroup><col style="width:5%"><col style="width:7%"><col style="width:13%"><col style="width:5%"><col style="width:15%"><col style="width:30%"><col style="width:6%"><col style="width:19%"></colgroup>
      <thead><tr><th>序号</th><th>姓名</th><th>部门</th><th>月份</th><th>项目</th><th>项目层面服务需求<br>(动态调整)</th><th>是否到岗</th><th>未到岗原因</th></tr></thead>
      <tbody>${absent}</tbody>
    </table>
    <h2>服务项目人员情况</h2>
    <table>
      <colgroup><col style="width:4%"><col style="width:6%"><col style="width:11%"><col style="width:4%"><col style="width:12%"><col style="width:24%"><col style="width:5%"><col style="width:20%"><col style="width:14%"></colgroup>
      <thead><tr><th>序号</th><th>姓名</th><th>部门</th><th>月份</th><th>项目</th><th>项目层面服务需求<br>(动态调整)</th><th>是否到岗</th><th>当日工作开展情况</th><th>今日项目反馈<br>需协调解决问题</th></tr></thead>
      <tbody>${service}</tbody>
    </table>`
  openPrintWindow(report.title, body)
}

/* ---------- 附件5 ---------- */
export function printWeeklyReport (start, end) {
  const report = buildWeeklyReport(store.db, start, end)
  const absent = report.absentRows.length
    ? report.absentRows.map((r, i) => row([i + 1, r.personName, r.deptName, r.date, r.projectName, r.needs, r.attend, r.reason], [0, 1, 2, 3, 6])).join('')
    : emptyRow(8)
  const service = report.serviceRows.length
    ? report.serviceRows.map((r, i) => row([i + 1, r.personName, r.deptName, r.date, r.projectName, r.needs, r.attend, r.workContent, r.issues], [0, 1, 2, 3, 6])).join('')
    : emptyRow(9)
  const body = `
    <h1>${esc(report.title)}</h1>
    <div class="summary">${esc(report.summary)}</div>
    <h2>未到岗人员情况</h2>
    <table>
      <colgroup><col style="width:5%"><col style="width:7%"><col style="width:13%"><col style="width:8%"><col style="width:14%"><col style="width:29%"><col style="width:6%"><col style="width:18%"></colgroup>
      <thead><tr><th>序号</th><th>姓名</th><th>部门</th><th>日期</th><th>项目</th><th>项目层面服务需求<br>(动态调整)</th><th>是否到岗</th><th>未到岗原因</th></tr></thead>
      <tbody>${absent}</tbody>
    </table>
    <h2>服务项目人员情况</h2>
    <table>
      <colgroup><col style="width:4%"><col style="width:6%"><col style="width:10%"><col style="width:7%"><col style="width:11%"><col style="width:23%"><col style="width:5%"><col style="width:20%"><col style="width:14%"></colgroup>
      <thead><tr><th>序号</th><th>姓名</th><th>部门</th><th>日期</th><th>项目</th><th>项目层面服务需求<br>(动态调整)</th><th>是否到岗</th><th>当日工作开展情况</th><th>今日项目反馈<br>需协调解决问题</th></tr></thead>
      <tbody>${service}</tbody>
    </table>`
  openPrintWindow(report.title, body)
}
