import { PROJECT, DEPARTMENT, staffOrg, targetOf, personName } from './serviceData'
import { nextCode } from './businessCodes'

// 沿用已有回复值，历史记录和新表单共用同一套显示文字。
export const SUGGESTION_DECISIONS = [
  { value: '改', label: '采纳' },
  { value: '不改', label: '不采纳' }
]

export function suggestionDecisionLabel (value) {
  return SUGGESTION_DECISIONS.find(option => option.value === value)?.label
}

export function submitAppeal (db, form, operator, time, id) {
  const original = id && db.appeals.find(row => row.id === id && !row.deleted)
  if (id && (!original || !['待审批', '已退回'].includes(original.status))) return '当前状态不允许修改诉求'
  const author = original ? db.people.find(p => p.id === original.creatorId) : operator
  let { company, unitName } = staffOrg(db, author)
  let type = author.orgType === '项目' ? PROJECT : DEPARTMENT
  let unitId = author.unitId
  if (author.orgType === '总部') {
    company = form.company
    type = form.type
    unitId = form.unitId
    const unit = targetOf(db, type, unitId)
    if (![PROJECT, DEPARTMENT].includes(type) || !unit || unit.company !== company) return '请选择分公司及所属部门或项目'
    unitName = unit.name
  }
  if (!db.departments.some(d => d.id === form.deptId)) return '请选择主责总部部门'
  if (!form.title.trim() || !form.desc.trim()) return '请填写诉求标题和诉求内容'
  const appeal = original || { id: nextCode(db.appeals, 'XMSQ', time), creatorId: author.id, createdAt: time,
    handlerId: '', history: [], completion: null, closedAt: '' }
  const action = original && original.status === '待审批' ? '修改诉求' : '提交受理'
  Object.assign(appeal, { company, unitName, type, unitId, deptId: form.deptId, title: form.title.trim(),
    desc: form.desc.trim(), attachments: form.attachments, status: '待审批', submittedAt: time })
  appeal.history.push({ time, action, operator: operator.name, note: unitName })
  if (!original) db.appeals.unshift(appeal)
}

export function reviewAppeal (db, id, stage, approved, handlerId, comment, operator, time) {
  const appeal = db.appeals.find(row => row.id === id && !row.deleted)
  if (!appeal || !['待审批', '待销项审批'].includes(stage) || appeal.status !== stage) return '该审批节点已变更，请查看最新记录'
  const acceptance = stage === '待审批'
  const manager = db.departments.find(d => d.id === appeal.deptId).manager
  if (approved && acceptance && !db.people.some(p => p.id === handlerId)) return '请选择承办人'
  let note = comment.trim()
  if (approved && acceptance) {
    appeal.handlerId = handlerId
    note = ['指派给' + personName(db, handlerId), note].filter(Boolean).join('。')
  }
  if (acceptance) appeal.status = approved ? '办理中' : '已退回'
  else {
    appeal.status = approved ? '已销项' : '办理中'
    if (approved) appeal.closedAt = time
  }
  appeal.history.push({ time, action: (acceptance ? '受理' : '销项') + (approved ? '通过' : '退回'),
    responsible: manager, operator: operator.name, note })
}

export function updateAppealProgress (db, id, form, operator, time) {
  const appeal = db.appeals.find(row => row.id === id && !row.deleted)
  if (!appeal || appeal.status !== '办理中') return '仅办理中的诉求可更新进展'
  const content = (form.content || '').trim()
  if (!content) return '请填写问题解决进展'
  appeal.history.push({ time, action: '更新进展', note: content, attachments: form.attachments || [],
    responsible: personName(db, appeal.handlerId), operator: operator.name })
}

// “进展”和“日报”是旧版迁入办理记录的业务进展。
function isProgressEntry (entry) {
  return ['更新进展', '进展', '日报'].includes(entry.action) && entry.note
}

export function latestAppealProgressEntry (appeal) {
  return (appeal.history || []).slice().reverse().find(isProgressEntry)
}

export function currentAppealResult (appeal) {
  if (['待销项审批', '已销项'].includes(appeal.status)) return appeal.completion
  if (appeal.status !== '办理中') return null

  // 记录按保存顺序追加，同一分钟内退回、更新、再送审也能区分先后。
  for (let i = appeal.history.length - 1; i >= 0; i--) {
    const entry = appeal.history[i]
    if (entry.action === '提交销项') return { ...appeal.completion, operator: entry.operator, time: entry.time }
    if (isProgressEntry(entry)) {
      return { content: entry.note, attachments: entry.attachments, operator: entry.operator, time: entry.time }
    }
  }
  return appeal.completion
}

export function requestClosure (db, id, form, operator, time) {
  const appeal = db.appeals.find(row => row.id === id && !row.deleted)
  if (!appeal || appeal.status !== '办理中') return '仅办理中的诉求可申请销项'
  if (!form.content.trim() || !form.date) return '请填写完成情况和完成日期'
  appeal.completion = { content: form.content.trim(), date: form.date, attachments: form.attachments }
  appeal.status = '待销项审批'
  appeal.history.push({ time, action: '提交销项', responsible: personName(db, appeal.handlerId),
    operator: operator.name, note: form.date + '　' + form.content.trim(), attachments: form.attachments })
}

export function submitSuggestion (db, form, operator, time, id) {
  const original = id && db.suggestions.find(row => row.id === id && !row.deleted)
  if (id && (!original || original.status !== '待回复')) return '已回复的建议不能修改'
  if (!db.departments.some(d => d.id === form.deptId)) return '请选择主责总部部门'
  if (!form.title.trim() || !form.flow.trim() || !form.desc.trim()) return '请填写建议标题、涉及制度/流程和建议内容'
  const suggestion = original || { id: nextCode(db.suggestions, 'ZDJY', time), creatorId: operator.id,
    ...staffOrg(db, operator), createdAt: time, status: '待回复', reply: null, history: [] }
  Object.assign(suggestion, { deptId: form.deptId, title: form.title.trim(), flow: form.flow.trim(),
    desc: form.desc.trim(), attachments: form.attachments })
  suggestion.history.push({ time, action: original ? '编辑建议' : '提交建议', operator: operator.name })
  if (!original) db.suggestions.unshift(suggestion)
}

export function replySuggestion (db, id, form, operator, time) {
  const s = db.suggestions.find(row => row.id === id && !row.deleted)
  if (!s || s.status !== '待回复') return '该建议已经回复'
  const label = suggestionDecisionLabel(form.decision)
  if (!label || !form.comment.trim()) return '请选择采纳或不采纳，并填写回复说明'
  const manager = db.departments.find(d => d.id === s.deptId)
  s.reply = { decision: form.decision, deadline: form.decision === '改' ? form.deadline || '' : '',
    comment: form.comment.trim(), by: manager.managerId, time }
  s.status = '已回复'
  s.history.push({ time, action: '经理回复', operator: operator.name, responsible: manager.manager, note: label + '。' + s.reply.comment })
}

export const IN_PROGRESS_APPEAL_STATES = ['办理中', '待销项审批']

export function appealStats (appeals) {
  const visible = appeals.filter(a => !a.deleted)
  return {
    total: visible.length,
    inProgress: visible.filter(a => IN_PROGRESS_APPEAL_STATES.includes(a.status)).length,
    closed: visible.filter(a => a.status === '已销项').length
  }
}
