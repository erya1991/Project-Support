import { todayStr } from './date'

export const PROJECT = '项目级'
export const DEPARTMENT = '部门级'
export const APPEAL_STATES = ['待审批', '办理中', '待销项审批', '已销项']

export function staffOrg (db, person) {
  if (person.orgType === '总部') {
    return { company: '公司总部', unitName: db.departments.find(d => d.id === person.deptId).name }
  }
  const unit = targetOf(db, person.orgType === '项目' ? PROJECT : DEPARTMENT, person.unitId)
  return { company: unit.company, unitName: unit.name }
}

export function targetOf (db, type, id) {
  const targets = type === PROJECT ? db.projects : db.branchDepartments
  return targets.find(target => target.id === id)
}

export function relationValues (relation) {
  const { personId, type, targetId, status } = relation
  return { personId, type, targetId, status }
}

// 每次配置操作保存当时的关联对象。历史工作日的应填资格按当日最后一次变更还原。
export function effectiveRelations (db, day = todayStr()) {
  if (day >= todayStr()) return db.relations.filter(r => r.status === '启用')
  const effective = []
  for (const relation of db.relations) {
    const entry = relation.history.slice().reverse().find(change => change.time.slice(0, 10) <= day)
    if (entry && entry.values.status === '启用') effective.push(entry.values)
  }
  return effective
}

export function projectHelpers (relations) {
  const result = new Map()
  for (const relation of relations) {
    if (relation.type !== PROJECT) continue
    if (!result.has(relation.targetId)) result.set(relation.targetId, new Set())
    result.get(relation.targetId).add(relation.personId)
  }
  return result
}

export function personProjects (db, personId, relations = effectiveRelations(db)) {
  const ids = new Set(relations.filter(r => r.personId === personId && r.type === PROJECT).map(r => r.targetId))
  return db.projects.filter(p => ids.has(p.id))
}

export function personName (db, id) {
  const person = db.people.find(p => p.id === id)
  return person ? person.name : ''
}

export function syncExecutions (db) {
  const projects = projectHelpers(effectiveRelations(db))
  for (const work of db.works.filter(w => w.status === '启用')) {
    const existing = new Map(work.executions.map(e => [e.projectId, e]))
    for (const [projectId, people] of projects) {
      let execution = existing.get(projectId)
      if (!execution) {
        execution = { projectId, content: '', issues: '', suggestions: '', attachments: [], firstBy: '', firstAt: '', lastBy: '', lastAt: '', helpers: [] }
        work.executions.push(execution)
      }
      execution.helpers = [...people]
    }
  }
}

export function snapshotProgress (executions) {
  return { projectIds: executions.map(e => e.projectId), filled: executions.filter(e => e.firstAt).length }
}

export function changeWorkStatus (db, work, status) {
  if (work.status === status) return
  if (status === '停用') {
    const projects = projectHelpers(effectiveRelations(db))
    work.stoppedProgress = snapshotProgress(work.executions.filter(e => projects.has(e.projectId)))
  } else {
    delete work.stoppedProgress
  }
  work.status = status
}

export function executionRows (db, work, helpers = projectHelpers(effectiveRelations(db)), retained = work.stoppedProgress) {
  const retainedIds = new Set(retained?.projectIds)
  return work.executions.map(record => {
    const project = targetOf(db, PROJECT, record.projectId)
    const active = work.status === '启用' && helpers.has(record.projectId)
    const helperIds = active ? [...helpers.get(record.projectId)] : record.helpers
    return { ...record, issues: record.issues || '', suggestions: record.suggestions || '',
      id: work.id + '/' + project.id, workId: work.id, title: work.title, workContent: work.content,
      system: work.system, deptId: work.deptId, deptName: db.departments.find(d => d.id === work.deptId).name,
      projectName: project.name, company: project.company, helperIds,
      helperNames: helperIds.map(id => personName(db, id)).join('、'),
      firstName: personName(db, record.firstBy), lastName: personName(db, record.lastBy),
      status: record.firstAt ? '已填写' : '待填写', scope: active ? '当前' : retainedIds.has(project.id) ? '停用留存' : '历史' }
  })
}

export function progress (rows) {
  const filled = rows.filter(r => r.status === '已填写').length
  return { filled, total: rows.length, text: filled + '/' + rows.length }
}

export function workRows (db) {
  const helpers = projectHelpers(effectiveRelations(db))
  return db.works.map(work => {
    const retained = work.status === '停用' && (work.stoppedProgress || snapshotProgress(work.executions))
    const executions = executionRows(db, work, helpers, retained)
    const current = progress(executions.filter(r => r.scope === '当前'))
    return { ...work, executions, deptName: db.departments.find(d => d.id === work.deptId).name,
      creatorName: personName(db, work.creatorId), current, progressText: retained ? retained.filled + '/' + retained.projectIds.length : current.text }
  })
}

export function myWork (db, personId) {
  const tasks = workRows(db).flatMap(work => work.executions.filter(row => row.scope === '当前' && row.helperIds.includes(personId)))
  const filled = tasks.filter(row => row.status === '已填写').length
  return { tasks, due: tasks.length, filled, pending: tasks.length - filled }
}
