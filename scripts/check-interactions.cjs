const assert = require('node:assert/strict')
const { createServer } = require('vite')
const vue = require('@vitejs/plugin-vue2')
const moment = require('moment')

async function main () {
  // 只在当前 Node 进程使用隔离数据，不访问浏览器的 localStorage。
  const storage = new Map()
  global.localStorage = { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) }
  const server = await createServer({ configFile: false, cacheDir: '.tmp/interaction-check-cache', plugins: [vue()], server: { middlewareMode: true, hmr: false }, appType: 'custom' })
  let count = 0
  try {
    const { default: store } = await server.ssrLoadModule('/src/store/index.js')
    const { buildSeed } = await server.ssrLoadModule('/src/data/seed.js')
    const { migrateDb } = await server.ssrLoadModule('/src/store/migrate.js')
    const { todayStr } = await server.ssrLoadModule('/src/utils/date.js')
    const { buildDailyReport, buildWeeklyReport } = await server.ssrLoadModule('/src/utils/reportData.js')
    const { listRows, listColumns, listFilterFields, emptyListFilters } = await server.ssrLoadModule('/src/utils/businessLists.js')
    const { sheetProcessStatus, closeApprovalStatus, suggestionApprovalStatus, workDisplayCode } = await server.ssrLoadModule('/src/utils/workflow.js')
    const views = {}
    for (const name of ['Relations', 'Works', 'Appeals', 'Daily', 'Suggestions', 'Overview']) {
      views[name] = (await server.ssrLoadModule(`/src/views/${name}.vue`)).default
    }
    const reset = () => { store.state.db = migrateDb(buildSeed()) }
    const vm = name => {
      const options = views[name].options || views[name]
      const instance = { ...options.data.call({ $store: store }), $store: store, $route: { query: {} }, $message: { warning () {}, error () {}, success () {} }, $nextTick: fn => fn() }
      for (const [key, value] of Object.entries(options.methods || {})) instance[key] = value.bind(instance)
      for (const [key, value] of Object.entries(options.computed || {})) Object.defineProperty(instance, key, { get: value.bind(instance) })
      return instance
    }
    const check = (title, action) => {
      reset()
      action()
      count++
      console.log(`PASS ${title}`)
    }
    const suggestionPayload = () => ({ deptId: 'D01', title: '回归建议', flow: '回归制度', desc: '原始问题', confirmerIds: [store.getDept('D01').managerId], attachments: [] })

    check('模拟数据采用统一业务编号，事项展示编号及种子日报引用一致', () => {
      const seed = buildSeed()
      for (const [key, pattern, first] of [
        ['relations', /^BF\d{8}$/, 'BF20260001'], ['sheets', /^ZDGZ\d{8}$/, 'ZDGZ20260001'],
        ['appeals', /^XMSQ\d{8}$/, 'XMSQ20260001'], ['suggestions', /^ZHJY\d{8}$/, 'ZHJY20260001']
      ]) {
        assert.equal(seed[key][0].id, first)
        assert.ok(seed[key].every(row => pattern.test(row.id)))
      }
      assert.equal(workDisplayCode(seed.works[1]), 'ZDGZ20260001-02')
      assert.ok(seed.works.every(work => seed.sheets.some(sheet => sheet.id === work.sheetId)))
      assert.ok(seed.dailyReports.every(report => report.feedbacks.every(f => seed.appeals.some(a => a.id === f.appealId))))
    })
    check('新增四类业务使用当前年份、四位连续流水号', () => {
      const year = todayStr().slice(0, 4)
      const relation = store.createRelations({ personIds: ['P20'], projectIds: ['J02'], role: '协同', startDate: todayStr(), remark: '编号回归' }).created[0]
      const sheet = store.saveSheet({ deptId: 'D01', system: '生产', items: [{ title: '编号回归工作', leadId: 'P01', dueDate: todayStr() }] }, true)
      const appeal = store.createAppeal({ ...store.db.appeals[0], title: '编号回归诉求' })
      const suggestion = store.createSuggestion(suggestionPayload())
      for (const [row, prefix] of [[relation, 'BF'], [sheet, 'ZDGZ'], [appeal, 'XMSQ'], [suggestion, 'ZHJY']]) {
        assert.match(row.id, new RegExp(`^${prefix}${year}\\d{4}$`))
      }
      assert.equal(workDisplayCode(store.db.works.find(w => w.sheetId === sheet.id)), `${sheet.id}-01`)
      assert.ok(store.db.dailyReports.some(r => r.appealId === appeal.id))
      const next = store.createSuggestion(suggestionPayload())
      assert.equal(Number(next.id.slice(-4)), Number(suggestion.id.slice(-4)) + 1)
      store.db.suggestions = [{ id: `ZHJY${Number(year) - 1}9999` }]
      assert.equal(store.createSuggestion(suggestionPayload()).id, `ZHJY${year}0001`)
    })
    check('已有 V1.4 缓存仅换业务编号，关联、历史日报及内部 ID 无损且可重复迁移', () => {
      const db = JSON.parse(JSON.stringify(store.db))
      const year = todayStr().slice(0, 4)
      db.dailyReports[0].id = 'RB-保留内部编号-SQ20260001'
      db.dailyReports.push({ ...db.dailyReports[0], id: 'RB-已删除诉求历史', appealId: `XMSQ${year}0090`, appealDeleted: true })
      const expected = JSON.parse(JSON.stringify(db))
      db.sheets[0].id = 'SL2026001'
      db.works.filter(w => w.sheetId === 'ZDGZ20260001').forEach(w => { w.sheetId = 'SL2026001' })
      db.appeals[0].id = 'SQ20260001'
      db.dailyReports.filter(r => r.appealId === 'XMSQ20260001').forEach(r => { r.appealId = 'SQ20260001' })
      db.dailyReports.at(-1).appealId = `SQ${year}0090`
      db.suggestions[0].id = 'JY2026001'
      const restored = migrateDb(db)
      assert.deepEqual(restored, expected)
      assert.deepEqual(migrateDb(restored), expected)
      store.state.db = restored
      const created = store.createAppeal({ ...store.db.appeals[0], title: '保留历史编号后的新增诉求' })
      assert.equal(created.id, `XMSQ${year}0091`)
      assert.equal(store.db.dailyReports.find(r => r.id === 'RB-已删除诉求历史').appealId, `XMSQ${year}0090`)
    })
    check('V1.4 存储往返保留已有内容且不重复迁移', () => {
      store.db.suggestions[0].desc += ' 自定义保留标记'
      const before = JSON.stringify(store.db)
      const restored = migrateDb(JSON.parse(before))
      assert.equal(JSON.stringify(restored), before)
      store.persist()
      assert.equal(storage.get('hq_enablement_db_v5'), before)
    })
    check('建议编辑更新原记录；确认后禁止编辑删除', () => {
      const s = store.createSuggestion(suggestionPayload())
      const total = store.db.suggestions.length
      assert.equal(store.updateSuggestion(s.id, { ...suggestionPayload(), desc: '已修改问题' }).ok, true)
      assert.equal(store.db.suggestions.length, total)
      assert.equal(s.desc, '已修改问题')
      assert.equal(store.approveSuggestionNode(s.id, 'pass', { adopt: '不改', reason: '现行制度已覆盖' }).ok, true)
      assert.equal(store.updateSuggestion(s.id, suggestionPayload()).ok, false)
      assert.equal(store.deleteSuggestion(s.id).ok, false)
      assert.equal(store.approveSuggestionNode(s.id, 'pass', { archiveOpinion: '归档' }).archived, true)
      assert.equal(store.canEditSuggestion(s), false)
    })
    check('建议退回后原编号重提，保留上轮意见并重新确认归档', () => {
      const payload = suggestionPayload()
      payload.confirmerIds.push(store.db.people.find(p => p.deptId === 'D01').id)
      const s = store.createSuggestion(payload)
      store.approveSuggestionNode(s.id, 'pass', { adopt: '不改', reason: '第一人意见' })
      store.approveSuggestionNode(s.id, 'reject', { reason: '补充问题描述' })
      assert.equal(store.canEditSuggestion(s), true)
      const total = store.db.suggestions.length
      assert.equal(store.updateSuggestion(s.id, { ...payload, desc: '补充描述' }).ok, true)
      assert.equal(store.db.suggestions.length, total)
      assert.equal(s.status, '待确认')
      assert.equal(s.history[0].before.confirmers[0].reply.reason, '第一人意见')
      assert.equal(s.history[0].before.nodes[1].comment, '补充问题描述')
      assert.ok(s.nodes.every(n => n.result === '待处理'))
      for (let i = 0; i < 2; i++) assert.equal(store.approveSuggestionNode(s.id, 'pass', { adopt: '改', plan: '补齐制度', deadline: todayStr() }).ok, true)
      assert.equal(store.approveSuggestionNode(s.id, 'pass', { archiveOpinion: '归档' }).archived, true)
    })
    check('仅未发生确认的建议可删除，退回及重提保留确认历史', () => {
      const s = store.createSuggestion(suggestionPayload())
      assert.equal(store.deleteSuggestion(s.id).ok, true)
      assert.ok(!store.db.suggestions.some(x => x.id === s.id))
      const returned = store.createSuggestion(suggestionPayload())
      store.approveSuggestionNode(returned.id, 'reject', { reason: '退回' })
      assert.equal(store.deleteSuggestion(returned.id).ok, false)
      store.updateSuggestion(returned.id, suggestionPayload())
      assert.equal(store.deleteSuggestion(returned.id).ok, false)
    })
    check('梳理单退回编辑同步事项；删除只移除本单未生效事项', () => {
      const payload = { deptId: 'D01', system: store.getDept('D01').system, remark: '回归说明', items: [1, 2].map(n => ({ title: `工作${n}`, leadId: 'P01', dueDate: todayStr() })) }
      const sheet = store.saveSheet(payload, true)
      const protectedIds = store.db.works.filter(w => w.sheetId !== sheet.id).map(w => w.id)
      assert.equal(store.deleteSheet(sheet.id).ok, false)
      store.approveSheet(sheet.id, 'reject', '补充')
      store.saveSheet({ ...payload, id: sheet.id, items: [{ ...payload.items[0], title: '修改工作' }] }, false)
      assert.equal(store.db.works.filter(w => w.sheetId === sheet.id).length, 1)
      assert.equal(store.db.works.find(w => w.sheetId === sheet.id).title, '修改工作')
      assert.equal(store.deleteSheet(sheet.id).ok, true)
      assert.ok(!store.db.works.some(w => w.sheetId === sheet.id))
      assert.deepEqual(store.db.works.map(w => w.id), protectedIds)
      const effective = store.db.sheets.find(s => s.status === '已生效')
      assert.equal(store.deleteSheet(effective.id).ok, false)
    })
    check('删除诉求后已提交历史日报可查，未填写任务移除', () => {
      const appeal = store.db.appeals.find(a => a.status === '办理中' && a.creatorId === store.currentUser.id && store.reportsForAppeal(a.id).length)
      const submittedIds = store.reportsForAppeal(appeal.id).map(r => r.id)
      assert.equal(store.deleteAppeal(appeal.id).ok, true)
      assert.ok(!store.db.appeals.some(a => a.id === appeal.id))
      const daily = vm('Daily')
      daily.appliedAll.date = ''
      assert.ok(submittedIds.every(id => daily.allReports.some(r => r.id === id)))
      assert.ok(!store.db.dailyReports.some(r => r.appealId === appeal.id && r.status !== '已提交'))
    })
    check('修改诉求同步未提交日报，保留已提交日报原文', () => {
      const appeal = store.db.appeals.find(a => a.status === '办理中' && store.db.dailyReports.some(r => r.appealId === a.id && r.status !== '已提交') && store.reportsForAppeal(a.id).length)
      const submitted = store.reportsForAppeal(appeal.id).map(r => JSON.stringify(r))
      const payload = { ...appeal, title: '更新标题', desc: '更新描述' }
      assert.equal(store.updateAppeal(appeal.id, payload).ok, true)
      const pending = store.db.dailyReports.filter(r => r.appealId === appeal.id && r.status !== '已提交')
      assert.ok(pending.every(r => r.appealTitle === '更新标题' && r.projectNeeds.includes('更新描述')))
      assert.deepEqual(store.reportsForAppeal(appeal.id).map(r => JSON.stringify(r)), submitted)
    })
    check('管理员不能将未填写日报修订为已提交；有效修订保留版本', () => {
      const empty = store.db.dailyReports.find(r => !r.legacy && r.status === '未填写')
      const payload = { attend: true, workContent: '实际开展工作', newIssues: '' }
      assert.equal(store.reviseReport(empty.id, payload, '修订原因').ok, false)
      assert.equal(empty.status, '未填写')
      const submitted = store.db.dailyReports.find(r => !r.legacy && r.status === '已提交')
      const before = submitted.workContent
      assert.equal(store.reviseReport(submitted.id, { attend: true, workContent: '' }, '原因').ok, false)
      assert.equal(store.reviseReport(submitted.id, payload, '修订原因').ok, true)
      assert.equal(submitted.revisions.at(-1).before.workContent, before)
      assert.equal(submitted.revisions.at(-1).after.workContent, payload.workContent)
    })
    check('历史日报修订不覆盖较新日报的诉求进展', () => {
      const appeal = store.db.appeals.find(a => store.reportsForAppeal(a.id).length > 1)
      const reports = store.reportsForAppeal(appeal.id)
      appeal.latestReportDate = reports[0].date
      appeal.latestProgress = '较新进展'
      const old = reports.find(r => r.date < reports[0].date)
      assert.ok(old)
      store.reviseReport(old.id, { attend: true, workContent: '历史修订' }, '原因')
      assert.equal(appeal.latestProgress, '较新进展')
    })
    check('全部列表查询、重置和翻页状态同步', () => {
      for (const [name, pagination, query, resetFilter, change] of [
        ['Relations', 'pagination', 'query', 'reset', 'onTableChange'],
        ['Appeals', 'pagination', 'query', 'reset', 'onTableChange'],
        ['Suggestions', 'pagination', 'query', 'reset', 'onTableChange'],
        ['Works', 'sheetPagination', 'applySheetFilter', 'resetSheetFilter', 'onSheetTableChange'],
        ['Works', 'workPagination', 'applyWorkFilter', 'resetWorkFilter', 'onWorkTableChange'],
        ['Daily', 'allPagination', 'applyAllFilter', 'resetAllFilter', 'onAllTableChange']
      ]) {
        const page = vm(name)
        page[change]({ current: 3, pageSize: 20 })
        assert.equal(page[pagination].current, 3)
        page[query]()
        assert.equal(page[pagination].current, 1)
        page[change]({ current: 2, pageSize: 20 })
        page[resetFilter]()
        assert.equal(page[pagination].current, 1)
        assert.equal(page[pagination].pageSize, 20)
      }
    })
    check('梳理单查看事项精确定位，重点工作文本与进展筛选', () => {
      const page = vm('Works')
      const sheet = store.db.sheets.find(s => s.status === '已生效')
      page.viewSheetWorks(sheet)
      assert.ok(page.filteredWorks.length)
      assert.ok(page.filteredWorks.every(w => w.sheetId === sheet.id))
      assert.equal(page.workFilters.deptId, undefined)
      page.resetWorkFilter()
      const work = store.db.works[0]
      work.problem = '独特问题回归'
      page.workFilters.problem = '独特问题回归'
      page.applyWorkFilter()
      assert.deepEqual(page.filteredWorks.map(w => w.id), [work.id])
    })
    check('梳理单详情按关联事项显示销项等实际状态', () => {
      const page = vm('Works')
      const closed = store.db.works.find(w => w.status === '已销项')
      page.sheetCurrent = store.db.sheets.find(s => s.id === closed.sheetId)
      const item = page.sheetCurrent.items.find(i => i.seq === closed.seq)
      assert.equal(page.sheetItemStatus(item), '已销项')
    })
    check('关系、诉求、建议结构化与重要文本筛选有效', () => {
      const relation = vm('Relations')
      relation.filters.employeeNo = store.getPerson(store.db.relations[0].personId).employeeNo
      relation.query()
      assert.ok(relation.filteredRelations.length)
      assert.ok(relation.filteredRelations.every(r => r.personId === store.db.relations[0].personId))
      const appeal = vm('Appeals')
      const record = store.db.appeals.find(a => a.status === '办理中')
      record.plan = '推进计划唯一关键词'
      record.coDepts = ['D02']
      appeal.filters.plan = '推进计划唯一关键词'
      appeal.filters.coDeptId = 'D02'
      appeal.query()
      assert.deepEqual(appeal.filteredAppeals.map(a => a.id), [record.id])
      appeal.filters.coDeptId = 'D03'; appeal.query()
      assert.equal(appeal.filteredAppeals.length, 0)
      const suggestion = store.createSuggestion(suggestionPayload())
      suggestion.desc = '问题描述唯一关键词'
      const page = vm('Suggestions')
      page.filters.desc = '问题描述唯一关键词'; page.query()
      assert.deepEqual(page.filteredSuggestions.map(s => s.id), [suggestion.id])
    })
    check('总览统计联动台账，日期、条件与分页同步；历史日期不影响今日统计', () => {
      const page = vm('Overview')
      const before = JSON.stringify(page.stats)
      page.selectMetric('reports', '')
      const pending = store.db.dailyReports.find(r => !r.legacy && r.date === todayStr() && r.status !== '已提交')
      pending.attend = true
      assert.equal(page.ledgerRows.find(r => r.id === pending.id).attendText, '未填报')
      const historical = store.db.dailyReports.find(r => !r.legacy && r.date < todayStr())
      page.ledgerFilters.date = moment(historical.date)
      page.queryLedger()
      assert.ok(page.ledgerRows.length)
      assert.ok(page.ledgerRows.every(r => r.date === historical.date))
      assert.equal(JSON.stringify(page.stats), before)
      page.openLedgerDetail(historical)
      assert.equal(page.detailVisible, true)
      assert.equal(page.ledgerDetail.type, 'reports')
      assert.equal(page.ledgerDetail.row.id, historical.id)
      for (const type of ['works', 'appeals', 'reports']) {
        page.ledgerFilters.personName = '不匹配人员'
        page.ledgerPagination.current = 3
        page.selectMetric(type, '')
        assert.equal(page.ledgerPagination.current, 1)
        assert.equal(page.ledgerRows.length, page.stats[{ works: 'workTotal', appeals: 'appealTotal', reports: 'dueCount' }[type]])
      }
      for (const [type, status, count] of [['works', '落实中', 'workProcessing'], ['works', '销项审批中', 'workClosing'], ['works', '已销项', 'workClosed'], ['appeals', '办理中', 'processingCount'], ['appeals', '销项审批中', 'closingCount'], ['appeals', '已销项', 'closedCount'], ['reports', '已提交', 'submittedCount'], ['reports', '未填写', 'unfilledCount']]) {
        page.selectMetric(type, status)
        assert.equal(page.ledgerRows.length, page.stats[count])
        assert.ok(page.ledgerRows.every(r => r.status === status))
      }
    })
    check('日报、周报采用 V1.4 有效关系，周度明细可按人员项目文本筛选', () => {
      const expected = new Set(store.effectiveRelations().map(r => r.personId)).size
      assert.ok(expected > 0)
      assert.ok(buildDailyReport(store.db, todayStr()).summary.includes(`服务人员${expected}人`))
      const weekly = buildWeeklyReport(store.db, moment().startOf('isoWeek').format('YYYY-MM-DD'), moment().endOf('isoWeek').format('YYYY-MM-DD'))
      assert.equal(weekly.personCount, expected)
      const rows = weekly.absentRows.concat(weekly.serviceRows)
      assert.equal(new Set(rows.map(r => r.rowKey)).size, rows.length)
      const page = vm('Daily')
      assert.ok(page.myReports.every(r => r.status === '已提交' ? r.attendText === (r.attend ? '是' : '否') : r.attendText === '未填报'))
      const row = rows[0]
      page.weeklyFilters = { personName: row.personName, deptId: row.deptId, projectId: row.projectId, needs: row.needs.slice(0, 6) }
      page.applyWeeklyFilter()
      const filtered = page.filterWeeklyRows(rows)
      assert.ok(filtered.length)
      assert.ok(filtered.every(r => r.personId === row.personId && r.projectId === row.projectId))
    })
    check('详情切换编辑、停用、销项时关闭原详情', () => {
      const relations = vm('Relations')
      const r = store.db.relations[0]
      relations.openDetail(r); relations.openEdit(r)
      assert.equal(relations.detailVisible, false)
      relations.openDetail(r); relations.openStop(r)
      assert.equal(relations.detailVisible, false)
      const appeals = vm('Appeals')
      const a = store.db.appeals[0]
      appeals.openDetail(a); appeals.openEdit(a)
      assert.equal(appeals.detailVisible, false)
      appeals.openDetail(a); appeals.openClose(a)
      assert.equal(appeals.detailVisible, false)
      assert.equal(appeals.closeVisible, true)
      appeals.closeReason = '未提交的内容'
      appeals.closeVisible = false
      appeals.openClose(a)
      assert.equal(appeals.closeReason, '')
      appeals.closeReason = '   '
      appeals.submitClose()
      assert.equal(appeals.closeVisible, true)
      assert.equal(a.closeRequest, null)
      appeals.closeReason = '办结结果已确认'
      appeals.closeAttachments = []
      appeals.submitClose()
      assert.equal(appeals.closeVisible, false)
      assert.equal(a.status, '销项审批中')
      assert.equal(a.closeRequest.reason, '办结结果已确认')
      assert.deepEqual(a.closeRequest.attachments, [])
      assert.deepEqual(a.closeRequest.nodes.map(n => n.name), ['项目经理确认', '企划归档'])
    })
    check('重点工作精简销项界面后仍校验总体、全部项目、办结说明和佐证附件', () => {
      const page = vm('Works')
      const work = store.db.works.find(w => w.status === '落实中' && store.getWorkProgress(w).B > 0)
      page.openExec({ ...work })
      assert.equal(page.workCurrent, work)
      page.overallContent = '从列表保存后详情应即时显示'
      page.saveExec()
      assert.equal(page.workCurrent.overallContent, '从列表保存后详情应即时显示')
      work.overallContent = ''
      page.openClose(work)
      assert.equal(page.workDrawerMode, 'exec')
      work.overallContent = '已完成总体执行工作'
      store.syncWorkProjectScope(work)
      work.projectExecutions.filter(e => e.inScope !== false).forEach(e => { e.content = ''; e.needsConfirm = false })
      page.openClose(work)
      assert.equal(page.workDrawerMode, 'exec')
      const projects = work.projectExecutions.filter(e => e.inScope !== false).map(e => ({ projectId: e.projectId, content: '该项目已完成落实', attachments: [] }))
      assert.equal(store.saveWorkExecutions(work.id, { overallContent: work.overallContent, overallAttachments: [], projects }).ok, true)
      page.openClose({ ...work })
      assert.equal(page.workDrawerMode, 'close')
      assert.equal(page.workCurrent, work)
      page.submitClose()
      assert.equal(work.closeRequest, null)
      page.closeReason = '已完成工作并形成成果'
      page.submitClose()
      assert.equal(work.closeRequest, null)
      page.closeAttachments = [{ name: '完成证明.pdf', size: 100 }]
      page.submitClose()
      assert.equal(work.status, '销项审批中')
      assert.equal(work.closeRequest.overallContent, work.overallContent)
      assert.equal(work.closeRequest.projectExecutions.length, projects.length)
    })
    const { default: uploader } = await server.ssrLoadModule('/src/components/FileUploader.vue')
    check('同批多附件合并一次，保留已有附件', () => {
      const files = [{ name: 'a.pdf', size: 1 }, { name: 'b.pdf', size: 2 }]
      const events = []
      const beforeUpload = (uploader.options || uploader).methods.beforeUpload
      const instance = { value: [{ name: 'old.pdf', size: 3 }], $emit: (name, data) => { if (name === 'input') events.push(data) } }
      files.forEach(f => assert.equal(beforeUpload.call(instance, f, files), false))
      assert.equal(events.length, 1)
      assert.deepEqual(events[0].map(f => f.name), ['old.pdf', 'a.pdf', 'b.pdf'])
    })
    check('流程字典按真实节点映射，退回可重提不算作废', () => {
      for (const [status, expected] of [['草稿', '待提交'], ['已退回', '待提交'], ['审核中', '处理中'], ['已生效', '已完成'], ['已作废', '已作废']]) assert.equal(sheetProcessStatus({ status }), expected)
      for (const [status, expected] of [['已退回', '待提交'], ['待确认', '处理中'], ['已回复', '处理中'], ['已归档', '已完成'], ['已终止', '已作废']]) assert.equal(suggestionApprovalStatus({ status }), expected)
      for (const [request, expected] of [[null, '待提交'], ['已退回', '待提交'], ['审批中', '处理中'], ['已通过', '已完成'], ['已作废', '已作废']]) {
        assert.equal(closeApprovalStatus({ status: '落实中', closeRequest: request ? { status: request } : null }), expected)
      }
      const appeal = store.db.appeals.find(a => a.status === '办理中')
      store.submitAppealClose(appeal.id, { reason: '办结', attachments: [] })
      assert.equal(closeApprovalStatus(appeal), '处理中')
      store.approveAppealClose(appeal.id, 'reject', '补齐')
      assert.equal(closeApprovalStatus(appeal), '待提交')
      store.submitAppealClose(appeal.id, { reason: '补齐', attachments: [] })
      store.approveAppealClose(appeal.id, 'pass', '确认')
      store.approveAppealClose(appeal.id, 'pass', '归档')
      assert.equal(closeApprovalStatus(appeal), '已完成')
      assert.equal(appeal.status, '已销项')
    })
    check('到期关系自动停用、历史只读，原日报及项目执行记录保留', () => {
      const relation = store.db.relations.find(r => r.configStatus === '启用' && store.db.dailyReports.some(d => d.personId === r.personId && d.projectId === r.projectId && d.status === '已提交'))
      store.db.relations.filter(r => r.personId === relation.personId && r.projectId === relation.projectId && r.id !== relation.id).forEach(r => { r.configStatus = '停用' })
      const ids = store.db.dailyReports.filter(r => r.personId === relation.personId && r.projectId === relation.projectId && r.status === '已提交').map(r => r.id)
      relation.endDate = moment().subtract(1, 'day').format('YYYY-MM-DD')
      const historyCount = relation.history.length
      store.syncRelationStatuses(); store.syncAllWorkProjectScopes(); store.refreshDailyWindow()
      assert.equal(relation.configStatus, '停用')
      assert.equal(relation.stoppedBy, '系统')
      assert.ok(relation.stopReason.includes(relation.endDate))
      assert.equal(relation.history.length, historyCount + 1)
      store.syncRelationStatuses()
      assert.equal(relation.history.length, historyCount + 1)
      assert.ok(ids.every(id => store.db.dailyReports.some(r => r.id === id)))
      assert.ok(!store.db.dailyReports.some(r => r.date >= todayStr() && r.personId === relation.personId && r.projectId === relation.projectId && r.status !== '已提交'))
      assert.ok(store.db.works.filter(w => w.status === '落实中' && w.leadId === relation.personId).every(w => !store.currentWorkRows(w).some(r => r.projectId === relation.projectId)))
      assert.equal(store.enableRelation(relation.id).ok, false)
      const historical = store.db.relations.find(r => r.id !== relation.id)
      const originalStatus = historical.status
      historical.configStatus = '历史归档'; historical.archived = true
      store.syncV14Data()
      assert.equal(historical.configStatus, '停用')
      assert.equal(historical.legacyStatus, originalStatus)
      assert.equal(store.enableRelation(historical.id).ok, false)
      assert.equal(store.updateRelation(historical.id, { role: '主责', startDate: todayStr() }).ok, false)
    })
    check('事项显示编号由梳理单与顺序生成，内部 ID 和执行引用不变', () => {
      const work = store.db.works[0], id = work.id
      assert.equal(workDisplayCode(work), `${work.sheetId}-${String(work.seq).padStart(2, '0')}`)
      const page = vm('Works')
      page.workFilters.code = workDisplayCode(work); page.applyWorkFilter()
      assert.deepEqual(page.filteredWorks.map(w => w.id), [id])
      page.openWorkDetail(page.filteredWorks[0])
      assert.equal(page.workCurrent, work)
      assert.ok(!page.workDrawerTitle.includes(id))
      assert.ok(page.workDrawerTitle.includes(workDisplayCode(work)))
    })
    check('旧删除记录迁移后仅保留历史日报，重复兼容不丢内容或复用编号', () => {
      const a = store.db.appeals.find(a => store.reportsForAppeal(a.id).length)
      const ids = store.reportsForAppeal(a.id).map(r => r.id)
      a.status = '已删除'
      store.syncV14Data()
      assert.ok(!store.db.appeals.some(r => r.id === a.id))
      assert.ok(ids.every(id => store.db.dailyReports.some(r => r.id === id && r.appealDeleted)))
      const before = JSON.stringify(store.db)
      store.syncV14Data()
      assert.equal(JSON.stringify(store.db), before)
      assert.ok(listRows('reports', store, {}).filter(r => ids.includes(r.id)).length)
      assert.ok(!store.reportsForDate(todayStr()).some(r => r.appealId === a.id))
      const created = store.createAppeal({ ...a, title: '新诉求' })
      assert.notEqual(created.id, a.id)
      assert.ok(ids.every(id => store.db.dailyReports.find(r => r.id === id).appealId === a.id))
    })
    check('总览与五类业务列表共享全部列，人员及各文本字段可组合查询', () => {
      const overview = vm('Overview')
      for (const [type, name, key] of [['relations', 'Relations', 'columns'], ['works', 'Works', 'workColumns'], ['appeals', 'Appeals', 'columns'], ['reports', 'Daily', 'allColumns'], ['suggestions', 'Suggestions', 'columns']]) {
        overview.ledgerTab = type; overview.onLedgerTabChange()
        const own = vm(name)[key]
        assert.deepEqual(overview.ledgerColumns.map(c => [c.title, c.dataIndex]), own.slice(0, -1).map(c => [c.title, c.dataIndex]))
        assert.ok(!overview.ledgerColumns.some(c => c.title === '操作'))
        assert.equal(overview.ledgerColumns[0].customRender('', {}, 0), 1)
        overview.onLedgerTableChange({ current: 2, pageSize: 10 })
        assert.equal(overview.ledgerColumns[0].customRender('', {}, 0), 11)
      }
      for (const type of ['relations', 'sheets', 'works', 'appeals', 'reports', 'suggestions', 'weekly']) {
        const fields = listFilterFields(type, store)
        assert.ok(fields.every(f => f.key !== 'keyword' && !f.label.includes('关键词')))
        assert.ok(fields.filter(f => /人员|姓名|牵头人|承办人|填报人|提出人|负责人|项目经理$/.test(f.label)).every(f => f.kind === 'text'))
        if (type === 'weekly') continue
        const rows = listRows(type, store, {})
        for (const field of fields.filter(f => f.kind === 'text')) {
          const record = rows.find(r => r[field.key])
          if (!record) continue
          const value = String(record[field.key]).slice(0, 5)
          assert.ok(listRows(type, store, { [field.key]: value }).some(r => r.id === record.id), type + '.' + field.key)
          assert.equal(listRows(type, store, { [field.key]: '不存在的检索值' }).length, 0, type + '.' + field.key)
        }
      }
    })
    console.log(`\n${count} scenario groups passed.`)
  } finally {
    await server.close()
    delete global.localStorage
  }
}

main().catch(error => { console.error(error); process.exitCode = 1 })
