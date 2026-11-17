import moment from 'moment'
import StatusTag from '../components/StatusTag.vue'
import { fmtDate, isFrozen, todayStr } from './date'
import { matchesKeyword, inDateRange } from './listQuery'
import { workResultText } from './reportData'
import { APPROVAL_STATES, sheetProcessStatus, closeApprovalStatus, suggestionApprovalStatus, relationStatus, workDisplayCode } from './workflow'

const text = (key, label) => ({ key, label, kind: 'text' })
const select = (key, label, options) => ({ key, label, kind: 'select', options })
const range = (key, label, match) => ({ key, label, kind: 'range', match })
const dict = values => values.map(value => ({ value, label: value }))

// 业务菜单和总览直接使用同一组查询定义、过滤逻辑和展示列。
export function listFilterFields (type, store) {
  const departments = store.db.departments.map(d => ({ value: d.id, label: d.name }))
  const projects = store.db.projects.map(p => ({ value: p.id, label: p.name }))
  const department = (key = 'deptId', label = '部门') => select(key, label, departments)
  const project = () => select('projectId', '项目', projects)
  const state = (key, label, values) => select(key, label, dict(values))
  const closeState = () => state('closeStatus', '销项审批状态', APPROVAL_STATES)
  const schemas = {
    relations: [text('personName', '服务人员'), text('employeeNo', '工号'), project(), department('deptId', '所属部门'),
      state('configStatus', '配置状态', ['启用', '停用']), text('id', '关系编号'),
      select('company', '所属单位', dict([...new Set(store.db.projects.map(p => p.company).filter(Boolean))])),
      text('projectManager', '项目经理'), text('managerPhone', '项目经理联系方式'), text('phone', '人员联系方式'),
      state('role', '帮扶角色', ['主责', '协同']), state('validity', '当前有效', ['当前有效', '未到生效日', '已停用']),
      range('dateRange', '有效期', 'period'), text('remark', '配置说明')],
    sheets: [text('id', '梳理单编号'), state('system', '所属体系', [...new Set(store.db.departments.map(d => d.system))]),
      department('deptId', '归属部门'), state('processStatus', '流程状态', APPROVAL_STATES), text('creatorName', '填报人'),
      range('dateRange', '填报日期', 'createDate'), text('remark', '创建说明'), { key: 'itemCount', label: '重点工作数量', kind: 'number' }],
    works: [text('code', '事项编号'), text('sheetId', '梳理单编号'), department('deptId', '归属部门'),
      state('status', '工作状态', ['待生效', '落实中', '销项审批中', '已销项']),
      state('system', '所属体系', [...new Set(store.db.departments.map(d => d.system))]), text('leadName', '牵头人'), closeState(),
      range('dueRange', '完成时限', 'dueDate'), state('progressState', '项目落实进展', ['未配置项目', '未填写', '部分填写', '全部填写']),
      text('title', '重点工作内容'), text('problem', '存在问题'), text('suggestion', '改进建议'), text('result', '落实情况')],
    appeals: [text('id', '诉求编号'), text('title', '诉求事项'), project(), state('status', '办理状态', ['办理中', '销项审批中', '已销项']),
      department('deptId', '主责部门'), text('personName', '承办人'), closeState(), range('dueRange', '完成时限', 'dueDate'),
      state('overdueText', '是否超期', ['是', '否']), state('source', '诉求来源', ['工程部梳理', '项目反馈', '日报', '现场', '其他']),
      department('coDeptId', '协同部门'), text('desc', '具体描述'), text('plan', '推进计划'), text('latestProgress', '最新进展')],
    reports: [{ key: 'date', label: '填报日期', kind: 'date' }, text('personName', '姓名'), project(),
      state('status', '填报状态', ['未填写', '已提交']), department(), state('attendText', '是否到岗', ['是', '否', '未填报']),
      state('frozenText', '冻结状态', ['已冻结', '未冻结']), range('submitRange', '提交时间', 'submitTime'),
      text('appealId', '诉求编号'), text('appealTitle', '对应诉求事项'), text('workContent', '当日工作开展情况'),
      text('newIssues', '需协调解决问题'), text('absentReason', '未到岗原因')],
    suggestions: [text('id', '建议编号'), text('title', '建议事项'), department('deptId', '主责部门'),
      state('approvalStatus', '审批状态', APPROVAL_STATES), text('proposerName', '提出人'), department('proposerDeptId', '提出部门'),
      text('confirmerNames', '确认负责人'), state('adopt', '回复结论', ['改', '不改', '待回复']),
      range('dateRange', '提出日期', 'createdAt'), text('flow', '涉及制度/流程'), text('desc', '问题描述'),
      text('replyText', '回复意见'), text('archiveOpinion', '归档意见')],
    weekly: [text('personName', '姓名'), department(), project(), text('needs', '项目层面服务需求'),
      text('workContent', '当日工作开展情况'), text('issues', '需协调解决问题'), text('reason', '未到岗原因')]
  }
  return schemas[type]
}

export function emptyListFilters (type, store) {
  const filters = {}
  listFilterFields(type, store).forEach(field => { filters[field.key] = field.kind === 'text' ? '' : undefined })
  if (type === 'reports') filters.date = moment()
  return filters
}

export function filterListRows (type, rows, filters, store) {
  const fields = listFilterFields(type, store)
  return rows.filter(row => fields.every(field => {
    const value = filters[field.key]
    if (value === undefined || value === null || value === '') return true
    if (field.kind === 'text') return matchesKeyword(value, [row[field.key]])
    if (field.kind === 'date') return row[field.key] === fmtDate(value)
    if (field.kind === 'range') {
      if (field.match === 'period') return !value || value.length !== 2 ||
        (row.startDate <= fmtDate(value[1]) && (!row.endDate || row.endDate >= fmtDate(value[0])))
      return inDateRange(row[field.match], value)
    }
    if (field.key === 'coDeptId') return (row.coDepts || []).includes(value)
    if (field.key === 'adopt') {
      const replies = (row.confirmers || []).filter(c => c.reply)
      return value === '待回复' ? !replies.length : replies.some(c => c.reply.adopt === value)
    }
    return row[field.key] === value
  }))
}

export function listRows (type, store, filters = {}) {
  let rows = []
  if (type === 'relations') rows = store.db.relations.map(r => ({ ...r,
    configStatus: relationStatus(r), validity: store.relationValidity(r),
    employeeNo: (store.getPerson(r.personId) || {}).employeeNo,
    phone: (store.getPerson(r.personId) || {}).phone,
    company: (store.getProject(r.projectId) || {}).company,
    managerPhone: (store.getProject(r.projectId) || {}).managerPhone,
    period: `${r.startDate} 至 ${r.endDate || '长期'}`
  }))
  if (type === 'sheets') rows = store.db.sheets.map(s => ({ ...s, itemCount: s.items.length, processStatus: sheetProcessStatus(s) }))
  if (type === 'works') rows = store.db.works.map(w => {
    const p = store.getWorkProgress(w)
    return { ...w, code: workDisplayCode(w), closeStatus: closeApprovalStatus(w), result: workResultText(w),
      progressText: p.B ? `${p.A}/${p.B}（${p.A === p.B ? '项目已全部填写' : `未填 ${p.B - p.A} 项`}）` : '未配置有效帮扶项目',
      progressState: !p.B ? '未配置项目' : (p.A === p.B ? '全部填写' : (p.A ? '部分填写' : '未填写')) }
  })
  if (type === 'appeals') rows = store.db.appeals.filter(a => a.status !== '已删除').map(a => ({ ...a,
    closeStatus: closeApprovalStatus(a), overdueText: a.dueDate < todayStr() && a.status !== '已销项' ? '是' : '否'
  }))
  if (type === 'reports') {
    const activeIds = new Set(store.db.appeals.filter(a => a.status !== '已删除').map(a => a.id))
    const order = new Map(store.db.people.map((p, i) => [p.id, i]))
    rows = store.db.dailyReports.filter(r => !r.legacy && (r.status === '已提交' || activeIds.has(r.appealId)))
      .map(r => ({ ...r, frozen: isFrozen(r.date), frozenText: isFrozen(r.date) ? '已冻结' : '未冻结',
        attendText: r.status === '已提交' ? (r.attend === true ? '是' : (r.attend === false ? '否' : '未填报')) : '未填报',
        workContent: r.status === '已提交' ? r.workContent : '', newIssues: r.status === '已提交' ? r.newIssues : '' }))
      .sort((a, b) => b.date.localeCompare(a.date) || (order.get(a.personId) || 0) - (order.get(b.personId) || 0) || (a.appealTitle || '').localeCompare(b.appealTitle || '', 'zh'))
  }
  if (type === 'suggestions') rows = store.db.suggestions.map(s => {
    const replies = (s.confirmers || []).filter(c => c.reply)
    return { ...s, approvalStatus: suggestionApprovalStatus(s), proposerText: `${s.proposerName}\n${s.proposerDeptName}`,
      confirmerNames: (s.confirmers || []).map(c => c.name).join('、'),
      replyText: replies.length ? replies.map(c => `${c.name}：${c.reply.adopt}；${c.reply.reason || c.reply.plan || ''}；${c.reply.comment || ''}`).join('；') : (s.status === '已退回' ? '已退回' : '待部门确认') }
  })
  return filterListRows(type, rows, filters, store)
}

// [列名, 展示字段, 宽度, 格式]；业务页在这些列之后追加操作列。
const columnSpecs = {
  relations: [['关系编号', 'id', 118], ['总部服务人员', 'personName', 100], ['工号', 'employeeNo', 94], ['所属部门', 'deptName', 150],
    ['帮扶项目', 'projectName', 180], ['所属单位', 'company', 118], ['项目经理', 'projectManager', 90], ['项目经理联系方式', 'managerPhone', 135],
    ['帮扶角色', 'role', 80], ['有效期', 'period', 210], ['配置状态', 'configStatus', 90, 'status'], ['当前有效', 'validity', 110]],
  sheets: [['梳理单编号', 'id', 120], ['体系', 'system', 75], ['归属部门', 'deptName', 160], ['重点工作数', 'itemCount', 100],
    ['填报人', 'creatorName', 90], ['填报日期', 'createDate', 110], ['创建说明', 'remark', 300], ['流程状态', 'processStatus', 100, 'status']],
  works: [['事项编号', 'code', 155], ['体系', 'system', 75], ['部门', 'deptName', 150], ['重点工作', 'title', 270], ['牵头人', 'leadName', 90],
    ['完成时限', 'dueDate', 115], ['项目落实进展', 'progressText', 200], ['工作状态', 'status', 105, 'status'], ['销项审批状态', 'closeStatus', 120, 'status']],
  appeals: [['诉求编号', 'id', 120], ['诉求事项', 'title', 250], ['所属项目', 'projectName', 180], ['主责部门', 'deptName', 150],
    ['承办人', 'personName', 90], ['推进计划', 'plan', 240], ['完成时限', 'dueDate', 120, 'due'], ['最新进展', 'latestProgress', 260, 'latest'],
    ['办理状态', 'status', 105, 'status'], ['销项审批状态', 'closeStatus', 120, 'status']],
  reports: [['日期', 'date', 110], ['姓名', 'personName', 85], ['部门', 'deptName', 150], ['项目', 'projectName', 170],
    ['对应诉求事项', 'appealTitle', 250, 'appeal'], ['填报状态', 'status', 100, 'status'], ['冻结状态', 'frozenText', 100, 'status'],
    ['到岗', 'attendText', 75], ['当日工作开展情况', 'workContent', 280], ['今日项目反馈需协调解决问题', 'newIssues', 260], ['提交时间', 'submitTime', 155]],
  suggestions: [['建议编号', 'id', 115], ['建议事项', 'title', 240], ['涉及制度/流程', 'flow', 200], ['提出人/部门', 'proposerText', 150],
    ['主责部门', 'deptName', 150], ['确认负责人', 'confirmerNames', 140], ['回复意见', 'replyText', 300], ['提出时间', 'createdAt', 115, 'date'],
    ['审批状态', 'approvalStatus', 105, 'status']]
}

export function listColumns (type, vm, pagination, detail) {
  const h = vm.$createElement
  const linkKey = { relations: 'id', sheets: 'id', works: 'code', appeals: 'id', reports: 'date', suggestions: 'id' }[type]
  const columns = columnSpecs[type].map(([title, dataIndex, width, format]) => ({
    title, dataIndex, key: dataIndex, width,
    customRender: (value, row) => {
      const content = format === 'date' ? (value || '').slice(0, 10) : (value == null || value === '' ? '—' : String(value))
      if (detail && dataIndex === linkKey) return h('a', { on: { click: () => detail(row) } }, content)
      if (format === 'status') return h(StatusTag, { props: { status: value } })
      if (format === 'appeal' && !detail && vm.openAppealDetail && vm.$store.db.appeals.some(a => a.id === row.appealId)) {
        return h('a', { on: { click: () => vm.openAppealDetail(row.appealId) } }, content)
      }
      const children = [h('div', { class: 'business-cell' }, content)]
      if (format === 'latest' && row.latestReportDate) children.push(h('div', { class: 'muted cell-sub' }, row.latestReportDate))
      if (format === 'due' && row.overdueText === '是') children.push(h('a-tag', { props: { color: 'red' } }, '超期'))
      return h('a-tooltip', { props: { title: content } }, [h('div', children)])
    }
  }))
  return [{ title: '序号', key: 'sequence', width: 60, align: 'center', customRender: (t, r, i) => ((pagination.current || 1) - 1) * pagination.pageSize + i + 1 }, ...columns]
}
