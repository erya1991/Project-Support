<template>
  <div class="daily-page">
    <a-tabs v-model="activeTab">
      <a-tab-pane key="mine">
        <span slot="tab"><a-icon type="user" /> 我的日报</span>
        <div class="tab-body">
          <div class="alert-note">
            <a-icon type="info-circle" />
            每条在办诉求每天对应一份日报，需分别提交；当日 24:00 前可修改，次日 00:00 自动冻结。未提交日报不计为未到岗。
          </div>

          <div class="mine-toolbar">
            <span class="mine-toolbar-label">填报日期</span>
            <a-date-picker v-model="mineDate" :allow-clear="false" style="width: 160px" />
            <a-button size="small" @click="backToToday">回到今天</a-button>
            <span class="muted">当前共 {{ myReports.length }} 份诉求日报任务</span>
          </div>

          <div class="mine-stats">
            <div class="mine-stat"><span>应填日报</span><b>{{ myStats.due }}</b></div>
            <div class="mine-stat"><span>已提交</span><b class="green">{{ myStats.submitted }}</b></div>
            <div class="mine-stat"><span>待填写</span><b class="red">{{ myStats.pending }}</b></div>
          </div>

          <div v-if="mineDateIsFuture" class="alert-note warn" style="margin-top:12px;">
            <a-icon type="clock-circle" /> 所选日期尚未到达，可提前查看应填任务，但需当日填报。
          </div>

          <a-table table-layout="fixed" :columns="fitColumns(mineColumns)" :data-source="myReports" :pagination="minePagination" @change="onMineTableChange" row-key="id" size="middle">
            <div slot="mineStatus" slot-scope="text, record"><status-tag :status="text" /> <status-tag v-if="record.frozen" status="已冻结" /></div>
            <div slot="mineAction" slot-scope="text, report" class="table-actions">
              <a v-if="!canFillReport(report)" @click="openReport(report, 'view')">查看</a>
              <template v-else-if="report.status === '已提交'"><a @click="openReport(report, 'mine')">修改并提交</a><a-divider type="vertical" /><a @click="openReport(report, 'view')">查看</a></template>
              <a v-else @click="openReport(report, 'mine')">填写日报</a>
            </div>
          </a-table>
          <div v-if="!myReports.length" class="empty-hint">当日暂无应填诉求日报</div>
        </div>
      </a-tab-pane>

      <a-tab-pane key="all">
        <span slot="tab"><a-icon type="profile" /> 全部日报</span>
        <div class="tab-body">
          <list-query type="reports" v-model="allFilters" @query="applyAllFilter" @reset="resetAllFilter" />

          <div class="toolbar">
            <a-button @click="exportDailyExcelByDate"><a-icon type="download" /> 导出当日日报</a-button>
            <span class="muted toolbar-tip">同一人同一项目的不同诉求分别占一行，可筛选未填写任务进行提醒。</span>
          </div>

          <div class="inline-stats">
            <span>共 <b>{{ allReports.length }}</b> 条诉求日报</span>
            <span>已提交 <b class="green">{{ allStats.submitted }}</b></span>
            <span>未填写 <b class="red">{{ allStats.unfilled }}</b></span>
          </div>

          <a-table table-layout="fixed"
            :columns="fitColumns(allColumns)"
            :data-source="allReports"
            :pagination="allPagination"
            @change="onAllTableChange"
            row-key="id"
            size="middle"
          >
            <div slot="action" slot-scope="text, record" class="table-actions">
              <a class="link-btn" @click="openReport(record, 'view')">查看日报</a>
              <template v-if="record.status === '已提交' && !record.legacy">
                <a-divider type="vertical" />
                <a class="link-btn" @click="openReport(record, 'admin')">管理员修订</a>
              </template>
            </div>
          </a-table>
        </div>
      </a-tab-pane>

      <a-tab-pane key="weekly">
        <span slot="tab"><a-icon type="schedule" /> 周度汇总</span>
        <div class="tab-body">
          <div class="weekly-toolbar">
            <span class="mine-toolbar-label"><span class="required-mark">*</span>自然周</span>
            <a-week-picker v-model="weekValue" :allow-clear="false" style="width: 220px" @change="onWeekChange" />
            <a-button size="small" @click="setWeek('current')">本周</a-button>
            <a-button size="small" @click="setWeek('last')">上周</a-button>
            <span class="muted">{{ weekStart.format('YYYY-MM-DD') }} 至 {{ weekEnd.format('YYYY-MM-DD') }}</span>
            <div class="weekly-actions">
              <a-button type="primary" size="small" @click="exportWeeklyExcel"><a-icon type="download" /> 导出周报Excel</a-button>
            </div>
          </div>

          <div class="weekly-summary">{{ weekly.summary || '请选择自然周' }}</div>
          <list-query type="weekly" v-model="weeklyFilters" @query="applyWeeklyFilter" @reset="resetWeeklyFilter" />

          <a-tabs v-model="weeklyTab" type="card" class="weekly-subtabs"><a-tab-pane key="absent" tab="未到岗人员情况">
          <a-table table-layout="fixed"
            :columns="fitColumns(weeklyAbsentColumns)"
            :data-source="weeklyAbsentRows"
            :pagination="false"
            row-key="rowKey"
            size="small"
          >
            <div slot="needs" slot-scope="text"><a-tooltip :title="text"><div class="business-cell">{{ text }}</div></a-tooltip></div>
            <div slot="reason" slot-scope="text"><a-tooltip :title="text"><div class="business-cell">{{ text }}</div></a-tooltip></div>
          </a-table>
          <div v-if="!weeklyAbsentRows.length" class="empty-hint">当前条件下暂无未到岗记录</div>

          </a-tab-pane><a-tab-pane key="attended" tab="已到岗人员情况">
          <a-table table-layout="fixed"
            :columns="fitColumns(weeklyServiceColumns)"
            :data-source="weeklyServiceRows"
            :pagination="false"
            row-key="rowKey"
            size="small"
          >
            <div slot="needs" slot-scope="text"><a-tooltip :title="text"><div class="business-cell">{{ text }}</div></a-tooltip></div>
            <div slot="work" slot-scope="text"><a-tooltip :title="text"><div class="business-cell">{{ text }}</div></a-tooltip></div>
            <div slot="issues" slot-scope="text"><a-tooltip :title="text"><div class="business-cell">{{ text }}</div></a-tooltip></div>
          </a-table>
          </a-tab-pane></a-tabs>
          <div class="weekly-foot muted">周度汇总及导出按完整自然周统计；查询条件筛选下方明细，到岗人数按人员与日期去重。</div>
        </div>
      </a-tab-pane>
    </a-tabs>

    <a-modal
      :title="reportDrawerTitle"
      :visible="reportDrawerVisible"
      :width="1000"
      :mask-closable="false"
      wrap-class-name="daily-report-modal"
      @cancel="reportDrawerVisible = false"
    >
      <template v-if="reportCurrent">
        <div v-if="reportMode === 'admin'" class="alert-note warn" style="margin-bottom:12px;">
          <a-icon type="edit" /> 管理员修订：可修改已冻结日报，保存时须填写修订原因并保留修改前后内容。
        </div>

        <div class="detail-grid">
          <div class="detail-item"><span class="detail-label">姓名</span><span class="detail-value">{{ reportCurrent.personName }}</span></div>
          <div class="detail-item"><span class="detail-label">部门</span><span class="detail-value">{{ reportCurrent.deptName }}</span></div>
          <div class="detail-item"><span class="detail-label">填报日期</span><span class="detail-value">{{ reportCurrent.date }}</span></div>
          <div class="detail-item"><span class="detail-label">项目</span><span class="detail-value">{{ reportCurrent.projectName }}</span></div>
          <div class="detail-item full"><span class="detail-label">诉求事项</span><span class="detail-value">{{ reportCurrent.appealTitle }}</span></div>
          <div class="detail-item full"><span class="detail-label">项目层面服务需求</span><span class="detail-value">{{ reportCurrent.projectNeeds }}</span></div>
        </div>

        <div class="drawer-section" style="margin-top:16px;">
          <div class="drawer-section-title">当日填报</div>
          <a-form-model :label-col="{ span: 5 }" :wrapper-col="{ span: 19 }">
            <a-form-model-item>
              <span slot="label"><span class="required-mark">*</span>是否到岗</span>
              <a-radio-group v-model="reportForm.attend" :disabled="!reportEditable">
                <a-radio :value="true">是</a-radio>
                <a-radio :value="false">否</a-radio>
              </a-radio-group>
            </a-form-model-item>
            <a-form-model-item v-if="reportForm.attend === false">
              <span slot="label"><span class="required-mark">*</span>未到岗原因</span>
              <a-textarea v-model="reportForm.absentReason" :rows="2" :max-length="200" :disabled="!reportEditable" placeholder="请说明未到岗原因" />
            </a-form-model-item>
            <a-form-model-item v-if="reportForm.attend === true">
              <span slot="label"><span class="required-mark">*</span>当日工作开展情况</span>
              <a-textarea v-model="reportForm.workContent" :rows="3" :max-length="500" :disabled="!reportEditable" placeholder="填写当天实际开展的项目帮扶工作，可分条填写" />
            </a-form-model-item>
            <a-form-model-item label="今日项目反馈需协调解决问题">
              <a-textarea v-model="reportForm.newIssues" :rows="2" :max-length="300" :disabled="!reportEditable" placeholder="无新增问题时填写“无”" />
            </a-form-model-item>
          </a-form-model>
        </div>

        <div v-if="reportMode === 'admin'">
          <div class="drawer-section">
            <div class="drawer-section-title"><span class="required-mark">*</span>修订原因</div>
            <a-textarea v-model="adminReason" :rows="2" placeholder="请填写本次修订原因，保存后记录修订人、时间及修改前后内容" />
          </div>
          <div v-if="reportCurrent.revisions && reportCurrent.revisions.length" class="drawer-section">
            <div class="drawer-section-title">修订记录</div>
            <a-timeline>
              <a-timeline-item v-for="(rev, index) in reportCurrent.revisions" :key="index" color="orange">
                <div class="history-title">{{ rev.operator }} · {{ rev.time }}</div>
                <div class="history-remark">修订原因：{{ rev.reason }}</div>
                <div class="revision-diff">
                  <div><span class="muted">修改前到岗：</span>{{ rev.before.attend === true ? '是' : (rev.before.attend === false ? '否' : '未填') }}</div>
                  <div><span class="muted">修改前工作内容：</span>{{ rev.before.workContent || '—' }}</div>
                  <div><span class="muted">修改后工作内容：</span>{{ rev.after.workContent || '—' }}</div>
                </div>
              </a-timeline-item>
            </a-timeline>
          </div>
        </div>
      </template>
      <template slot="footer">
        <a-button @click="reportDrawerVisible = false">关闭</a-button>
        <template v-if="reportMode === 'admin'">
          <a-button type="primary" @click="saveAdminRevision">保存修订</a-button>
        </template>
        <template v-else-if="reportEditable">
          <a-button type="primary" @click="saveSubmit">提交日报</a-button>
        </template>
      </template>
    </a-modal>

    <a-modal
      title="诉求详情"
      :visible="appealDetailVisible"
      :width="860"
      @cancel="appealDetailVisible = false"
    >
      <template v-if="appealDetailCurrent">
        <div class="appeal-head">
          <div class="appeal-id">{{ appealDetailCurrent.id }} · {{ appealDetailCurrent.projectName }}</div>
          <status-tag :status="appealDetailCurrent.status" />
        </div>
        <div class="detail-grid">
          <div class="detail-item"><span class="detail-label">承办人</span><span class="detail-value">{{ appealDetailCurrent.personName }}　<span class="muted">{{ appealDetailCurrent.personPhone }}</span></span></div>
          <div class="detail-item"><span class="detail-label">主责部门</span><span class="detail-value">{{ appealDetailCurrent.deptName }}</span></div>
          <div class="detail-item"><span class="detail-label">完成时限</span><span class="detail-value">{{ appealDetailCurrent.dueDate }}</span></div>
          <div class="detail-item"><span class="detail-label">发起人</span><span class="detail-value">{{ appealDetailCurrent.creatorName }}</span></div>
          <div class="detail-item full"><span class="detail-label">诉求事项</span><span class="detail-value">{{ appealDetailCurrent.title }}</span></div>
          <div class="detail-item full"><span class="detail-label">具体描述</span><span class="detail-value">{{ appealDetailCurrent.desc }}</span></div>
          <div class="detail-item full"><span class="detail-label">推进计划</span><span class="detail-value">{{ appealDetailCurrent.plan }}</span></div>
        </div>
        <div class="drawer-section" style="margin-top:14px;">
          <div class="drawer-section-title">办理日报</div>
          <a-table table-layout="fixed"
            :columns="fitColumns(appealReportColumns)"
            :data-source="appealDetailReports"
            :pagination="false"
            size="small"
            row-key="id"
          >
            <div slot="workSummary" slot-scope="text"><a-tooltip :title="text"><div class="business-cell">{{ text || '—' }}</div></a-tooltip></div>
            <div slot="issues" slot-scope="text"><a-tooltip :title="text"><div class="business-cell">{{ text || '—' }}</div></a-tooltip></div>
          </a-table>
          <div v-if="!appealDetailReports.length" class="empty-hint">暂无关联日报</div>
        </div>
      </template>
      <template slot="footer">
        <a-button @click="appealDetailVisible = false">关闭</a-button>
      </template>
    </a-modal>
  </div>
</template>

<script>
import moment from 'moment'
import StatusTag from '../components/StatusTag.vue'
import { todayStr, fmtDate, isFrozen } from '../utils/date'
import { buildWeeklyReport } from '../utils/reportData'
import { exportDailyExcel, exportWeeklyExcel } from '../utils/exportExcel'
import ListQuery from '../components/ListQuery.vue'
import { emptyListFilters, filterListRows, listRows, listColumns, fitColumns } from '../utils/businessLists'

export default {
  name: 'DailyView',
  components: { StatusTag, ListQuery },
  data () {
    const week = moment().startOf('isoWeek')
    return {
      activeTab: 'mine',
      projects: [],
      people: [],
      departments: [],
      mineDate: moment(),
      minePagination: { current: 1, pageSize: 10, showSizeChanger: true, showTotal: total => `共 ${total} 条` },
      weeklyTab: 'absent',
      allFilters: emptyListFilters('reports', this.$store),
      appliedAll: { ...emptyListFilters('reports', this.$store), date: todayStr() },
      allPagination: { current: 1, pageSize: 10, showSizeChanger: true, showTotal: total => `共 ${total} 条`, pageSizeOptions: ['10', '20', '50'] },
      weeklyFilters: emptyListFilters('weekly', this.$store),
      appliedWeekly: emptyListFilters('weekly', this.$store),
      weekValue: week,
      reportDrawerVisible: false,
      reportCurrent: null,
      reportMode: 'mine',
      reportForm: { attend: null, absentReason: '', workContent: '', newIssues: '' },
      adminReason: '',
      appealDetailVisible: false,
      appealDetailCurrent: null
    }
  },
  computed: {
    mineColumns () {
      const columns = listColumns('reports', this, this.minePagination)
      const keys = ['date', 'projectName', 'appealTitle', 'attendText', 'status', 'submitTime']
      return keys.map(key => {
        const column = columns.find(c => c.dataIndex === key)
        if (key === 'status') return { ...column, customRender: undefined, scopedSlots: { customRender: 'mineStatus' } }
        return { ...column, title: { date: '填报日期', projectName: '所属项目', attendText: '是否到岗' }[key] || column.title }
      }).concat({ title: '操作', width: 125, scopedSlots: { customRender: 'mineAction' } })
    },

    myReports () {
      const date = fmtDate(this.mineDate)
      const order = {}
      this.projects.forEach((p, index) => { order[p.id] = index })
      return listRows('reports', this.$store, { date })
        .filter(r => !r.appealDeleted && r.personId === this.$store.currentUser.id)
        .sort((a, b) => (order[a.projectId] || 0) - (order[b.projectId] || 0) || (a.appealTitle || '').localeCompare(b.appealTitle || '', 'zh'))
    },
    myStats () {
      const submitted = this.myReports.filter(r => r.status === '已提交').length
      return { due: this.myReports.length, submitted, pending: this.myReports.length - submitted }
    },
    mineDateIsFuture () {
      return fmtDate(this.mineDate) > todayStr()
    },
    allReports () {
      return listRows('reports', this.$store, this.appliedAll)
    },
    allStats () {
      return {
        submitted: this.allReports.filter(r => r.status === '已提交').length,
        unfilled: this.allReports.filter(r => r.status !== '已提交').length
      }
    },
    allColumns () {
      return listColumns('reports', this, this.allPagination).concat({ title: '操作', width: 125, scopedSlots: { customRender: 'action' } })
    },
    weekStart () {
      return this.weekValue ? moment(this.weekValue).startOf('isoWeek') : moment().startOf('isoWeek')
    },
    weekEnd () {
      return this.weekStart.clone().add(6, 'day')
    },
    weekly () {
      return buildWeeklyReport(this.$store.db, this.weekStart.format('YYYY-MM-DD'), this.weekEnd.format('YYYY-MM-DD'))
    },
    weeklyAbsentRows () {
      return this.filterWeeklyRows(this.weekly.absentRows)
    },
    weeklyServiceRows () {
      return this.filterWeeklyRows(this.weekly.serviceRows)
    },
    weeklyAbsentColumns () {
      return [
        { title: '序号', dataIndex: 'rowKey', width: 50, align: 'center', customRender: (t, r, i) => i + 1 },
        { title: '姓名', dataIndex: 'personName', width: 72 },
        { title: '部门', dataIndex: 'deptName', width: 145 },
        { title: '日期', dataIndex: 'date', width: 98 },
        { title: '项目', dataIndex: 'projectName', width: 175 },
        { title: '项目层面服务需求', dataIndex: 'needs', width: 280, scopedSlots: { customRender: 'needs' } },
        { title: '是否到岗', dataIndex: 'attend', width: 76, align: 'center' },
        { title: '未到岗原因', dataIndex: 'reason', width: 235, scopedSlots: { customRender: 'reason' } }
      ]
    },
    weeklyServiceColumns () {
      return [
        { title: '序号', dataIndex: 'rowKey', width: 50, align: 'center', customRender: (t, r, i) => i + 1 },
        { title: '姓名', dataIndex: 'personName', width: 72 },
        { title: '部门', dataIndex: 'deptName', width: 145 },
        { title: '日期', dataIndex: 'date', width: 98 },
        { title: '项目', dataIndex: 'projectName', width: 175 },
        { title: '项目层面服务需求', dataIndex: 'needs', width: 250, scopedSlots: { customRender: 'needs' } },
        { title: '是否到岗', dataIndex: 'attend', width: 76, align: 'center' },
        { title: '当日工作开展情况', dataIndex: 'workContent', width: 270, scopedSlots: { customRender: 'work' } },
        { title: '今日项目反馈需协调解决问题', dataIndex: 'issues', width: 210, scopedSlots: { customRender: 'issues' } }
      ]
    },
    reportDrawerTitle () {
      if (!this.reportCurrent) return '诉求日报'
      return `${this.reportCurrent.personName} · ${this.reportCurrent.projectName} · ${this.reportCurrent.appealTitle}`
    },
    reportEditable () {
      if (!this.reportCurrent) return false
      if (this.reportMode === 'admin') return this.reportCurrent.status === '已提交' && !this.reportCurrent.legacy
      if (this.reportMode === 'view') return false
      return this.canFillReport(this.reportCurrent)
    },
    appealDetailReports () {
      return this.appealDetailCurrent ? this.$store.reportsForAppeal(this.appealDetailCurrent.id) : []
    },
    appealReportColumns () {
      return [
        { title: '日期', dataIndex: 'date', width: 96 },
        { title: '填报人', dataIndex: 'personName', width: 74 },
        { title: '项目', dataIndex: 'projectName', width: 135 },
        { title: '到岗', dataIndex: 'attend', width: 50, align: 'center', customRender: text => text === true ? '是' : (text === false ? '否' : '—') },
        { title: '当日工作开展情况', dataIndex: 'workContent', width: 220, scopedSlots: { customRender: 'workSummary' } },
        { title: '今日新增问题', dataIndex: 'newIssues', width: 140, scopedSlots: { customRender: 'issues' } },
        { title: '提交时间', dataIndex: 'submitTime', width: 112 }
      ]
    }
  },
  created () {
    this.projects = this.$store.db.projects
    this.people = this.$store.db.people
    this.departments = this.$store.db.departments
    this.applyTabQuery()
  },
  watch: {
    mineDate () { this.minePagination.current = 1 },
    '$route.query': function () {
      this.applyTabQuery()
    }
  },
  methods: {
    fitColumns (columns) { return fitColumns(columns, this.$createElement) },
    onMineTableChange ({ current, pageSize }) { Object.assign(this.minePagination, { current, pageSize }) },
    onAllTableChange ({ current, pageSize }) {
      Object.assign(this.allPagination, { current, pageSize })
    },
    canFillReport (report) {
      return !report.legacy && this.$store.db.appeals.some(a => a.id === report.appealId) && report.date === todayStr()
    },
    filterWeeklyRows (rows) {
      return filterListRows('weekly', rows, this.appliedWeekly, this.$store)
    },
    applyWeeklyFilter () {
      this.appliedWeekly = { ...this.weeklyFilters }
    },
    resetWeeklyFilter () {
      this.weeklyFilters = emptyListFilters('weekly', this.$store)
      this.applyWeeklyFilter()
    },
    applyTabQuery () {
      const q = this.$route.query
      if (q.tab && ['mine', 'all', 'weekly'].indexOf(q.tab) > -1) this.activeTab = q.tab
      if (q.tab === 'all') {
        this.allFilters = { ...emptyListFilters('reports', this.$store), date: q.date ? moment(q.date, 'YYYY-MM-DD') : moment(), status: q.status, personName: q.personId ? (this.$store.getPerson(q.personId) || {}).name : '' }
        this.applyAllFilter()
      }
      if (q.status) {
        this.activeTab = 'all'
        this.allFilters.status = q.status
        this.appliedAll = { ...this.allFilters, date: this.allFilters.date ? fmtDate(this.allFilters.date) : '' }
      }
      if (q.personId) {
        this.activeTab = 'all'
        this.allFilters.personName = (this.$store.getPerson(q.personId) || {}).name || ''
        this.appliedAll = { ...this.allFilters, date: this.allFilters.date ? fmtDate(this.allFilters.date) : '' }
      }
      if (q.id) {
        const report = this.$store.db.dailyReports.find(r => r.id === q.id)
        if (report) this.openReport(report, 'view')
      }
    },
    backToToday () {
      this.mineDate = moment()
    },
    applyAllFilter () {
      this.appliedAll = { ...this.allFilters, date: this.allFilters.date ? fmtDate(this.allFilters.date) : '' }
      this.allPagination = { ...this.allPagination, current: 1 }
    },
    resetAllFilter () {
      this.allFilters = emptyListFilters('reports', this.$store)
      this.applyAllFilter()
    },
    openReport (report, mode) {
      this.reportCurrent = this.$store.db.dailyReports.find(r => r.id === report.id)
      if (mode === 'admin' && (report.legacy || report.status !== '已提交')) return this.$message.warning('仅已提交的诉求日报可管理员修订')
      if (mode === 'mine' && !this.canFillReport(report)) mode = 'view'
      this.reportMode = mode
      this.reportCurrent.frozen = isFrozen(report.date)
      this.reportForm = {
        attend: report.attend,
        absentReason: report.absentReason || '',
        workContent: report.workContent || '',
        newIssues: report.newIssues || ''
      }
      this.adminReason = ''
      this.reportDrawerVisible = true
    },
    openCard (report) {
      if (!this.canFillReport(report)) return this.openReport(report, 'view')
      return this.openReport(report, 'mine')
    },
    validateReport () {
      if (this.reportForm.attend === null || typeof this.reportForm.attend === 'undefined') {
        this.$message.warning('请选择是否到岗')
        return false
      }
      if (this.reportForm.attend === false && !this.reportForm.absentReason.trim()) {
        this.$message.warning('请填写未到岗原因')
        return false
      }
      if (this.reportForm.attend === true && !this.reportForm.workContent.trim()) {
        this.$message.warning('请填写当日工作开展情况')
        return false
      }
      return true
    },
    saveSubmit () {
      if (!this.validateReport()) return
      const res = this.$store.saveReport(this.reportCurrent.id, this.reportForm)
      if (!res.ok) return this.$message.error(res.message)
      this.reportDrawerVisible = false
      this.$message.success('日报已提交，关联诉求已同步更新')
    },
    saveAdminRevision () {
      if (!this.validateReport()) return
      if (!this.adminReason.trim()) return this.$message.warning('请填写修订原因')
      const res = this.$store.reviseReport(this.reportCurrent.id, this.reportForm, this.adminReason)
      if (!res.ok) return this.$message.error(res.message)
      this.reportDrawerVisible = false
      this.$message.success('日报已修订，已保留修改前后版本')
    },
    openAppealDetail (appealId) {
      const appeal = this.$store.db.appeals.find(a => a.id === appealId)
      if (!appeal) return
      this.appealDetailCurrent = appeal
      this.appealDetailVisible = true
    },
    setWeek (type) {
      this.weekValue = moment().startOf('isoWeek').add(type === 'last' ? -1 : 0, 'week')
    },
    onWeekChange (value) {
      if (value) this.weekValue = moment(value).startOf('isoWeek')
    },
    exportDailyExcelByDate () {
      const date = this.appliedAll.date || todayStr()
      exportDailyExcel(date)
      this.$message.success('日报 Excel 文件已生成并开始下载')
    },
    exportWeeklyExcel () {
      exportWeeklyExcel(this.weekStart.format('YYYY-MM-DD'), this.weekEnd.format('YYYY-MM-DD'))
      this.$message.success('周报 Excel 文件已生成并开始下载')
    }
  }
}
</script>

<style scoped>
.tab-body { padding-top: 6px; }
.mine-toolbar { display: flex; align-items: center; gap: 10px; margin: 12px 0; }
.mine-toolbar-label { font-size: 13px; color: #4a5d72; }
.mine-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); border: 1px solid #e8eff7; border-radius: 3px; background: #fbfdff; margin-bottom: 14px; }
.mine-stat { padding: 10px 16px; border-right: 1px solid #eef3f9; display: flex; align-items: center; justify-content: space-between; font-size: 12.5px; color: #6b8096; }
.mine-stat:last-child { border-right: 0; }
.mine-stat b { font-size: 20px; color: #1f3a56; }
.mine-stat b.green { color: #20a06b; }
.mine-stat b.red { color: #e04b4b; }
.inline-stats { display: flex; gap: 20px; font-size: 12.5px; color: #6b8096; margin-bottom: 10px; }
.inline-stats b { color: #2f4358; margin-left: 2px; }
.inline-stats b.green { color: #20a06b; }
.inline-stats b.red { color: #e04b4b; }
.weekly-toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.weekly-actions { margin-left: auto; display: flex; gap: 8px; }
.weekly-summary { background: #f7fbff; border: 1px solid #dcecfa; border-radius: 3px; padding: 10px 14px; font-size: 12.5px; color: #35536f; line-height: 22px; white-space: pre-line; margin-bottom: 14px; }
.weekly-foot { margin-top: 12px; font-size: 11.5px; }
.appeal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.appeal-id { font-size: 13px; font-weight: 600; color: #2c4359; }
.revision-diff { margin-top: 5px; background: #fffaf0; border: 1px solid #ffe9bf; border-radius: 2px; padding: 6px 9px; font-size: 11.5px; color: #8a6420; line-height: 18px; }
.history-title { font-size: 13px; color: #2f4358; font-weight: 600; }
.history-remark { font-size: 12px; color: #5b7189; line-height: 18px; }
</style>
