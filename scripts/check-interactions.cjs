const assert = require('node:assert/strict')
const { createServer } = require('vite')
const vue = require('@vitejs/plugin-vue2')
const moment = require('moment')

function memoryStorage () {
  const entries = new Map()
  return { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, String(value)) }
}

async function main () {
  const originalNow = moment.now
  const setDay = date => { moment.now = () => Date.parse(date + 'T10:00:00+08:00') }
  const today = '2026-11-24' // 周二，固定时钟使冻结及周末用例可重复。
  setDay(today)
  global.localStorage = memoryStorage()
  global.sessionStorage = memoryStorage()
  const key = 'hq_enablement_db_v5'
  const server = await createServer({ configFile: false, cacheDir: '.tmp/interaction-check-cache', plugins: [vue()],
    server: { middlewareMode: true, hmr: false }, appType: 'custom' })
  try {
    const { default: store } = await server.ssrLoadModule('/src/store/index.js')
    const { todayStr } = await server.ssrLoadModule('/src/utils/date.js')
    const { workRows, myWork } = await server.ssrLoadModule('/src/utils/serviceData.js')
    const { listRows } = await server.ssrLoadModule('/src/utils/businessLists.js')
    const { dailyRows, reportBody, buildDailyReport, buildWeeklyReport } = await server.ssrLoadModule('/src/utils/reportData.js')
    const { default: uploader } = await server.ssrLoadModule('/src/components/FileUploader.vue')
    assert.equal(todayStr(), today)
    let count = 0
    const ok = res => assert.equal(res.ok, true, res.message)
    const denied = res => { assert.equal(res.ok, false); assert.ok(res.message) }
    function scenario (name, fn) {
      setDay(today)
      global.localStorage = memoryStorage()
      store.init()
      store.selectPerson('P01')
      fn()
      count++
      console.log('PASS ' + name)
    }
    function emptyBusinesses () {
      ok(store.change(db => {
        db.relations = []; db.works = []; db.dailyReports = []; db.appeals = []; db.suggestions = []
      }))
    }
    const relation = (personId, targetId, type = '项目级') => {
      const targets = type === '项目级' ? store.db.projects : store.db.branchDepartments
      return { personId, targetId, type, company: targets.find(t => t.id === targetId).company }
    }
    const addRelation = (...args) => {
      ok(store.saveRelation(relation(...args)))
      return store.db.relations[0].id
    }
    const work = (title, deptId) => ({ title, deptId, system: store.getDept(deptId).system, content: title + '的要求', status: '启用' })
    const addWork = (title, deptId) => { ok(store.saveWork(work(title, deptId))); return store.db.works[0].id }
    const execution = content => ({ content, attachments: [{ name: '记录.pdf' }] })
    const submitted = { projectNeeds: '1. 协调运输\n2. 复核方案', attend: true, workContent: '完成检查', newIssues: '无', attachments: [{ name: '现场.jpg' }] }
    const forPerson = (id, date = todayStr()) => dailyRows(store.db, date).find(r => r.personId === id)
    const appealForm = { company: '华东分公司', type: '项目级', unitId: 'J01', deptId: 'D01', title: '跨组织支持',
      desc: '请协助技术复核。', attachments: [] }
    const suggestionForm = { deptId: 'D02', title: '安全检查指标', flow: '安全检查', desc: '合并同一处重复检查。', attachments: [] }

    const backupKey = key + ':backup:v8'
    scenario('空缓存初始化 V1.6 样例，当前版本刷新沿用业务数据', () => {
      assert.equal(store.db.schemaVersion, 9)
      for (const table of ['relations', 'works', 'dailyReports', 'appeals', 'suggestions']) assert.ok(store.db[table].length)
      assert.equal(localStorage.getItem(backupKey), null)
      const id = addWork('首次进入后录入', 'D04')
      const saved = localStorage.getItem(key)
      store.init()
      assert.equal(localStorage.getItem(key), saved)
      assert.ok(store.db.works.some(w => w.id === id))
    })
    scenario('V1.4 原文可恢复、在办诉求按原单续办，刷新保留新版修改与模拟身份', () => {
      const appeal = { id: 'XMSQ20260821', projectId: 'J06', title: '旧版手工录入', desc: '需协调设备',
        creatorId: 'P01', deptId: 'D03', personId: 'P06', status: '办理中', createdAt: '2026-10-01 08:00',
        progress: [{ time: '2026-10-02 10:00', source: '进展', operator: '吴启明', content: '已联系设备部' }],
        attachments: [{ name: '调拨单.pdf' }] }
      const closing = { ...appeal, id: 'XMSQ20260822', status: '销项审批中', closeRequest: { nodes: [{ key: 'pm' }] } }
      const incomplete = { ...appeal, id: 'XMSQ20260823', progress: [null] }
      const legacy = { schemaVersion: 8, appeals: [appeal, closing, incomplete],
        dailyReports: [{ appealId: appeal.id, workContent: '专项记录' }], sheets: [{ remark: '旧梳理单' }] }
      const raw = JSON.stringify(legacy, null, 2)
      localStorage.setItem(key, raw)
      localStorage.setItem('unrelated', 'keep')
      store.init()
      assert.equal(store.db.schemaVersion, 9)
      assert.equal(localStorage.getItem(backupKey), raw)
      assert.deepEqual(JSON.parse(localStorage.getItem(backupKey)), legacy)
      assert.equal(localStorage.getItem('unrelated'), 'keep')
      const rows = listRows('appeals', store)
      assert.equal(rows.length, 1)
      const row = rows[0]
      assert.deepEqual([row.id, row.title, row.creatorId, row.handlerId, row.deptId, row.unitId, row.submittedAt],
        [appeal.id, appeal.title, appeal.creatorId, appeal.personId, appeal.deptId, appeal.projectId, appeal.createdAt])
      assert.equal(row.history[0].note, appeal.progress[0].content)
      assert.deepEqual(row.attachments, appeal.attachments)
      ok(store.requestClosure(row.id, { content: '已完成调拨', date: today, attachments: [] }))
      store.selectPerson('B11')
      const before = localStorage.getItem(key)
      store.init()
      assert.equal(localStorage.getItem(key), before)
      assert.equal(store.currentUser.id, 'B11')
      assert.equal(store.db.appeals[0].status, '待销项审批')
      assert.equal(localStorage.getItem(backupKey), raw)
      assert.equal(localStorage.getItem(backupKey + ':2'), null)
    })
    scenario('升级写入失败保留旧主键，重试复用备份并保护其他快照及高版本', () => {
      const raw = JSON.stringify({ schemaVersion: 8, sheets: [{ id: 'SL01' }] })
      const previousBackup = JSON.stringify({ schemaVersion: 8, sheets: [] })
      localStorage.setItem(key, raw)
      localStorage.setItem(backupKey, previousBackup)
      const write = localStorage.setItem
      let failKey = backupKey + ':2'
      localStorage.setItem = (k, value) => {
        if (k === failKey) throw new Error('存储空间不足')
        write(k, value)
      }
      assert.throws(() => store.init(), /存储空间不足/)
      assert.equal(localStorage.getItem(key), raw)
      assert.equal(localStorage.getItem(backupKey + ':2'), null)
      failKey = key
      assert.throws(() => store.init(), /存储空间不足/)
      assert.equal(localStorage.getItem(key), raw)
      assert.equal(localStorage.getItem(backupKey + ':2'), raw)
      localStorage.setItem = write
      store.init()
      assert.equal(store.db.schemaVersion, 9)
      assert.equal(localStorage.getItem(backupKey), previousBackup)
      assert.equal(localStorage.getItem(backupKey + ':3'), null)
      const future = JSON.stringify({ schemaVersion: 10 })
      localStorage.setItem(key, future)
      assert.throws(() => store.init(), /高于/)
      assert.equal(localStorage.getItem(key), future)
      localStorage.setItem(key, '{"schemaVersion":')
      store.init()
      assert.equal(localStorage.getItem(key + ':backup:unversioned'), '{"schemaVersion":')
      assert.equal(store.db.schemaVersion, 9)
    })
    scenario('升级期间另一个标签页已保存新版记录时，沿用最新数据', () => {
      const id = addWork('另一页刚保存的事项', 'D04')
      const otherTab = localStorage.getItem(key)
      const old = JSON.stringify({ schemaVersion: 8, sheets: [] })
      localStorage.setItem(key, old)
      const write = localStorage.setItem
      localStorage.setItem = (k, value) => {
        write(k, value)
        if (k === backupKey) write(key, otherTab)
      }
      store.init()
      assert.equal(localStorage.getItem(backupKey), old)
      assert.equal(localStorage.getItem(key), otherTab)
      assert.ok(store.db.works.some(work => work.id === id))
    })
    scenario('关系级联、总部人员限制、同对象多人及新增/编辑/停用/启用历史', () => {
      emptyBusinesses()
      const id = addRelation('P01', 'BD1', '部门级')
      addRelation('P06', 'BD1', '部门级')
      denied(store.saveRelation(relation('JP01', 'J01')))
      denied(store.saveRelation({ ...relation('P01', 'J01'), company: '西南分公司' }))
      denied(store.saveRelation(relation('P01', 'BD1', '部门级')))
      assert.equal(forPerson('P01'), undefined)
      ok(store.saveRelation(relation('P01', 'J06'), id))
      ok(store.setRelationStatus(id, '停用'))
      ok(store.setRelationStatus(id, '启用'))
      const row = listRows('relations', store, { type: '项目级', status: '启用', employeeNo: 'HZ0001', company: '西南分公司' })[0]
      assert.equal(row.manager, '叶建平')
      assert.equal(row.managerPhone, store.db.projects.find(p => p.id === 'J06').managerPhone)
      assert.deepEqual(row.history.map(e => e.action), ['新增', '编辑', '停用', '启用'])
      assert.ok(row.history.every(e => e.operator === '林致远' && e.time))
    })
    scenario('共享记录、三种进度和最后一条关系停用/恢复', () => {
      emptyBusinesses()
      const ax = addRelation('P01', 'J01')
      addRelation('P01', 'J06')
      const bx = addRelation('P06', 'J01')
      addRelation('P16', 'BD1', '部门级')
      const counts = () => { const { due, filled, pending } = store.personalWork(); return [due, filled, pending] }
      const a = addWork('A', 'D07')
      ok(store.saveExecution(a, 'J01', execution('A-X')))
      assert.deepEqual(counts(), [2, 1, 1])
      const b = addWork('B', 'D06')
      ok(store.saveExecution(b, 'J06', execution('B-Y')))
      const read = () => workRows(store.db).find(w => w.id === a).executions.find(e => e.projectId === 'J01')
      const first = read().firstAt
      assert.deepEqual(workRows(store.db).map(w => w.progressText), ['1/2', '1/2'])
      assert.equal(store.personalWork().tasks.length, 4)
      assert.deepEqual(counts(), [4, 2, 2])
      assert.deepEqual(listRows('mine', store).filter(r => r.workId === a).map(r => [r.projectId, r.content]),
        [['J01', 'A-X'], ['J06', '']])
      assert.equal(myWork(store.db, 'P16').due, 0)
      store.selectPerson('P06')
      assert.deepEqual(counts(), [2, 1, 1])
      ok(store.saveExecution(a, 'J01', execution('乙编辑 A-X')))
      assert.equal(read().firstBy, 'P01'); assert.equal(read().firstAt, first); assert.equal(read().lastBy, 'P06')
      const totals = () => { const s = store.overviewStats(); return [s.filled, s.executions] }
      assert.deepEqual(totals(), [2, 4])
      ok(store.setRelationStatus(ax, '停用')); assert.deepEqual(totals(), [2, 4])
      ok(store.setRelationStatus(bx, '停用')); assert.deepEqual(totals(), [1, 2])
      assert.equal(read().scope, '历史'); assert.equal(read().content, '乙编辑 A-X')
      denied(store.saveExecution(a, 'J01', execution('越过范围')))
      ok(store.setRelationStatus(ax, '启用')); assert.deepEqual(totals(), [2, 4])
      assert.equal(read().firstAt, first); assert.equal(read().status, '已填写')
      ok(store.setWorkStatus(a, '停用')); assert.deepEqual(totals(), [1, 2])
      assert.ok(myWork(store.db, 'P01').tasks.every(e => e.workId !== a))
      ok(store.setWorkStatus(a, '启用')); assert.deepEqual(totals(), [2, 4])
      ok(store.saveWork({ ...work('A 已编辑', 'D04'), content: '新要求' }, a))
      assert.equal(read().content, '乙编辑 A-X')
      addWork('C', 'D14')
      assert.equal(myWork(store.db, 'P01').due, 6)
      addRelation('P02', 'J03')
      assert.equal(myWork(store.db, 'P02').tasks.length, 3)
      assert.equal(listRows('executions', store, { status: '已填写' }).length, 2)
    })
    scenario('列表与编辑表单停用均留存范围，管理员仅逐项目修订已填记录', () => {
      emptyBusinesses()
      addRelation('P01', 'J01')
      const second = addRelation('P01', 'J06')
      addRelation('P01', 'J03')
      const historical = addRelation('P01', 'J04')
      addRelation('P06', 'J01')
      const id = addWork('保留项目范围', 'D04')
      const saved = { ...execution('第一项成果'), issues: '设备不足', suggestions: '调拨设备' }
      ok(store.saveExecution(id, 'J01', saved))
      ok(store.saveExecution(id, 'J06', execution('第二项成果')))
      ok(store.setRelationStatus(historical, '停用'))
      const read = () => listRows('works', store).find(w => w.id === id)
      const project = projectId => read().executions.find(e => e.projectId === projectId)
      const firstAt = project('J01').firstAt
      const untouched = JSON.stringify(store.db.works[0].executions.filter(e => e.projectId !== 'J01'))
      assert.equal(read().progressText, '2/3')
      ok(store.setWorkStatus(id, '停用'))
      ok(store.setRelationStatus(second, '停用'))
      addRelation('P01', 'J05')
      store.selectPerson('P17')
      const later = moment.now() + 60000
      moment.now = () => later
      denied(store.saveExecution(id, 'J01', saved))
      denied(store.saveExecution(id, 'J03', saved, true))
      denied(store.saveExecution(id, 'J01', { ...saved, content: '  ' }, true))
      ok(store.saveExecution(id, 'J01', { ...saved, content: '管理员修正', issues: '', suggestions: '轮换检查', attachments: [] }, true))
      assert.equal(JSON.stringify(store.db.works[0].executions.filter(e => e.projectId !== 'J01')), untouched)
      assert.deepEqual([read().id, read().status, read().progressText], [id, '停用', '2/3'])
      assert.deepEqual(read().executions.filter(e => e.scope === '停用留存').map(e => e.projectId).sort(), ['J01', 'J03', 'J06'])
      assert.equal(project('J04').scope, '历史')
      assert.deepEqual([project('J01').firstAt, project('J01').firstBy, project('J01').lastBy], [firstAt, 'P01', 'P17'])
      assert.notEqual(project('J01').lastAt, firstAt)
      assert.equal(myWork(store.db, 'P01').due, 0)
      assert.equal(store.overviewStats().executions, 0)
      store.init()
      assert.equal(read().progressText, '2/3')
      ok(store.saveWork(work('重新启用', 'D04'), id))
      assert.equal(read().progressText, '1/3')
      const shared = myWork(store.db, 'P06').tasks[0]
      assert.deepEqual([shared.workId, shared.content, shared.issues, shared.suggestions, shared.attachments],
        [id, '管理员修正', '', '轮换检查', []])
      ok(store.saveWork({ ...work('表单停用', 'D04'), status: '停用' }, id))
      ok(store.setRelationStatus(second, '启用'))
      assert.equal(read().progressText, '1/3')
      assert.equal(project('J06').scope, '历史')
      ok(store.setWorkStatus(id, '启用'))
      assert.equal(read().progressText, '2/4')
    })
    scenario('已有 V1.6 停用事项按原执行行一次回填，保留正文和附件', () => {
      const old = JSON.parse(localStorage.getItem(key))
      const stopped = old.works.find(w => w.status === '停用')
      delete stopped.stoppedProgress
      for (const row of stopped.executions) { delete row.issues; delete row.suggestions }
      const original = JSON.stringify(old)
      localStorage.setItem(key, original)
      store.init()
      const upgraded = localStorage.getItem(key)
      const comparison = JSON.parse(upgraded)
      const snapshot = comparison.works.find(w => w.id === stopped.id).stoppedProgress
      assert.deepEqual(snapshot.projectIds, stopped.executions.map(e => e.projectId))
      assert.equal(snapshot.filled, stopped.executions.filter(e => e.firstAt).length)
      delete comparison.works.find(w => w.id === stopped.id).stoppedProgress
      assert.deepEqual(comparison, JSON.parse(original))
      assert.ok(workRows(store.db).find(w => w.id === stopped.id).executions.every(e => e.issues === '' && e.suggestions === ''))
      store.init()
      assert.equal(localStorage.getItem(key), upgraded)
    })
    scenario('待填按人日投影，取消及查询不落库；多项目一份，两端分公司均可筛选', () => {
      emptyBusinesses()
      addRelation('P01', 'J01'); addRelation('P01', 'J06'); addRelation('P16', 'BD1', '部门级')
      const raw = localStorage.getItem(key)
      const pending = forPerson('P01')
      assert.equal(dailyRows(store.db, today).length, 1)
      assert.equal(forPerson('JP01'), undefined)
      assert.deepEqual(pending.companies, ['华东分公司', '西南分公司'])
      assert.equal(localStorage.getItem(key), raw)
      denied(store.saveReport(pending, { ...submitted, attend: false, absentReason: '' }))
      ok(store.saveReport(pending, submitted))
      ok(store.saveReport(pending, { ...submitted, workContent: '第二次保存' }))
      assert.equal(store.db.dailyReports.length, 1)
      for (const projectId of ['J01', 'J06']) assert.equal(listRows('reports', store, { date: today, projectId })[0].id, pending.id)
      assert.equal(listRows('reports', store, { date: today, company: '西南分公司' }).length, 1)
      assert.deepEqual([store.overviewStats().due, store.overviewStats().submitted], [1, 1])
      assert.equal(forPerson('P01').projectNeeds, submitted.projectNeeds)
      assert.deepEqual(forPerson('P01').attachments, submitted.attachments)
      assert.ok(!('appealId' in store.db.dailyReports[0]))
    })
    scenario('历史日报保留项目快照；失去资格人员不计入当日卡片；冻结、管理员修订留痕', () => {
      emptyBusinesses()
      const first = addRelation('P01', 'J01'), second = addRelation('P01', 'J06')
      ok(store.saveReport(forPerson('P01'), submitted))
      ok(store.setRelationStatus(first, '停用')); ok(store.setRelationStatus(second, '停用'))
      assert.deepEqual([store.overviewStats().due, store.overviewStats().submitted], [0, 0])
      assert.equal(listRows('reports', store, { date: today, eligible: true }).length, 0)
      assert.equal(forPerson('P01').projects.length, 2)
      setDay('2026-11-25'); store.init()
      const history = forPerson('P01', today)
      assert.equal(history.frozen, true)
      denied(store.saveReport(history, submitted))
      denied(store.saveReport(history, submitted, ''))
      store.selectPerson('P17')
      ok(store.saveReport(history, { ...submitted, projectNeeds: '修订需求' }, '项目补充资料'))
      const revision = store.db.dailyReports[0].revisions[0]
      assert.equal(revision.before.projectNeeds, submitted.projectNeeds); assert.equal(revision.after.projectNeeds, '修订需求')
      assert.equal(revision.operator, '叶清和'); assert.equal(forPerson('P01'), undefined)
      denied(store.saveReport({ ...history, date: '2026-11-26' }, submitted, '无历史数据'))
    })
    scenario('周一至周五资格按历史关系还原，周报人日去重、办结取批准日期', () => {
      emptyBusinesses()
      setDay('2026-11-23'); store.init()
      const first = addRelation('P01', 'J01')
      addRelation('P01', 'J06')
      ok(store.saveReport(forPerson('P01', '2026-11-23'), submitted))
      setDay(today); store.init()
      ok(store.setRelationStatus(first, '停用'))
      addRelation('P06', 'J01')
      ok(store.saveReport(forPerson('P01'), { ...submitted, projectNeeds: '第二天服务需求' }))
      const week = buildWeeklyReport(store.db, '2026-11-23', '2026-11-29')
      assert.deepEqual([week.expected, week.attended], [3, 2])
      assert.equal(week.serviceRows.length, 2)
      assert.equal(buildDailyReport(store.db, '2026-11-23').serviceRows[0].projectIds.length, 2)
      setDay('2026-11-28'); store.init()
      assert.equal(dailyRows(store.db, todayStr()).length, 0)
      assert.equal(store.overviewStats().due, 0)
    })
    scenario('项目和分公司员工发起自动带出；总部须选真实分公司对象', () => {
      emptyBusinesses()
      denied(store.saveAppeal({ ...appealForm, company: '西南分公司' }))
      denied(store.saveAppeal({ ...appealForm, deptId: '' }))
      for (const [actor, company, unit] of [['P01', '华东分公司', '无锡深南电路'], ['JP01', '华东分公司', '无锡深南电路'], ['B11', '华东分公司', '综合管理部']]) {
        store.selectPerson(actor); ok(store.saveAppeal(appealForm))
        const row = store.db.appeals[0]
        assert.deepEqual([row.creatorId, row.company, row.unitName, row.status, row.handlerId], [actor, company, unit, '待审批', ''])
      }
      assert.ok(/^XMSQ2026\d{4}$/.test(store.db.appeals[0].id))
    })
    scenario('受理退回重提、跨组织指派、销项退回再批准、流程留痕及全量演示权限', () => {
      emptyBusinesses()
      const relationId = addRelation('P01', 'J01')
      ok(store.saveAppeal(appealForm))
      const id = store.db.appeals[0].id
      const review = (stage, approved, handler) => store.reviewAppeal(id, stage, approved, handler, '办理意见')
      denied(review('待审批', true, ''))
      ok(review('待审批', false))
      ok(store.saveAppeal({ ...appealForm, desc: '补充工程情况' }, id))
      ok(review('待审批', true, 'JP01'))
      assert.equal(store.db.appeals[0].deptId, 'D01')
      assert.equal(store.db.appeals[0].handlerId, 'JP01')
      ok(store.setRelationStatus(relationId, '停用'))
      const close = { content: '已办结', date: '2026-11-10', attachments: [{ name: '佐证.pdf' }] }
      denied(store.requestClosure(id, { ...close, content: ' ' }))
      ok(store.requestClosure(id, close)); ok(review('待销项审批', false))
      assert.equal(store.db.appeals[0].status, '办理中')
      ok(store.requestClosure(id, { ...close, content: '已补齐佐证' })); ok(review('待销项审批', true))
      assert.equal(store.db.appeals[0].status, '已销项')
      assert.equal(store.db.appeals[0].closedAt.slice(0, 10), today)
      assert.equal(store.db.appeals[0].completion.date, '2026-11-10')
      assert.equal(store.overviewStats().appeals['已销项'], 1)
      assert.ok(buildWeeklyReport(store.db, '2026-11-23','2026-11-29').summary.includes('本周共销项1项'))
      assert.equal(store.db.appeals[0].history.at(-1).responsible, '杜正华')
      assert.equal(store.db.appeals[0].history.at(-1).operator, '林致远')
      assert.equal(store.db.dailyReports.length, 0)
      denied(review('待销项审批', true)); denied(store.requestClosure(id, close))
    })
    scenario('全员可提建议、自由文本制度、改可无日期、不改清除日期、回复后办结', () => {
      emptyBusinesses()
      for (const decision of ['改', '不改']) {
        store.selectPerson(decision === '改' ? 'B11' : 'JP01')
        denied(store.saveSuggestion({ ...suggestionForm, flow: '' }))
        ok(store.saveSuggestion(suggestionForm))
        const s = store.db.suggestions[0]
        assert.equal(s.status, '待回复'); assert.ok(s.unitName); assert.equal(s.company, '华东分公司')
        store.selectPerson('P01') // 演示者可直接办理其他部门的节点。
        const form = { decision, comment: '回复说明', deadline: decision === '不改' ? '2027-01-01' : '' }
        ok(store.replySuggestion(s.id, form))
        const reply = store.db.suggestions[0].reply
        assert.equal(reply.deadline, ''); assert.equal(reply.by, 'M02'); assert.ok(reply.time)
        assert.equal(listRows('suggestions', store, { decision })[0].status, '已回复')
        denied(store.replySuggestion(s.id, form)); denied(store.removeRequest('suggestions', s.id))
      }
      assert.equal(store.todoGroups().find(g => g.key === 'approvals').items.length, 0)
    })
    scenario('服务人数和到岗明细按业务日去重，区分未到岗、未填报及无应填', () => {
      emptyBusinesses()
      addRelation('P01', 'J01'); addRelation('P01', 'J06'); addRelation('P01', 'BD2', '部门级')
      addRelation('P03', 'J03'); addRelation('P06', 'J01'); addRelation('P16', 'BD1', '部门级')
      ok(store.saveReport(forPerson('P01'), submitted))
      ok(store.saveReport(forPerson('P03'), { ...submitted, attend: false, absentReason: '总部开会' }))
      let s = store.overviewStats()
      assert.deepEqual([s.serviceCount, s.due, s.submitted, s.attended, s.attendanceRate], [4, 3, 2, 1, 33.3])
      assert.deepEqual(s.attendance.map(r => [r.id, r.attendance]), [['P01', '已到岗'], ['P03', '未到岗'], ['P06', '未填报'], ['P16', '无应填']])
      assert.equal(s.attendance[0].projectName, '无锡深南电路、綦江江苏省人民医院')
      setDay('2026-11-25'); store.init()
      ok(store.saveReport(forPerson('P03', today), submitted, '核实到岗'))
      addRelation('P10', 'J08')
      store.state.day = today
      s = store.overviewStats()
      assert.deepEqual([s.serviceCount, s.due, s.attended, s.attendanceRate], [4, 3, 2, 66.7])
      setDay('2026-11-28'); store.init()
      s = store.overviewStats()
      assert.deepEqual([s.serviceCount, s.due, s.attended, s.attendanceRate], [5, 0, 0, null])
    })
    scenario('列表查询与总览卡片数据一致，分页及查询不改变存储', () => {
      const raw = localStorage.getItem(key), s = store.overviewStats()
      assert.equal(new Set(listRows('relations', store, { status: '启用' }).map(r => r.personId)).size, s.serviceCount)
      assert.equal(listRows('executions', store).length, s.executions)
      assert.equal(listRows('executions', store, { status: '已填写' }).length, s.filled)
      assert.equal(listRows('works', store, { status: '启用' }).length, s.works)
      assert.equal(listRows('reports', store, { date: today, eligible: true, status: '已提交' }).length, s.submitted)
      for (const [status, count] of Object.entries(s.appeals)) assert.equal(listRows('appeals', store, { status }).length, count)
      const match = listRows('works', store, { title: '风险', deptId: 'D02' })
      assert.equal(match.length, 1)
      assert.equal(localStorage.getItem(key), raw)
    })
    scenario('附件同批多选保留已有附件；未到岗按实际记录展示', () => {
      const component = (uploader.options || uploader)
      const first = { name: 'A.pdf', size: 10 }, second = { name: 'B.pdf', size: 15 }
      let calls = 0, files
      const vm = { value: [{ name: '已有.pdf' }], $emit: (event, value) => { if (event === 'input') { calls++; files = value } } }
      component.methods.beforeUpload.call(vm, first, [first, second])
      component.methods.beforeUpload.call(vm, second, [first, second])
      assert.equal(calls, 1); assert.deepEqual(files.map(f => f.name), ['已有.pdf','A.pdf','B.pdf'])
      assert.equal(reportBody().attend, null)
      assert.ok(buildDailyReport(store.db, today).absentRows.every(row => row.attend === '否' && row.reason))
    })
    console.log(count + ' scenario groups passed.')
  } finally { moment.now = originalNow; await server.close(); delete global.localStorage; delete global.sessionStorage }
}
main().catch(e => { console.error(e); process.exitCode = 1 })
