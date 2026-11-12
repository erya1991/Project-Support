import moment from 'moment'
import { recentReportDays, todayStr } from '../utils/date'

const TODAY = moment().utcOffset(8).startOf('day')
const d = n => TODAY.clone().add(n, 'day').format('YYYY-MM-DD')
const t = (n, hm) => `${d(n)} ${hm}`
const hash = str => {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 4294967296
}
const pad = (n, len = 3) => String(n).padStart(len, '0')

export const CURRENT_USER_ID = 'P01'
export const PLANNER = { id: 'P17', name: '叶清和', deptName: '企业策划与管理部' }
export const ARCHIVER = { id: 'M14', name: '秦岚', deptName: '企业策划与管理部' }

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
  { id: 'J01', name: '无锡深南电路', manager: '白景涛', managerPhone: '13905130001', type: '房建', region: '江苏无锡', needs: '重点关注深南项目薪酬包干情况，需结合项目各阶段特点合理配置管理人员，统筹薪酬包干与人员结构，强化质量、安全、履约管理，确保满足抢工期间现场施工管理需求。' },
  { id: 'J02', name: '宁九高速公路', manager: '袁海', managerPhone: '13905130002', type: '公路', region: '江苏南京', needs: '1.项目专职机械工程师人员配置；2.公路安全标准化打造、安全策划修改；3.分包单位合同签订和人员配置到位并履职。' },
  { id: 'J03', name: '弋南高速', manager: '秦浩', managerPhone: '13905130003', type: '公路', region: '江西抚州', needs: '1.关注弋南高速项目中建智慧安全平台使用情况，保证平台数据真实同步；2.核实分包单位专职安监人员到岗履职情况；3.强化设备进场、转场、退场全流程验收管控。' },
  { id: 'J04', name: '奉贤1#海上光伏', manager: '高海峰', managerPhone: '13905130004', type: '新能源', region: '上海奉贤', needs: '如东金牛码头是海光项目展示的重要窗口，需要提高现场标准化管理水平，其中关于登高车、履带吊及吊梁等机械方面需请公司给予现场指导。' },
  { id: 'J05', name: '吴江国测', manager: '程晓明', managerPhone: '13905130005', type: '房建', region: '江苏苏州', needs: '1.与业主开展谈判，规避履约及资金风险；2.跟踪补充协议签署进展。' },
  { id: 'J06', name: '綦江江苏省人民医院', manager: '叶建平', managerPhone: '13905130006', type: '医疗', region: '重庆綦江', needs: '1.推动认质认价工作；2.开展EPC项目结算梳理；3.针对工期已延误的情况，制定工期计划与索赔资料。' },
  { id: 'J07', name: '104国道', manager: '毛涛', managerPhone: '13905130007', type: '公路', region: '浙江湖州', needs: '1.开展扣塔设计验算工作，编写实施方案；2.与设计对接，深化施工方案；3.针对跨运河段矮塔斜拉桥，加强施工环节管控。' },
  { id: 'J08', name: '陆家粮库改造', manager: '石峰', managerPhone: '13905130008', type: '改造', region: '江苏昆山', needs: '1.打造智能建造示范项目；2.总结改造项目工法；3.梳理项目物业管理存在的问题。' },
  { id: 'J09', name: '万基铝业', manager: '欧洋', managerPhone: '13905130009', type: '工业', region: '辽宁营口', needs: '1.项目潜亏风险梳理和化解；2.关注联合体单位的界面划分和施工进度；3.以11月份点火节点倒排工艺计划。' },
  { id: 'J10', name: '建宁西路过江通道江南连接线三标', manager: '吴凯', managerPhone: '13905130010', type: '市政', region: '江苏南京', needs: '1.项目文化示范点擂台赛筹备；2.项目宣传需求较多；3.临近双线贯通节点，需做好宣传系列策划。' },
  { id: 'J11', name: '新疆外国语学院', manager: '冯超', managerPhone: '13905130011', type: '房建', region: '新疆乌鲁木齐', needs: '1.业主已向分局发函，需着力提升客户满意度；2.做好资源保障，保障现场月度履约；3.梳理年底完工计划并做好过程跟踪。' },
  { id: 'J12', name: '上海集成电路', manager: '卢立', managerPhone: '13905130012', type: '厂房', region: '上海', needs: '1.项目非生产性支出复核；2.关注地铁移交，推动精装修施工进展，确保竣工节点。' }
]

const PRIMARY_PERSON = {
  J01: 'P01', J02: 'P03', J03: 'P04', J04: 'P01', J05: 'P09', J06: 'P07',
  J07: 'P13', J08: 'P12', J09: 'P08', J10: 'P18', J11: 'P02', J12: 'P20'
}

const RELATION_ITEMS = [
  ['P01', 'J01', '主责'], ['P06', 'J01', '协同'], ['P10', 'J01', '协同'], ['P15', 'J01', '协同'],
  ['P03', 'J02', '主责'], ['P11', 'J02', '协同'],
  ['P04', 'J03', '主责'], ['P19', 'J03', '协同'],
  ['P01', 'J04', '主责'], ['P05', 'J04', '协同'], ['P15', 'J04', '协同'],
  ['P09', 'J05', '主责'],
  ['P07', 'J06', '主责'], ['P08', 'J06', '协同'],
  ['P13', 'J07', '主责'],
  ['P12', 'J08', '主责'], ['P02', 'J08', '协同'],
  ['P08', 'J09', '主责'],
  ['P18', 'J10', '主责'], ['P15', 'J10', '协同'], ['P16', 'J10', '协同'],
  ['P02', 'J11', '主责'], ['P14', 'J11', '协同'],
  ['P20', 'J12', '主责'], ['P17', 'J12', '协同']
]

const WORK_SHEETS = [
  {
    deptId: 'D01',
    status: '已生效',
    dateOffset: -46,
    remark: '结合年度履约提升专项行动，梳理工程管理部本年度重点工作。',
    items: [
      {
        title: '推行项目前期策划标准化，建立策划评审与交底机制',
        leadId: 'P02',
        problem: '部分新开工项目前期策划深度不足，策划评审意见闭环不及时。',
        suggestion: '统一策划清单模板，明确开工前评审节点，由部门按月抽查策划执行情况。',
        execText: '完成前期策划清单模板修订，在新开工项目首次策划会上完成交底，形成评审记录并跟踪意见闭环。',
        projects: ['J01', 'J11'],
        status: '落实中'
      },
      {
        title: '强化产业类项目工期履约管控，建立月度预警清单',
        leadId: 'M01',
        problem: '产业类项目工期短、体量大，节点滞后预警不及时。',
        suggestion: '建立月度履约预警清单，对滞后节点明确纠偏措施和责任人。',
        execText: '建立产业类项目月度履约预警清单，完成三轮节点偏差分析，推动两个滞后节点恢复计划。',
        closeReason: '已形成产业类项目工期履约预警机制并在在建项目运行，节点偏差得到有效纠偏。',
        projects: ['J01'],
        status: '已销项'
      }
    ]
  },
  {
    deptId: 'D02',
    status: '已生效',
    dateOffset: -42,
    remark: '围绕安全生产治本攻坚三年行动，梳理部门年度重点工作。',
    items: [
      {
        title: '推广中建智慧安全平台全量应用，确保线上线下数据一致',
        leadId: 'P03',
        problem: '部分项目平台数据录入滞后，线上线下管控存在脱节。',
        suggestion: '按月通报平台应用情况，将数据真实性纳入项目安全考核。',
        execText: '完成平台应用专项检查，梳理数据异常项目清单，组织专题培训并建立月度通报机制。',
        projects: ['J02', 'J03'],
        status: '落实中'
      },
      {
        title: '开展分包单位专职安监人员到岗履职专项核查',
        leadId: 'P04',
        problem: '个别分包单位专职安监人员配备不足，现场履职记录不完整。',
        suggestion: '建立分包安监人员台账，进场前核验资质，按月核查履职记录。',
        execText: '完成分包单位专职安监人员台账核查，对3家未按合同配备人员的单位下发整改通知并跟踪到岗。',
        projects: ['J02', 'J03', 'J11'],
        status: '落实中'
      }
    ]
  },
  {
    deptId: 'D03',
    status: '已生效',
    dateOffset: -38,
    remark: '结合大型机械设备专项治理，梳理部门重点工作。',
    items: [
      {
        title: '完善大型机械设备进场、转场、退场全流程验收管控',
        leadId: 'P06',
        problem: '设备转场频繁，验收资料与现场实际不同步。',
        suggestion: '统一验收表单，明确各环节责任人和留存资料清单。',
        execText: '修订大型机械设备全流程验收表单，在无锡深南电路项目完成试点，设备转场验收资料实现一机一档。',
        projects: ['J01'],
        status: '落实中'
      },
      {
        title: '推进塔吊选型与布置标准化，压降设备安全风险',
        leadId: 'M03',
        problem: '项目塔吊选型与布置多依赖分包经验，方案比选不充分。',
        suggestion: '建立塔吊选型布置标准图集，推行安装前联合评审。',
        execText: '完成塔吊选型布置标准图集初稿，在3个在建项目开展安装前联合评审，压降群塔作业风险。',
        closeReason: '塔吊选型布置标准图集已完成并在新开工项目执行，安装前联合评审机制同步落地。',
        projects: ['J01', 'J11'],
        status: '销项审批中'
      }
    ]
  },
  {
    deptId: 'D04',
    status: '已生效',
    dateOffset: -51,
    remark: '围绕结算创效与潜亏治理，梳理商务管理部年度重点工作。',
    items: [
      {
        title: '推进EPC项目结算策划，建立过程结算节点台账',
        leadId: 'P07',
        problem: 'EPC项目结算前置策划不足，过程结算节点易遗漏。',
        suggestion: '开工即编制结算策划，按月度更新过程结算台账。',
        execText: '完成EPC项目结算策划模板编制，在綦江江苏省人民医院项目建立过程结算节点台账并按月更新。',
        closeReason: 'EPC项目结算策划模板及过程结算台账已在两个EPC项目运行，过程结算节点按期确权。',
        projects: ['J06', 'J11'],
        status: '已销项'
      },
      {
        title: '开展潜亏项目专项治理，落实一项目一策',
        leadId: 'P08',
        problem: '部分项目潜亏原因分析不深入，治理措施缺乏量化目标。',
        suggestion: '逐项目编制治理方案，明确扭亏目标和责任人，按季度复盘。',
        execText: '完成潜亏项目清单复核，组织万基铝业、綦江江苏省人民医院项目编制一项目一策治理方案。',
        projects: ['J06', 'J09'],
        status: '落实中'
      }
    ]
  },
  {
    deptId: 'D05',
    status: '审核中',
    dateOffset: -3,
    remark: '结合合规管理强化年活动，增补部门重点工作。',
    items: [
      {
        title: '强化联合体项目合同边界与履约风险联审',
        leadId: 'P09',
        problem: '联合体项目合同界面划分不清，履约风险易向公司传导。',
        suggestion: '建立联合体合同联审清单，商务、法务、工程联合评审。',
        execText: '待创建审批通过后组织实施。',
        projects: ['J06', 'J09'],
        status: '待生效'
      },
      {
        title: '建立长账龄应收账款法律风险跟踪机制',
        leadId: 'M05',
        problem: '长账龄应收账款法律风险识别滞后，处置手段单一。',
        suggestion: '按季度形成风险清单，分类制定函告、谈判、诉讼处置方案。',
        execText: '待创建审批通过后组织实施。',
        projects: [],
        status: '待生效'
      }
    ]
  },
  {
    deptId: 'D06',
    status: '已生效',
    dateOffset: -44,
    remark: '围绕资源保障与采购降本，梳理供应链管理部重点工作。',
    items: [
      {
        title: '推进分包分供集中采购，提升区域资源议价能力',
        leadId: 'P10',
        problem: '区域采购分散，同类资源价格差异较大。',
        suggestion: '按区域归集需求，推行集中招标和价格联动。',
        execText: '完成区域钢筋、混凝土需求归集，组织集中招标并形成区域指导价，平均采购成本下降约2%。',
        projects: ['J01', 'J05'],
        status: '落实中'
      },
      {
        title: '建立重点项目物资保供周报机制',
        leadId: 'P11',
        problem: '重点项目物资供应异常发现滞后，影响现场连续施工。',
        suggestion: '建立周报机制，对断供风险提前预警并明确替代方案。',
        execText: '建立重点项目物资保供周报机制，覆盖宁九高速、建宁西路过江通道等项目，累计预警并化解断供风险5项。',
        closeReason: '物资保供周报机制已覆盖全部重点项目并按周运行，断供风险实现提前预警。',
        projects: ['J02', 'J10'],
        status: '已销项'
      }
    ]
  },
  {
    deptId: 'D07',
    status: '已生效',
    dateOffset: -36,
    remark: '围绕质量提升与智能建造，梳理科技质量部重点工作。',
    items: [
      {
        title: '打造智能建造示范项目，形成可复制应用场景',
        leadId: 'P12',
        problem: '智能建造应用场景分散，缺乏系统性总结。',
        suggestion: '选取示范项目，梳理应用清单并形成推广手册。',
        execText: '在陆家粮库改造项目完成智能建造场景清单落地，形成包含12项应用场景的推广手册初稿。',
        projects: ['J08', 'J01'],
        status: '落实中'
      },
      {
        title: '开展住宅工程渗漏质量通病专项治理',
        leadId: 'M07',
        problem: '住宅项目渗漏问题仍有发生，细部做法执行不到位。',
        suggestion: '编制防渗漏标准做法图集，开展专项检查和样板验收。',
        execText: '完成防渗漏标准做法图集编制，在新疆外国语学院项目组织样板验收和专项检查。',
        projects: ['J11'],
        status: '落实中'
      }
    ]
  },
  {
    deptId: 'D08',
    status: '已生效',
    dateOffset: -48,
    remark: '围绕技术支撑与成果转化，梳理工程研究院重点工作。',
    items: [
      {
        title: '推广有限元分析等设计验算工具在项目落地应用',
        leadId: 'P13',
        problem: '项目技术人员对设计验算工具掌握不足，方案比选依赖外部单位。',
        suggestion: '组织专题培训，形成常用计算模板并下沉项目。',
        execText: '完成有限元分析软件培训3场，编制常用计算模板，指导104国道项目完成扣塔设计验算。',
        closeReason: '完成2轮专题培训并形成计算模板，104国道项目已独立完成扣塔验算，工具应用能力明显提升。',
        projects: ['J07'],
        status: '已销项'
      },
      {
        title: '总结大跨度桥梁施工关键技术并形成工法',
        leadId: 'P13',
        problem: '大跨度桥梁施工技术成果分散，未形成系统工法。',
        suggestion: '依托在建桥梁项目提炼关键技术，年内形成省级工法。',
        execText: '完成104国道矮塔斜拉桥和弋南高速桥梁施工技术总结，形成工法初稿并组织专家评审。',
        projects: ['J07', 'J03'],
        status: '落实中'
      }
    ]
  },
  {
    deptId: 'D09',
    status: '已退回',
    dateOffset: -6,
    remark: '结合设计管理提升，增补设计管理院重点工作。',
    items: [
      {
        title: '深化EPC项目设计优化，前移设计策划与概算管控',
        leadId: 'P14',
        problem: '设计优化介入时点偏晚，概算控制被动。',
        suggestion: '在方案阶段介入设计策划，建立概算动态对比表。',
        execText: '',
        projects: ['J06', 'J11'],
        status: '待生效'
      },
      {
        title: '建立图纸会审与图审问题闭环清单',
        leadId: 'M09',
        problem: '图纸问题多头反馈，闭环情况缺少统一台账。',
        suggestion: '统一问题清单模板，明确回复时限和责任人。',
        execText: '',
        projects: ['J11'],
        status: '待生效'
      }
    ]
  },
  {
    deptId: 'D10',
    status: '已生效',
    dateOffset: -47,
    remark: '围绕资金保障与费用管控，梳理财务资金部重点工作。',
    items: [
      {
        title: '保障重点项目资金支付，建立收款与支付联动机制',
        leadId: 'P15',
        problem: '项目收款与支付节奏不匹配，资金链存在阶段性压力。',
        suggestion: '建立收款支付联动表，按周平衡资金缺口。',
        execText: '建立重点项目收款支付联动表，协调完成无锡深南电路项目收款3190万元及供应链放款950万元。',
        projects: ['J01', 'J04', 'J10'],
        status: '落实中'
      },
      {
        title: '推进项目非生产性支出压降专项工作',
        leadId: 'M10',
        problem: '部分项目非生产性支出偏高，费用标准执行不统一。',
        suggestion: '开展专项复核，建立费用红线清单并纳入月度分析。',
        execText: '完成上海集成电路、陆家粮库改造项目非生产性支出复核，形成费用红线清单并在项目推行。',
        closeReason: '完成2个项目专项复核并建立费用红线清单，非生产性支出同比压降8%。',
        projects: ['J12', 'J08'],
        status: '已销项'
      }
    ]
  },
  {
    deptId: 'D11',
    status: '已生效',
    dateOffset: -40,
    remark: '围绕审计监督全覆盖，梳理审计部重点工作。',
    items: [
      {
        title: '开展项目过程审计，前移风险识别关口',
        leadId: 'M11',
        problem: '项目审计以竣工决算为主，过程风险发现偏晚。',
        suggestion: '选取重点项目开展过程审计，形成风险提示清单。',
        execText: '完成綦江江苏省人民医院、上海集成电路项目过程审计，形成风险提示清单23项并推动整改。',
        projects: ['J06', 'J12'],
        status: '落实中'
      },
      {
        title: '推进审计发现问题整改闭环',
        leadId: 'M11',
        problem: '审计整改台账更新不及时，部分问题重复发生。',
        suggestion: '建立整改销号机制，按月通报整改进度。',
        execText: '建立审计问题整改销号台账，按月通报整改进度，推动上年度遗留问题整改完成率达到92%。',
        projects: ['J06'],
        status: '落实中'
      }
    ]
  },
  {
    deptId: 'D12',
    status: '已生效',
    dateOffset: -49,
    remark: '围绕后勤服务保障，梳理办公室重点工作。',
    items: [
      {
        title: '提升项目物业服务管理水平，梳理后勤保障问题清单',
        leadId: 'M12',
        problem: '项目物业服务质量参差，员工诉求响应不及时。',
        suggestion: '建立问题清单和响应时限，开展季度满意度调查。',
        execText: '完成陆家粮库改造项目物业服务问题清单梳理，建立48小时响应机制并开展满意度调查。',
        closeReason: '项目物业服务问题清单及响应机制已建立，季度满意度调查得分提升至93分。',
        projects: ['J08'],
        status: '已销项'
      },
      {
        title: '规范项目公章使用与用印审批流程',
        leadId: 'M12',
        problem: '项目用印审批链条不清晰，存在先用后批情况。',
        suggestion: '统一用印审批流程，明确责任人和留存材料。',
        execText: '完成用印审批流程梳理，统一线上审批表单并在全部在建项目推行。',
        projects: [],
        status: '落实中'
      }
    ]
  },
  {
    deptId: 'D13',
    status: '已生效',
    dateOffset: -35,
    remark: '围绕人员配置与持证上岗，梳理人力资源部重点工作。',
    items: [
      {
        title: '优化产业类项目管理人员配置标准',
        leadId: 'P16',
        problem: '产业类项目周期短、体量大，管理人员配置标准不统一。',
        suggestion: '按项目类型和体量制定配置标准，动态调整。',
        execText: '完成产业类项目管理人员配置标准初稿，在无锡深南电路项目开展配置测算。',
        projects: ['J01'],
        status: '落实中'
      },
      {
        title: '推进项目关键岗位持证上岗专项检查',
        leadId: 'M13',
        problem: '个别项目关键岗位人员证书过期未及时更新。',
        suggestion: '建立证书到期预警台账，按季度开展专项检查。',
        execText: '完成关键岗位持证情况专项检查，建立证书到期预警台账，推动12人完成证书复审。',
        closeReason: '关键岗位持证专项检查已完成，证书到期预警台账实现按月更新，问题人员全部完成复审。',
        projects: ['J11', 'J10'],
        status: '销项审批中'
      }
    ]
  },
  {
    deptId: 'D14',
    status: '已生效',
    dateOffset: -39,
    remark: '围绕战略研究与绩效管理，梳理企业策划与管理部重点工作。',
    items: [
      {
        title: '总结城市更新类项目实施经验，支撑后续业务承接',
        leadId: 'P17',
        problem: '城市更新类项目经验分散，尚未形成系统性总结。',
        suggestion: '选取典型项目开展复盘，形成实施经验手册。',
        execText: '完成城市更新类项目实施经验调研，形成包含投资、融资、运营三个维度的经验总结初稿。',
        projects: [],
        status: '落实中'
      },
      {
        title: '完善项目绩效考核指标体系',
        leadId: 'M14',
        problem: '现行考核指标偏重产值，履约和质量权重不足。',
        suggestion: '优化指标权重，增加履约、质量、安全类指标。',
        execText: '完成项目绩效考核指标修订方案，调整履约、质量、安全指标权重并组织征求意见。',
        projects: [],
        status: '落实中'
      }
    ]
  },
  {
    deptId: 'D15',
    status: '已生效',
    dateOffset: -45,
    remark: '围绕党建与生产经营融合，梳理党建工作部重点工作。',
    items: [
      {
        title: '推进项目文化示范点创建与品牌宣传策划',
        leadId: 'P18',
        problem: '项目宣传策划前瞻性不足，示范点创建标准不统一。',
        suggestion: '建立示范点创建清单，提前介入项目宣传策划。',
        execText: '完成建宁西路过江通道项目文化示范点创建方案，组织参加局项目文化示范点擂台赛并获评示范点。',
        closeReason: '项目文化示范点创建完成并获评局级示范点，形成可复制的创建清单和宣传策划模板。',
        projects: ['J10'],
        status: '已销项'
      },
      {
        title: '深化项目党支部标准化规范化建设',
        leadId: 'M15',
        problem: '部分项目党支部组织生活记录不规范。',
        suggestion: '统一党支部工作手册，开展季度检查指导。',
        execText: '统一项目党支部工作手册，完成宁九高速、建宁西路过江通道项目党支部季度检查指导。',
        projects: ['J02', 'J10'],
        status: '落实中'
      }
    ]
  },
  {
    deptId: 'D16',
    status: '已生效',
    dateOffset: -43,
    remark: '围绕员工关爱与劳动竞赛，梳理工会工作部重点工作。',
    items: [
      {
        title: '建设项目工会工作站，提升一线员工关心关怀',
        leadId: 'P19',
        problem: '项目工会工作站建设标准不统一，服务功能不完善。',
        suggestion: '制定工作站建设标准，完善健康、文化、维权服务功能。',
        execText: '完成弋南高速项目工会工作站建设并报局工会验收，配套建设员工书屋和健康角。',
        closeReason: '弋南高速项目工会工作站通过局工会验收，服务功能配置齐全，形成建设标准模板。',
        projects: ['J03'],
        status: '已销项'
      },
      {
        title: '组织重点项目劳动竞赛，助力履约攻坚',
        leadId: 'M16',
        problem: '劳动竞赛与项目履约节点结合不紧密。',
        suggestion: '围绕关键节点设置竞赛目标，强化过程激励。',
        execText: '组织建宁西路过江通道、新疆外国语学院项目劳动竞赛，围绕双线贯通和年底完工节点设置竞赛目标。',
        projects: ['J10', 'J11'],
        status: '落实中'
      }
    ]
  },
  {
    deptId: 'D17',
    status: '审核中',
    dateOffset: -2,
    remark: '结合廉洁风险防控，增补纪检监督工作部重点工作。',
    items: [
      {
        title: '开展项目非生产性支出监督检查',
        leadId: 'P20',
        problem: '项目非生产性支出监督以事后检查为主，过程监督不足。',
        suggestion: '建立月度抽查机制，重点关注招待、车辆、办公费用。',
        execText: '待创建审批通过后组织实施。',
        projects: ['J12'],
        status: '待生效'
      },
      {
        title: '推进廉洁风险防控清单在项目落地',
        leadId: 'M17',
        problem: '廉洁风险防控清单与项目岗位职责结合不紧密。',
        suggestion: '按岗位细化风险点和防控措施，纳入项目日常管理。',
        execText: '待创建审批通过后组织实施。',
        projects: ['J10', 'J12'],
        status: '待生效'
      }
    ]
  }
]

const APPEAL_SEED = [
  { projectId: 'J01', personId: 'P01', title: '施工许可办理后渣土准运证及土场落实', desc: '项目已于10月29日取得施工许可证，现场土方外运受渣土准运证及土场落实制约，存在窝工风险。期望总部协调属地资源，尽快明确土场并完成准运证办理。', plan: '1.对接属地城管部门明确准运证办理材料；2.协调就近土场并确认容量；3.跟踪首车出土时间。', dueOffset: 5, source: '项目反馈', status: '办理中', createdOffset: -9 },
  { projectId: 'J01', personId: 'P01', title: '桩基小应变检测范围及静载试验方案确定', desc: '桩基施工已完成，小应变、大应变及静载试验范围尚未确定，影响后续承台施工穿插。期望明确检测比例和试验点位。', plan: '1.组织检测单位与设计确认检测方案；2.报监理及业主审批；3.按批准方案组织检测。', dueOffset: 8, source: '工程部梳理', status: '办理中', createdOffset: -7 },
  { projectId: 'J01', personId: 'P06', title: '塔吊安装前置条件核查与检测资料归档', desc: '项目计划投入28台塔吊，首批塔吊安装前需完成方案审批、人员资质核验和检测资料归档，现场资料尚不完整。', plan: '1.核对安装方案与人员资质；2.完成设备检测资料收集；3.组织安装前联合验收。', dueOffset: 3, source: '项目反馈', status: '办理中', createdOffset: -6 },
  { projectId: 'J01', personId: 'P10', title: '钢筋、混凝土分包付款比例调整谈判', desc: '项目周期短、分包商谈判意愿不高，付款比例调整方案尚未达成一致，影响资源锁定。', plan: '1.梳理分包商诉求；2.参考南通深南项目经验拟定方案；3.组织集中谈判并锁定价格。', dueOffset: 7, source: '现场', status: '办理中', createdOffset: -8 },
  { projectId: 'J01', personId: 'P15', title: '项目收款与供应链放款衔接', desc: '项目收款进度与供应链放款节奏不匹配，存在资金断档风险。', plan: '1.跟踪业主付款节点；2.协调供应链金融放款；3.建立周度资金平衡表。', dueOffset: -2, source: '日报', status: '办理中', createdOffset: -12 },
  { projectId: 'J01', personId: 'P01', title: '产业类项目实施指南编制', desc: '产业类项目工期短、体量大、监管严，需系统总结全过程管理经验及业主关注事项，形成实施指南。', plan: '1.梳理在建产业类项目共性问题；2.组织专题研讨；3.编制实施指南并评审发布。', dueOffset: 20, source: '工程部梳理', status: '已销项', createdOffset: -28 },
  { projectId: 'J02', personId: 'P03', title: '公路安全标准化策划修改', desc: '项目安全标准化策划需结合公路项目特点修改完善，现有策划与现场实际存在偏差。', plan: '1.现场踏勘核对风险点；2.修订安全策划；3.组织交底并跟踪实施。', dueOffset: 8, source: '项目反馈', status: '办理中', createdOffset: -10 },
  { projectId: 'J02', personId: 'P11', title: '苏南建设与中建基物资合同签订', desc: '苏南建设与中建基物资合同尚未签订，影响物资集中采购和供应。', plan: '1.核对合同条款；2.组织双方谈判；3.完成合同签订和备案。', dueOffset: 2, source: '现场', status: '办理中', createdOffset: -5 },
  { projectId: 'J03', personId: 'P04', title: '中建智慧安全平台数据同步', desc: '项目平台数据录入滞后，线上线下管控存在脱节，部分危险作业流程未提前发起。', plan: '1.梳理平台使用问题；2.组织分包单位培训；3.建立日检查周通报机制。', dueOffset: -1, source: '日报', status: '办理中', createdOffset: -11 },
  { projectId: 'J03', personId: 'P19', title: '工会工作站建设验收', desc: '项目工会工作站建设材料已报局工会审核，需完成现场验收并完善服务功能。', plan: '1.补充工作站建设材料；2.对接局工会验收；3.完善书屋和健康角配置。', dueOffset: 9, source: '项目反馈', status: '待受理', createdOffset: -2 },
  { projectId: 'J04', personId: 'P01', title: '海上光伏项目现场标准化提升', desc: '项目现场标准化管理水平需进一步提升，以满足分局和局检查要求。', plan: '1.对照标准化检查表自查；2.形成整改清单；3.组织复查并固化标准。', dueOffset: 10, source: '工程部梳理', status: '办理中', createdOffset: -9 },
  { projectId: 'J04', personId: 'P05', title: '登高车、履带吊现场指导', desc: '项目登高车、履带吊及吊梁等机械作业需公司给予现场技术指导，确保作业安全。', plan: '1.组织机械专家现场指导；2.检查设备及人员资质；3.形成指导纪要并跟踪落实。', dueOffset: 4, source: '项目反馈', status: '办理中', createdOffset: -4 },
  { projectId: 'J04', personId: 'P15', title: '项目资金支付比例与收款联动', desc: '项目资金需求突出，需结合收款比例确定支付比例，保障项目连续生产。', plan: '1.测算资金缺口；2.协调业主加快收款；3.建立支付联动方案。', dueOffset: 6, source: '日报', status: '销项审批中', createdOffset: -18 },
  { projectId: 'J05', personId: 'P09', title: '业主补充协议谈判及履约风险', desc: '项目与业主就补充协议条款尚未达成一致，存在履约及资金风险。', plan: '1.梳理争议条款；2.组织谈判；3.完成协议签署并跟踪履行。', dueOffset: 12, source: '项目反馈', status: '办理中', createdOffset: -14 },
  { projectId: 'J05', personId: 'P09', title: '长账龄应收账款法律风险跟踪', desc: '项目存在长账龄应收账款，需评估法律风险并制定处置措施。', plan: '1.梳理账款账龄；2.发送律师函；3.视情况启动诉讼程序。', dueOffset: -5, source: '工程部梳理', status: '办理中', createdOffset: -21 },
  { projectId: 'J06', personId: 'P07', title: '认质认价及EPC结算梳理', desc: '项目认质认价工作推进缓慢，EPC结算基础资料不完整。', plan: '1.梳理未认质认价材料清单；2.组织业主及监理确认；3.完成结算资料归集。', dueOffset: 15, source: '项目反馈', status: '已销项', createdOffset: -32 },
  { projectId: 'J06', personId: 'P08', title: '工期延误索赔资料编制', desc: '项目工期已延误，需系统编制工期计划和索赔资料，维护公司权益。', plan: '1.梳理延误事件；2.编制工期索赔报告；3.报业主及监理确认。', dueOffset: 18, source: '现场', status: '销项审批中', createdOffset: -25 },
  { projectId: 'J06', personId: 'P07', title: '医疗专项分包界面划分', desc: '医疗专项分包与总包界面划分不清，存在交叉作业和费用争议。', plan: '1.组织界面划分专题会；2.形成界面划分表；3.签订补充协议。', dueOffset: 11, source: '项目反馈', status: '办理中', createdOffset: -6 },
  { projectId: 'J07', personId: 'P13', title: '扣塔设计验算与实施方案', desc: '跨运河段矮塔斜拉桥扣塔设计验算尚未完成，实施方案需进一步深化。', plan: '1.完成扣塔设计验算；2.编制实施方案；3.组织专家评审。', dueOffset: 5, source: '工程部梳理', status: '办理中', createdOffset: -8 },
  { projectId: 'J08', personId: 'P12', title: '智能建造示范项目场景落地', desc: '项目智能建造应用场景需进一步落地，形成可展示、可复制的示范成果。', plan: '1.明确应用场景清单；2.组织设备和平台部署；3.总结形成推广手册。', dueOffset: 25, source: '项目反馈', status: '办理中', createdOffset: -16 },
  { projectId: 'J08', personId: 'P02', title: '物业后勤问题清单梳理', desc: '项目物业管理存在问题，需系统梳理并明确整改责任。', plan: '1.开展员工满意度调查；2.梳理问题清单；3.明确整改时限和责任人。', dueOffset: 11, source: '日报', status: '已销项', createdOffset: -26 },
  { projectId: 'J09', personId: 'P08', title: '潜亏风险梳理与化解', desc: '项目存在潜亏风险，需梳理原因并制定化解措施，确保点火节点目标。', plan: '1.完成潜亏原因分析；2.制定一项目一策方案；3.按月跟踪扭亏进展。', dueOffset: 30, source: '工程部梳理', status: '办理中', createdOffset: -19 },
  { projectId: 'J10', personId: 'P18', title: '项目文化示范点擂台赛筹备', desc: '项目将代表公司参加局项目文化示范点擂台赛，需完成材料编制和现场展示准备。', plan: '1.编制创建方案；2.制作展示材料；3.组织现场彩排。', dueOffset: 3, source: '项目反馈', status: '办理中', createdOffset: -7 },
  { projectId: 'J10', personId: 'P15', title: '双线贯通节点资金保障', desc: '项目临近双线贯通节点，资金保障需进一步落实，确保履约正常。', plan: '1.测算节点资金需求；2.协调业主计量支付；3.落实供应链融资。', dueOffset: 7, source: '日报', status: '已销项', createdOffset: -30 },
  { projectId: 'J10', personId: 'P16', title: '项目人员配置与薪酬包干跟踪', desc: '项目人员配置与薪酬包干执行情况需跟踪评估，确保与项目阶段特点匹配。', plan: '1.核对人员配置台账；2.评估薪酬包干执行；3.提出优化建议。', dueOffset: 16, source: '工程部梳理', status: '办理中', createdOffset: -13 },
  { projectId: 'J11', personId: 'P02', title: '幕墙图纸审查与热力招标推进', desc: '项目幕墙图纸审查和热力招标进度滞后，影响年底完工计划。', plan: '1.组织幕墙图纸审查；2.推进热力招标；3.跟踪定标和进场。', dueOffset: 6, source: '项目反馈', status: '办理中', createdOffset: -9 },
  { projectId: 'J11', personId: 'P14', title: '智能化图纸问题修改与图审', desc: '智能化图纸存在较多问题，业主图审顾问提出的意见需尽快回复修改。', plan: '1.梳理图审意见；2.组织设计修改；3.完成图纸汇总报审。', dueOffset: 4, source: '现场', status: '销项审批中', createdOffset: -17 },
  { projectId: 'J12', personId: 'P20', title: '非生产性支出复核', desc: '项目非生产性支出需开展专项复核，核实费用合规性和合理性。', plan: '1.调取费用台账；2.开展现场复核；3.形成复核报告并督促整改。', dueOffset: 14, source: '工程部梳理', status: '待受理', createdOffset: -3 },
  { projectId: 'J12', personId: 'P17', title: '竣工节点精装修施工推进', desc: '项目临近竣工节点，精装修施工进度需进一步推进，地铁移交界面尚需协调。', plan: '1.梳理精装修剩余工程量；2.协调地铁移交；3.按周跟踪竣工节点。', dueOffset: 20, source: '项目反馈', status: '已销项', createdOffset: -34 },
  { projectId: 'J12', personId: 'P17', title: '地铁移交界面协调', desc: '项目与地铁单位移交界面尚未明确，影响精装修和机电施工穿插。', plan: '1.组织界面协调会；2.形成移交清单；3.跟踪移交完成。', dueOffset: 9, source: '日报', status: '办理中', createdOffset: -10 }
]

const SUGGESTION_SEED = [
  {
    title: '建立项目诉求跨部门协同响应时限',
    flow: '项目诉求办理流程',
    desc: '目前项目诉求转协同部门后缺少明确响应时限，容易出现久拖不决。建议明确协同部门3个工作日内反馈初步意见。',
    proposerId: 'P01',
    deptId: 'D14',
    confirmerIds: ['M14'],
    status: '待确认',
    createdOffset: -4
  },
  {
    title: '优化日报填报字段，减少重复录入',
    flow: '总部人员服务诉求日报填报',
    desc: '日报中项目层面服务需求与诉求进展存在重复填写，建议按项目自动带出诉求清单，减少手工录入工作量。',
    proposerId: 'P03',
    deptId: 'D14',
    confirmerIds: ['M14'],
    status: '待确认',
    createdOffset: -6
  },
  {
    title: '明确帮扶关系调整期间的诉求移交规则',
    flow: '帮扶关系配置与调整流程',
    desc: '关系调整时未办结诉求的责任归属不清晰，建议在关系失效前强制完成诉求移交或明确后续责任人。',
    proposerId: 'P09',
    deptId: 'D01',
    confirmerIds: ['M01'],
    status: '待确认',
    createdOffset: -8
  },
  {
    title: '统一项目周报数据统计口径',
    flow: '服务项目周报汇总',
    desc: '周报中到岗人次与诉求销项数存在多口径统计，建议明确以日报提交数据为唯一来源，避免重复统计。',
    proposerId: 'P17',
    deptId: 'D14',
    confirmerIds: ['M14'],
    status: '已回复',
    createdOffset: -15,
    reply: {
      adopt: '改',
      reason: '',
      plan: '由企划部牵头梳理周报统计口径，形成口径说明并在系统中固化取数规则。',
      deadlineOffset: 12,
      replyOffset: -9
    }
  },
  {
    title: '建立重点项目物资保供周报机制',
    flow: '项目物资供应保障管理',
    desc: '重点项目物资供应异常发现偏晚，建议建立周报机制，对断供风险提前预警并明确替代方案。',
    proposerId: 'P11',
    deptId: 'D06',
    confirmerIds: ['M06'],
    status: '已回复',
    createdOffset: -20,
    reply: {
      adopt: '改',
      reason: '',
      plan: '建立重点项目物资保供周报模板，覆盖全部重点项目，每周五汇总上报。',
      deadlineOffset: 8,
      replyOffset: -14
    }
  },
  {
    title: '统一项目诉求编号规则',
    flow: '项目诉求办理流程',
    desc: '各项目诉求编号规则不统一，跨项目检索时容易混淆。建议统一编号前缀和流水号规则，便于台账查询和导出。',
    proposerId: 'P04',
    deptId: 'D14',
    confirmerIds: ['M14'],
    status: '已回复',
    createdOffset: -17,
    reply: {
      adopt: '不改',
      reason: '现行诉求编号由系统按年度自动生成，已满足唯一性要求，暂不调整编号规则。',
      plan: '',
      deadlineOffset: null,
      replyOffset: -12
    }
  },
  {
    title: '完善产业类项目管理人员配置标准',
    flow: '项目人员配置管理',
    desc: '产业类项目周期短、体量大，现有管理人员配置标准与实际需求不匹配，建议按项目类型和体量分类制定标准。',
    proposerId: 'P16',
    deptId: 'D13',
    confirmerIds: ['M13'],
    status: '已归档',
    createdOffset: -33,
    reply: {
      adopt: '改',
      reason: '',
      plan: '人力资源部牵头修订产业类项目管理人员配置标准，明确不同体量项目的岗位和人数配置。',
      deadlineOffset: 15,
      replyOffset: -25
    },
    archivedOffset: -22
  },
  {
    title: '在项目考核中增加帮扶工作权重',
    flow: '项目绩效考核管理',
    desc: '建议将总部帮扶工作成效纳入项目绩效考核，提升项目对帮扶工作的重视程度。',
    proposerId: 'P02',
    deptId: 'D14',
    confirmerIds: ['M14'],
    status: '已归档',
    createdOffset: -38,
    reply: {
      adopt: '不改',
      reason: '涉及公司项目考核体系整体调整，需专题研究后统筹考虑，本期暂不纳入。',
      plan: '',
      deadlineOffset: null,
      replyOffset: -30
    },
    archivedOffset: -27
  }
]

const FEEDBACK_TEXTS = [
  '已与项目班子对接，明确本周推进节点和责任人，相关事项按计划推进。',
  '组织专题会研究办理方案，完成资料收集并报部门审核。',
  '协调相关部门现场踏勘，形成初步处理意见，待项目确认。',
  '完成与业主的沟通，取得阶段性答复，后续持续跟踪落实。',
  '梳理办理过程中的堵点，调整推进计划并报责任人确认。',
  '现场核查完成，相关问题已纳入整改清单并明确完成时限。'
]

const WORK_CONTENTS = [
  '赴项目现场检查施工进度与安全文明施工情况，协调解决模板周转材料进场问题。',
  '与项目班子梳理本周履约计划，跟踪分包单位人员到岗及材料供应情况。',
  '组织专题会议研究项目结算及认质认价推进事项，明确责任人和完成节点。',
  '远程核对项目日报数据，梳理需总部协调的资源事项并反馈相关部门。',
  '检查项目质量样板引路实施情况，跟踪上周质量问题整改闭环。',
  '配合项目完成业主检查迎检准备，整理汇报材料及现场整改清单。',
  '跟进项目资金支付及收款进度，协调供应链资源保障现场连续施工。',
  '开展项目机械设备专项检查，核实塔吊安装前条件及人员资质。',
  '参加项目周例会，梳理设计变更与图纸问题，明确下周出图计划。',
  '走访项目现场，了解员工后勤保障情况并协调解决住宿及餐饮问题。'
]

const ABSENT_REASONS = [
  '今日在公司总部参加部门月度例会，未到项目现场，已通过电话与项目沟通当日工作。',
  '参加公司安全总监例会，项目工作已交接项目班子跟进。',
  '按计划返岗处理部门事务，项目现场工作由项目班子按计划推进。',
  '今日在分公司参加结算专题会，未能前往项目现场。'
]

function personInfo (id) {
  const p = PEOPLE.find(x => x.id === id)
  if (p) return p
  return MANAGERS.find(x => x.id === id)
}

function deptOf (id) {
  return DEPARTMENTS.find(x => x.id === id)
}

function projectOf (id) {
  return PROJECTS.find(x => x.id === id)
}

function dayValue (offset, hm) {
  return `${d(offset)} ${hm || '09:00'}`
}

function buildRelationNodes (status, offset) {
  if (status === '待审批') {
    return [
      { key: 'eng', name: '工程管理部审批', approver: '杜正华', result: '通过', time: dayValue(offset, '10:20'), comment: '人员与项目匹配，同意配置。' },
      { key: 'plan', name: '企划部审批', approver: '秦岚', result: '待处理', time: '', comment: '' }
    ]
  }
  if (status === '已驳回') {
    return [
      { key: 'eng', name: '工程管理部审批', approver: '杜正华', result: '通过', time: dayValue(offset, '09:40'), comment: '同意提交联合审批。' },
      { key: 'plan', name: '企划部审批', approver: '秦岚', result: '退回', time: dayValue(offset + 1, '15:10'), comment: '项目人员配置已调整，请核实后重新提交。' }
    ]
  }
  return [
    { key: 'eng', name: '工程管理部审批', approver: '杜正华', result: '通过', time: dayValue(offset, '10:10'), comment: '同意配置。' },
    { key: 'plan', name: '企划部审批', approver: '秦岚', result: '通过', time: dayValue(offset + 1, '09:30'), comment: '已核对人员与项目信息，同意生效。' }
  ]
}

function buildRelations () {
  const list = []
  let seq = 1
  RELATION_ITEMS.forEach(([personId, projectId, role]) => {
    const person = personInfo(personId)
    const project = projectOf(projectId)
    list.push({
      id: `BF2026${pad(seq, 4)}`,
      batchId: `B2026${pad(seq, 4)}`,
      personId,
      personName: person.name,
      deptId: person.deptId,
      deptName: deptOf(person.deptId).name,
      projectId,
      projectName: project.name,
      projectManager: project.manager,
      role,
      startDate: d(-120),
      endDate: d(240),
      plannerId: PLANNER.id,
      plannerName: PLANNER.name,
      remark: '根据年度服务项目安排配置。',
      status: '已生效',
      createdAt: dayValue(-119, '09:00'),
      approvals: buildRelationNodes('已生效', -119),
      history: [
        { time: dayValue(-119, '08:40'), action: '创建配置', operator: PLANNER.name, remark: '提交联合审批。' },
        { time: dayValue(-118, '09:30'), action: '审批生效', operator: '秦岚', remark: '联合审批通过，关系生效。' }
      ]
    })
    seq += 1
  })

  const pendingBatch = 'B20261111001'
  ;[
    ['P07', 'J01', '协同'],
    ['P16', 'J03', '协同']
  ].forEach(([personId, projectId, role], index) => {
    const person = personInfo(personId)
    const project = projectOf(projectId)
    list.push({
      id: `BF2026${pad(seq, 4)}`,
      batchId: pendingBatch,
      personId,
      personName: person.name,
      deptId: person.deptId,
      deptName: deptOf(person.deptId).name,
      projectId,
      projectName: project.name,
      projectManager: project.manager,
      role,
      startDate: d(3),
      endDate: d(240),
      plannerId: PLANNER.id,
      plannerName: PLANNER.name,
      remark: '项目提出增加商务、人力专业协同支持。',
      status: '待审批',
      createdAt: dayValue(-2, '14:00'),
      approvals: buildRelationNodes('待审批', -2),
      history: [
        { time: dayValue(-2, '13:40'), action: '创建配置', operator: PLANNER.name, remark: '提交工程管理部、企划部联合审批。' }
      ]
    })
    seq += 1
  })

  const rejectedPerson = personInfo('P20')
  const rejectedProject = projectOf('J04')
  list.push({
    id: `BF2026${pad(seq, 4)}`,
    batchId: 'B20261105001',
    personId: 'P20',
    personName: rejectedPerson.name,
    deptId: rejectedPerson.deptId,
    deptName: deptOf(rejectedPerson.deptId).name,
    projectId: 'J04',
    projectName: rejectedProject.name,
    projectManager: rejectedProject.manager,
    role: '协同',
    startDate: d(-1),
    endDate: d(120),
    plannerId: PLANNER.id,
    plannerName: PLANNER.name,
    remark: '项目提出增加纪检监督协同。',
    status: '已驳回',
    createdAt: dayValue(-6, '10:00'),
    approvals: buildRelationNodes('已驳回', -6),
    history: [
      { time: dayValue(-6, '09:50'), action: '创建配置', operator: PLANNER.name, remark: '提交联合审批。' },
      { time: dayValue(-5, '15:10'), action: '审批退回', operator: '秦岚', remark: '项目人员配置已调整，请核实后重新提交。' }
    ]
  })
  seq += 1

  const expiredPerson = personInfo('P10')
  const expiredProject = projectOf('J09')
  list.push({
    id: `BF2026${pad(seq, 4)}`,
    batchId: 'B20260512001',
    personId: 'P10',
    personName: expiredPerson.name,
    deptId: expiredPerson.deptId,
    deptName: deptOf(expiredPerson.deptId).name,
    projectId: 'J09',
    projectName: expiredProject.name,
    projectManager: expiredProject.manager,
    role: '协同',
    startDate: d(-220),
    endDate: d(-30),
    plannerId: PLANNER.id,
    plannerName: PLANNER.name,
    remark: '上一服务周期配置，项目服务期结束。',
    status: '已失效',
    createdAt: dayValue(-219, '09:00'),
    approvals: buildRelationNodes('已生效', -219),
    history: [
      { time: dayValue(-219, '08:40'), action: '创建配置', operator: PLANNER.name, remark: '提交联合审批。' },
      { time: dayValue(-218, '09:30'), action: '审批生效', operator: '秦岚', remark: '联合审批通过，关系生效。' },
      { time: dayValue(-30, '17:20'), action: '关系失效', operator: PLANNER.name, remark: '项目服务期结束，关系自动失效，历史记录保留。' }
    ]
  })

  return list
}

function buildSheetsAndWorks () {
  const sheets = []
  const works = []
  let sheetSeq = 1
  let workSeq = 1
  let closeSeq = 1

  WORK_SHEETS.forEach(def => {
    const dept = deptOf(def.deptId)
    const createdAt = dayValue(def.dateOffset, '09:30')
    const sheet = {
      id: `SL2026${pad(sheetSeq, 3)}`,
      system: dept.system,
      deptId: dept.id,
      deptName: dept.name,
      creatorId: PLANNER.id,
      creatorName: PLANNER.name,
      createDate: d(def.dateOffset),
      remark: def.remark,
      status: def.status,
      createdAt,
      items: [],
      approvals: []
    }
    if (def.status === '已生效') {
      sheet.approvals = [
        { key: 'head', name: '部门负责人审核', approver: dept.manager, result: '通过', time: dayValue(def.dateOffset, '14:20'), comment: '同意纳入部门年度重点工作。' },
        { key: 'plan', name: '企划部审核', approver: '秦岚', result: '通过', time: dayValue(def.dateOffset + 1, '10:00'), comment: '内容完整，同意生效。' }
      ]
    } else if (def.status === '审核中') {
      sheet.approvals = [
        { key: 'head', name: '部门负责人审核', approver: dept.manager, result: '通过', time: dayValue(def.dateOffset, '16:00'), comment: '同意提交。' },
        { key: 'plan', name: '企划部审核', approver: '秦岚', result: '待处理', time: '', comment: '' }
      ]
    } else {
      sheet.approvals = [
        { key: 'head', name: '部门负责人审核', approver: dept.manager, result: '通过', time: dayValue(def.dateOffset, '10:30'), comment: '同意提交。' },
        { key: 'plan', name: '企划部审核', approver: '秦岚', result: '退回', time: dayValue(def.dateOffset + 1, '11:20'), comment: '部分工作缺少可量化目标，请补充完善后重新提交。' }
      ]
    }

    def.items.forEach((item, index) => {
      const lead = personInfo(item.leadId) || deptOf(item.leadId)
      const leadName = lead ? lead.name : dept.manager
      const leadDept = lead && lead.deptId ? lead.deptId : dept.id
      const sheetItem = {
        id: `SLI${pad(sheetSeq, 3)}${index + 1}`,
        seq: index + 1,
        title: item.title,
        leadId: item.leadId,
        leadName,
        leadDeptId: leadDept,
        problem: item.problem,
        suggestion: item.suggestion
      }
      sheet.items.push(sheetItem)

      if (def.status === '已退回') return

      const status = def.status === '审核中' ? '待生效' : item.status
      const executions = []
      if (status !== '待生效') {
        if (item.projects && item.projects.length) {
          item.projects.forEach(pid => {
            const project = projectOf(pid)
            const execPerson = personInfo(PRIMARY_PERSON[pid])
            executions.push({
              id: `GZE${pad(workSeq, 3)}${pid}`,
              scope: 'project',
              projectId: pid,
              projectName: project.name,
              personId: execPerson.id,
              personName: execPerson.name,
              content: `${project.name}：${item.execText}`,
              updatedAt: dayValue(def.dateOffset + 6, '17:40'),
              attachments: []
            })
          })
        } else {
          executions.push({
            id: `GZE${pad(workSeq, 3)}C`,
            scope: 'company',
            projectId: '',
            projectName: '',
            personId: item.leadId,
            personName: leadName,
            content: item.execText,
            updatedAt: dayValue(def.dateOffset + 5, '16:20'),
            attachments: []
          })
        }
      }

      let closeRequest = null
      if (status === '已销项' || status === '销项审批中') {
        const nodes = []
        if (item.projects && item.projects.length) {
          item.projects.forEach(pid => {
            const project = projectOf(pid)
            nodes.push({ key: `pm_${pid}`, name: `项目经理确认（${project.name}）`, approver: project.manager, result: '通过', time: dayValue(-8, '10:30'), comment: '本项目执行结果属实，同意办结。' })
          })
        }
        nodes.push({ key: 'head', name: '部门负责人审核', approver: dept.manager, result: '通过', time: dayValue(-7, '15:10'), comment: '执行结果符合要求，同意销项。' })
        nodes.push({ key: 'archive', name: '企划归档', approver: '秦岚', result: '通过', time: dayValue(-6, '09:20'), comment: '已归档。' })
        if (status === '销项审批中') {
          const pendingIndex = item.projects && item.projects.length > 1 ? 1 : 0
          nodes.forEach((node, idx) => {
            if (idx < pendingIndex) {
              node.result = '通过'
              node.time = dayValue(-2, '10:30')
              node.comment = '执行结果属实，同意办结。'
            } else {
              node.result = '待处理'
              node.time = ''
              node.comment = ''
            }
          })
        }
        closeRequest = {
          id: `GZX2026${pad(closeSeq, 3)}`,
          reason: item.closeReason || '相关工作已完成阶段性目标，申请销项。',
          attachments: [{ name: '重点工作完成情况说明.pdf', size: 386000 }],
          executionIds: executions.map(e => e.id),
          submittedBy: leadName,
          submittedAt: dayValue(status === '已销项' ? -10 : -3, '11:00'),
          status: status === '已销项' ? '已通过' : '审批中',
          nodes,
          archivedAt: status === '已销项' ? dayValue(-6, '09:20') : '',
          archivedBy: status === '已销项' ? '秦岚' : ''
        }
        closeSeq += 1
      }

      works.push({
        id: `GZ2026${pad(workSeq, 3)}`,
        sheetId: sheet.id,
        seq: index + 1,
        system: dept.system,
        deptId: dept.id,
        deptName: dept.name,
        title: item.title,
        leadId: item.leadId,
        leadName,
        problem: item.problem,
        suggestion: item.suggestion,
        status,
        createdAt: dayValue(def.dateOffset + 1, '10:00'),
        executions,
        closeRequest,
        history: [
          { time: createdAt, action: '创建梳理单', operator: PLANNER.name, remark: def.remark }
        ]
      })
      workSeq += 1
    })

    sheets.push(sheet)
    sheetSeq += 1
  })

  return { sheets, works }
}

function buildAppeals () {
  const list = []
  let closeSeq = 1
  APPEAL_SEED.forEach((seed, index) => {
    const project = projectOf(seed.projectId)
    const person = personInfo(seed.personId)
    const dept = deptOf(person.deptId)
    const id = `SQ2026${pad(index + 1, 4)}`
    const createdAt = dayValue(seed.createdOffset, '09:20')
    const progress = [
      { time: createdAt, source: '登记', content: '诉求已登记，等待主责部门受理。', operator: person.name },
      { time: dayValue(seed.createdOffset + 1, '14:10'), source: '受理', content: `${dept.name}已受理，转责任人跟进办理。`, operator: dept.manager }
    ]
    if (seed.status !== '待受理') {
      progress.push({
        time: dayValue(seed.createdOffset + 2, '16:30'),
        source: '进展',
        content: `已与${project.name}项目对接，明确推进节点：${seed.plan.split('；')[0].replace(/^\d+\./, '')}。`,
        operator: person.name
      })
    }

    let closeRequest = null
    if (seed.status === '已销项' || seed.status === '销项审批中') {
      const nodes = [
        { key: 'pm', name: '项目经理确认', approver: project.manager, result: '通过', time: dayValue(-5, '11:20'), comment: '办理结果已满足项目需求，同意办结。' },
        { key: 'archive', name: '企划归档', approver: '秦岚', result: '通过', time: dayValue(-4, '09:10'), comment: '已归档。' }
      ]
      if (seed.status === '销项审批中') {
        nodes[0].result = '通过'
        nodes[0].time = dayValue(-1, '16:40')
        nodes[0].comment = '办理结果已满足项目需求，同意办结。'
        nodes[1].result = '待处理'
        nodes[1].time = ''
        nodes[1].comment = ''
      }
      closeRequest = {
        id: `SQX2026${pad(closeSeq, 3)}`,
        reason: seed.status === '已销项'
          ? '经与项目共同确认，诉求涉及事项已处理完毕，项目反馈无后续问题，申请销项归档。'
          : '办理措施已全部落实，项目确认结果满足要求，申请项目经理确认后归档。',
        attachments: [{ name: '诉求办结说明及佐证材料.pdf', size: 512000 }],
        submittedBy: person.name,
        submittedAt: dayValue(seed.status === '已销项' ? -6 : -1, '15:30'),
        status: seed.status === '已销项' ? '已通过' : '审批中',
        nodes,
        archivedAt: seed.status === '已销项' ? dayValue(-4, '09:10') : '',
        archivedBy: seed.status === '已销项' ? '秦岚' : ''
      }
      closeSeq += 1
      if (seed.status === '已销项') {
        progress.push({
          time: dayValue(-4, '09:10'),
          source: '销项',
          content: `销项申请经项目经理确认、企划归档，诉求办结。${closeRequest.reason}`,
          operator: '秦岚'
        })
      } else {
        progress.push({
          time: dayValue(-1, '15:30'),
          source: '销项',
          content: '已提交销项申请，等待项目经理确认。',
          operator: person.name
        })
      }
    }

    list.push({
      id,
      projectId: seed.projectId,
      projectName: project.name,
      title: seed.title,
      desc: seed.desc,
      deptId: dept.id,
      deptName: dept.name,
      personId: seed.personId,
      personName: person.name,
      personPhone: person.phone,
      coDepts: [],
      plan: seed.plan,
      dueDate: d(seed.dueOffset),
      source: seed.source,
      status: seed.status,
      createdAt,
      acceptedAt: seed.status === '待受理' ? '' : dayValue(seed.createdOffset + 1, '14:10'),
      latestProgress: progress[progress.length - 1].content,
      progress,
      closeRequest,
      attachments: [{ name: '项目诉求说明材料.pdf', size: 245000 }]
    })
  })
  return list
}

function feedbackTextFor (appeal, key) {
  return `${FEEDBACK_TEXTS[Math.floor(hash(`${key}|${appeal.id}|fb`) * FEEDBACK_TEXTS.length)]}`
}

function buildReports (relations, appeals) {
  const days = recentReportDays(7)
  const today = todayStr()
  const reports = []
  const activeRelations = relations.filter(r => r.status === '已生效')
  const feedbackable = appeals.filter(a => a.status === '办理中')

  activeRelations.forEach(relation => {
    days.forEach(day => {
      const key = `${day}|${relation.personId}|${relation.projectId}`
      const r = hash(key)
      let status
      if (day === today) {
        status = r < 0.58 ? '已提交' : (r < 0.68 ? '草稿' : '未填写')
      } else {
        status = r < 0.86 ? '已提交' : (r < 0.93 ? '草稿' : '未填写')
      }
      const project = projectOf(relation.projectId)
      const attend = hash(`${key}|attend`) < 0.84

      const report = {
        id: `RB${day.replace(/-/g, '')}${relation.personId}${relation.projectId}`,
        date: day,
        personId: relation.personId,
        personName: relation.personName,
        deptId: relation.deptId,
        deptName: relation.deptName,
        projectId: relation.projectId,
        projectName: relation.projectName,
        projectNeeds: project.needs,
        attend: status === '未填写' ? null : (attend ? true : false),
        absentReason: '',
        workContent: '',
        newIssues: '',
        status,
        frozen: day !== today,
        submitTime: '',
        feedbacks: [],
        revisions: []
      }

      if (report.attend === false) {
        report.absentReason = ABSENT_REASONS[Math.floor(hash(`${key}|absent`) * ABSENT_REASONS.length)]
        report.workContent = ''
        report.newIssues = ''
      } else if (report.attend === true) {
        report.workContent = WORK_CONTENTS[Math.floor(hash(`${key}|work`) * WORK_CONTENTS.length)]
        report.newIssues = hash(`${key}|issue`) < 0.2 ? '项目反映部分材料进场计划需总部协调，已登记待评估后转诉求。' : '无'
      }

      if (status === '已提交') {
        report.submitTime = `${day} ${String(8 + Math.floor(hash(`${key}|hour`) * 8)).padStart(2, '0')}:${String(Math.floor(hash(`${key}|min`) * 60)).padStart(2, '0')}`
      }

      feedbackable
        .filter(a => a.personId === relation.personId && a.projectId === relation.projectId)
        .forEach(appeal => {
          const latest = appeal.progress[appeal.progress.length - 1]
          const fr = hash(`${key}|${appeal.id}|ftype`)
          let type = ''
          if (status === '已提交' && report.attend === true) {
            type = fr < 0.58 ? '有新进展' : (fr < 0.82 ? '无新进展' : '')
          } else if (status === '草稿' && report.attend === true) {
            type = fr < 0.3 ? '有新进展' : (fr < 0.5 ? '无新进展' : '')
          }
          report.feedbacks.push({
            appealId: appeal.id,
            appealTitle: appeal.title,
            appealStatus: appeal.status,
            latestProgress: latest ? latest.content : '',
            type,
            content: type === '有新进展' ? feedbackTextFor(appeal, key) : '',
            newIssue: '',
            attachments: []
          })
        })

      reports.push(report)
    })
  })

  // 今日：当前用户一个项目已提交（部分诉求未关联），另一个项目未填写
  const todayOne = reports.find(r => r.date === today && r.personId === 'P01' && r.projectId === 'J01')
  if (todayOne) {
    todayOne.status = '已提交'
    todayOne.attend = true
    todayOne.absentReason = ''
    todayOne.workContent = '上午与项目班子核对施工许可办理后的渣土准运证、土场落实及桩基检测安排，下午协调检测单位确认小应变检测范围。'
    todayOne.newIssues = '项目提出渣土准运证办理需总部协调属地城管部门，已登记、待评估后转诉求。'
    todayOne.submitTime = `${today} 09:18`
    todayOne.feedbacks.forEach(fb => {
      if (fb.appealId === 'SQ20260001') {
        fb.type = '有新进展'
        fb.content = '已对接属地城管部门，明确准运证办理材料清单；土场完成选址，预计明日提交申请。'
      } else if (fb.appealId === 'SQ20260002') {
        fb.type = ''
        fb.content = ''
      }
    })
  }
  const todayTwo = reports.find(r => r.date === today && r.personId === 'P01' && r.projectId === 'J04')
  if (todayTwo) {
    todayTwo.status = '未填写'
    todayTwo.attend = null
    todayTwo.workContent = ''
    todayTwo.newIssues = ''
    todayTwo.submitTime = ''
    todayTwo.feedbacks.forEach(fb => { fb.type = ''; fb.content = '' })
  }

  // 一项已冻结日报由企划管理员修订，保留修订历史
  const revised = reports.find(r => r.personId === 'P01' && r.projectId === 'J01' && r.date === days[days.length - 2])
  if (revised) {
    const before = revised.workContent
    revised.status = '已提交'
    revised.attend = true
    revised.workContent = `${before}补充：已完成与业主的沟通纪要整理，明确下周现场检查安排。`
    revised.submitTime = `${revised.date} 09:05`
    revised.revisions = [{
      time: dayValue(0, '08:35'),
      operator: '秦岚',
      reason: '项目补充说明已确认，补录业主沟通及下周检查安排。',
      before: { attend: true, absentReason: '', workContent: before, newIssues: revised.newIssues },
      after: { attend: true, absentReason: '', workContent: revised.workContent, newIssues: revised.newIssues }
    }]
  }

  // 保证今日有未到岗、草稿等状态
  const todayP04 = reports.find(r => r.date === today && r.personId === 'P04' && r.projectId === 'J03')
  if (todayP04) {
    todayP04.status = '已提交'
    todayP04.attend = false
    todayP04.absentReason = '召开弋南高速项目安全生产专题会，部署分局检查隐患整改和回复工作。'
    todayP04.workContent = ''
    todayP04.submitTime = `${today} 09:42`
    todayP04.feedbacks.forEach(fb => { fb.type = ''; fb.content = '' })
  }
  const todayP15 = reports.find(r => r.date === today && r.personId === 'P15' && r.projectId === 'J01')
  if (todayP15) {
    todayP15.status = '草稿'
    todayP15.attend = true
    todayP15.workContent = '跟踪项目收款及供应链放款进度，整理资金平衡表。'
    todayP15.submitTime = ''
  }

  // 将日报中的诉求进展回写诉求时间线
  reports.forEach(report => {
    if (report.status === '未填写') return
    report.feedbacks.forEach(fb => {
      if (fb.type !== '有新进展') return
      if (fb._linked) return
      const appeal = appeals.find(a => a.id === fb.appealId)
      if (!appeal) return
      appeal.progress.push({
        time: `${report.date} 18:10`,
        source: '日报',
        content: fb.content,
        operator: report.personName,
        reportId: report.id
      })
      appeal.latestProgress = fb.content
    })
  })

  appeals.forEach(appeal => {
    appeal.progress.sort((a, b) => a.time.localeCompare(b.time))
    appeal.latestProgress = appeal.progress[appeal.progress.length - 1].content
  })

  return reports
}

function buildSuggestions () {
  return SUGGESTION_SEED.map((seed, index) => {
    const proposer = personInfo(seed.proposerId)
    const dept = deptOf(seed.deptId)
    const created = dayValue(seed.createdOffset, '10:20')
    let reply = null
    let status = seed.status
    if (seed.reply) {
      reply = {
        adopt: seed.reply.adopt,
        reason: seed.reply.reason || '',
        plan: seed.reply.plan || '',
        deadline: seed.reply.deadlineOffset ? d(seed.reply.deadlineOffset) : '',
        time: dayValue(seed.reply.replyOffset, '15:30'),
        operator: personInfo(seed.confirmerIds[0]).name,
        comment: ''
      }
    }
    if (status === '已归档') {
      reply.archivedAt = dayValue(seed.archivedOffset, '09:00')
      reply.archivedBy = '秦岚'
    }
    return {
      id: `JY2026${pad(index + 1, 3)}`,
      title: seed.title,
      flow: seed.flow,
      desc: seed.desc,
      proposerId: seed.proposerId,
      proposerName: proposer.name,
      proposerDeptId: proposer.deptId,
      proposerDeptName: deptOf(proposer.deptId).name,
      deptId: seed.deptId,
      deptName: dept.name,
      confirmerIds: seed.confirmerIds,
      confirmers: seed.confirmerIds.map(id => ({ id, name: personInfo(id).name, title: personInfo(id).title })),
      reply,
      status,
      createdAt: created,
      attachments: [{ name: '建议事项说明.docx', size: 68000 }]
    }
  })
}

export function buildSeed () {
  const { sheets, works } = buildSheetsAndWorks()
  const relations = buildRelations()
  const appeals = buildAppeals()
  const reports = buildReports(relations, appeals)
  const suggestions = buildSuggestions()

  return {
    version: 5,
    generatedAt: new Date().toISOString(),
    currentUserId: CURRENT_USER_ID,
    systems: SYSTEM_LIST,
    departments: DEPARTMENTS,
    projects: PROJECTS,
    people: PEOPLE,
    managers: MANAGERS,
    relations,
    sheets,
    works,
    appeals,
    dailyReports: reports,
    suggestions
  }
}
