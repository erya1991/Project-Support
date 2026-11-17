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
    const views = {}
    for (const name of ['Relations', 'Works', 'Appeals', 'Daily', 'Suggestions', 'Overview']) {
      views[name] = (await server.ssrLoadModule(`/src/views/${name}.vue`)).default
    }
    const reset = () => { store.state.db = migrateDb(buildSeed()) }
    const vm = name => {
      const options = views[name].options || views[name]
      const instance = { ...options.data(), $store: store, $route: { query: {} }, $message: { warning () {}, error () {}, success () {} }, $nextTick: fn => fn() }
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
      page.workFilters.keyword = '独特问题回归'
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
      relation.filters.keyword = store.getPerson(store.db.relations[0].personId).employeeNo
      relation.query()
      assert.ok(relation.filteredRelations.length)
      assert.ok(relation.filteredRelations.every(r => r.personId === store.db.relations[0].personId))
      const appeal = vm('Appeals')
      const record = store.db.appeals.find(a => a.status === '办理中')
      record.plan = '推进计划唯一关键词'
      record.coDepts = ['D02']
      appeal.filters.keyword = '推进计划唯一关键词'
      appeal.filters.coDeptId = 'D02'
      appeal.query()
      assert.deepEqual(appeal.filteredAppeals.map(a => a.id), [record.id])
      appeal.filters.coDeptId = 'D03'; appeal.query()
      assert.equal(appeal.filteredAppeals.length, 0)
      const suggestion = store.createSuggestion(suggestionPayload())
      suggestion.desc = '问题描述唯一关键词'
      const page = vm('Suggestions')
      page.filters.keyword = '问题描述唯一关键词'; page.query()
      assert.deepEqual(page.filteredSuggestions.map(s => s.id), [suggestion.id])
    })
    check('总览日报历史日期不影响今日统计；跳转带正确页签和记录', () => {
      const page = vm('Overview')
      const before = JSON.stringify(page.stats)
      page.ledgerTab = 'reports'
      const pending = store.db.dailyReports.find(r => !r.legacy && r.date === todayStr() && r.status !== '已提交')
      pending.attend = true
      assert.equal(page.ledgerRows.find(r => r.id === pending.id).attendText, '未填')
      const historical = store.db.dailyReports.find(r => !r.legacy && r.date < todayStr())
      page.ledgerDate = moment(historical.date)
      assert.ok(page.ledgerRows.length)
      assert.ok(page.ledgerRows.every(r => r.date === historical.date))
      assert.equal(JSON.stringify(page.stats), before)
      let target
      page.$router = { push: value => { target = value } }
      page.goLedgerModule(historical)
      assert.deepEqual(target, { path: '/daily', query: { tab: 'all', date: historical.date, id: historical.id } })
      page.ledgerTab = 'works'; page.goLedgerModule()
      assert.deepEqual(target, { path: '/works', query: { tab: 'works' } })
      page.ledgerTab = 'relations'; page.ledgerStatus = '启用'
      assert.ok(page.ledgerRows.length)
      assert.ok(page.ledgerRows.every(r => r.configStatus === '启用'))
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
      const row = rows[0]
      page.weeklyFilters = { personId: row.personId, deptId: row.deptId, projectId: row.projectId, keyword: row.needs.slice(0, 6) }
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
    console.log(`\n${count} scenario groups passed.`)
  } finally {
    await server.close()
    delete global.localStorage
  }
}

main().catch(error => { console.error(error); process.exitCode = 1 })
