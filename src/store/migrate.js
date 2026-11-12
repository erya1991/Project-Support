import moment from 'moment'
import { isFrozen } from '../utils/date'

export const SCHEMA_VERSION = 7

const REGION_COMPANIES = [
  [/上海|江苏|浙江|安徽/, '华东分公司'],
  [/重庆|四川|云南|贵州/, '西南分公司'],
  [/新疆|甘肃|青海|宁夏|陕西/, '西北分公司'],
  [/江西|湖北|湖南|河南/, '华中分公司'],
  [/辽宁|吉林|黑龙江/, '东北分公司'],
  [/北京|天津|河北|山东|山西|内蒙古/, '华北分公司'],
  [/广东|广西|福建|海南/, '华南分公司']
]

function companyOf (project, index) {
  const region = project.region || ''
  const match = REGION_COMPANIES.find(([regex]) => regex.test(region))
  return match ? match[1] : `第${index + 1}分公司`
}

function dateAfter (base, days) {
  const m = base ? moment(base) : moment()
  const cursor = m.isValid() ? m : moment()
  return cursor.add(days, 'day').format('YYYY-MM-DD')
}

function normalizeWork (work) {
  const executions = work.executions || []
  if (!work.dueDate) {
    work.dueDate = dateAfter(work.createdAt, 120)
  }
  if (typeof work.overallContent !== 'string') {
    work.overallContent = executions
      .filter(e => e.scope === 'company')
      .map(e => e.content)
      .filter(Boolean)
      .join('\n')
  }
  if (!Array.isArray(work.overallAttachments)) {
    work.overallAttachments = []
    executions.filter(e => e.scope === 'company').forEach(e => {
      (e.attachments || []).forEach(f => work.overallAttachments.push(f))
    })
  }
  if (!Array.isArray(work.projectExecutions)) {
    work.projectExecutions = executions
      .filter(e => e.scope === 'project')
      .map(e => ({
        id: e.id || `PE${work.id}${e.projectId}`,
        projectId: e.projectId,
        projectName: e.projectName,
        content: e.content || '',
        attachments: e.attachments || [],
        updatedAt: e.updatedAt || work.createdAt
      }))
  }
  work.projectExecutions.forEach(e => {
    delete e.personId
    delete e.personName
  })
  if (work.closeRequest) {
    if (!work.closeRequest.overallContent) work.closeRequest.overallContent = work.overallContent
    if (!Array.isArray(work.closeRequest.projectExecutions)) {
      work.closeRequest.projectExecutions = JSON.parse(JSON.stringify(work.projectExecutions))
    }
    work.closeRequest.projectExecutions.forEach(e => {
      delete e.personId
      delete e.personName
    })
  }
  return work
}

function normalizeSuggestion (suggestion, db) {
  const archiveApprover = (db.managers.find(m => m.deptId === 'D14') || {}).name || '企划归档'
  if (!Array.isArray(suggestion.confirmers) || !suggestion.confirmers.length) {
    const ids = suggestion.confirmerIds || []
    suggestion.confirmers = ids.map(id => {
      const p = (db.people || []).concat(db.managers || []).find(x => x.id === id) || { name: id, title: '部门负责人' }
      return { id, name: p.name, title: p.title || '部门负责人', status: '待确认', reply: null }
    })
  }
  suggestion.confirmers.forEach(c => {
    if (!c.status) c.status = '待确认'
    if (c.reply === undefined) c.reply = null
  })

  if (Array.isArray(suggestion.nodes) && suggestion.nodes.length) {
    if (suggestion.archivedAt && suggestion.archiveOpinion === undefined) suggestion.archiveOpinion = '同意归档。'
    return suggestion
  }

  const oldReply = suggestion.reply
  const confirmed = suggestion.status === '已回复' || suggestion.status === '已归档'
  const archived = suggestion.status === '已归档'

  suggestion.confirmers.forEach((c, index) => {
    const passed = confirmed
    c.status = passed ? '已确认' : '待确认'
    if (passed && index === 0 && oldReply) {
      c.reply = {
        adopt: oldReply.adopt,
        reason: oldReply.reason || '',
        plan: oldReply.plan || '',
        deadline: oldReply.deadline || '',
        time: oldReply.time || '',
        comment: oldReply.comment || ''
      }
    }
  })

  suggestion.nodes = suggestion.confirmers.map(c => ({
    key: `confirm_${c.id}`,
    type: 'confirmer',
    confirmerId: c.id,
    name: `部门负责人确认（${c.name}）`,
    approver: c.name,
    result: confirmed ? '通过' : '待处理',
    time: confirmed ? ((c.reply && c.reply.time) || suggestion.createdAt || '') : '',
    comment: (c.reply && (c.reply.adopt === '改' ? c.reply.plan : c.reply.reason)) || ''
  }))
  suggestion.nodes.push({
    key: 'archive',
    type: 'archive',
    name: '企划部归档',
    approver: archiveApprover,
    result: archived ? '通过' : '待处理',
    time: archived ? ((oldReply && oldReply.archivedAt) || '') : '',
    comment: archived ? (suggestion.archiveOpinion || '同意归档。') : ''
  })

  if (archived) {
    suggestion.archiveOpinion = suggestion.archiveOpinion || '同意归档。'
    suggestion.archivedAt = suggestion.archivedAt || (oldReply && oldReply.archivedAt) || ''
    suggestion.archivedBy = suggestion.archivedBy || (oldReply && oldReply.archivedBy) || archiveApprover
  } else {
    suggestion.archiveOpinion = suggestion.archiveOpinion || ''
    suggestion.archivedAt = ''
    suggestion.archivedBy = ''
  }
  return suggestion
}

function uniqueReportId (base, used) {
  let id = base
  let index = 2
  while (used.has(id)) {
    id = `${base}-${index}`
    index += 1
  }
  used.add(id)
  return id
}

function expandDailyReports (db) {
  const used = new Set()
  const expanded = []
  const appeals = db.appeals || []
  ;(db.dailyReports || []).forEach(source => {
    let ids = Array.isArray(source.appealIds) ? source.appealIds.slice() : []
    if (!Array.isArray(source.appealIds)) {
      ids = [...new Set((source.feedbacks || []).map(f => f.appealId).filter(Boolean))]
    }
    ids = [...new Set(ids)].filter(id => appeals.some(a => a.id === id))
    const base = JSON.parse(JSON.stringify(source))
    delete base.feedbacks
    delete base.appealIds
    delete base.checkStatus
    delete base.checkTime
    delete base.checker
    delete base.checkRemark

    if (!ids.length) {
      base.legacy = true
      base.appealId = ''
      base.appealTitle = ''
      base.appealDesc = ''
      base.status = base.status === '已提交' ? '已提交' : '未填写'
      if (base.status !== '已提交') {
        base.submitTime = ''
        base.revisions = []
      }
      base.frozen = isFrozen(base.date)
      base.id = uniqueReportId(base.id, used)
      expanded.push(base)
      return
    }

    ids.forEach(id => {
      const appeal = appeals.find(a => a.id === id)
      const copy = JSON.parse(JSON.stringify(base))
      copy.appealId = id
      copy.appealTitle = appeal.title || ''
      copy.appealDesc = appeal.desc || ''
      copy.projectId = appeal.projectId || copy.projectId
      copy.projectName = appeal.projectName || copy.projectName
      copy.projectNeeds = `${appeal.title || ''}；${appeal.desc || ''}`
      copy.legacy = false
      copy.status = source.status === '已提交' ? '已提交' : '未填写'
      copy.submitTime = copy.status === '已提交' ? (source.submitTime || '') : ''
      copy.revisions = copy.status === '已提交' ? (source.revisions || []) : []
      copy.frozen = isFrozen(copy.date)
      copy.id = uniqueReportId(ids.length === 1 ? source.id : `${source.id}-${id}`, used)
      expanded.push(copy)
    })
  })
  db.dailyReports = expanded
}

export function migrateDb (db) {
  if (!db) return db
  if (db.schemaVersion === SCHEMA_VERSION) return db

  ;(db.people || []).forEach((p, index) => {
    if (!p.employeeNo) p.employeeNo = `HZ${String(index + 1).padStart(4, '0')}`
    if (!p.phone) p.phone = `1380512${String(index + 1).padStart(4, '0')}`
  })
  ;(db.managers || []).forEach((m, index) => {
    if (!m.employeeNo) m.employeeNo = `GL${String(index + 1).padStart(4, '0')}`
  })
  ;(db.projects || []).forEach((p, index) => {
    if (!p.company) p.company = companyOf(p, index)
  })

  ;(db.sheets || []).forEach(sheet => {
    ;(sheet.items || []).forEach(item => {
      if (!item.dueDate) {
        const work = (db.works || []).find(w => w.sheetId === sheet.id && w.seq === item.seq)
        item.dueDate = (work && work.dueDate) || dateAfter(sheet.createDate, 120)
      }
    })
  })

  ;(db.works || []).forEach(normalizeWork)

  ;(db.appeals || []).forEach(a => {
    const wasPending = a.status === '待受理'
    if (wasPending) {
      a.status = '办理中'
      a.latestProgress = '诉求已登记并安排承办人办理。'
      a.progress = []
    }
    if (!a.acceptedAt) a.acceptedAt = a.createdAt || ''
    if (!a.creatorId) {
      const creator = (db.people || [])[0] || {}
      a.creatorId = creator.id || 'P01'
      a.creatorName = creator.name || '工程部经办人'
    }
    if (a.status === '已删除' && !a.deletedAt) a.deletedAt = a.updatedAt || a.createdAt || ''
    if (!Array.isArray(a.progress)) a.progress = []
    if (a.latestProgress) {
      a.latestProgress = a.latestProgress
        .replace(/责任人/g, '承办人')
        .replace(/已受理，转承办人跟进办理。/g, '已登记并转承办人跟进办理。')
        .replace(/已受理/g, '已登记')
    }
    a.progress.forEach(p => {
      if (p.content) {
        p.content = p.content
          .replace(/责任人/g, '承办人')
          .replace(/已受理，转承办人跟进办理。/g, '已登记并转承办人跟进办理。')
          .replace(/已受理/g, '已登记')
      }
    })
  })

  expandDailyReports(db)

  ;(db.appeals || []).forEach(appeal => {
    const latest = (db.dailyReports || [])
      .filter(r => r.status === '已提交' && r.appealId === appeal.id)
      .sort((a, b) => b.date.localeCompare(a.date))[0]
    if (latest) appeal.latestReportDate = latest.date
  })

  ;(db.suggestions || []).forEach(s => normalizeSuggestion(s, db))

  db.schemaVersion = SCHEMA_VERSION
  if (db.generatedAt === undefined) db.generatedAt = new Date().toISOString()
  return db
}
