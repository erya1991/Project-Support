<template>
  <div class="daily-page">
    <a-tabs v-model="activeTab">
      <a-tab-pane key="mine">
        <span slot="tab"><a-icon type="user" /> 我的日报</span>
        <div class="alert-note"><a-icon type="info-circle" /> 工作日每人填写一份日报，项目及分公司由有效帮扶关系带出。次日零点冻结。</div>
        <div class="toolbar section-block"><span>填报日期</span><a-date-picker v-model="mineDate" :allow-clear="false" />
          <a-button size="small" @click="mineDate = todayValue()">回到今天</a-button></div>
        <div class="work-summary"><div>应填日报 <b>{{ mine.filter(r => r.eligible).length }}</b></div>
          <div>已提交 <b class="success-text">{{ mine.filter(r => r.status === '已提交').length }}</b></div>
          <div>待填写 <b>{{ mine.filter(r => r.status === '待填写').length }}</b></div></div>
        <business-table ref="mine" type="reports" :rows="mine" @detail="detail = $event">
          <template #actions="{row}"><a v-if="canSubmit(row)" class="link-btn" @click="open(row)">{{ row.status === '已提交' ? '修改并提交' : '填写日报' }}</a>
            <a class="link-btn" @click="detail = row">查看</a></template>
        </business-table>
      </a-tab-pane>
      <a-tab-pane key="all">
        <span slot="tab"><a-icon type="profile" /> 全部日报</span>
        <business-list type="reports" table-type="allReports" :action-width="147">
          <template #toolbar="{filters, rows}"><a-button icon="download" @click="downloadDaily(filters)">导出当日日报</a-button>
            <span class="muted">已提交 {{ rows.filter(r => r.status === '已提交').length }} 份 · 待填写 {{ rows.filter(r => r.status === '待填写').length }} 份</span>
          </template>
          <template #actions="{row}">
            <a v-if="row.status === '待填写' && canSubmit(row)" class="link-btn" @click="open(row)">填写日报</a>
            <a class="link-btn" @click="detail = row">查看</a>
            <a v-if="row.status === '已提交'" class="link-btn" @click="open(row, true)">管理员修订</a>
          </template>
        </business-list>
      </a-tab-pane>
      <a-tab-pane key="weekly">
        <span slot="tab"><a-icon type="schedule" /> 周度汇总</span>
        <div class="toolbar"><span>自然周</span><a-week-picker v-model="week" :allow-clear="false" />
          <a-button size="small" @click="week = todayValue()">本周</a-button>
          <a-button size="small" @click="week = todayValue().subtract(1, 'week')">上周</a-button>
          <span class="muted">{{ start }} 至 {{ end }}</span>
          <a-button class="toolbar-right" type="primary" icon="download" @click="downloadWeekly">导出周报 Excel</a-button>
        </div>
        <div class="alert-note pre-line">{{ summary.summary }}</div>
        <list-query type="weekly" v-model="weeklyFilters" @query="queryWeekly" @reset="resetWeekly" />
        <a-tabs v-model="weeklyTab" type="card" @change="firstWeeklyPage">
          <a-tab-pane key="absent" tab="未到岗人员情况" /><a-tab-pane key="attended" tab="已到岗人员情况" />
        </a-tabs>
        <business-table ref="weeklyTable" :type="weeklyTab === 'absent' ? 'weeklyAbsent' : 'weeklyService'" :rows="weeklyRows" @detail="openWeeklyDetail" />
      </a-tab-pane>
    </a-tabs>
    <record-detail v-if="detail" type="reports" :record="detail" @close="detail = null" />
    <a-modal :visible="!!record" :title="revising ? '管理员修订日报' : '填写日报'" :width="810" :mask-closable="false"
      :ok-text="revising ? '保存修订' : '提交日报'" wrap-class-name="daily-report-modal" @ok="submit" @cancel="record = null">
      <template v-if="record">
        <div class="detail-grid">
          <div class="detail-item"><span class="detail-label">填报日期</span>{{ record.date }}</div>
          <div class="detail-item"><span class="detail-label">填报人</span>{{ record.personName }} · {{ record.deptName }}</div>
          <div class="detail-item full"><span class="detail-label">帮扶项目及分公司</span>
            <div class="detail-value"><div v-for="p in record.projects" :key="p.id">{{ p.company }} · {{ p.name }}</div></div>
          </div>
        </div>
        <a-form-model layout="vertical" class="section-block">
          <a-form-model-item label="项目层面服务需求"><a-textarea v-model="form.projectNeeds" :rows="2" placeholder="可按项目分点填写" /></a-form-model-item>
          <a-form-model-item label="是否到岗" required><a-radio-group v-model="form.attend"><a-radio :value="true">是</a-radio><a-radio :value="false">否</a-radio></a-radio-group></a-form-model-item>
          <a-form-model-item v-if="form.attend === false" label="未到岗原因" required><a-textarea v-model="form.absentReason" :rows="2" /></a-form-model-item>
          <a-form-model-item v-if="form.attend === true" label="当日工作开展情况" required><a-textarea v-model="form.workContent" :rows="3" placeholder="可按项目分点填写" /></a-form-model-item>
          <a-form-model-item label="今日需协调问题"><a-textarea v-model="form.newIssues" :rows="2" /></a-form-model-item>
          <a-form-model-item label="附件"><file-uploader v-model="form.attachments" /></a-form-model-item>
          <a-form-model-item v-if="revising" label="修订原因" required><a-textarea v-model="reason" :rows="2" /></a-form-model-item>
        </a-form-model>
      </template>
    </a-modal>
  </div>
</template>
<script>
import moment from 'moment'
import BusinessList from '../components/BusinessList.vue'
import BusinessTable from '../components/BusinessTable.vue'
import RecordDetail from '../components/RecordDetail.vue'
import ListQuery from '../components/ListQuery.vue'
import FileUploader from '../components/FileUploader.vue'
import { dailyRows, reportBody, buildWeeklyReport, reportRow } from '../utils/reportData'
import { emptyListFilters, filterListRows } from '../utils/businessLists'
import { fmtDate, todayStr } from '../utils/date'
import { exportDailyExcel, exportWeeklyExcel } from '../utils/exportExcel'

export default {
  name: 'DailyView', components: { BusinessList, BusinessTable, RecordDetail, ListQuery, FileUploader },
  data () {
    const today = moment(this.$store.state.day)
    return { activeTab: 'mine', mineDate: today, week: today.clone(), weeklyTab: 'absent', weeklyFilters: emptyListFilters('weekly', this.$store),
      appliedWeekly: {}, form: reportBody(), record: null, detail: null, revising: false, reason: '' }
  },
  computed: {
    mine () { return dailyRows(this.$store.db, fmtDate(this.mineDate)).filter(r => r.personId === this.$store.currentUser.id) },
    start () { return this.week.clone().startOf('isoWeek').format('YYYY-MM-DD') },
    end () { return this.week.clone().endOf('isoWeek').format('YYYY-MM-DD') },
    summary () { return buildWeeklyReport(this.$store.db, this.start, this.end) },
    weeklyRows () {
      return filterListRows('weekly', this.weeklyTab === 'absent' ? this.summary.absentRows : this.summary.serviceRows, this.appliedWeekly, this.$store)
    }
  },
  watch: {
    '$route.fullPath': { immediate: true, handler () {
      if (['all', 'weekly', 'mine'].includes(this.$route.query.tab)) this.activeTab = this.$route.query.tab
      const saved = this.$store.db.dailyReports.find(r => r.id === this.$route.query.id)
      if (saved) this.detail = reportRow(saved, false)
    } },
    mineDate () { if (this.$refs.mine) this.$refs.mine.firstPage() },
    week () { this.firstWeeklyPage() },
    '$store.state.day' (day, previous) { if (fmtDate(this.mineDate) === previous) this.mineDate = moment(day) }
  },
  methods: {
    todayValue () { return moment(todayStr()) },
    canSubmit (row) { return row.date === this.$store.state.day && row.eligible },
    open (row, revising = false) {
      this.record = row
      this.form = { ...reportBody(row), attachments: row.attachments.slice() }
      this.revising = revising
      this.reason = ''
    },
    submit () {
      const res = this.$store.saveReport(this.record, this.form, this.revising ? this.reason : undefined)
      if (!res.ok) return this.$message.warning(res.message)
      this.record = null
      this.$message.success(this.revising ? '日报已修订，变更已记录' : '日报已提交')
    },
    openWeeklyDetail (row) { this.detail = reportRow(this.$store.db.dailyReports.find(r => r.id === row.id), false) },
    firstWeeklyPage () { if (this.$refs.weeklyTable) this.$refs.weeklyTable.firstPage() },
    queryWeekly () { this.appliedWeekly = { ...this.weeklyFilters }; this.firstWeeklyPage() },
    resetWeekly () { this.weeklyFilters = emptyListFilters('weekly', this.$store); this.queryWeekly() },
    downloadDaily (filters) { exportDailyExcel(fmtDate(filters.date) || todayStr()); this.$message.success('日报 Excel 已导出') },
    downloadWeekly () { exportWeeklyExcel(this.start, this.end); this.$message.success('周报 Excel 已导出') }
  }
}
</script>
