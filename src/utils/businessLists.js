import moment from 'moment'
import { fmtDate } from './date'
import { matchesKeyword, inDateRange } from './listQuery'
import { PROJECT, DEPARTMENT, APPEAL_STATES, personName, workRows, targetOf } from './serviceData'
import { dailyRows, reportRow } from './reportData'
import { currentAppealResult, SUGGESTION_DECISIONS, suggestionDecisionLabel } from './workflow'

export const LIST_TITLES = { appeals: '基层诉求', works: '部门重点工作', executions: '项目执行情况', reports: '日报',
  suggestions: '制度改进建议', relations: '帮扶关系', mine: '我的重点工作' }
const text = (key, label) => ({ key, label, kind: 'text' })
const select = (key, label, options) => ({ key, label, kind: 'select', options })
const dateRange = (key, label, match) => ({ key, label, match, kind: 'range' })
const values = items => items.map(value => ({ value, label: value }))
const options = items => items.map(item => ({ value: item.id, label: item.name }))

export function listFilterFields (type, store) {
  const db = store.db
  const dept = select('deptId', '总部部门', options(db.departments))
  const company = select('company', '所属分公司', values(db.companies))
  const project = select('projectId', '项目名称', options(db.projects))
  const state = choices => select('status', '状态', values(choices))
  const title = text('title', '重点工作名称')
  const workDept = { ...dept, label: '归属部门' }
  const workSystem = select('system', '所属体系', values(db.systems))
  const owner = { ...dept, label: '主责部门' }
  const status = state(['待填写', '已填写'])
  const execution = [title, project, workDept, status, company, text('helperNames', '帮扶人员'), text('content', '项目落实情况'), dateRange('firstRange', '录入时间', 'firstAt')]
  const fields = {
    relations: [text('personName', '总部帮扶人员'), select('type', '帮扶对象类型', values([DEPARTMENT, PROJECT])), company,
      state(['启用', '停用']), text('employeeNo', '工号'), dept, text('targetName', '帮扶部门／项目'),
      select('targetId', '帮扶对象', [...db.projects, ...db.branchDepartments].map(t => ({ value: t.id, label: t.company + ' · ' + t.name }))),
      text('personTitle', '职务'), text('manager', '对应负责人'), text('managerPhone', '负责人联系方式'), text('id', '关系编号')],
    works: [title, workSystem, workDept, state(['启用', '停用']), text('content', '重点工作内容')],
    executions: execution, mine: [status, title, project, workDept],
    reports: [{ key: 'date', label: '填报日期', kind: 'date' }, text('personName', '填报人'), project, state(['待填写', '已提交']),
      company, dept, select('frozenText', '冻结状态', values(['已冻结', '未冻结'])), dateRange('submitRange', '提交时间', 'submitTime'), select('attendText', '是否到岗', values(['是', '否', '未填报'])),
      text('projectNeeds', '项目层面服务需求'), text('workContent', '当日工作开展情况'), text('newIssues', '需协调问题')],
    appeals: [text('title', '诉求标题'), owner, state([...APPEAL_STATES, '已退回']), company, text('id', '诉求单号'),
      text('creatorName', '发起人'), text('unitName', '所属部门／项目'), text('handlerName', '承办人'), text('desc', '诉求内容'), dateRange('submitRange', '提交时间', 'submittedAt')],
    suggestions: [text('title', '建议标题'), owner, state(['待回复', '已回复']), select('decision', '回复结果', SUGGESTION_DECISIONS),
      text('id', '建议编号'), text('creatorName', '发起人'), select('company', '所属分公司', values(['公司总部', ...db.companies])),
      text('unitName', '所属部门／项目'), text('flow', '涉及制度/流程'), text('desc', '建议内容'), text('comment', '回复说明'), dateRange('createdRange', '提交时间', 'createdAt')],
    weekly: [text('personName', '填报人'), dept, project, company, text('needs', '项目层面服务需求'), text('workContent', '当日工作开展情况'),
      text('issues', '需协调问题'), text('reason', '未到岗原因')]
  }
  return fields[type]
}

export function emptyListFilters (type, store) {
  const filters = Object.fromEntries(listFilterFields(type, store).map(f => [f.key, undefined]))
  if (type === 'reports') filters.date = moment(store.state.day)
  return filters
}

export function filterListRows (type, rows, filters, store) {
  const fields = listFilterFields(type, store)
  return rows.filter(row => {
    if (filters.eligible && !row.eligible) return false
    return fields.every(({ key, kind, match }) => {
      const value = filters[key]
      if (value === undefined || value === null || value === '') return true
      if (kind === 'range') return inDateRange(row[match], value)
      if (kind === 'date') return row[key] === fmtDate(value)
      if (kind === 'text') return matchesKeyword(value, [row[key]])
      if (key === 'projectId' && row.projectIds) return row.projectIds.includes(value)
      if (key === 'company' && row.companies) return row.companies.includes(value)
      return row[key] === value
    })
  })
}

export function listRows (type, store, filters = {}) {
  const db = store.db
  let rows
  if (type === 'relations') {
    rows = db.relations.map(r => {
      const p = store.getPerson(r.personId)
      const target = targetOf(db, r.type, r.targetId)
      return { ...r, personName: p.name, employeeNo: p.employeeNo, personTitle: p.title, phone: p.phone, deptId: p.deptId,
        deptName: store.getDept(p.deptId).name, company: target.company, targetName: target.name, manager: target.manager, managerPhone: target.managerPhone }
    })
  } else if (type === 'works') rows = workRows(db)
  else if (type === 'mine') rows = store.personalWork().tasks
  else if (type === 'executions') rows = workRows(db).flatMap(w => w.executions.filter(e => e.scope === '当前'))
  else if (type === 'reports') {
    if (filters.date) rows = dailyRows(db, fmtDate(filters.date))
    else {
      const today = store.state.day
      rows = [...dailyRows(db, today), ...db.dailyReports.filter(r => r.date !== today).map(r => reportRow(r, false))]
        .sort((a, b) => b.date.localeCompare(a.date))
    }
  } else {
    rows = db[type].filter(r => !r.deleted).map(r => {
      const dept = store.getDept(r.deptId)
      const base = { ...r, deptName: dept.name, manager: dept.manager, creatorName: personName(db, r.creatorId) }
      if (type === 'appeals') {
        const result = currentAppealResult(r)
        return { ...base, handlerName: personName(db, r.handlerId), result, progressContent: result?.content || '' }
      }
      const decision = r.reply?.decision
      return { ...base, decision, decisionLabel: suggestionDecisionLabel(decision), comment: r.reply?.comment }
    })
  }
  return filterListRows(type, rows, filters, store)
}

// 业务菜单和总览使用同一组具名字段。宽度按可用表格宽度分配。
const specs = {
  relations: [['编号', 'id', 106], ['总部帮扶人员', 'personName', 80], ['工号', 'employeeNo', 70], ['职务', 'personTitle', 82],
    ['总部部门', 'deptName', 96], ['对象类型', 'type', 66], ['所属分公司', 'company', 88], ['帮扶部门／项目', 'targetName', 130],
    ['对应负责人', 'manager', 70], ['联系方式', 'managerPhone', 100], ['状态', 'status', 61]],
  works: [['事项编码', 'id', 120], ['所属体系', 'system', 70], ['归属部门', 'deptName', 110], ['重点工作名称', 'title', 160],
    ['重点工作内容', 'content', 220], ['项目落实进展', 'progressText', 95], ['状态', 'status', 58]],
  executions: [['重点工作事项', 'title', 164], ['所属分公司', 'company', 96], ['项目名称', 'projectName', 132],
    ['帮扶人员', 'helperNames', 112], ['填报状态', 'status', 76], ['首次录入时间', 'firstAt', 130]],
  mine: [['事项编码', 'workId', 120], ['重点工作事项', 'title', 145], ['归属部门', 'deptName', 105],
    ['所属分公司', 'company', 88], ['项目名称', 'projectName', 124], ['项目落实情况', 'content', 220], ['填报状态', 'status', 65], ['最后修改时间', 'lastAt', 115]],
  workDetail: [['项目名称', 'projectName', 125], ['所属分公司', 'company', 85], ['帮扶人员', 'helperNames', 85], ['项目落实情况', 'content', 142],
    ['填报状态', 'status', 65], ['首次填报人', 'firstName', 75], ['首次录入时间', 'firstAt', 103],
    ['最后修改人', 'lastName', 75], ['修改时间', 'lastAt', 103]],
  appeals: [['单号', 'id', 115], ['诉求标题', 'title', 170], ['发起人', 'creatorName', 65], ['所属分公司', 'company', 92],
    ['所属部门／项目', 'unitName', 120], ['主责部门', 'deptName', 110], ['承办人', 'handlerName', 65],
    ['当前状态', 'status', 90], ['问题解决进展', 'progressContent', 180], ['提交时间', 'submittedAt', 116]],
  suggestions: [['建议编号', 'id', 116], ['建议标题', 'title', 180], ['发起人', 'creatorName', 68], ['所属分公司', 'company', 95],
    ['所属部门／项目', 'unitName', 118], ['主责部门', 'deptName', 115], ['回复结果', 'decisionLabel', 70], ['当前状态', 'status', 78]],
  reports: [['填报日期', 'date', 101], ['填报人', 'personName', 70], ['所属分公司', 'company', 108], ['帮扶项目', 'projectName', 167],
    ['是否到岗', 'attendText', 68], ['当日工作开展情况', 'workContent', 214], ['填报状态', 'status', 76]],
  allReports: [['填报日期', 'date', 90], ['填报人', 'personName', 58], ['总部部门', 'deptName', 92], ['所属分公司', 'company', 92],
    ['帮扶项目', 'projectName', 136], ['是否到岗', 'attendText', 58], ['当日工作开展情况', 'workContent', 148],
    ['今日需协调问题', 'newIssues', 124], ['填报状态', 'status', 65], ['冻结状态', 'frozenText', 65], ['提交时间', 'submitTime', 103]],
  attendance: [['姓名', 'personName', 80], ['总部部门', 'deptName', 140], ['关联项目', 'projectName', 250],
    ['当日日报', 'reportStatus', 95], ['到岗情况', 'attendance', 90]],
  weeklyAbsent: [['日期', 'date', 100], ['姓名', 'personName', 75], ['部门', 'deptName', 100], ['帮扶项目', 'projectName', 143],
    ['项目层面服务需求', 'needs', 165], ['是否到岗', 'attend', 65], ['未到岗原因', 'reason', 175]],
  weeklyService: [['日期', 'date', 100], ['姓名', 'personName', 75], ['部门', 'deptName', 100], ['帮扶项目', 'projectName', 143],
    ['项目层面服务需求', 'needs', 165], ['是否到岗', 'attend', 65], ['当日工作开展情况', 'workContent', 175], ['需协调解决问题', 'issues', 130]]
}

export function listColumns (type) {
  return specs[type].map(([title, dataIndex, width]) => ({ title, dataIndex, key: dataIndex, width }))
}

export function fitColumns (columns, fixedKey) {
  const fixedWidth = columns.find(c => c.key === fixedKey)?.width || 0
  const flexible = columns.reduce((sum, c) => sum + c.width, 0) - fixedWidth
  return columns.map(c => {
    if (c.key === fixedKey) return c
    const share = c.width / flexible
    return { ...c, width: fixedWidth ? `calc(${share * 100}% - ${share * fixedWidth}px)` : share * 100 + '%' }
  })
}

export const detailLinks = { relations: ['id', 'personName'], works: ['id', 'title'], executions: ['title', 'projectName'],
  mine: ['workId', 'title', 'projectName'], workDetail: ['projectName'], attendance: [], appeals: ['id', 'title'], suggestions: ['id', 'title'], reports: ['date', 'personName'],
  allReports: ['date', 'personName'], weeklyAbsent: ['date'], weeklyService: ['date'] }
