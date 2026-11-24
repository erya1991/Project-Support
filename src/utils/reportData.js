import moment from 'moment'
import { todayStr, monthLabel, isWeekend, workdaysBetween } from './date'
import { PROJECT, effectiveRelations, personProjects, staffOrg } from './serviceData'

export function reportBody (source = {}) {
  return { projectNeeds: source.projectNeeds || '', attend: source.attend == null ? null : source.attend,
    absentReason: source.absentReason || '', workContent: source.workContent || '',
    newIssues: source.newIssues || '', attachments: source.attachments || [] }
}

export function validateReport (form) {
  if (typeof form.attend !== 'boolean') return '请选择是否到岗'
  if (!form.attend && !form.absentReason.trim()) return '请填写未到岗原因'
  if (form.attend && !form.workContent.trim()) return '请填写当日工作开展情况'
}

export function dailyEligible (db, date, relations = effectiveRelations(db, date)) {
  if (isWeekend(date) || date > todayStr()) return new Set()
  return new Set(relations.filter(r => r.type === PROJECT).map(r => r.personId))
}

export function pendingReport (db, person, date, relations) {
  const projects = personProjects(db, person.id, relations).map(({ id, name, company }) => ({ id, name, company }))
  return { id: 'RB' + date.replace(/-/g, '') + '-' + person.id, personId: person.id, personName: person.name,
    deptId: person.deptId, deptName: staffOrg(db, person).unitName, projects, date, status: '待填写',
    ...reportBody(), submitTime: '', revisions: [] }
}

export function reportRow (report, eligible) {
  const frozen = report.date < todayStr()
  return { ...report, eligible, frozen, frozenText: frozen ? '已冻结' : '未冻结', projectIds: report.projects.map(p => p.id),
    projectName: report.projects.map(p => p.name).join('、'),
    companies: [...new Set(report.projects.map(p => p.company))],
    company: [...new Set(report.projects.map(p => p.company))].join('、'),
    attendText: report.attend == null ? '未填报' : report.attend ? '是' : '否' }
}

export function dailyRows (db, date) {
  const relations = effectiveRelations(db, date)
  const eligible = dailyEligible(db, date, relations)
  const submitted = new Map(db.dailyReports.filter(r => r.date === date).map(r => [r.personId, r]))
  return db.people.filter(p => eligible.has(p.id) || submitted.has(p.id))
    .map(p => reportRow(submitted.get(p.id) || pendingReport(db, p, date, relations), eligible.has(p.id)))
}

function summaryRows (db, records) {
  const order = new Map(db.people.map((p, i) => [p.id, i]))
  const sorted = records.slice().sort((a, b) => order.get(a.personId) - order.get(b.personId) || a.date.localeCompare(b.date))
  const rows = sorted.map(report => ({
    ...reportRow(report, true), rowKey: report.id, month: monthLabel(report.date),
    needs: report.projectNeeds, attend: report.attend ? '是' : '否', reason: report.absentReason,
    issues: report.newIssues || '无'
  }))
  return { absentRows: rows.filter(r => r.attend === '否'), serviceRows: rows.filter(r => r.attend === '是') }
}

export function buildDailyReport (db, date) {
  const rows = dailyRows(db, date)
  const due = rows.filter(r => r.eligible)
  const filled = due.filter(r => r.status === '已提交')
  const attended = filled.filter(r => r.attend).length
  const appeals = db.appeals.filter(a => !a.deleted)
  const closed = appeals.filter(a => a.status === '已销项').length
  const rate = (a, b) => b ? Math.round(a * 1000 / b) / 10 : 0
  return {
    title: '公司总部人员服务项目日报-' + moment(date).format('YYYY年MM月DD日'),
    summary: ['情况汇总：',
      `1.人员到岗。本日报服务人员${due.length}人，应到岗${due.length}人次，实际到岗${attended}人次，到岗率${rate(attended, due.length)}%。`,
      `2.问题解决。截至目前，共计基层诉求${appeals.length}条，销项闭环${closed}条，推进解决中${appeals.filter(a => ['办理中', '待销项审批'].includes(a.status)).length}条，销项率${rate(closed, appeals.length)}%。`,
      `3.日报填报。本日应填日报${due.length}份，已提交${filled.length}份，未提交${due.length - filled.length}份。`].join('\n'),
    ...summaryRows(db, rows.filter(r => r.status === '已提交'))
  }
}

export function buildWeeklyReport (db, start, end) {
  const days = workdaysBetween(start, end).filter(date => date <= todayStr())
  const due = days.flatMap(date => dailyRows(db, date).filter(r => r.eligible))
  const personCount = new Set(due.map(r => r.personId)).size
  const attended = due.filter(r => r.attend === true).length
  const rate = due.length ? Math.round(attended * 1000 / due.length) / 10 : 0
  const submitted = db.dailyReports.filter(r => r.date >= start && r.date <= end)
  const appeals = db.appeals.filter(a => !a.deleted)
  const closed = appeals.filter(a => a.closedAt && a.closedAt.slice(0, 10) >= start && a.closedAt.slice(0, 10) <= end).length
  const active = appeals.filter(a => ['办理中', '待销项审批'].includes(a.status)).length
  return { title: `公司总部人员服务项目日报-${moment(start).format('YYYY年MM月DD日')}-${moment(end).format('YYYY年MM月DD日')}`,
    personCount, workdayCount: days.length, expected: due.length, attended, rate,
    summary: ['情况汇总：',
      `1.人员到岗。本周服务人员${personCount}人，应到岗${due.length}人次，到岗${attended}人次，到岗率${rate}%。`,
      `2.问题解决。本周共销项${closed}项，推进解决中${active}条。`].join('\n'),
    ...summaryRows(db, submitted) }
}
