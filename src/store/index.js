import Vue from 'vue'
import { buildSeed, CURRENT_USER_ID, PLANNER, ARCHIVER } from '../data/seed'
import { nowStr, todayStr, isFrozen, datesBetween, isWeekend, recentReportDays } from '../utils/date'
import { migrateDb } from './migrate'

const STORAGE_KEY = 'hq_enablement_db_v5'
const state = Vue.observable({ db: null })

function nextCode (list, prefix, len = 4) {
  let max = 0
  list.forEach(item => {
    let id = String(item.id || '')
    if (id.indexOf(prefix) === 0) id = id.slice(prefix.length)
    const m = id.match(/^(\d+)$/)
    if (m) max = Math.max(max, parseInt(m[1], 10))
  })
  return `${prefix}${String(max + 1).padStart(len, '0')}`
}

function clone (value) {
  return JSON.parse(JSON.stringify(value))
}

function findFirstPending (nodes) {
  return (nodes || []).findIndex(n => n.result === '待处理')
}

const store = {
  state,

  init () {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && parsed.people && parsed.works && parsed.dailyReports) {
          state.db = migrateDb(parsed)
          this.refreshDailyWindow()
          this.persist()
          return
        }
      }
    } catch (e) {
      // 本地数据不可用时重新初始化
    }
    state.db = migrateDb(buildSeed())
    this.refreshDailyWindow()
    this.persist()
  },

  persist () {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.db))
    } catch (e) {
      // 存储空间不足时保留内存数据
    }
  },

  reset () {
    localStorage.removeItem(STORAGE_KEY)
    state.db = migrateDb(buildSeed())
    this.persist()
  },

  get db () {
    return state.db
  },

  get currentUser () {
    return this.getPerson(CURRENT_USER_ID)
  },

  getPerson (id) {
    if (!this.db) return null
    return this.db.people.find(p => p.id === id) || this.db.managers.find(m => m.id === id) || null
  },

  getDept (id) {
    return this.db.departments.find(d => d.id === id) || null
  },

  getProject (id) {
    return this.db.projects.find(p => p.id === id) || null
  },

  staffOfDept (deptId) {
    return this.db.people.filter(p => p.deptId === deptId)
      .concat(this.db.managers.filter(m => m.deptId === deptId))
  },

  allStaff () {
    return this.db.people.concat(this.db.managers)
  },

  effectiveRelations () {
    return this.db.relations.filter(r => r.status === '已生效')
  },

  relationsOfPerson (personId) {
    return this.effectiveRelations().filter(r => r.personId === personId)
  },

  relationsOfProject (projectId) {
    return this.effectiveRelations().filter(r => r.projectId === projectId)
  },

  projectsOfPerson (personId) {
    const ids = this.relationsOfPerson(personId).map(r => r.projectId)
    return this.db.projects.filter(p => ids.indexOf(p.id) > -1)
  },

  peopleOfProject (projectId) {
    const ids = this.relationsOfProject(projectId).map(r => r.personId)
    return this.db.people.filter(p => ids.indexOf(p.id) > -1)
  },

  appealsOf (personId, projectId, includeClosed = false) {
    return this.db.appeals.filter(a => {
      if (a.status === '已删除') return false
      if (personId && a.personId !== personId) return false
      if (projectId && a.projectId !== projectId) return false
      if (!includeClosed && a.status === '已销项') return false
      return true
    })
  },

  reportFor (date, personId, projectId, appealId) {
    return this.db.dailyReports.find(r =>
      !r.legacy &&
      r.date === date &&
      r.personId === personId &&
      r.projectId === projectId &&
      r.appealId === appealId
    ) || null
  },

  reportsForDate (date) {
    const deleted = new Set(this.db.appeals.filter(a => a.status === '已删除').map(a => a.id))
    return this.db.dailyReports.filter(r => !r.legacy && r.date === date && !deleted.has(r.appealId))
  },

  workById (id) {
    return this.db.works.find(w => w.id === id)
  },

  /* ---------------- 帮扶关系 ---------------- */
  createRelations (payload) {
    const { personIds, projectIds, role, startDate, endDate, remark } = payload
    const created = []
    const skipped = []
    const batchPrefix = `B${todayStr().replace(/-/g, '')}`
    const batchMax = Math.max(0, ...this.db.relations
      .filter(r => r.batchId && r.batchId.indexOf(batchPrefix) === 0)
      .map(r => parseInt(r.batchId.slice(batchPrefix.length), 10) || 0))
    const batchId = `${batchPrefix}${String(batchMax + 1).padStart(3, '0')}`
    personIds.forEach(personId => {
      const person = this.getPerson(personId)
      projectIds.forEach(projectId => {
        const project = this.getProject(projectId)
        const overlap = this.db.relations.find(r => {
          if (r.personId !== personId || r.projectId !== projectId) return false
          if (r.status === '已失效' || r.status === '已驳回') return false
          const relEnd = r.endDate || '9999-12-31'
          const newEnd = endDate || '9999-12-31'
          return startDate <= relEnd && newEnd >= r.startDate
        })
        if (overlap) {
          skipped.push(`${person.name} — ${project.name}（已存在${overlap.status}关系 ${overlap.id}）`)
          return
        }
        const relation = {
          id: nextCode(this.db.relations, 'BF2026', 4),
          batchId,
          personId,
          personName: person.name,
          deptId: person.deptId,
          deptName: this.getDept(person.deptId).name,
          projectId,
          projectName: project.name,
          projectManager: project.manager,
          role,
          startDate,
          endDate: endDate || '',
          plannerId: PLANNER.id,
          plannerName: PLANNER.name,
          remark: remark || '',
          status: '草稿',
          createdAt: nowStr(),
          approvals: [],
          history: [{ time: nowStr(), action: '创建配置', operator: PLANNER.name, remark: remark || '创建帮扶关系草稿。' }]
        }
        this.db.relations.unshift(relation)
        created.push(relation)
      })
    })
    this.persist()
    return { created, skipped }
  },

  submitRelations (ids) {
    const targets = this.db.relations.filter(r => ids.indexOf(r.id) > -1 && (r.status === '草稿' || r.status === '已驳回'))
    const batches = [...new Set(targets.map(r => r.batchId))]
    this.db.relations.forEach(r => {
      if (batches.indexOf(r.batchId) > -1 && (r.status === '草稿' || r.status === '已驳回')) {
        r.status = '待审批'
        r.approvals = [
          { key: 'eng', name: '工程管理部审批', approver: this.getDept('D01').manager, result: '待处理', time: '', comment: '' },
          { key: 'plan', name: '企划部审批', approver: ARCHIVER.name, result: '待处理', time: '', comment: '' }
        ]
        r.history.push({ time: nowStr(), action: '提交联合审批', operator: r.plannerName, remark: '提交工程管理部、企划部联合审批。' })
      }
    })
    this.persist()
    return batches
  },

  appealNeedsSnapshot (appeal) {
    if (!appeal) return ''
    return `${appeal.title || ''}；${appeal.desc || ''}`
  },

  createDailyTask (appeal, relation, date) {
    if (!appeal || !relation || appeal.status !== '办理中') return
    if (this.reportFor(date, appeal.personId, appeal.projectId, appeal.id)) return
    this.db.dailyReports.push({
      id: `RB${date.replace(/-/g, '')}${appeal.id}`,
      date,
      personId: appeal.personId,
      personName: appeal.personName,
      deptId: appeal.deptId,
      deptName: appeal.deptName,
      projectId: appeal.projectId,
      projectName: appeal.projectName,
      appealId: appeal.id,
      appealTitle: appeal.title,
      appealDesc: appeal.desc,
      projectNeeds: this.appealNeedsSnapshot(appeal),
      attend: null,
      absentReason: '',
      workContent: '',
      newIssues: '',
      status: '未填写',
      frozen: isFrozen(date),
      submitTime: '',
      legacy: false,
      revisions: []
    })
  },

  refreshDailyWindow () {
    const days = recentReportDays(7)
    const today = todayStr()
    this.db.dailyReports.forEach(report => {
      report.frozen = report.date < today
    })
    this.db.appeals.filter(a => a.status === '办理中').forEach(appeal => {
      const relation = this.db.relations.find(r =>
        r.status === '已生效' && r.personId === appeal.personId && r.projectId === appeal.projectId
      )
      if (!relation) return
      const createdDate = (appeal.createdAt || '').slice(0, 10)
      days.forEach(day => {
        if (createdDate && createdDate > day) return
        if (relation.startDate && relation.startDate > day) return
        if (relation.endDate && relation.endDate < day) return
        this.createDailyTask(appeal, relation, day)
      })
    })
  },

  ensureRelationReportTask (relation) {
    const today = todayStr()
    if (relation.startDate && relation.startDate > today) return
    if (relation.endDate && relation.endDate < today) return
    this.db.appeals
      .filter(a => a.status === '办理中' && a.personId === relation.personId && a.projectId === relation.projectId)
      .forEach(appeal => this.createDailyTask(appeal, relation, today))
  },

  approveRelationBatch (batchId, action, comment) {
    const targets = this.db.relations.filter(r => r.batchId === batchId && r.status === '待审批')
    if (!targets.length) return { ok: false, message: '当前批次不存在待审批关系' }
    let finished = false
    targets.forEach(r => {
      const idx = findFirstPending(r.approvals)
      if (idx < 0) return
      const node = r.approvals[idx]
      node.time = nowStr()
      node.comment = comment || ''
      if (action === 'reject') {
        node.result = '退回'
        r.status = '已驳回'
        r.history.push({ time: nowStr(), action: '审批退回', operator: node.approver, remark: comment || '审批退回。' })
      } else {
        node.result = '通过'
        if (findFirstPending(r.approvals) < 0) {
          r.status = '已生效'
          this.ensureRelationReportTask(r)
          r.history.push({ time: nowStr(), action: '审批生效', operator: node.approver, remark: '联合审批通过，关系生效。' })
          finished = true
        } else {
          r.history.push({ time: nowStr(), action: `${node.name}通过`, operator: node.approver, remark: comment || '同意。' })
        }
      }
    })
    this.persist()
    return { ok: true, finished }
  },

  updateDraftRelation (id, payload) {
    const relation = this.db.relations.find(r => r.id === id)
    if (!relation) return
    Object.assign(relation, {
      role: payload.role,
      startDate: payload.startDate,
      endDate: payload.endDate || '',
      remark: payload.remark || ''
    })
    relation.history.push({ time: nowStr(), action: '修改配置草稿', operator: PLANNER.name, remark: payload.remark || '修改帮扶关系配置。' })
    this.persist()
  },

  adjustRelation (id, payload) {    const relation = this.db.relations.find(r => r.id === id)
    if (!relation) return
    const before = clone({ role: relation.role, startDate: relation.startDate, endDate: relation.endDate, remark: relation.remark })
    Object.assign(relation, payload)
    relation.history.push({
      time: nowStr(),
      action: '调整关系',
      operator: PLANNER.name,
      remark: `调整前：${before.role}，${before.startDate} 至 ${before.endDate || '长期'}；调整后：${relation.role}，${relation.startDate} 至 ${relation.endDate || '长期'}。${payload.remark || ''}`
    })
    if (relation.status === '已生效') this.ensureRelationReportTask(relation)
    this.persist()
  },

  invalidateRelation (id, reason) {
    const relation = this.db.relations.find(r => r.id === id)
    if (!relation) return { ok: false }
    relation.status = '已失效'
    relation.endDate = todayStr()
    relation.history.push({ time: nowStr(), action: '关系失效', operator: PLANNER.name, remark: reason })
    const today = todayStr()
    this.db.dailyReports = this.db.dailyReports.filter(r =>
      !(r.date === today && r.personId === relation.personId && r.projectId === relation.projectId && r.status !== '已提交')
    )
    this.persist()
    return { ok: true }
  },

  /* ---------------- 梳理单与重点工作 ---------------- */
  saveSheet (payload, submit) {
    const { id, deptId, system, remark, items } = payload
    let sheet
    if (id) {
      sheet = this.db.sheets.find(s => s.id === id)
      Object.assign(sheet, { deptId, system, deptName: this.getDept(deptId).name, remark })
      sheet.items = items.map((item, index) => ({
        id: item.id || `SLI${sheet.id.slice(-3)}${index + 1}`,
        seq: index + 1,
        title: item.title,
        leadId: item.leadId,
        leadName: this.getPerson(item.leadId) ? this.getPerson(item.leadId).name : '',
        leadDeptId: deptId,
        dueDate: item.dueDate || '',
        problem: item.problem || '',
        suggestion: item.suggestion || ''
      }))
    } else {
      sheet = {
        id: nextCode(this.db.sheets, 'SL2026', 3),
        system,
        deptId,
        deptName: this.getDept(deptId).name,
        creatorId: PLANNER.id,
        creatorName: PLANNER.name,
        createDate: todayStr(),
        remark: remark || '',
        status: '草稿',
        createdAt: nowStr(),
        items: [],
        approvals: []
      }
      sheet.items = items.map((item, index) => ({
        id: `SLI${sheet.id.slice(-3)}${index + 1}`,
        seq: index + 1,
        title: item.title,
        leadId: item.leadId,
        leadName: this.getPerson(item.leadId) ? this.getPerson(item.leadId).name : '',
        leadDeptId: deptId,
        dueDate: item.dueDate || '',
        problem: item.problem || '',
        suggestion: item.suggestion || ''
      }))
      this.db.sheets.unshift(sheet)
    }

    if (id) {
      const removed = this.db.works.filter(w => w.sheetId === sheet.id && w.seq > sheet.items.length && w.status === '待生效')
      this.db.works = this.db.works.filter(w => removed.indexOf(w) === -1)
    }

    if (submit) {
      sheet.status = '审核中'
      sheet.approvals = [
        { key: 'head', name: '部门负责人审核', approver: this.getDept(deptId).manager, result: '待处理', time: '', comment: '' },
        { key: 'plan', name: '企划部审核', approver: ARCHIVER.name, result: '待处理', time: '', comment: '' }
      ]
      if (!sheet.history) sheet.history = []
      this.upsertSheetWorks(sheet)
    }
    this.persist()
    return sheet
  },

  upsertSheetWorks (sheet) {
    sheet.items.forEach((item, index) => {
      const existing = this.db.works.find(w => w.sheetId === sheet.id && w.seq === item.seq)
      const base = {
        sheetId: sheet.id,
        seq: index + 1,
        system: sheet.system,
        deptId: sheet.deptId,
        deptName: sheet.deptName,
        title: item.title,
        leadId: item.leadId,
        leadName: item.leadName,
        dueDate: item.dueDate,
        problem: item.problem,
        suggestion: item.suggestion
      }
      if (existing) {
        if (existing.status === '待生效') Object.assign(existing, base)
      } else {
        this.db.works.unshift({
          id: nextCode(this.db.works, 'GZ2026', 3),
          ...base,
          status: '待生效',
          createdAt: nowStr(),
          overallContent: '',
          overallAttachments: [],
          projectExecutions: [],
          executions: [],
          closeRequest: null,
          history: [{ time: nowStr(), action: '创建梳理单', operator: PLANNER.name, remark: sheet.remark }]
        })
      }
    })
  },

  submitSheetById (id) {
    const sheet = this.db.sheets.find(s => s.id === id)
    if (!sheet) return { ok: false, message: '未找到梳理单' }
    if (sheet.status !== '草稿' && sheet.status !== '已退回') {
      return { ok: false, message: '当前状态不允许提交创建审批' }
    }
    sheet.status = '审核中'
    sheet.approvals = [
      { key: 'head', name: '部门负责人审核', approver: this.getDept(sheet.deptId).manager, result: '待处理', time: '', comment: '' },
      { key: 'plan', name: '企划部审核', approver: ARCHIVER.name, result: '待处理', time: '', comment: '' }
    ]
    this.upsertSheetWorks(sheet)
    this.persist()
    return { ok: true }
  },

  approveSheet (id, action, comment) {    const sheet = this.db.sheets.find(s => s.id === id)
    if (!sheet || sheet.status !== '审核中') return { ok: false, message: '当前梳理单不在审核中' }
    const idx = findFirstPending(sheet.approvals)
    if (idx < 0) return { ok: false, message: '没有待处理审批节点' }
    const node = sheet.approvals[idx]
    node.time = nowStr()
    node.comment = comment || ''
    if (action === 'reject') {
      node.result = '退回'
      sheet.status = '已退回'
    } else {
      node.result = '通过'
      if (findFirstPending(sheet.approvals) < 0) {
        sheet.status = '已生效'
        this.db.works.filter(w => w.sheetId === sheet.id && w.status === '待生效').forEach(w => {
          w.status = '落实中'
          w.history.push({ time: nowStr(), action: '创建审批通过', operator: ARCHIVER.name, remark: '梳理单创建审批通过，工作生效。' })
        })
      }
    }
    this.persist()
    return { ok: true }
  },

  saveWorkExecutions (workId, payload) {
    const work = this.workById(workId)
    if (!work) return { ok: false, message: '未找到重点工作' }
    if (work.status === '销项审批中' || work.status === '已销项') {
      return { ok: false, message: '当前状态不允许修改执行情况' }
    }
    if (!payload.overallContent || !payload.overallContent.trim()) {
      return { ok: false, message: '请填写总体执行情况' }
    }
    const projects = payload.projects || []
    const projectIds = projects.map(p => p.projectId)
    if (new Set(projectIds).size !== projectIds.length) {
      return { ok: false, message: '同一项目不能重复添加' }
    }
    for (const p of projects) {
      if (!p.projectId) return { ok: false, message: '请选择关联项目' }
      if (!p.content || !p.content.trim()) return { ok: false, message: '请填写项目落实情况' }
    }
    const projectExecutions = projects.map((p, index) => {
      const existing = (work.projectExecutions || []).find(e => e.projectId === p.projectId)
      const project = this.getProject(p.projectId)
      return {
        id: existing ? existing.id : `GPE${work.id.slice(-3)}${index}${Date.now().toString().slice(-3)}`,
        projectId: p.projectId,
        projectName: project ? project.name : '',
        content: p.content,
        attachments: p.attachments || [],
        updatedAt: nowStr()
      }
    })
    work.overallContent = payload.overallContent
    work.overallAttachments = payload.overallAttachments || []
    work.projectExecutions = projectExecutions
    if (work.status === '待生效') work.status = '落实中'
    work.updatedAt = nowStr()
    work.history.push({
      time: nowStr(),
      action: '更新执行情况',
      operator: work.leadName,
      remark: `保存总体执行情况及${projectExecutions.length}个项目落实情况。`
    })
    this.persist()
    return { ok: true }
  },

  submitWorkClose (workId, payload) {
    const work = this.workById(workId)
    if (!work) return { ok: false, message: '未找到重点工作' }
    if (!work.overallContent || !work.overallContent.trim()) {
      return { ok: false, message: '请先填写总体执行情况' }
    }
    if (work.closeRequest && work.closeRequest.status === '审批中') {
      return { ok: false, message: '该事项已有进行中的销项申请' }
    }
    const nodes = []
    const projectExecutions = work.projectExecutions || []
    const projectIds = [...new Set(projectExecutions.map(e => e.projectId))]
    projectIds.forEach(pid => {
      const project = this.getProject(pid)
      nodes.push({ key: `pm_${pid}`, name: `项目经理确认（${project.name}）`, approver: project.manager, result: '待处理', time: '', comment: '' })
    })
    nodes.push({ key: 'head', name: '部门负责人审核', approver: this.getDept(work.deptId).manager, result: '待处理', time: '', comment: '' })
    nodes.push({ key: 'archive', name: '企划归档', approver: ARCHIVER.name, result: '待处理', time: '', comment: '' })
    work.closeRequest = {
      id: nextCode(this.db.works.map(w => ({ id: w.closeRequest ? w.closeRequest.id : '' })).filter(w => w.id), 'GZX2026', 3),
      reason: payload.reason,
      attachments: payload.attachments || [],
      executionIds: projectExecutions.map(e => e.id),
      overallContent: work.overallContent,
      overallAttachments: clone(work.overallAttachments || []),
      projectExecutions: clone(projectExecutions),
      submittedBy: work.leadName,
      submittedAt: nowStr(),
      status: '审批中',
      nodes,
      archivedAt: '',
      archivedBy: ''
    }
    work.status = '销项审批中'
    work.history.push({ time: nowStr(), action: '提交销项申请', operator: work.leadName, remark: payload.reason })
    this.persist()
    return { ok: true }
  },

  approveWorkClose (workId, action, comment) {
    const work = this.workById(workId)
    if (!work || !work.closeRequest) return { ok: false, message: '未找到销项申请' }
    const close = work.closeRequest
    if (close.status !== '审批中') return { ok: false, message: '该销项申请已结束' }
    const idx = findFirstPending(close.nodes)
    if (idx < 0) return { ok: false, message: '没有待处理审批节点' }
    const node = close.nodes[idx]
    node.time = nowStr()
    node.comment = comment || ''
    if (action === 'reject') {
      node.result = '退回'
      close.status = '已退回'
      work.status = '落实中'
      work.history.push({ time: nowStr(), action: '销项退回', operator: node.approver, remark: comment || '销项申请退回。' })
    } else {
      node.result = '通过'
      if (findFirstPending(close.nodes) < 0) {
        close.status = '已通过'
        close.archivedAt = nowStr()
        close.archivedBy = ARCHIVER.name
        work.status = '已销项'
        work.history.push({ time: nowStr(), action: '销项归档', operator: ARCHIVER.name, remark: '销项审批通过，企划归档，事项已销项。' })
      } else {
        work.history.push({ time: nowStr(), action: `${node.name}通过`, operator: node.approver, remark: comment || '同意。' })
      }
    }
    this.persist()
    return { ok: true }
  },

  /* ---------------- 项目诉求 ---------------- */
  createAppeal (payload) {
    const appeal = {
      id: nextCode(this.db.appeals, 'SQ2026', 4),
      projectId: payload.projectId,
      projectName: this.getProject(payload.projectId).name,
      title: payload.title,
      desc: payload.desc,
      deptId: payload.deptId,
      deptName: this.getDept(payload.deptId).name,
      personId: payload.personId,
      personName: this.getPerson(payload.personId).name,
      personPhone: this.getPerson(payload.personId).phone,
      coDepts: payload.coDepts || [],
      plan: payload.plan,
      dueDate: payload.dueDate,
      source: payload.source,
      status: '办理中',
      createdAt: nowStr(),
      acceptedAt: nowStr(),
      creatorId: this.currentUser.id,
      creatorName: this.currentUser.name,
      latestProgress: '诉求已登记并安排承办人办理。',
      progress: [],
      closeRequest: null,
      attachments: payload.attachments || []
    }
    this.db.appeals.unshift(appeal)
    const relation = this.db.relations.find(r => r.status === '已生效' && r.personId === appeal.personId && r.projectId === appeal.projectId)
    if (relation) this.createDailyTask(appeal, relation, todayStr())
    this.persist()
    return appeal
  },

  updateAppeal (id, payload) {
    const appeal = this.db.appeals.find(a => a.id === id)
    if (!appeal) return { ok: false, message: '未找到诉求' }
    if (appeal.status === '已删除') return { ok: false, message: '已删除诉求不可编辑' }
    if (appeal.status !== '办理中') return { ok: false, message: '仅办理中诉求可编辑' }
    const dueChanged = payload.dueDate && payload.dueDate !== appeal.dueDate
    if (dueChanged && !payload.extendReason) {
      return { ok: false, message: '调整完成时限需填写延期原因' }
    }
    const personChanged = payload.personId && payload.personId !== appeal.personId
    if (personChanged) {
      const person = this.getPerson(payload.personId)
      if (person) {
        appeal.personId = person.id
        appeal.personName = person.name
        appeal.personPhone = person.phone
        appeal.deptId = person.deptId
        appeal.deptName = this.getDept(person.deptId).name
      }
    }
    Object.assign(appeal, {
      title: payload.title || appeal.title,
      desc: payload.desc || appeal.desc,
      plan: payload.plan,
      dueDate: payload.dueDate,
      source: payload.source || appeal.source,
      coDepts: payload.coDepts || appeal.coDepts,
      attachments: payload.attachments || appeal.attachments
    })
    if (personChanged) {
      this.db.dailyReports = this.db.dailyReports.filter(r => !(r.appealId === appeal.id && r.status !== '已提交'))
      const relation = this.db.relations.find(r => r.status === '已生效' && r.personId === appeal.personId && r.projectId === appeal.projectId)
      if (relation) this.createDailyTask(appeal, relation, todayStr())
    }
    if (dueChanged) {
      appeal.latestProgress = `完成时限调整至 ${payload.dueDate}：${payload.extendReason}`
    }
    this.persist()
    return { ok: true }
  },

  deleteAppeal (id) {
    const appeal = this.db.appeals.find(a => a.id === id)
    if (!appeal) return { ok: false, message: '未找到诉求' }
    if (appeal.creatorId !== this.currentUser.id) return { ok: false, message: '仅诉求发起人可删除' }
    if (appeal.status !== '办理中') return { ok: false, message: '仅办理中且未进入销项审批的诉求可删除' }
    appeal.status = '已删除'
    appeal.deletedAt = nowStr()
    appeal.deletedBy = this.currentUser.name
    this.db.dailyReports = this.db.dailyReports.filter(r => !(r.appealId === appeal.id && r.status !== '已提交'))
    this.persist()
    return { ok: true }
  },

  submitAppealClose (id, payload) {
    const appeal = this.db.appeals.find(a => a.id === id)
    if (!appeal) return { ok: false }
    if (appeal.status === '已删除') return { ok: false, message: '已删除诉求不可发起销项' }
    if (appeal.closeRequest && appeal.closeRequest.status === '审批中') {
      return { ok: false, message: '该诉求已有进行中的销项申请' }
    }
    const project = this.getProject(appeal.projectId)
    appeal.closeRequest = {
      id: nextCode(this.db.appeals.map(a => ({ id: a.closeRequest ? a.closeRequest.id : '' })).filter(a => a.id), 'SQX2026', 3),
      reason: payload.reason,
      attachments: payload.attachments || [],
      submittedBy: appeal.personName,
      submittedAt: nowStr(),
      status: '审批中',
      nodes: [
        { key: 'pm', name: '项目经理确认', approver: project.manager, result: '待处理', time: '', comment: '' },
        { key: 'archive', name: '企划归档', approver: ARCHIVER.name, result: '待处理', time: '', comment: '' }
      ],
      archivedAt: '',
      archivedBy: ''
    }
    appeal.status = '销项审批中'
    appeal.progress.push({
      time: nowStr(),
      source: '销项',
      content: `已提交销项申请：${payload.reason}`,
      operator: appeal.personName
    })
    appeal.latestProgress = appeal.progress[appeal.progress.length - 1].content
    this.persist()
    return { ok: true }
  },

  approveAppealClose (id, action, comment) {
    const appeal = this.db.appeals.find(a => a.id === id)
    if (!appeal || !appeal.closeRequest) return { ok: false, message: '未找到销项申请' }
    const close = appeal.closeRequest
    if (close.status !== '审批中') return { ok: false, message: '该销项申请已结束' }
    const idx = findFirstPending(close.nodes)
    if (idx < 0) return { ok: false, message: '没有待处理审批节点' }
    const node = close.nodes[idx]
    node.time = nowStr()
    node.comment = comment || ''
    if (action === 'reject') {
      node.result = '退回'
      close.status = '已退回'
      appeal.status = '办理中'
      appeal.progress.push({
        time: nowStr(),
        source: '销项',
        content: `销项申请被${node.approver}退回：${comment || '请补充办结材料后重新提交。'}`,
        operator: node.approver
      })
    } else {
      node.result = '通过'
      if (findFirstPending(close.nodes) < 0) {
        close.status = '已通过'
        close.archivedAt = nowStr()
        close.archivedBy = ARCHIVER.name
        appeal.status = '已销项'
        this.db.dailyReports = this.db.dailyReports.filter(r => !(r.appealId === appeal.id && r.status !== '已提交'))
        appeal.progress.push({
          time: nowStr(),
          source: '销项',
          content: `销项申请经项目经理确认、企划归档，诉求办结。${close.reason}`,
          operator: ARCHIVER.name
        })
      } else {
        appeal.progress.push({
          time: nowStr(),
          source: '销项',
          content: `${node.name}通过：${comment || '同意办结。'}`,
          operator: node.approver
        })
      }
    }
    appeal.latestProgress = appeal.progress[appeal.progress.length - 1].content
    this.persist()
    return { ok: true }
  },

  /* ---------------- 日报 ---------------- */
  saveReport (reportId, payload) {
    const report = this.db.dailyReports.find(r => r.id === reportId)
    if (!report) return { ok: false, message: '未找到日报' }
    if (report.legacy) return { ok: false, message: '历史日报只读' }
    if (isFrozen(report.date)) {
      return { ok: false, message: '该日报已冻结，个人不可修改' }
    }
    report.frozen = false
    Object.assign(report, {
      attend: payload.attend,
      absentReason: payload.absentReason || '',
      workContent: payload.workContent || '',
      newIssues: payload.newIssues || '',
      status: '已提交',
      submitTime: nowStr()
    })
    const appeal = this.db.appeals.find(a => a.id === report.appealId)
    if (appeal) {
      appeal.latestProgress = report.workContent || report.newIssues || '已提交诉求日报。'
      appeal.latestReportDate = report.date
      appeal.latestReportId = report.id
    }
    this.persist()
    return { ok: true }
  },

  reviseReport (reportId, payload, reason) {
    const report = this.db.dailyReports.find(r => r.id === reportId)
    if (!report) return { ok: false, message: '未找到日报' }
    if (!reason) return { ok: false, message: '请填写修订原因' }
    const before = {
      attend: report.attend,
      absentReason: report.absentReason,
      workContent: report.workContent,
      newIssues: report.newIssues
    }
    Object.assign(report, {
      attend: payload.attend,
      absentReason: payload.absentReason || '',
      workContent: payload.workContent || '',
      newIssues: payload.newIssues || '',
      status: '已提交',
      submitTime: report.submitTime || nowStr()
    })
    if (!report.revisions) report.revisions = []
    report.revisions.push({
      time: nowStr(),
      operator: ARCHIVER.name,
      reason,
      before,
      after: {
        attend: report.attend,
        absentReason: report.absentReason,
        workContent: report.workContent,
        newIssues: report.newIssues
      }
    })
    const appeal = this.db.appeals.find(a => a.id === report.appealId)
    if (appeal) {
      appeal.latestProgress = report.workContent || report.newIssues || '已提交诉求日报。'
      appeal.latestReportDate = report.date
      appeal.latestReportId = report.id
    }
    this.persist()
    return { ok: true }
  },

  /* ---------------- 制度建议 ---------------- */
  createSuggestion (payload) {
    const proposer = this.currentUser
    const dept = this.getDept(payload.deptId)
    const confirmers = payload.confirmerIds.map(id => {
      const p = this.getPerson(id)
      return { id, name: p.name, title: p.title, status: '待确认', reply: null }
    })
    const nodes = confirmers.map(c => ({
      key: `confirm_${c.id}`,
      type: 'confirmer',
      confirmerId: c.id,
      name: `部门负责人确认（${c.name}）`,
      approver: c.name,
      result: '待处理',
      time: '',
      comment: ''
    }))
    nodes.push({
      key: 'archive',
      type: 'archive',
      name: '企划部归档',
      approver: ARCHIVER.name,
      result: '待处理',
      time: '',
      comment: ''
    })
    const suggestion = {
      id: nextCode(this.db.suggestions, 'JY2026', 3),
      title: payload.title,
      flow: payload.flow,
      desc: payload.desc,
      proposerId: proposer.id,
      proposerName: proposer.name,
      proposerDeptId: proposer.deptId,
      proposerDeptName: this.getDept(proposer.deptId).name,
      deptId: payload.deptId,
      deptName: dept.name,
      confirmerIds: payload.confirmerIds,
      confirmers,
      nodes,
      reply: null,
      status: '待确认',
      archiveOpinion: '',
      archivedAt: '',
      archivedBy: '',
      createdAt: nowStr(),
      attachments: payload.attachments || []
    }
    this.db.suggestions.unshift(suggestion)
    this.persist()
    return suggestion
  },

  approveSuggestionNode (id, action, payload = {}) {
    const suggestion = this.db.suggestions.find(s => s.id === id)
    if (!suggestion) return { ok: false, message: '未找到制度建议' }
    if (suggestion.status === '已归档') return { ok: false, message: '该建议已归档' }
    const idx = findFirstPending(suggestion.nodes)
    if (idx < 0) return { ok: false, message: '没有待处理流程节点' }
    const node = suggestion.nodes[idx]
    const comment = payload.comment || ''
    if (node.type === 'archive') {
      if (action === 'reject') {
        node.result = '退回'
        node.time = nowStr()
        node.comment = payload.archiveOpinion || comment
        suggestion.status = '已回复'
        this.persist()
        return { ok: true, rejected: true }
      }
      if (!payload.archiveOpinion || !payload.archiveOpinion.trim()) {
        return { ok: false, message: '请填写归档意见' }
      }
      node.result = '通过'
      node.time = nowStr()
      node.comment = payload.archiveOpinion
      suggestion.archiveOpinion = payload.archiveOpinion
      suggestion.archivedAt = nowStr()
      suggestion.archivedBy = ARCHIVER.name
      suggestion.status = '已归档'
      this.persist()
      return { ok: true, archived: true }
    }

    const confirmer = suggestion.confirmers.find(c => c.id === node.confirmerId)
    if (!confirmer) return { ok: false, message: '未找到确认负责人' }
    if (action === 'reject') {
      node.result = '退回'
      node.time = nowStr()
      node.comment = payload.reason || comment
      confirmer.status = '已退回'
      suggestion.status = '已退回'
      suggestion.nodes.forEach(n => {
        if (n.result === '待处理') n.result = '已终止'
      })
      this.persist()
      return { ok: true, rejected: true }
    }
    const adopt = payload.adopt
    if (adopt !== '改' && adopt !== '不改') return { ok: false, message: '请选择回复结论' }
    if (adopt === '不改' && (!payload.reason || !payload.reason.trim())) {
      return { ok: false, message: '回复“不改”需说明理由' }
    }
    if (adopt === '改' && (!payload.plan || !payload.plan.trim() || !payload.deadline)) {
      return { ok: false, message: '回复“改”需填写整改计划和完成时限' }
    }
    confirmer.reply = {
      adopt,
      reason: payload.reason || '',
      plan: payload.plan || '',
      deadline: payload.deadline || '',
      time: nowStr(),
      operator: confirmer.name,
      comment
    }
    confirmer.status = '已确认'
    node.result = '通过'
    node.time = nowStr()
    node.comment = adopt === '改' ? confirmer.reply.plan : confirmer.reply.reason
    if (!suggestion.nodes.some(n => n.type === 'confirmer' && n.result === '待处理')) {
      suggestion.status = '已回复'
    }
    this.persist()
    return { ok: true }
  },

  /* ---------------- 统计与待办 ---------------- */
  overviewStats (date) {
    const day = date || todayStr()
    const rels = this.effectiveRelations()
    const serviceCount = new Set(rels.map(r => r.personId)).size
    const dueReports = this.reportsForDate(day)
    const submitted = dueReports.filter(r => r.status === '已提交')
    const expectedPeople = new Set(dueReports.map(r => r.personId)).size
    const attendedPeople = new Set(submitted.filter(r => r.attend === true).map(r => r.personId)).size
    const appeals = this.db.appeals.filter(a => a.status !== '已删除')
    const closed = appeals.filter(a => a.status === '已销项')
    const processing = appeals.filter(a => a.status === '办理中')
    const closing = appeals.filter(a => a.status === '销项审批中')
    return {
      serviceCount,
      dueCount: dueReports.length,
      submittedCount: submitted.length,
      unfilledCount: dueReports.length - submitted.length,
      expectedPeople,
      attendedCount: attendedPeople,
      attendanceRate: expectedPeople ? Math.round((attendedPeople / expectedPeople) * 1000) / 10 : 0,
      appealTotal: appeals.length,
      closedCount: closed.length,
      processingCount: processing.length,
      closingCount: closing.length,
      activeCount: processing.length + closing.length,
      closeRate: appeals.length ? Math.round((closed.length / appeals.length) * 1000) / 10 : 0,
      workTotal: this.db.works.length,
      workClosed: this.db.works.filter(w => w.status === '已销项').length,
      relationCount: rels.length
    }
  },

  todos () {
    const today = todayStr()
    const myReports = this.db.dailyReports.filter(r => !r.legacy && r.date === today && r.personId === CURRENT_USER_ID && r.status !== '已提交')
    const myAppeals = this.db.appeals.filter(a => a.personId === CURRENT_USER_ID && a.status === '办理中')
    const relationBatches = [...new Set(this.db.relations.filter(r => r.status === '待审批').map(r => r.batchId))]
    const sheets = this.db.sheets.filter(s => s.status === '审核中')
    const workCloses = this.db.works.filter(w => w.closeRequest && w.closeRequest.status === '审批中')
    const appealCloses = this.db.appeals.filter(a => a.closeRequest && a.closeRequest.status === '审批中')
    const suggestions = this.db.suggestions.filter(s => s.status === '待确认' || s.status === '已回复')
    const approvalCount = relationBatches.length + sheets.length + workCloses.length + appealCloses.length + suggestions.length
    return {
      dailyCount: myReports.length,
      appealCount: myAppeals.length,
      approvalCount,
      relationBatches,
      sheets,
      workCloses,
      appealCloses,
      suggestions,
      total: myReports.length + myAppeals.length + approvalCount
    }
  },

  reportsForAppeal (appealId) {
    return this.db.dailyReports
      .filter(r => r.status === '已提交' && r.appealId === appealId)
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
  },

  weekSummary (start, end) {
    const allDates = datesBetween(start, end)
    const workDates = allDates.filter(d => !isWeekend(d))
    const elapsed = workDates.filter(d => d <= todayStr())
    const reports = this.db.dailyReports.filter(r => !r.legacy && r.date >= start && r.date <= end)
    const deletedIds = new Set(this.db.appeals.filter(a => a.status === '已删除').map(a => a.id))
    const validReports = reports.filter(r => !deletedIds.has(r.appealId))
    const submitted = validReports.filter(r => r.status === '已提交')
    const absentRows = submitted.filter(r => r.attend === false).sort((a, b) => a.personName.localeCompare(b.personName, 'zh') || a.date.localeCompare(b.date))
    const serviceRows = submitted.filter(r => r.attend === true).sort((a, b) => a.personName.localeCompare(b.personName, 'zh') || a.date.localeCompare(b.date))
    const peopleIds = new Set(this.effectiveRelations().map(r => r.personId))
    const closed = this.db.appeals.filter(a => a.closeRequest && a.closeRequest.archivedAt && a.closeRequest.archivedAt.slice(0, 10) >= start && a.closeRequest.archivedAt.slice(0, 10) <= end)
    const activeCount = this.db.appeals.filter(a => a.status === '办理中' || a.status === '销项审批中').length
    const expected = peopleIds.size * elapsed.length
    const attendedSet = new Set(submitted.filter(r => r.attend === true).map(r => `${r.personId}|${r.date}`))
    const attended = attendedSet.size
    return {
      start,
      end,
      dates: allDates,
      workDates,
      elapsedDates: elapsed,
      personCount: peopleIds.size,
      expectedCount: expected,
      submittedCount: submitted.length,
      attendedCount: attended,
      attendanceRate: expected ? Math.round((attended / expected) * 1000) / 10 : 0,
      absentRows,
      serviceRows,
      closedCount: closed.length,
      activeCount,
      reports: validReports
    }
  }
}

export default store
