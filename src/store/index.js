import Vue from 'vue'
import { buildSeed, SCHEMA_VERSION } from '../data/seed'
import { migrateDb } from './migrate'
import { nowStr, todayStr } from '../utils/date'
import { nextCode } from '../utils/businessCodes'
import { PROJECT, DEPARTMENT, staffOrg, targetOf, relationValues, effectiveRelations, personName, syncExecutions, changeWorkStatus, workRows, myWork } from '../utils/serviceData'
import { dailyRows, attendanceRows, pendingReport, reportBody, dailyEligible, validateReport } from '../utils/reportData'
import { submitAppeal, reviewAppeal, updateAppealProgress, requestClosure, submitSuggestion, replySuggestion, appealStats } from '../utils/workflow'

const STORAGE_KEY = 'hq_enablement_db_v5'
const ACTOR_KEY = 'service_project_demo_person'
const state = Vue.observable({ db: null, actorId: 'P01', day: todayStr() })

function cachedDb () {
  const raw = localStorage.getItem(STORAGE_KEY)
  return raw ? JSON.parse(raw) : null
}

function relationChange (db, r, action, actor) {
  const target = targetOf(db, r.type, r.targetId)
  r.history.push({ action, operator: actor.name, time: nowStr(), values: relationValues(r),
    note: [personName(db, r.personId), r.type, target.company, target.name, r.status].join(' · ') })
  syncExecutions(db)
}

function duplicateRelation (db, relation) {
  return db.relations.some(r => r.id !== relation.id && r.status === '启用' && r.personId === relation.personId &&
    r.type === relation.type && r.targetId === relation.targetId)
}

const store = {
  state,
  get db () { return state.db },
  get currentUser () { return this.getPerson(state.actorId) },
  getPerson (id) { return this.db.people.find(p => p.id === id) },
  getDept (id) { return this.db.departments.find(d => d.id === id) },
  orgOf (person) { return staffOrg(this.db, person) },

  init () {
    state.db = migrateDb(localStorage, STORAGE_KEY)
    const saved = sessionStorage.getItem(ACTOR_KEY)
    state.actorId = this.getPerson(saved) ? saved : 'P01'
    state.day = todayStr()
  },
  reset () {
    const db = buildSeed()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
    state.db = db
  },
  refreshFromStorage (event) {
    if (event.key === STORAGE_KEY && event.newValue) {
      const db = JSON.parse(event.newValue)
      if (db.schemaVersion === SCHEMA_VERSION) state.db = db
    }
  },
  selectPerson (id) {
    if (this.getPerson(id)) {
      sessionStorage.setItem(ACTOR_KEY, id)
      state.actorId = id
    }
  },

  // 从最新缓存读取，在副本上完成一个业务操作，写入成功后才发布给页面。
  change (edit) {
    const db = cachedDb()
    if (!db || db.schemaVersion !== SCHEMA_VERSION) return { ok: false, message: '演示数据已变化，请刷新后重试' }
    const error = edit(db, db.people.find(p => p.id === state.actorId))
    if (error) return { ok: false, message: error }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
    } catch (error) {
      return { ok: false, message: '浏览器未能保存更改：' + error.message }
    }
    state.db = db
    return { ok: true }
  },

  saveRelation (form, id) {
    return this.change((db, actor) => {
      const person = db.people.find(p => p.id === form.personId && p.orgType === '总部')
      const target = targetOf(db, form.type, form.targetId)
      if (!person || ![PROJECT, DEPARTMENT].includes(form.type) || !target || target.company !== form.company) return '请选择总部人员、分公司和对应的帮扶对象'
      const original = id && db.relations.find(r => r.id === id)
      if (id && !original) return '未找到帮扶关系'
      const r = original || { id: nextCode(db.relations, 'BF'), status: '启用', history: [] }
      Object.assign(r, { personId: person.id, type: form.type, targetId: target.id })
      if (r.status === '启用' && duplicateRelation(db, r)) return '该人员与该对象已有启用关系'
      if (!original) db.relations.unshift(r)
      relationChange(db, r, original ? '编辑' : '新增', actor)
    })
  },
  setRelationStatus (id, status) {
    return this.change((db, actor) => {
      const r = db.relations.find(r => r.id === id)
      if (!r || !['启用', '停用'].includes(status) || status === r.status) return '帮扶关系状态已变更'
      if (status === '启用' && duplicateRelation(db, r)) return '该人员与该对象已有启用关系'
      r.status = status
      relationChange(db, r, status, actor)
    })
  },
  saveWork (form, id) {
    return this.change((db, actor) => {
      if (!form.title.trim() || !form.content.trim() || !db.systems.includes(form.system) ||
        !db.departments.some(d => d.id === form.deptId && d.system === form.system) || !['启用', '停用'].includes(form.status)) {
        return '请填写体系、归属部门、重点工作名称、内容和状态'
      }
      const original = id && db.works.find(w => w.id === id)
      if (id && !original) return '未找到重点工作'
      const work = original || { id: nextCode(db.works, 'ZDGZ'), creatorId: actor.id, createdAt: nowStr(), executions: [] }
      changeWorkStatus(db, work, form.status)
      Object.assign(work, { title: form.title.trim(), content: form.content.trim(), system: form.system, deptId: form.deptId })
      if (!original) db.works.unshift(work)
      syncExecutions(db)
    })
  },
  setWorkStatus (id, status) {
    return this.change(db => {
      const work = db.works.find(w => w.id === id)
      if (!work || !['启用', '停用'].includes(status) || work.status === status) return '事项状态已变更'
      changeWorkStatus(db, work, status)
      syncExecutions(db)
    })
  },
  saveExecution (workId, projectId, form, admin = false) {
    return this.change((db, actor) => {
      const work = db.works.find(w => w.id === workId)
      const row = work && work.executions.find(e => e.projectId === projectId)
      if (!row) return '未找到项目执行记录'
      if (admin) {
        if (!row.firstAt) return '管理员仅可编辑已填写的项目记录'
      } else if (work.status !== '启用' || !effectiveRelations(db).some(r => r.type === PROJECT && r.targetId === projectId && r.personId === actor.id)) {
        return '该事项或项目已退出个人填报范围'
      }
      if (!form.content.trim()) return '请填写项目落实情况'
      const time = nowStr()
      if (!row.firstAt) Object.assign(row, { firstAt: time, firstBy: actor.id })
      Object.assign(row, { content: form.content.trim(), issues: (form.issues ?? row.issues ?? '').trim(),
        suggestions: (form.suggestions ?? row.suggestions ?? '').trim(), attachments: form.attachments, lastAt: time, lastBy: actor.id })
    })
  },
  personalWork () { return myWork(this.db, state.actorId) },

  saveReport (row, form, revisionReason) {
    return this.change((db, actor) => {
      const error = validateReport(form)
      if (error) return error
      const existing = db.dailyReports.find(r => r.personId === row.personId && r.date === row.date)
      const revising = revisionReason !== undefined
      if (revising && (!existing || !revisionReason.trim())) return '仅可修订已提交的日报，并须填写修订原因'
      const relations = effectiveRelations(db, row.date)
      if (!revising && (row.date !== todayStr() || !dailyEligible(db, row.date, relations).has(row.personId))) return '该人员当前不在当日填报范围'
      const person = db.people.find(p => p.id === row.personId)
      const record = existing || pendingReport(db, person, row.date, relations)
      if (!existing && row.projects.map(p => p.id).join() !== record.projects.map(p => p.id).join()) return '帮扶项目已调整，请重新打开日报'
      const after = reportBody(form)
      if (after.attend) after.absentReason = ''
      else after.workContent = ''
      const time = nowStr()
      if (revising) record.revisions.push({ time, operator: actor.name, reason: revisionReason.trim(), before: reportBody(record), after })
      Object.assign(record, after, { status: '已提交', submitTime: revising ? record.submitTime : time })
      if (!existing) db.dailyReports.push(record)
    })
  },

  saveAppeal (form, id) { return this.change((db, actor) => submitAppeal(db, form, actor, nowStr(), id)) },
  reviewAppeal (id, stage, approved, handlerId, comment) {
    return this.change((db, actor) => reviewAppeal(db, id, stage, approved, handlerId, comment, actor, nowStr()))
  },
  updateAppealProgress (id, form) { return this.change((db, actor) => updateAppealProgress(db, id, form, actor, nowStr())) },
  requestClosure (id, form) { return this.change((db, actor) => requestClosure(db, id, form, actor, nowStr())) },
  saveSuggestion (form, id) { return this.change((db, actor) => submitSuggestion(db, form, actor, nowStr(), id)) },
  replySuggestion (id, form) { return this.change((db, actor) => replySuggestion(db, id, form, actor, nowStr())) },
  removeRequest (type, id) {
    return this.change(db => {
      const row = db[type].find(r => r.id === id)
      const allowed = type === 'appeals' ? ['待审批', '已退回', '办理中'] : ['待回复']
      if (!row || row.deleted || !allowed.includes(row.status) || row.completion) return '当前状态不允许删除'
      row.deleted = true
    })
  },

  overviewStats () {
    const works = workRows(this.db).filter(w => w.status === '启用')
    const attendance = attendanceRows(this.db, state.day)
    const due = attendance.filter(r => r.eligible).length
    const attended = attendance.filter(r => r.attendance === '已到岗').length
    return { attendance, serviceCount: attendance.length, attended, attendanceRate: due ? Math.round(attended / due * 1000) / 10 : null,
      works: works.length, filled: works.reduce((total, w) => total + w.current.filled, 0),
      executions: works.reduce((total, w) => total + w.current.total, 0), appeals: appealStats(this.db.appeals),
      due, submitted: attendance.filter(r => r.reportStatus === '已提交').length }
  },
  todoGroups () {
    const reports = dailyRows(this.db, state.day).filter(r => r.personId === state.actorId && r.status === '待填写')
    const pendingWork = this.personalWork().tasks.filter(r => r.status === '待填写')
    const appeals = this.db.appeals.filter(a => !a.deleted)
    const item = (path, title, desc) => ({ path, title, desc })
    return [
      { key: 'daily', title: '待填日报', color: 'blue', items: reports.map(r => item('/daily', r.personName + ' · ' + r.date, r.projectName)) },
      { key: 'works', title: '我的重点工作待填', color: 'blue', items: pendingWork.map(r => item('/works/mine?id=' + encodeURIComponent(r.id), r.title, r.projectName)) },
      { key: 'appeals', title: '诉求办理', color: 'orange', items: appeals.filter(a => ['办理中', '已退回'].includes(a.status))
        .map(a => item('/appeals?id=' + a.id, a.title, a.status)) },
      { key: 'approvals', title: '待审批与回复', color: 'red', items: [
        ...appeals.filter(a => ['待审批', '待销项审批'].includes(a.status)).map(a => item('/appeals?id=' + a.id, a.title, a.status)),
        ...this.db.suggestions.filter(s => !s.deleted && s.status === '待回复').map(s => item('/suggestions?id=' + s.id, s.title, s.status))
      ] }
    ]
  }
}

export default store
