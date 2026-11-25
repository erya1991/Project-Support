import { beijingNow, todayStr, workdaysBetween } from '../utils/date'
import { nextCode } from '../utils/businessCodes'
import { PROJECT, DEPARTMENT, relationValues, syncExecutions, changeWorkStatus } from '../utils/serviceData'
import { pendingReport } from '../utils/reportData'
import { submitAppeal, reviewAppeal, requestClosure, submitSuggestion, replySuggestion } from '../utils/workflow'

export const SCHEMA_VERSION = 9

const SYSTEM_LIST = ['生产', '商法供', '科技', '财务审计', '综合', '党群纪检']

const DEPARTMENTS = [
  { id: 'D01', name: '工程管理部', system: '生产', managerId: 'M01', manager: '杜正华', managerPhone: '13805120101' },
  { id: 'D02', name: '安全生产监督管理部', system: '生产', managerId: 'M02', manager: '马卫东', managerPhone: '13805120102' },
  { id: 'D03', name: '机械设备管理部', system: '生产', managerId: 'M03', manager: '徐国梁', managerPhone: '13805120103' },
  { id: 'D04', name: '商务管理部', system: '商法供', managerId: 'M04', manager: '顾承宇', managerPhone: '13805120104' },
  { id: 'D05', name: '法律合规与风险管理部', system: '商法供', managerId: 'M05', manager: '宋立恒', managerPhone: '13805120105' },
  { id: 'D06', name: '供应链管理部', system: '商法供', managerId: 'M06', manager: '梁俊', managerPhone: '13805120106' },
  { id: 'D07', name: '科技质量部', system: '科技', managerId: 'M07', manager: '施远', managerPhone: '13805120107' },
  { id: 'D08', name: '工程研究院', system: '科技', managerId: 'M08', manager: '汪振', managerPhone: '13805120108' },
  { id: 'D09', name: '设计管理院', system: '科技', managerId: 'M09', manager: '崔宁', managerPhone: '13805120109' },
  { id: 'D10', name: '财务资金部', system: '财务审计', managerId: 'M10', manager: '龚志远', managerPhone: '13805120110' },
  { id: 'D11', name: '审计部', system: '财务审计', managerId: 'M11', manager: '傅立', managerPhone: '13805120111' },
  { id: 'D12', name: '办公室', system: '综合', managerId: 'M12', manager: '范晓川', managerPhone: '13805120112' },
  { id: 'D13', name: '人力资源部', system: '综合', managerId: 'M13', manager: '侯静', managerPhone: '13805120113' },
  { id: 'D14', name: '企业策划与管理部', system: '综合', managerId: 'M14', manager: '秦岚', managerPhone: '13805120114' },
  { id: 'D15', name: '党建工作部', system: '党群纪检', managerId: 'M15', manager: '殷红', managerPhone: '13805120115' },
  { id: 'D16', name: '工会工作部', system: '党群纪检', managerId: 'M16', manager: '虞芳', managerPhone: '13805120116' },
  { id: 'D17', name: '纪检监督工作部', system: '党群纪检', managerId: 'M17', manager: '鲁斌', managerPhone: '13805120117' }
]

const PEOPLE = [
  { id: 'P01', name: '林致远', deptId: 'D01', title: '工程管理高级经理', phone: '13805126631' },
  { id: 'P02', name: '周明轩', deptId: 'D01', title: '履约管理经理', phone: '13805126632' },
  { id: 'P03', name: '陈立衡', deptId: 'D02', title: '安全总监', phone: '13805126633' },
  { id: 'P04', name: '赵文博', deptId: 'D02', title: '安全生产管理经理', phone: '13805126634' },
  { id: 'P05', name: '孙嘉禾', deptId: 'D02', title: '机械设备安全经理', phone: '13805126635' },
  { id: 'P06', name: '吴启明', deptId: 'D03', title: '机械设备管理经理', phone: '13805126636' },
  { id: 'P07', name: '郑思远', deptId: 'D04', title: '商务管理经理', phone: '13805126637' },
  { id: 'P08', name: '何睿', deptId: 'D04', title: '商务成本经理', phone: '13805126638' },
  { id: 'P09', name: '冯少华', deptId: 'D05', title: '法律合规经理', phone: '13805126639' },
  { id: 'P10', name: '许卓', deptId: 'D06', title: '供应链管理经理', phone: '13805126640' },
  { id: 'P11', name: '邓一鸣', deptId: 'D06', title: '采购管理经理', phone: '13805126641' },
  { id: 'P12', name: '曹景行', deptId: 'D07', title: '科技质量管理经理', phone: '13805126642' },
  { id: 'P13', name: '彭宇', deptId: 'D08', title: '桥梁技术研究所所长', phone: '13805126643' },
  { id: 'P14', name: '唐建川', deptId: 'D09', title: '设计管理经理', phone: '13805126644' },
  { id: 'P15', name: '罗浩', deptId: 'D10', title: '财务资金经理', phone: '13805126645' },
  { id: 'P16', name: '苏婉宁', deptId: 'D13', title: '人力资源经理', phone: '13805126646' },
  { id: 'P17', name: '叶清和', deptId: 'D14', title: '企划业务经理', phone: '13805126647' },
  { id: 'P18', name: '江雨桐', deptId: 'D15', title: '党建宣传经理', phone: '13805126648' },
  { id: 'P19', name: '方大川', deptId: 'D16', title: '工会业务经理', phone: '13805126649' },
  { id: 'P20', name: '邵铭', deptId: 'D17', title: '纪检监督经理', phone: '13805126650' }
]

const MANAGERS = DEPARTMENTS.map((dept, index) => ({
  id: dept.managerId,
  name: dept.manager,
  deptId: dept.id,
  title: '部门负责人',
  phone: dept.managerPhone,
  isManager: true,
  order: index
}))

const PROJECTS = [
  { id: 'J01', name: '无锡深南电路', company: '华东分公司', manager: '白景涛', managerPhone: '13905130001' },
  { id: 'J02', name: '宁九高速公路', company: '华东分公司', manager: '袁海', managerPhone: '13905130002' },
  { id: 'J03', name: '弋南高速', company: '华中分公司', manager: '秦浩', managerPhone: '13905130003' },
  { id: 'J04', name: '奉贤1#海上光伏', company: '华东分公司', manager: '高海峰', managerPhone: '13905130004' },
  { id: 'J05', name: '吴江国测', company: '华东分公司', manager: '程晓明', managerPhone: '13905130005' },
  { id: 'J06', name: '綦江江苏省人民医院', company: '西南分公司', manager: '叶建平', managerPhone: '13905130006' },
  { id: 'J07', name: '104国道', company: '华东分公司', manager: '毛涛', managerPhone: '13905130007' },
  { id: 'J08', name: '陆家粮库改造', company: '华东分公司', manager: '石峰', managerPhone: '13905130008' },
  { id: 'J09', name: '万基铝业', company: '东北分公司', manager: '欧洋', managerPhone: '13905130009' },
  { id: 'J10', name: '建宁西路过江通道江南连接线三标', company: '华东分公司', manager: '吴凯', managerPhone: '13905130010' },
  { id: 'J11', name: '新疆外国语学院', company: '西北分公司', manager: '冯超', managerPhone: '13905130011' },
  { id: 'J12', name: '上海集成电路', company: '华东分公司', manager: '卢立', managerPhone: '13905130012' }
]

function organisation () {
  const departments = DEPARTMENTS.map(d => ({ ...d }))
  const people = [...PEOPLE, ...MANAGERS].map((p, i) => ({ ...p, orgType: '总部',
    employeeNo: (p.isManager ? 'GL' : 'HZ') + String(p.isManager ? i - PEOPLE.length + 1 : i + 1).padStart(4, '0') }))
  const projects = PROJECTS.map(p => ({ ...p }))
  const companies = [...new Set(projects.map(p => p.company))]
  const branchDepartments = []
  const managers = ['陈晓', '丁诚', '周嘉', '王立', '吴越', '刘敏', '蒋明', '杨帆', '郑博', '段文']
  companies.forEach((company, index) => {
    for (const [i, name] of ['工程管理部', '综合管理部'].entries()) {
      const seq = index * 2 + i
      const id = 'BD' + (seq + 1)
      const manager = managers[seq]
      const phone = '13805138' + String(seq + 1).padStart(3, '0')
      branchDepartments.push({ id, name, company, manager, managerPhone: phone })
      people.push({ id: 'B' + (seq + 1), name: manager, title: '分公司部门经理', orgType: '分公司', unitId: id, phone })
    }
  })
  for (const p of projects) {
    people.push({ id: 'PM' + p.id, name: p.manager, title: '项目经理', orgType: '项目', unitId: p.id, phone: p.managerPhone })
  }
  people.push({ id: 'B11', name: '顾溪', title: '综合管理员', orgType: '分公司', unitId: 'BD2' },
    { id: 'JP01', name: '徐诺', title: '项目工程师', orgType: '项目', unitId: 'J01' })
  return { systems: SYSTEM_LIST.slice(), departments, projects, companies, branchDepartments, people }
}

function seedProcesses (db, time) {
  const person = id => db.people.find(p => p.id === id)
  const scenarios = [
    ['JP01', 'D01', '雨季施工排水方案技术支持', '现场基坑进入雨季施工，请总部协助复核排水方案。', '待审批'],
    ['B11', 'D04', '材料集中采购合同评审', '分公司拟统一采购临设材料，请协助明确合同结算条款。', '办理中'],
    ['P01', 'D02', '深基坑监测资料复核', '请安全生产部门复核监测点位和报警值。', '待销项审批'],
    ['PMJ06', 'D07', '样板段技术交底指导', '项目首段即将施工，申请技术人员指导交底。', '已销项'],
    ['P03', 'D06', '设备调拨协调', '请协调相邻项目的闲置设备。', '已退回']
  ]
  for (const [authorId, deptId, title, desc, status] of scenarios) {
    const dept = db.departments.find(d => d.id === deptId)
    const manager = person(dept.managerId)
    submitAppeal(db, { deptId, title, desc, attachments: [], company: '华东分公司', type: PROJECT, unitId: 'J01' }, person(authorId), time(-5))
    const appeal = db.appeals[0]
    if (status === '待审批') continue
    reviewAppeal(db, appeal.id, '待审批', status !== '已退回', 'B11',
      status === '已退回' ? '请补充设备型号和使用时间。' : '请跟进办理。', manager, time(-4))
    if (['待销项审批', '已销项'].includes(status)) {
      requestClosure(db, appeal.id, { content: '协调工作已完成，结果已反馈现场。', date: time(-2).slice(0, 10),
        attachments: [{ name: '现场确认单.pdf' }] }, person('B11'), time(-2))
      if (status === '已销项') reviewAppeal(db, appeal.id, '待销项审批', true, '', '已确认办理结果。', manager, time(-1))
    }
  }
  for (const [authorId, deptId, title, flow, desc, decision] of [
    ['B11', 'D01', '统一月度履约检查表', '项目履约检查', '建议统一分公司检查表中的关键节点字段。', ''],
    ['JP01', 'D06', '调整季度采购申报时间', '物资采购申报', '建议与项目季度需求计划同步收集。', '改'],
    ['P06', 'D07', '合并两项技术复核', '技术方案复核', '建议合并同一施工部位的两次技术复核。', '不改']
  ]) {
    submitSuggestion(db, { deptId, title, flow, desc, attachments: [] }, person(authorId), time(-4))
    if (decision) {
      const manager = person(db.departments.find(d => d.id === deptId).managerId)
      replySuggestion(db, db.suggestions[0].id, { decision, comment: decision === '改' ? '纳入下一次制度更新。' : '两项复核分别对应不同安全责任。', deadline: '' }, manager, time(-2))
    }
  }
}

export function buildSeed () {
  const today = beijingNow().startOf('day')
  const date = offset => today.clone().add(offset, 'days').format('YYYY-MM-DD')
  const time = offset => date(offset) + ' 09:00'
  const db = { schemaVersion: SCHEMA_VERSION, ...organisation(), relations: [], works: [], dailyReports: [], appeals: [], suggestions: [] }
  const assignments = [
    ['P01', 'J01'], ['P01', 'J06'], ['P06', 'J01'], ['P03', 'J03'], ['P09', 'J05'],
    ['P10', 'J08'], ['P07', 'J09'], ['P18', 'J11'], ['P02', 'J12'],
    ['P16', 'BD1'], ['P01', 'BD2'], ['P17', 'BD1'], ['P13', 'J02']
  ]
  for (const [personId, targetId] of assignments) {
    const r = { id: nextCode(db.relations, 'BF', date(-30)), personId, type: targetId.startsWith('J') ? PROJECT : DEPARTMENT, targetId, status: '启用', history: [] }
    r.history.push({ time: time(-30), action: '新增', operator: '叶清和', values: relationValues(r) })
    if (personId === 'P13') {
      r.status = '停用'
      r.history.push({ time: time(-10), action: '停用', operator: '叶清和', values: relationValues(r) })
    }
    db.relations.push(r)
  }
  for (const [deptId, title, content, status] of [
    ['D01', '产值计划跟踪', '结合月度产值目标，说明当期完成情况及偏差原因。', '启用'],
    ['D02', '重大风险排查', '核查现场重大风险清单，反馈整改及复核情况。', '启用'],
    ['D04', '合同履约检查', '核对合同关键节点与实际履约进度，说明需协调的问题。', '启用'],
    ['D07', '项目策划复核', '对照策划书复核现场实施情况，记录待改进事项。', '启用'],
    ['D06', '专项物资盘点', '汇总现场主要物资库存及调拨需求。', '启用']
  ]) {
    db.works.push({ id: nextCode(db.works, 'ZDGZ', date(-12)), title, content, system: db.departments.find(d => d.id === deptId).system,
      deptId, status, createdAt: time(-12), creatorId: 'P17', executions: [] })
  }
  syncExecutions(db)
  db.works.forEach((work, i) => {
    const row = work.executions[i % work.executions.length]
    Object.assign(row, { firstBy: row.helpers[0], lastBy: row.helpers[0], firstAt: time(-3), lastAt: time(-2),
      content: '已与项目经理核对现场资料，完成本期检查并反馈整改意见。', attachments: [{ name: '项目落实记录.pdf' }] })
  })
  changeWorkStatus(db, db.works[4], '停用')
  const days = workdaysBetween(date(-10), todayStr())
  for (const day of days) {
    for (const personId of ['P01', 'P03', 'P06']) {
      if (day === todayStr() && personId === 'P01') continue
      const person = db.people.find(p => p.id === personId)
      const report = pendingReport(db, person, day, db.relations.filter(r => r.status === '启用'))
      const attend = personId !== 'P03'
      Object.assign(report, { status: '已提交', attend, submitTime: day + ' 09:00',
        projectNeeds: day.slice(5) + ' 协调周转材料调配，复核项目阶段计划。',
        absentReason: attend ? '' : '在总部参加安全专题会，远程跟进。',
        workContent: attend ? '1. 核查现场进度。\n2. 与项目经理确认下阶段材料需求。' : '',
        newIssues: attend ? '需协调下一批钢材进场时间。' : '无' })
      db.dailyReports.push(report)
    }
  }
  seedProcesses(db, time)
  return db
}
