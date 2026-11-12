import Vue from 'vue'
import { buildSeed, CURRENT_USER_ID, PLANNER, ARCHIVER } from '../data/seed'
import { nowStr, todayStr, isFrozen, datesBetween, isWeekend, recentReportDays } from '../utils/date'

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
        if (parsed && parsed.version === 5) {
          state.db = parsed
          this.refreshDailyWindow()
          this.persist()
          return
        }
      }
    } catch (e) {
      // 本地数据不可用时重新初始化
    }
    state.db = buildSeed()
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
    state.db = buildSeed()
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

  primaryPersonOfProject (projectId) {
    const list = this.db.relations.filter(r => r.projectId === projectId && r.status === '已生效')
    const primary = list.find(r => r.role === '主责') || list[0]
    return primary ? this.getPerson(primary.personId) : null
  },

  appealsOf (personId, projectId, includeClosed = false) {
    return this.db.appeals.filter(a => {
      if (personId && a.personId !== personId) return false
      if (projectId && a.projectId !== projectId) return false
      if (!includeClosed && a.status === '已销项') return false
      return true
    })
  },

  feedbackAppeals (personId, projectId) {
    return this.db.appeals.filter(a => a.personId === personId && a.projectId === projectId && a.status === '办理中')
  },

  reportFor (date, personId, projectId) {
    return this.db.dailyReports.find(r => r.date === date && r.personId === personId && r.projectId === projectId) || null
  },

  reportsForDate (date) {
    return this.db.dailyReports.filter(r => r.date === date)
  },

  workById (id) {
    return this.db.works.find(w => w.id === id)
  },

  /* ---------------- 帮扶关系 ---------------- */
  createRelations (payload) {
    const { personIds, projectIds, role, startDate, endDate, plannerId, remark } = payload
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
          plannerId,
          plannerName: this.getPerson(plannerId) ? this.getPerson(plannerId).name : PLANNER.name,
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

  createDailyTask (relation, date) {
    if (this.reportFor(date, relation.personId, relation.projectId)) return
    const project = this.getProject(relation.projectId)
    this.db.dailyReports.push({
      id: `RB${date.replace(/-/g, '')}${relation.personId}${relation.projectId}`,
      date,
      personId: relation.personId,
      personName: relation.personName,
      deptId: relation.deptId,
      deptName: relation.deptName,
      projectId: relation.projectId,
      projectName: relation.projectName,
      projectNeeds: project ? project.needs : '',
      attend: null,
      absentReason: '',
      workContent: '',
      newIssues: '',
      status: '未填写',
      checkStatus: '待校核',
      frozen: isFrozen(date),
      submitTime: '',
      checkTime: '',
      checker: '',
      feedbacks: [],
      revisions: []
    })
  },

  refreshDailyWindow () {
    const days = recentReportDays(7)
    const today = todayStr()
    this.db.dailyReports.forEach(report => {
      report.frozen = report.date < today
    })
    this.db.relations.filter(r => r.status === '已生效').forEach(relation => {
      days.forEach(day => {
        if (relation.startDate && relation.startDate > day) return
        if (relation.endDate && relation.endDate < day) return
        this.createDailyTask(relation, day)
      })
    })
  },

  ensureRelationReportTask (relation) {
    const today = todayStr()
    if (relation.startDate && relation.startDate > today) return
    if (relation.endDate && relation.endDate < today) return
    this.createDailyTask(relation, today)
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
      plannerId: payload.plannerId,
      plannerName: this.getPerson(payload.plannerId) ? this.getPerson(payload.plannerId).name : relation.plannerName,
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
    const todayReport = this.reportFor(todayStr(), relation.personId, relation.projectId)
    if (todayReport && todayReport.status === '未填写') {
      this.db.dailyReports = this.db.dailyReports.filter(r => r.id !== todayReport.id)
    }
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
    const executions = []
    if (payload.scope === 'company') {
      executions.push({
        id: `GZE${work.id.slice(-3)}C${Date.now().toString().slice(-3)}`,
        scope: 'company',
        projectId: '',
        projectName: '',
        personId: work.leadId,
        personName: work.leadName,
        content: payload.companyContent,
        updatedAt: nowStr(),
        attachments: payload.attachments || []
      })
    } else {
      payload.projects.forEach((p, index) => {
        const existing = work.executions.find(e => e.projectId === p.projectId)
        const person = this.getPerson(p.personId) || this.primaryPersonOfProject(p.projectId)
        executions.push({
          id: existing ? existing.id : `GZE${work.id.slice(-3)}${index}${Date.now().toString().slice(-3)}`,
          scope: 'project',
          projectId: p.projectId,
          projectName: this.getProject(p.projectId).name,
          personId: person ? person.id : '',
          personName: person ? person.name : '',
          content: p.content,
          updatedAt: nowStr(),
          attachments: p.attachments || []
        })
      })
    }
    work.executions = executions
    if (work.status === '待生效') work.status = '落实中'
    work.updatedAt = nowStr()
    work.history.push({
      time: nowStr(),
      action: '更新执行情况',
      operator: payload.scope === 'company' ? work.leadName : '项目跟进人',
      remark: payload.scope === 'company' ? '填写公司级总体执行情况。' : `按项目分别填报执行情况（${executions.length}个项目）。`
    })
    this.persist()
    return { ok: true }
  },

  submitWorkClose (workId, payload) {
    const work = this.workById(workId)
    if (!work) return { ok: false, message: '未找到重点工作' }
    if (!work.executions.length) return { ok: false, message: '请先填写执行情况' }
    if (work.closeRequest && work.closeRequest.status === '审批中') {
      return { ok: false, message: '该事项已有进行中的销项申请' }
    }
    const nodes = []
    const executionIds = payload.executionIds && payload.executionIds.length
      ? payload.executionIds
      : work.executions.map(e => e.id)
    const selectedExecutions = work.executions.filter(e => executionIds.indexOf(e.id) > -1)
    const projectIds = [...new Set(selectedExecutions.filter(e => e.scope === 'project').map(e => e.projectId))]
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
      executionIds,
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
      status: '待受理',
      createdAt: nowStr(),
      acceptedAt: '',
      latestProgress: '诉求已登记，等待主责部门受理。',
      progress: [{ time: nowStr(), source: '登记', content: '诉求已登记，等待主责部门受理。', operator: this.currentUser.name }],
      closeRequest: null,
      attachments: payload.attachments || []
    }
    this.db.appeals.unshift(appeal)
    this.persist()
    return appeal
  },

  updateAppeal (id, payload) {
    const appeal = this.db.appeals.find(a => a.id === id)
    if (!appeal) return { ok: false, message: '未找到诉求' }
    const dueChanged = payload.dueDate && payload.dueDate !== appeal.dueDate
    if (dueChanged && !payload.extendReason) {
      return { ok: false, message: '调整完成时限需填写延期原因' }
    }
    if (payload.personId && payload.personId !== appeal.personId) {
      const person = this.getPerson(payload.personId)
      if (person) {
        appeal.personId = person.id
        appeal.personName = person.name
        appeal.personPhone = person.phone
        appeal.deptId = person.deptId
        appeal.deptName = this.getDept(person.deptId).name
        appeal.progress.push({
          time: nowStr(),
          source: '进展',
          content: `责任人调整为 ${person.name}（${appeal.deptName}），继续跟进办理。`,
          operator: ARCHIVER.name
        })
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
    if (dueChanged) {
      appeal.latestProgress = `完成时限调整至 ${payload.dueDate}：${payload.extendReason}`
      appeal.progress.push({
        time: nowStr(),
        source: '进展',
        content: `完成时限调整至 ${payload.dueDate}，延期原因：${payload.extendReason}`,
        operator: appeal.personName
      })
    }
    this.persist()
    return { ok: true }
  },

  acceptAppeal (id) {
    const appeal = this.db.appeals.find(a => a.id === id)
    if (!appeal) return
    appeal.status = '办理中'
    appeal.acceptedAt = nowStr()
    appeal.progress.push({
      time: nowStr(),
      source: '受理',
      content: `${appeal.deptName}已受理，转 ${appeal.personName} 跟进办理。`,
      operator: this.getDept(appeal.deptId).manager
    })
    appeal.latestProgress = appeal.progress[appeal.progress.length - 1].content
    this.persist()
  },

  addAppealProgress (id, content) {
    const appeal = this.db.appeals.find(a => a.id === id)
    if (!appeal) return
    appeal.progress.push({ time: nowStr(), source: '进展', content, operator: appeal.personName })
    appeal.latestProgress = content
    this.persist()
  },

  submitAppealClose (id, payload) {
    const appeal = this.db.appeals.find(a => a.id === id)
    if (!appeal) return { ok: false }
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
  ensureReportFeedbacks (report) {
    if (!report) return
    if (!report.feedbacks) report.feedbacks = []
    const appeals = this.feedbackAppeals(report.personId, report.projectId)
    appeals.forEach(appeal => {
      const exists = report.feedbacks.find(f => f.appealId === appeal.id)
      if (!exists) {
        report.feedbacks.push({
          appealId: appeal.id,
          appealTitle: appeal.title,
          appealStatus: appeal.status,
          latestProgress: appeal.latestProgress,
          type: '',
          content: '',
          newIssue: '',
          attachments: []
        })
      } else {
        exists.appealTitle = appeal.title
        exists.appealStatus = appeal.status
        exists.latestProgress = appeal.latestProgress
      }
    })
    report.feedbacks = report.feedbacks || []
    this.persist()
  },

  saveReport (reportId, payload, mode, options = {}) {    const report = this.db.dailyReports.find(r => r.id === reportId)
    if (!report) return { ok: false, message: '未找到日报' }
    if (report.frozen && !options.admin) return { ok: false, message: '该日报已冻结，个人不可修改' }
    const changingChecked = report.checkStatus === '已校核'
    Object.assign(report, {
      attend: payload.attend,
      absentReason: payload.absentReason || '',
      workContent: payload.workContent || '',
      newIssues: payload.newIssues || '',
      feedbacks: payload.feedbacks || report.feedbacks
    })
    if (mode === 'submit') {
      report.status = '已提交'
      report.submitTime = nowStr()
    } else {
      report.status = '草稿'
    }
    if (changingChecked) report.checkStatus = '需重新校核'
    else if (report.checkStatus !== '需重新校核') report.checkStatus = '待校核'
    this.syncReportFeedback(report)
    this.persist()
    return { ok: true }
  },

  syncReportFeedback (report) {
    // 先移除该日报此前写入的进展，避免重复编辑产生重复记录
    this.db.appeals.forEach(appeal => {
      const before = appeal.progress.length
      appeal.progress = appeal.progress.filter(p => p.reportId !== report.id)
      if (appeal.progress.length !== before) {
        appeal.latestProgress = appeal.progress.length ? appeal.progress[appeal.progress.length - 1].content : ''
      }
    })
    if (report.status === '未填写') return
    report.feedbacks.forEach(fb => {
      if (fb.type !== '有新进展' || !fb.content) return
      const appeal = this.db.appeals.find(a => a.id === fb.appealId)
      if (!appeal) return
      appeal.progress.push({
        time: `${report.date} ${nowStr().slice(11)}`,
        source: '日报',
        content: fb.content,
        operator: report.personName,
        reportId: report.id
      })
      appeal.progress.sort((a, b) => a.time.localeCompare(b.time))
      appeal.latestProgress = appeal.progress[appeal.progress.length - 1].content
    })
  },

  checkReport (reportId, remark) {
    const report = this.db.dailyReports.find(r => r.id === reportId)
    if (!report) return
    report.checkStatus = '已校核'
    report.checkTime = nowStr()
    report.checker = ARCHIVER.name
    report.checkRemark = remark || ''
    this.persist()
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
    if (payload.feedbacks) report.feedbacks = payload.feedbacks
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
    report.checkStatus = '需重新校核'
    this.syncReportFeedback(report)
    this.persist()
    return { ok: true }
  },

  /* ---------------- 制度建议 ---------------- */
  createSuggestion (payload) {
    const proposer = this.currentUser
    const dept = this.getDept(payload.deptId)
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
      confirmers: payload.confirmerIds.map(id => {
        const p = this.getPerson(id)
        return { id, name: p.name, title: p.title }
      }),
      reply: null,
      status: '待确认',
      createdAt: nowStr(),
      attachments: payload.attachments || []
    }
    this.db.suggestions.unshift(suggestion)
    this.persist()
    return suggestion
  },

  replySuggestion (id, payload) {
    const suggestion = this.db.suggestions.find(s => s.id === id)
    if (!suggestion) return { ok: false }
    if (payload.adopt === '不改' && !payload.reason) return { ok: false, message: '回复“不改”需说明理由' }
    if (payload.adopt === '改' && (!payload.plan || !payload.deadline)) return { ok: false, message: '回复“改”需填写整改计划和完成时限' }
    suggestion.reply = {
      adopt: payload.adopt,
      reason: payload.reason || '',
      plan: payload.plan || '',
      deadline: payload.deadline || '',
      time: nowStr(),
      operator: suggestion.confirmers[0].name,
      comment: payload.comment || ''
    }
    suggestion.status = '已回复'
    this.persist()
    return { ok: true }
  },

  archiveSuggestion (id) {
    const suggestion = this.db.suggestions.find(s => s.id === id)
    if (!suggestion || !suggestion.reply) return
    suggestion.status = '已归档'
    suggestion.reply.archivedAt = nowStr()
    suggestion.reply.archivedBy = ARCHIVER.name
    this.persist()
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
    const appeals = this.db.appeals
    const closed = appeals.filter(a => a.status === '已销项')
    const active = appeals.filter(a => a.status !== '已销项')
    const monitorRows = this.monitorRows(day)
    const requiredRows = monitorRows.filter(r => r.required)
    const fed = requiredRows.filter(r => r.feedbackType === '有新进展' || r.feedbackType === '无新进展').length
    return {
      serviceCount,
      dueCount: dueReports.length,
      submittedCount: submitted.length,
      unfilledCount: dueReports.filter(r => r.status === '未填写' || r.status === '草稿').length,
      expectedPeople,
      attendedCount: attendedPeople,
      attendanceRate: expectedPeople ? Math.round((attendedPeople / expectedPeople) * 1000) / 10 : 0,
      appealTotal: appeals.length,
      closedCount: closed.length,
      activeCount: active.length,
      closeRate: appeals.length ? Math.round((closed.length / appeals.length) * 1000) / 10 : 0,
      pendingAppeals: appeals.filter(a => a.status === '待受理').length,
      feedbackTaskCount: requiredRows.length,
      fedCount: fed,
      unfedCount: requiredRows.length - fed,
      feedbackRate: requiredRows.length ? Math.round((fed / requiredRows.length) * 1000) / 10 : 0,
      workTotal: this.db.works.length,
      workClosed: this.db.works.filter(w => w.status === '已销项').length,
      relationCount: rels.length
    }
  },

  todos () {
    const today = todayStr()
    const myReports = this.db.dailyReports.filter(r => r.date === today && r.personId === CURRENT_USER_ID && r.status !== '已提交')
    const myAppeals = this.db.appeals.filter(a => a.personId === CURRENT_USER_ID && a.status === '办理中')
    const relationBatches = [...new Set(this.db.relations.filter(r => r.status === '待审批').map(r => r.batchId))]
    const sheets = this.db.sheets.filter(s => s.status === '审核中')
    const workCloses = this.db.works.filter(w => w.closeRequest && w.closeRequest.status === '审批中')
    const appealCloses = this.db.appeals.filter(a => a.closeRequest && a.closeRequest.status === '审批中')
    const suggestions = this.db.suggestions.filter(s => s.status === '待确认')
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

  monitorRows (date) {
    const day = date || todayStr()
    return this.db.appeals.filter(a => a.status !== '已销项').map(appeal => {
      const report = this.reportFor(day, appeal.personId, appeal.projectId)
      const fb = report && report.feedbacks.find(f => f.appealId === appeal.id)
      const required = appeal.status === '办理中'
      let feedbackStatus = '—'
      if (required) {
        if (!report || report.status !== '已提交') feedbackStatus = '待反馈'
        else if (report.attend === false) feedbackStatus = '因未到岗未反馈'
        else if (!fb || !fb.type) feedbackStatus = '待反馈'
        else feedbackStatus = fb.type
      }
      let reportStatus = '未填写'
      if (report) reportStatus = report.status
      let attendText = '尚未填报'
      if (report && report.status !== '未填写') attendText = report.attend === true ? '是' : (report.attend === false ? '否' : '尚未填报')
      const last = appeal.progress[appeal.progress.length - 1]
      return {
        appealId: appeal.id,
        title: appeal.title,
        projectId: appeal.projectId,
        projectName: appeal.projectName,
        personId: appeal.personId,
        personName: appeal.personName,
        personPhone: appeal.personPhone,
        deptName: appeal.deptName,
        status: appeal.status,
        reportStatus,
        reportId: report ? report.id : '',
        attend: attendText,
        attendRaw: report ? report.attend : null,
        absentReason: report ? report.absentReason : '',
        feedbackStatus,
        feedbackType: fb ? fb.type : '',
        lastProgressTime: last ? last.time : '',
        required
      }
    })
  },

  weekSummary (start, end) {
    const allDates = datesBetween(start, end)
    const workDates = allDates.filter(d => !isWeekend(d))
    const elapsed = workDates.filter(d => d <= todayStr())
    const reports = this.db.dailyReports.filter(r => r.date >= start && r.date <= end)
    const submitted = reports.filter(r => r.status === '已提交')
    const absentRows = submitted.filter(r => r.attend === false).sort((a, b) => a.personName.localeCompare(b.personName, 'zh') || a.date.localeCompare(b.date))
    const serviceRows = submitted.filter(r => r.attend === true).sort((a, b) => a.personName.localeCompare(b.personName, 'zh') || a.date.localeCompare(b.date))
    const peopleIds = new Set(this.effectiveRelations().map(r => r.personId))
    const closed = this.db.appeals.filter(a => a.closeRequest && a.closeRequest.archivedAt && a.closeRequest.archivedAt.slice(0, 10) >= start && a.closeRequest.archivedAt.slice(0, 10) <= end)
    const activeCount = this.db.appeals.filter(a => a.status !== '已销项').length
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
      reports
    }
  }
}

export default store
