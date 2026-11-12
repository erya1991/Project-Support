import moment from 'moment'
import { todayStr, monthLabel, isWeekend, datesBetween } from './date'

function personOrderMap (db) {
  const map = {}
  db.people.forEach((p, index) => { map[p.id] = index })
  db.managers.forEach((m, index) => { map[m.id] = db.people.length + index })
  return map
}

function projectOrderMap (db) {
  const map = {}
  db.projects.forEach((p, index) => { map[p.id] = index })
  return map
}

function deptOrderMap (db) {
  const map = {}
  db.departments.forEach((d, index) => { map[d.id] = index })
  return map
}

export function workResultText (work) {
  if (!work.executions || !work.executions.length) return '待落实'
  return work.executions.map(e => {
    if (e.scope === 'company') return e.content
    if (!e.content) return `${e.projectName}：待落实`
    if (e.content.indexOf(`${e.projectName}：`) === 0 || e.content.indexOf(`${e.projectName}:`) === 0) return e.content
    return `${e.projectName}：${e.content}`
  }).join('\n')
}

export function buildWorkList (db) {
  const deptOrder = deptOrderMap(db)
  const works = db.works.slice().sort((a, b) => {
    const sa = db.systems.indexOf(a.system)
    const sb = db.systems.indexOf(b.system)
    if (sa !== sb) return sa - sb
    if (deptOrder[a.deptId] !== deptOrder[b.deptId]) return deptOrder[a.deptId] - deptOrder[b.deptId]
    return a.seq - b.seq
  })
  return works.map(w => ({
    id: w.id,
    system: w.system,
    deptName: w.deptName,
    title: w.title,
    result: workResultText(w),
    problem: w.problem || '',
    suggestion: w.suggestion || '',
    status: w.status,
    projects: (w.executions || []).filter(e => e.scope === 'project').map(e => e.projectName)
  }))
}

export function buildAppealList (db, projectId) {
  const deptOrder = deptOrderMap(db)
  const projectOrder = projectOrderMap(db)
  return db.appeals
    .filter(a => !projectId || a.projectId === projectId)
    .slice()
    .sort((a, b) => {
      if (projectOrder[a.projectId] !== projectOrder[b.projectId]) return projectOrder[a.projectId] - projectOrder[b.projectId]
      if (deptOrder[a.deptId] !== deptOrder[b.deptId]) return deptOrder[a.deptId] - deptOrder[b.deptId]
      return a.dueDate.localeCompare(b.dueDate)
    })
    .map(a => ({
      id: a.id,
      title: a.title,
      desc: a.desc,
      deptName: a.deptName,
      personName: a.personName,
      plan: a.plan,
      dueDate: a.dueDate,
      status: a.status,
      projectName: a.projectName
    }))
}

export function buildSuggestionList (db) {
  const deptOrder = deptOrderMap(db)
  return db.suggestions.slice()
    .sort((a, b) => deptOrder[a.deptId] - deptOrder[b.deptId] || a.createdAt.localeCompare(b.createdAt))
    .map(s => ({
      id: s.id,
      title: s.title,
      flow: s.flow,
      desc: s.desc,
      proposer: `${s.proposerName}/${s.proposerDeptName}`,
      deptName: s.deptName,
      replyText: s.reply ? (s.reply.adopt === '改' ? '改' : `不改。${s.reply.reason}`) : '待部门确认',
      plan: s.reply ? s.reply.plan : '',
      deadline: s.reply ? s.reply.deadline : '',
      status: s.status
    }))
}

function orderReports (db, reports) {
  const pOrder = personOrderMap(db)
  const jOrder = projectOrderMap(db)
  return reports.slice().sort((a, b) => {
    if (pOrder[a.personId] !== pOrder[b.personId]) return pOrder[a.personId] - pOrder[b.personId]
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    if (jOrder[a.projectId] !== jOrder[b.projectId]) return jOrder[a.projectId] - jOrder[b.projectId]
    return 0
  })
}

export function buildDailyReport (db, date) {
  const all = db.dailyReports.filter(r => r.date === date)
  const submitted = all.filter(r => r.status === '已提交')
  const absentRows = orderReports(db, submitted.filter(r => r.attend === false)).map(r => ({
    personName: r.personName,
    deptName: r.deptName,
    month: monthLabel(r.date),
    date: r.date,
    projectName: r.projectName,
    needs: r.projectNeeds,
    attend: '否',
    reason: r.absentReason || '',
    workContent: '',
    issues: ''
  }))
  const serviceRows = orderReports(db, submitted.filter(r => r.attend === true)).map(r => ({
    personName: r.personName,
    deptName: r.deptName,
    month: monthLabel(r.date),
    date: r.date,
    projectName: r.projectName,
    needs: r.projectNeeds,
    attend: '是',
    reason: '',
    workContent: r.workContent || '',
    issues: r.newIssues || '无'
  }))

  const rels = db.relations.filter(r => r.status === '已生效')
  const personIds = new Set(all.map(r => r.personId))
  const attendedPersons = new Set(submitted.filter(r => r.attend === true).map(r => r.personId))
  const expected = personIds.size
  const attended = attendedPersons.size
  const closed = db.appeals.filter(a => a.status === '已销项').length
  const active = db.appeals.length - closed
  const closeRate = db.appeals.length ? Math.round((closed / db.appeals.length) * 1000) / 10 : 0
  const rate = expected ? Math.round((attended / expected) * 1000) / 10 : 0
  const servicePeople = new Set(rels.map(r => r.personId)).size

  const summary = [
    '情况汇总：',
    `1.人员到岗。本日报服务人员${servicePeople}人，应到岗${expected}人次，实际到岗${attended}人次，到岗率${rate}%。`,
    `2.问题解决。截至目前，共计项目诉求${db.appeals.length}条，销项闭环${closed}条、推进解决中${active}条，销项率${closeRate}%。`,
    `3.日报填报。本日应填日报${all.length}份，已提交${submitted.length}份，未提交${all.length - submitted.length}份。`
  ].join('\n')

  return {
    title: `公司总部人员服务项目日报-${moment(date, 'YYYY-MM-DD').format('YYYY年MM月DD日')}`,
    summary,
    absentRows,
    serviceRows,
    date
  }
}

export function buildWeeklyReport (db, start, end) {
  const reports = db.dailyReports.filter(r => r.date >= start && r.date <= end && r.status === '已提交')
  const absentRows = orderReports(db, reports.filter(r => r.attend === false)).map(r => ({
    personName: r.personName,
    deptName: r.deptName,
    date: r.date,
    projectName: r.projectName,
    needs: r.projectNeeds,
    attend: '否',
    reason: r.absentReason || '',
    workContent: '',
    issues: ''
  }))
  const serviceRows = orderReports(db, reports.filter(r => r.attend === true)).map(r => ({
    personName: r.personName,
    deptName: r.deptName,
    date: r.date,
    projectName: r.projectName,
    needs: r.projectNeeds,
    attend: '是',
    reason: '',
    workContent: r.workContent || '',
    issues: r.newIssues || '无'
  }))

  const workDates = datesBetween(start, end).filter(d => !isWeekend(d))
  const elapsed = workDates.filter(d => d <= todayStr())
  const personIds = new Set(db.relations.filter(r => r.status === '已生效').map(r => r.personId))
  const expected = personIds.size * elapsed.length
  const attendedSet = new Set(reports.filter(r => r.attend === true).map(r => `${r.personId}|${r.date}`))
  const attended = attendedSet.size
  const rate = expected ? Math.round((attended / expected) * 1000) / 10 : 0
  const closed = db.appeals.filter(a => a.closeRequest && a.closeRequest.archivedAt && a.closeRequest.archivedAt.slice(0, 10) >= start && a.closeRequest.archivedAt.slice(0, 10) <= end).length
  const active = db.appeals.filter(a => a.status !== '已销项').length

  const summary = [
    '情况汇总：',
    `1.人员到岗。本周服务人员${personIds.size}人×${elapsed.length}天，共计${expected}人次，到岗${attended}人次，到岗率${rate}%。`,
    `2.问题解决。本周共销项${closed}项，推进解决中${active}条。`
  ].join('\n')

  return {
    title: `公司总部人员服务项目日报-${moment(start, 'YYYY-MM-DD').format('YYYY年MM月DD日')}-${moment(end, 'YYYY-MM-DD').format('YYYY年MM月DD日')}`,
    summary,
    absentRows,
    serviceRows,
    start,
    end,
    personCount: personIds.size,
    workdayCount: elapsed.length,
    expected,
    attended,
    rate
  }
}
