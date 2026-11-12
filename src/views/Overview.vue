<template>
  <div class="overview-page">
    <div class="section-title">
      服务项目概览
      <span class="section-extra">
        <span style="margin-right:6px;">统计日期</span>
        <a-date-picker v-model="statDate" size="small" :allow-clear="false" style="width: 138px; margin-right: 10px;" />
        数据来源：帮扶关系、诉求台账、项目日报实时汇总
      </span>
    </div>

    <div class="stat-strip">
      <div class="stat-cell clickable" @click="openAttendance">
        <div class="stat-label"><a-icon type="team" /> 服务人员</div>
        <div class="stat-value">{{ stats.serviceCount }}<small>人</small></div>
      </div>
      <div class="stat-cell clickable" @click="openAttendance">
        <div class="stat-label"><a-icon type="login" /> 人员到岗</div>
        <div class="stat-value blue">{{ stats.attendedCount }}<small>/ {{ stats.serviceCount }} 人</small></div>
      </div>
      <div class="stat-cell clickable" @click="goAppeals('')">
        <div class="stat-label"><a-icon type="profile" /> 项目诉求总数</div>
        <div class="stat-value">{{ stats.appealTotal }}<small>条</small></div>
      </div>
      <div class="stat-cell clickable" @click="goAppeals('办理中')">
        <div class="stat-label"><a-icon type="clock-circle" /> 办理中诉求</div>
        <div class="stat-value orange">{{ stats.processingCount }}<small>条</small></div>
      </div>
      <div class="stat-cell clickable" @click="goAppeals('销项审批中')">
        <div class="stat-label"><a-icon type="audit" /> 销项审批中</div>
        <div class="stat-value orange">{{ stats.closingCount }}<small>条</small></div>
      </div>
      <div class="stat-cell clickable" @click="goAppeals('已销项')">
        <div class="stat-label"><a-icon type="check-circle" /> 已销项</div>
        <div class="stat-value green">{{ stats.closedCount }}<small>条</small></div>
      </div>
      <div class="stat-cell clickable" @click="goAppeals('已销项')">
        <div class="stat-label"><a-icon type="pie-chart" /> 销项率</div>
        <div class="stat-value green">{{ stats.closeRate }}<small>%</small></div>
      </div>
      <div class="stat-cell clickable" @click="$router.push('/daily')">
        <div class="stat-label"><a-icon type="form" /> 日报应填</div>
        <div class="stat-value">{{ stats.dueCount }}<small>份</small></div>
      </div>
      <div class="stat-cell clickable" @click="$router.push('/daily')">
        <div class="stat-label"><a-icon type="check" /> 日报已填</div>
        <div class="stat-value blue">{{ stats.submittedCount }}<small>份</small></div>
      </div>
      <div class="stat-cell clickable" @click="$router.push('/daily')">
        <div class="stat-label"><a-icon type="exclamation-circle" /> 日报未填</div>
        <div class="stat-value red">{{ stats.unfilledCount }}<small>份</small></div>
      </div>
      <div class="stat-cell clickable" @click="$router.push('/daily?tab=all')">
        <div class="stat-label"><a-icon type="solution" /> 日报待校核</div>
        <div class="stat-value orange">{{ stats.uncheckedCount }}<small>份</small></div>
      </div>
      <div class="stat-cell">
        <div class="stat-label"><a-icon type="dashboard" /> 到岗率</div>
        <div class="stat-value">{{ stats.attendanceRate }}<small>%</small></div>
      </div>
    </div>

    <div class="overview-middle">
      <div class="todo-panel">
        <div class="section-title" style="margin-bottom: 10px;">
          我的待办
          <span class="section-extra">共 {{ todo.total }} 项</span>
        </div>
        <div class="todo-cards">
          <div class="todo-card">
            <div class="todo-card-head">
              <a-icon type="form" class="todo-card-icon blue" />
              <span>待填日报</span>
              <b>{{ todo.dailyCount }}</b>
            </div>
            <div
              v-for="item in todoDaily"
              :key="item.id"
              class="todo-card-row"
              @click="$router.push('/daily')"
            >
              <span class="todo-card-title">{{ item.projectName }}</span>
              <span class="muted">{{ item.status }}</span>
            </div>
            <div v-if="!todoDaily.length" class="todo-card-empty">今日日报已全部提交</div>
            <div class="todo-card-foot" @click="$router.push('/daily')">去填写 <a-icon type="right" /></div>
          </div>

          <div class="todo-card">
            <div class="todo-card-head">
              <a-icon type="message" class="todo-card-icon orange" />
              <span>待推进诉求</span>
              <b>{{ todo.appealCount }}</b>
            </div>
            <div
              v-for="item in todoAppeals"
              :key="item.id"
              class="todo-card-row"
              @click="openAppeal(item.id)"
            >
              <span class="todo-card-title">{{ item.title }}</span>
              <span class="muted">{{ item.dueDate }} 前</span>
            </div>
            <div v-if="!todoAppeals.length" class="todo-card-empty">暂无待推进诉求</div>
            <div class="todo-card-foot" @click="$router.push('/appeals')">去处理 <a-icon type="right" /></div>
          </div>

          <div class="todo-card">
            <div class="todo-card-head">
              <a-icon type="audit" class="todo-card-icon red" />
              <span>待处理审批</span>
              <b>{{ todo.approvalCount }}</b>
            </div>
            <div
              v-for="item in todoApprovals.slice(0, 4)"
              :key="item.key"
              class="todo-card-row"
              @click="$router.push(item.path)"
            >
              <span class="todo-card-title">{{ item.title }}</span>
              <span class="muted">{{ item.desc }}</span>
            </div>
            <div v-if="todoApprovals.length > 4" class="todo-card-more muted">还有 {{ todoApprovals.length - 4 }} 项待处理</div>
            <div v-if="!todoApprovals.length" class="todo-card-empty">暂无待处理审批</div>
            <div class="todo-card-foot" @click="showApprovalList = true">查看全部 <a-icon type="right" /></div>
          </div>
        </div>
      </div>
    </div>

    <div class="section-block">
      <div class="section-title">
        综合台账
        <span class="section-extra">同一份业务数据，按类别切换查看，点击行查看详情</span>
      </div>
      <a-tabs v-model="ledgerTab" @change="onLedgerTabChange">
        <a-tab-pane key="relations" tab="帮扶关系" />
        <a-tab-pane key="works" tab="部门重点工作" />
        <a-tab-pane key="appeals" tab="项目诉求" />
        <a-tab-pane key="reports" tab="日报" />
        <a-tab-pane key="suggestions" tab="建议" />
      </a-tabs>

      <div class="ledger-filter">
        <a-input
          v-model="ledgerKeyword"
          placeholder="输入人员、项目、事项关键词"
          allow-clear
          style="width: 260px"
        >
          <a-icon slot="prefix" type="search" style="color:#b3c0ce" />
        </a-input>
        <a-select
          v-model="ledgerStatus"
          placeholder="全部状态"
          allow-clear
          style="width: 160px"
        >
          <a-select-option v-for="s in ledgerStatusOptions" :key="s" :value="s">{{ s }}</a-select-option>
        </a-select>
        <span class="muted">共 {{ ledgerRows.length }} 条</span>
        <a class="ledger-more" @click="goLedgerModule">查看全部 <a-icon type="right" /></a>
      </div>

      <a-table
        :columns="ledgerColumns"
        :data-source="ledgerRows.slice(0, 8)"
        :pagination="false"
        row-key="id"
        size="middle"
        :scroll="{ x: 1060 }"
        :custom-row="record => ({ on: { click: () => openLedgerDetail(record) } })"
      >
        <div slot="status" slot-scope="text">
          <status-tag :status="text" />
        </div>
        <div slot="content" slot-scope="text" class="ledger-content">{{ text }}</div>
      </a-table>
      <div v-if="!ledgerRows.length" class="ledger-empty">当前筛选条件下暂无台账数据</div>
    </div>

    <div class="section-block report-block">
      <div class="section-title">
        报表查询与导出
        <span class="section-extra">导出内容以当前业务数据为准，PDF 通过浏览器打印另存</span>
      </div>
      <div class="report-grid">
        <div class="report-card">
          <div class="report-card-title"><a-icon type="profile" /> 业务清单</div>
          <a-form-model layout="vertical" :label-col="{ span: 24 }">
            <a-form-model-item label="清单类型">
              <a-select v-model="reportType">
                <a-select-option value="works">附件1 · 重点工作梳理清单</a-select-option>
                <a-select-option value="appeals">附件2 · 项目诉求办理清单</a-select-option>
                <a-select-option value="suggestions">附件3 · 制度改进建议清单</a-select-option>
              </a-select>
            </a-form-model-item>
            <a-form-model-item v-if="reportType === 'appeals'" label="项目范围">
              <a-select v-model="reportProject" allow-clear placeholder="全部项目">
                <a-select-option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</a-select-option>
              </a-select>
            </a-form-model-item>
          </a-form-model>
          <div class="report-actions">
            <a-button type="primary" size="small" @click="exportListExcel"><a-icon type="download" /> 导出 Excel</a-button>
            <a-button size="small" @click="printList"><a-icon type="printer" /> 打印 / PDF</a-button>
          </div>
        </div>

        <div class="report-card">
          <div class="report-card-title"><a-icon type="form" /> 项目日报（附件4）</div>
          <div class="report-field">
            <span class="report-label">日报日期</span>
            <a-date-picker v-model="reportDate" :allow-clear="false" style="width: 100%" />
          </div>
          <div class="report-desc">按选定日期汇总服务项目日报，包含情况汇总、未到岗人员情况、服务项目人员情况。</div>
          <div class="report-actions">
            <a-button type="primary" size="small" @click="exportDaily"><a-icon type="download" /> 导出 Excel</a-button>
            <a-button size="small" @click="printDaily"><a-icon type="printer" /> 打印 / PDF</a-button>
          </div>
        </div>

        <div class="report-card">
          <div class="report-card-title"><a-icon type="schedule" /> 周度汇总（附件5）</div>
          <div class="report-field">
            <span class="report-label">周起止日期</span>
            <a-range-picker v-model="reportWeek" :allow-clear="false" style="width: 100%" />
          </div>
          <div class="report-desc">仅根据每日日报数据生成，按人员、日期排列，逐日展示，不含独立周报填报。</div>
          <div class="report-actions">
            <a-button type="primary" size="small" @click="exportWeekly"><a-icon type="download" /> 导出 Excel</a-button>
            <a-button size="small" @click="printWeekly"><a-icon type="printer" /> 打印 / PDF</a-button>
          </div>
        </div>
      </div>
    </div>

    <a-modal
      title="人员到岗明细"
      :visible="attendanceVisible"
      :width="820"
      @cancel="attendanceVisible = false"
    >
      <div class="alert-note" style="margin-bottom:12px;">
        <a-icon type="info-circle" /> 统计日期：{{ statDay }}。人员到岗按人去重统计，同一人员服务多个项目时只计 1 人次；未提交日报不计为未到岗。
      </div>
      <a-table
        :columns="attendanceColumns"
        :data-source="attendanceRows"
        :pagination="false"
        size="small"
        row-key="personId"
      >
        <div slot="attendance" slot-scope="text">
          <status-tag :status="text === '已到岗' ? '已提交' : (text === '未到岗' ? '已冻结' : '未填写')" :text="text" />
        </div>
      </a-table>
      <template slot="footer">
        <a-button @click="attendanceVisible = false">关闭</a-button>
      </template>
    </a-modal>

    <a-modal
      :title="ledgerDetailTitle"
      :visible="detailVisible"
      :width="780"
      @cancel="detailVisible = false"
    >
      <template v-if="ledgerDetail">
        <div v-if="ledgerDetail.type === 'relations'" class="drawer-section">
          <div class="detail-grid">
            <div class="detail-item"><span class="detail-label">关系编号</span><span class="detail-value">{{ ledgerDetail.row.id }}</span></div>
            <div class="detail-item"><span class="detail-label">关系状态</span><span class="detail-value"><status-tag :status="ledgerDetail.row.status" /></span></div>
            <div class="detail-item"><span class="detail-label">服务人员</span><span class="detail-value">{{ ledgerDetail.row.personName }}</span></div>
            <div class="detail-item"><span class="detail-label">所属部门</span><span class="detail-value">{{ ledgerDetail.row.deptName }}</span></div>
            <div class="detail-item"><span class="detail-label">服务项目</span><span class="detail-value">{{ ledgerDetail.row.projectName }}</span></div>
            <div class="detail-item"><span class="detail-label">帮扶角色</span><span class="detail-value">{{ ledgerDetail.row.role }}</span></div>
            <div class="detail-item full"><span class="detail-label">有效期</span><span class="detail-value">{{ ledgerDetail.row.startDate }} 至 {{ ledgerDetail.row.endDate || '长期' }}</span></div>
          </div>
        </div>

        <div v-if="ledgerDetail.type === 'works'" class="drawer-section">
          <div class="detail-grid">
            <div class="detail-item"><span class="detail-label">事项编号</span><span class="detail-value">{{ ledgerDetail.row.id }}</span></div>
            <div class="detail-item"><span class="detail-label">工作状态</span><span class="detail-value"><status-tag :status="ledgerDetail.row.status" /></span></div>
            <div class="detail-item"><span class="detail-label">体系</span><span class="detail-value">{{ ledgerDetail.row.system }}</span></div>
            <div class="detail-item"><span class="detail-label">归属部门</span><span class="detail-value">{{ ledgerDetail.row.deptName }}</span></div>
            <div class="detail-item"><span class="detail-label">牵头人</span><span class="detail-value">{{ ledgerDetail.row.leadName }}</span></div>
            <div class="detail-item"><span class="detail-label">关联项目</span><span class="detail-value">{{ ledgerDetail.projectNames || '公司级（不关联项目）' }}</span></div>
            <div class="detail-item full"><span class="detail-label">重点工作</span><span class="detail-value">{{ ledgerDetail.row.title }}</span></div>
            <div class="detail-item full"><span class="detail-label">项目落实情况</span><span class="detail-value">{{ ledgerDetail.result }}</span></div>
            <div class="detail-item full"><span class="detail-label">存在问题</span><span class="detail-value">{{ ledgerDetail.row.problem || '—' }}</span></div>
            <div class="detail-item full"><span class="detail-label">改进建议</span><span class="detail-value">{{ ledgerDetail.row.suggestion || '—' }}</span></div>
          </div>
        </div>

        <div v-if="ledgerDetail.type === 'appeals'" class="drawer-section">
          <div class="detail-grid">
            <div class="detail-item"><span class="detail-label">诉求编号</span><span class="detail-value">{{ ledgerDetail.row.id }}</span></div>
            <div class="detail-item"><span class="detail-label">办理状态</span><span class="detail-value"><status-tag :status="ledgerDetail.row.status" /></span></div>
            <div class="detail-item"><span class="detail-label">所属项目</span><span class="detail-value">{{ ledgerDetail.row.projectName }}</span></div>
            <div class="detail-item"><span class="detail-label">主责部门</span><span class="detail-value">{{ ledgerDetail.row.deptName }}</span></div>
            <div class="detail-item"><span class="detail-label">承办人</span><span class="detail-value">{{ ledgerDetail.row.personName }}</span></div>
            <div class="detail-item"><span class="detail-label">完成时限</span><span class="detail-value">{{ ledgerDetail.row.dueDate }}</span></div>
            <div class="detail-item full"><span class="detail-label">诉求事项</span><span class="detail-value">{{ ledgerDetail.row.title }}</span></div>
            <div class="detail-item full"><span class="detail-label">具体描述</span><span class="detail-value">{{ ledgerDetail.row.desc }}</span></div>
            <div class="detail-item full"><span class="detail-label">推进计划</span><span class="detail-value">{{ ledgerDetail.row.plan }}</span></div>
            <div class="detail-item full"><span class="detail-label">最新进展</span><span class="detail-value">{{ ledgerDetail.row.latestProgress }}</span></div>
          </div>
        </div>

        <div v-if="ledgerDetail.type === 'reports'" class="drawer-section">
          <div class="detail-grid">
            <div class="detail-item"><span class="detail-label">填报日期</span><span class="detail-value">{{ ledgerDetail.row.date }}</span></div>
            <div class="detail-item"><span class="detail-label">填报状态</span><span class="detail-value"><status-tag :status="ledgerDetail.row.status" /></span></div>
            <div class="detail-item"><span class="detail-label">姓名</span><span class="detail-value">{{ ledgerDetail.row.personName }}</span></div>
            <div class="detail-item"><span class="detail-label">部门</span><span class="detail-value">{{ ledgerDetail.row.deptName }}</span></div>
            <div class="detail-item"><span class="detail-label">项目</span><span class="detail-value">{{ ledgerDetail.row.projectName }}</span></div>
            <div class="detail-item"><span class="detail-label">校核状态</span><span class="detail-value"><status-tag :status="ledgerDetail.row.checkStatus" /></span></div>
            <div class="detail-item"><span class="detail-label">是否到岗</span><span class="detail-value">{{ ledgerDetail.row.attend === true ? '是' : (ledgerDetail.row.attend === false ? '否' : '尚未填报') }}</span></div>
            <div class="detail-item"><span class="detail-label">冻结状态</span><span class="detail-value"><status-tag :status="ledgerDetail.row.frozen ? '已冻结' : '未冻结'" /></span></div>
            <div class="detail-item full"><span class="detail-label">当日工作开展情况</span><span class="detail-value">{{ ledgerDetail.row.workContent || '—' }}</span></div>
            <div class="detail-item full"><span class="detail-label">需协调解决问题</span><span class="detail-value">{{ ledgerDetail.row.newIssues || '无' }}</span></div>
          </div>
        </div>

        <div v-if="ledgerDetail.type === 'suggestions'" class="drawer-section">
          <div class="detail-grid">
            <div class="detail-item"><span class="detail-label">建议编号</span><span class="detail-value">{{ ledgerDetail.row.id }}</span></div>
            <div class="detail-item"><span class="detail-label">建议状态</span><span class="detail-value"><status-tag :status="ledgerDetail.row.status" /></span></div>
            <div class="detail-item"><span class="detail-label">提出人</span><span class="detail-value">{{ ledgerDetail.row.proposerName }} / {{ ledgerDetail.row.proposerDeptName }}</span></div>
            <div class="detail-item"><span class="detail-label">主责部门</span><span class="detail-value">{{ ledgerDetail.row.deptName }}</span></div>
            <div class="detail-item full"><span class="detail-label">建议事项</span><span class="detail-value">{{ ledgerDetail.row.title }}</span></div>
            <div class="detail-item full"><span class="detail-label">涉及制度/流程</span><span class="detail-value">{{ ledgerDetail.row.flow }}</span></div>
            <div class="detail-item full"><span class="detail-label">问题描述</span><span class="detail-value">{{ ledgerDetail.row.desc }}</span></div>
            <div class="detail-item full"><span class="detail-label">回复意见</span><span class="detail-value">{{ ledgerDetail.row.replyText || '待部门确认' }}</span></div>
          </div>
        </div>

      </template>
      <template slot="footer">
        <a-button @click="detailVisible = false">关闭</a-button>
        <a-button type="primary" ghost @click="jumpToModule">进入业务页面 <a-icon type="right" /></a-button>
      </template>
    </a-modal>

    <a-modal
      title="待处理审批事项"
      :visible="showApprovalList"
      :footer="null"
      :width="680"
      @cancel="showApprovalList = false"
    >
      <a-list :data-source="todoApprovals" size="small">
        <a-list-item slot="renderItem" slot-scope="item">
          <a-list-item-meta>
            <span slot="title">{{ item.title }}</span>
            <span slot="description">{{ item.desc }}</span>
          </a-list-item-meta>
          <a slot="actions" @click="goApproval(item.path)">去处理</a>
        </a-list-item>
      </a-list>
      <a-empty v-if="!todoApprovals.length" description="暂无待处理审批" />
    </a-modal>
  </div>
</template>

<script>
import moment from 'moment'
import StatusTag from '../components/StatusTag.vue'
import { weekRange, todayStr, fmtDate } from '../utils/date'
import {
  exportWorksExcel,
  exportAppealsExcel,
  exportSuggestionsExcel,
  exportDailyExcel,
  exportWeeklyExcel
} from '../utils/exportExcel'
import {
  printWorksList,
  printAppealsList,
  printSuggestionsList,
  printDailyReport,
  printWeeklyReport
} from '../utils/printReport'
import { workResultText } from '../utils/reportData'

export default {
  name: 'OverviewView',
  components: { StatusTag },
  data () {
    const week = weekRange(0)
    return {
      today: todayStr(),
      statDate: moment(),
      ledgerTab: 'relations',
      ledgerKeyword: '',
      ledgerStatus: undefined,
      detailVisible: false,
      ledgerDetail: null,
      attendanceVisible: false,
      showApprovalList: false,
      reportType: 'works',
      reportProject: '',
      reportDate: moment(),
      reportWeek: [moment(week[0]), moment(week[1])]
    }
  },
  computed: {
    stats () {
      return this.$store.overviewStats(this.statDay)
    },
    statDay () {
      return fmtDate(this.statDate) || this.today
    },
    todo () {
      return this.$store.todos()
    },
    projects () {
      return this.$store.db.projects
    },
    todoDaily () {
      return this.$store.db.dailyReports
        .filter(r => r.date === this.today && r.personId === this.$store.currentUser.id && r.status !== '已提交')
        .slice(0, 3)
    },
    todoAppeals () {
      return this.$store.db.appeals
        .filter(a => a.personId === this.$store.currentUser.id && a.status === '办理中')
        .slice(0, 3)
    },
    todoApprovals () {
      const list = []
      const t = this.todo
      t.sheets.forEach(s => list.push({ key: s.id, title: `重点工作梳理单创建审批 ${s.id}`, desc: `${s.deptName} · 待企划部审核`, path: '/works' }))
      t.workCloses.forEach(w => list.push({ key: w.closeRequest.id, title: `重点工作销项审批 ${w.closeRequest.id}`, desc: w.title, path: '/works' }))
      t.appealCloses.forEach(a => list.push({ key: a.closeRequest.id, title: `诉求销项审批 ${a.closeRequest.id}`, desc: `${a.projectName} · ${a.title}`, path: '/appeals' }))
      t.relationBatches.forEach(b => {
        const count = this.$store.db.relations.filter(r => r.batchId === b && r.status === '待审批').length
        list.push({ key: b, title: `帮扶关系联合审批（${count} 条）`, desc: `批次 ${b}`, path: '/relations' })
      })
      t.suggestions.forEach(s => list.push({ key: s.id, title: `制度改进建议流程待办 ${s.id}`, desc: s.title, path: '/suggestions' }))
      return list
    },
    ledgerStatusOptions () {
      const map = {
        relations: ['草稿', '待审批', '已生效', '已驳回', '已失效'],
        works: ['待生效', '落实中', '销项审批中', '已销项'],
        appeals: ['办理中', '销项审批中', '已销项'],
        reports: ['未填写', '草稿', '已提交'],
        suggestions: ['待确认', '已回复', '已归档', '已退回']
      }
      return map[this.ledgerTab] || []
    },
    ledgerColumns () {
      const statusCol = { title: '状态', dataIndex: 'status', width: 100, scopedSlots: { customRender: 'status' } }
      if (this.ledgerTab === 'relations') {
        return [
          { title: '序号', width: 50, align: 'center', customRender: (text, record, index) => index + 1 },
          { title: '关系编号', dataIndex: 'id', width: 118 },
          { title: '服务人员', dataIndex: 'personName', width: 80 },
          { title: '部门', dataIndex: 'deptName', width: 150 },
          { title: '服务项目', dataIndex: 'projectName', width: 180 },
          { title: '角色', dataIndex: 'role', width: 62 },
          { title: '有效期', dataIndex: 'period', width: 190 },
          statusCol
        ]
      }
      if (this.ledgerTab === 'works') {
        return [
          { title: '序号', width: 50, align: 'center', customRender: (text, record, index) => index + 1 },
          { title: '事项编号', dataIndex: 'id', width: 108 },
          { title: '部门', dataIndex: 'deptName', width: 150 },
          { title: '重点工作', dataIndex: 'title', width: 300, scopedSlots: { customRender: 'content' } },
          { title: '牵头人', dataIndex: 'leadName', width: 80 },
          { title: '落实进展', dataIndex: 'result', width: 260, scopedSlots: { customRender: 'content' } },
          statusCol
        ]
      }
      if (this.ledgerTab === 'appeals') {
        return [
          { title: '序号', width: 50, align: 'center', customRender: (text, record, index) => index + 1 },
          { title: '诉求编号', dataIndex: 'id', width: 110 },
          { title: '诉求事项', dataIndex: 'title', width: 260, scopedSlots: { customRender: 'content' } },
          { title: '所属项目', dataIndex: 'projectName', width: 170 },
          { title: '承办人', dataIndex: 'personName', width: 76 },
          { title: '完成时限', dataIndex: 'dueDate', width: 106 },
          statusCol
        ]
      }
      if (this.ledgerTab === 'reports') {
        return [
          { title: '序号', width: 50, align: 'center', customRender: (text, record, index) => index + 1 },
          { title: '日期', dataIndex: 'date', width: 106 },
          { title: '姓名', dataIndex: 'personName', width: 76 },
          { title: '部门', dataIndex: 'deptName', width: 150 },
          { title: '项目', dataIndex: 'projectName', width: 180 },
          { title: '到岗', dataIndex: 'attendText', width: 72 },
          { title: '校核状态', dataIndex: 'checkStatus', width: 100 },
          statusCol
        ]
      }
      return [
        { title: '序号', width: 50, align: 'center', customRender: (text, record, index) => index + 1 },
        { title: '建议编号', dataIndex: 'id', width: 106 },
        { title: '建议事项', dataIndex: 'title', width: 300, scopedSlots: { customRender: 'content' } },
        { title: '主责部门', dataIndex: 'deptName', width: 170 },
        { title: '提出人', dataIndex: 'proposerName', width: 82 },
        { title: '回复结论', dataIndex: 'replyText', width: 100 },
        statusCol
      ]
    },
    ledgerRows () {
      const kw = this.ledgerKeyword.trim()
      const st = this.ledgerStatus
      let rows = []
      if (this.ledgerTab === 'relations') {
        rows = this.$store.db.relations.map(r => ({
          ...r,
          period: `${r.startDate} 至 ${r.endDate || '长期'}`
        }))
        if (kw) rows = rows.filter(r => `${r.personName}${r.deptName}${r.projectName}`.indexOf(kw) > -1)
        if (st) rows = rows.filter(r => r.status === st)
      } else if (this.ledgerTab === 'works') {
        rows = this.$store.db.works.map(w => ({
          ...w,
          result: workResultText(w)
        }))
        if (kw) rows = rows.filter(r => `${r.title}${r.deptName}${r.leadName}`.indexOf(kw) > -1)
        if (st) rows = rows.filter(r => r.status === st)
      } else if (this.ledgerTab === 'appeals') {
        rows = this.$store.db.appeals.slice()
        if (kw) rows = rows.filter(r => `${r.title}${r.projectName}${r.personName}`.indexOf(kw) > -1)
        if (st) rows = rows.filter(r => r.status === st)
      } else if (this.ledgerTab === 'reports') {
        rows = this.$store.db.dailyReports
          .filter(r => r.date === this.today)
          .map(r => ({
            ...r,
            attendText: r.attend === true ? '是' : (r.attend === false ? '否' : '未填')
          }))
        if (kw) rows = rows.filter(r => `${r.personName}${r.deptName}${r.projectName}`.indexOf(kw) > -1)
        if (st) rows = rows.filter(r => r.status === st)
      } else {
        rows = this.$store.db.suggestions.map(s => {
          const replies = (s.confirmers || []).filter(c => c.reply)
          return {
            ...s,
            replyText: replies.length ? (replies.some(c => c.reply.adopt === '改') ? '改' : '不改') : '待回复'
          }
        })
        if (kw) rows = rows.filter(r => `${r.title}${r.deptName}${r.proposerName}`.indexOf(kw) > -1)
        if (st) rows = rows.filter(r => r.status === st)
      }
      return rows
    },
    ledgerDetailTitle () {
      const map = { relations: '帮扶关系详情', works: '重点工作详情', appeals: '项目诉求详情', reports: '日报详情', suggestions: '制度改进建议详情' }
      return map[this.ledgerTab] || '详情'
    },
    attendanceRows () {
      const map = {}
      this.$store.effectiveRelations().forEach(r => {
        if (!map[r.personId]) {
          map[r.personId] = {
            personId: r.personId,
            personName: r.personName,
            deptName: r.deptName,
            projects: [],
            reports: []
          }
        }
        map[r.personId].projects.push(r.projectName)
        const report = this.$store.reportFor(this.statDay, r.personId, r.projectId)
        if (report) map[r.personId].reports.push(report)
      })
      return Object.values(map).map(row => {
        const submitted = row.reports.filter(r => r.status === '已提交')
        let attendance = '尚未填报'
        if (submitted.some(r => r.attend === true)) attendance = '已到岗'
        else if (submitted.length && submitted.every(r => r.attend === false)) attendance = '未到岗'
        else if (submitted.length) attendance = '已到岗'
        return {
          ...row,
          projectText: row.projects.join('、'),
          reportText: `${submitted.length}/${row.reports.length} 份已提交`,
          attendance
        }
      })
    },
    attendanceColumns () {
      return [
        { title: '姓名', dataIndex: 'personName', width: 76 },
        { title: '部门', dataIndex: 'deptName', width: 160 },
        { title: '服务项目', dataIndex: 'projectText' },
        { title: '今日日报', dataIndex: 'reportText', width: 104 },
        { title: '到岗情况', dataIndex: 'attendance', width: 96, scopedSlots: { customRender: 'attendance' } }
      ]
    }
  },
  methods: {
    openAttendance () {
      this.attendanceVisible = true
    },
    goAppeals (status) {
      const query = status ? { status } : {}
      this.$router.push({ path: '/appeals', query })
    },
    openAppeal (id) {
      this.$router.push({ path: '/appeals', query: { id } })
    },
    openLedgerDetail (record) {
      this.ledgerDetail = {
        type: this.ledgerTab,
        row: record,
        result: record.result,
        projectNames: (record.projectExecutions || []).map(e => e.projectName).join('、')
      }
      this.detailVisible = true
    },
    onLedgerTabChange () {
      this.ledgerStatus = undefined
      this.ledgerKeyword = ''
    },
    goLedgerModule () {
      const map = { relations: '/relations', works: '/works', appeals: '/appeals', reports: '/daily', suggestions: '/suggestions' }
      this.$router.push(map[this.ledgerTab])
    },
    jumpToModule () {
      this.detailVisible = false
      this.goLedgerModule()
    },
    goApproval (path) {
      this.showApprovalList = false
      this.$router.push(path)
    },
    exportListExcel () {
      if (this.reportType === 'works') exportWorksExcel()
      else if (this.reportType === 'appeals') exportAppealsExcel(this.reportProject)
      else exportSuggestionsExcel()
      this.$message.success('Excel 文件已生成并开始下载')
    },
    printList () {
      if (this.reportType === 'works') printWorksList()
      else if (this.reportType === 'appeals') printAppealsList(this.reportProject)
      else printSuggestionsList()
    },
    exportDaily () {
      exportDailyExcel(fmtDate(this.reportDate))
      this.$message.success('日报 Excel 文件已生成并开始下载')
    },
    printDaily () {
      printDailyReport(fmtDate(this.reportDate))
    },
    exportWeekly () {
      if (!this.reportWeek || this.reportWeek.length !== 2) return
      exportWeeklyExcel(fmtDate(this.reportWeek[0]), fmtDate(this.reportWeek[1]))
      this.$message.success('周报 Excel 文件已生成并开始下载')
    },
    printWeekly () {
      if (!this.reportWeek || this.reportWeek.length !== 2) return
      printWeeklyReport(fmtDate(this.reportWeek[0]), fmtDate(this.reportWeek[1]))
    }
  }
}
</script>

<style scoped>
.overview-page {
  padding-bottom: 6px;
}
.stat-cell.clickable {
  cursor: pointer;
  transition: background 0.15s;
}
.stat-cell.clickable:hover {
  background: #f2f9ff;
}
.overview-middle {
  margin-top: 14px;
}
.todo-cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.todo-card {
  border: 1px solid #e8eff7;
  border-radius: 3px;
  background: #fbfdff;
  padding: 10px 12px;
  min-height: 132px;
  display: flex;
  flex-direction: column;
}
.todo-card-head {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  font-weight: 600;
  color: #2c4359;
  margin-bottom: 8px;
}
.todo-card-head b {
  margin-left: auto;
  color: #e04b4b;
  font-size: 17px;
}
.todo-card-icon {
  font-size: 15px;
}
.todo-card-icon.blue { color: #1890ff; }
.todo-card-icon.orange { color: #fa8c16; }
.todo-card-icon.red { color: #f5222d; }
.todo-card-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  padding: 4px 0;
  cursor: pointer;
  border-bottom: 1px dashed #f0f4f9;
}
.todo-card-row:last-of-type {
  border-bottom: 0;
}
.todo-card-row:hover .todo-card-title {
  color: #1890ff;
}
.todo-card-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #40566d;
}
.todo-card-empty {
  color: #a5b4c4;
  font-size: 12px;
  padding: 6px 0;
}
.todo-card-more {
  font-size: 11.5px;
  padding: 3px 0 0;
}
.todo-card-foot {
  margin-top: auto;
  padding-top: 8px;
  color: #1890ff;
  font-size: 12px;
  cursor: pointer;
  text-align: right;
}
.ledger-filter {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.ledger-more {
  margin-left: auto;
  font-size: 12px;
}
.ledger-content {
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.ledger-empty {
  text-align: center;
  color: #a5b4c4;
  font-size: 12px;
  padding: 16px 0 4px;
}
.report-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}
.report-card {
  border: 1px solid #e8eff7;
  border-radius: 3px;
  padding: 12px 14px;
  background: #fbfdff;
  display: flex;
  flex-direction: column;
}
.report-card-title {
  font-size: 13px;
  font-weight: 600;
  color: #2c4359;
  margin-bottom: 10px;
}
.report-card-title .anticon {
  color: #1890ff;
  margin-right: 3px;
}
.report-field {
  margin-bottom: 8px;
}
.report-label {
  display: block;
  font-size: 12px;
  color: #7d90a5;
  margin-bottom: 4px;
}
.report-desc {
  font-size: 11.5px;
  color: #8a9cb0;
  line-height: 18px;
  min-height: 54px;
}
.report-actions {
  display: flex;
  gap: 8px;
  margin-top: auto;
  padding-top: 10px;
}
.drawer-jump {
  margin-top: 18px;
  text-align: right;
}
</style>
