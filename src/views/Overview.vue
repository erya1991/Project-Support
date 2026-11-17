<template>
  <div class="overview-page">
    <div class="section-title overview-title">服务项目概览<span class="section-extra">数据按今日业务口径统计</span></div>
    <div class="stat-groups">
      <div v-for="group in statGroups" :key="group.key" class="stat-group">
        <div class="stat-group-title"><a-icon :type="group.icon" /> {{ group.title }}</div>
        <div class="stat-group-row">
          <div v-for="metric in group.metrics" :key="metric.label" class="stat-group-cell" @click="selectMetric(group.key, metric.status)">
            <div class="stat-label">{{ metric.label }}</div><div class="stat-value" :class="metric.color">{{ metric.value }}<small>{{ metric.unit }}</small></div>
          </div>
        </div>
      </div>
    </div>
    <section class="ledger-section">
      <div class="section-title">综合台账<span class="section-extra">点击编号或日期查看详情</span></div>
      <a-tabs v-model="ledgerTab" @change="onLedgerTabChange">
        <a-tab-pane key="relations" tab="帮扶关系" /><a-tab-pane key="works" tab="部门重点工作" />
        <a-tab-pane key="appeals" tab="项目诉求" /><a-tab-pane key="reports" tab="日报" /><a-tab-pane key="suggestions" tab="建议" />
      </a-tabs>
      <list-query :key="ledgerTab" :type="ledgerTab" v-model="ledgerFilters" @query="queryLedger" @reset="resetLedger" />
      <div ref="tableArea" class="ledger-table-area">
        <a-table :columns="ledgerColumns" :data-source="ledgerRows" :pagination="ledgerPagination" @change="onLedgerTableChange"
          row-key="id" size="small" :scroll="{ x: ledgerWidth, y: tableHeight }" />
      </div>
    </section>
    <a-modal
      title="人员到岗明细"
      :visible="attendanceVisible"
      :width="820"
      @cancel="attendanceVisible = false"
    >
      <div class="alert-note" style="margin-bottom:12px;">
        <a-icon type="info-circle" /> 统计日期：{{ today }}。人员到岗按人去重统计，同一人员服务多个项目时只计 1 人次；未提交日报不计为未到岗。
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
            <div class="detail-item"><span class="detail-label">配置状态</span><span class="detail-value"><status-tag :status="ledgerDetail.row.configStatus" /></span></div>
            <div class="detail-item"><span class="detail-label">服务人员</span><span class="detail-value">{{ ledgerDetail.row.personName }}</span></div>
            <div class="detail-item"><span class="detail-label">所属部门</span><span class="detail-value">{{ ledgerDetail.row.deptName }}</span></div>
            <div class="detail-item"><span class="detail-label">服务项目</span><span class="detail-value">{{ ledgerDetail.row.projectName }}</span></div>
            <div class="detail-item"><span class="detail-label">帮扶角色</span><span class="detail-value">{{ ledgerDetail.row.role }}</span></div>
            <div class="detail-item full"><span class="detail-label">有效期</span><span class="detail-value">{{ ledgerDetail.row.startDate }} 至 {{ ledgerDetail.row.endDate || '长期' }}</span></div>
          </div>
        </div>

        <div v-if="ledgerDetail.type === 'works'" class="drawer-section">
          <div class="detail-grid">
            <div class="detail-item"><span class="detail-label">事项编号</span><span class="detail-value">{{ ledgerDetail.row.code }}</span></div>
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
            <div class="detail-item"><span class="detail-label">销项审批状态</span><span class="detail-value"><status-tag :status="ledgerDetail.row.closeStatus" /></span></div>
            <div class="detail-item"><span class="detail-label">完成时限</span><span class="detail-value">{{ ledgerDetail.row.dueDate }}</span></div>
            <div class="detail-item full"><span class="detail-label">诉求事项</span><span class="detail-value">{{ ledgerDetail.row.title }}</span></div>
            <div class="detail-item full"><span class="detail-label">具体描述</span><span class="detail-value">{{ ledgerDetail.row.desc }}</span></div>
            <div class="detail-item full"><span class="detail-label">推进计划</span><span class="detail-value">{{ ledgerDetail.row.plan }}</span></div>
          </div>
        </div>

        <div v-if="ledgerDetail.type === 'reports'" class="drawer-section">
          <div class="detail-grid">
            <div class="detail-item"><span class="detail-label">填报日期</span><span class="detail-value">{{ ledgerDetail.row.date }}</span></div>
            <div class="detail-item"><span class="detail-label">填报状态</span><span class="detail-value"><status-tag :status="ledgerDetail.row.status" /></span></div>
            <div class="detail-item"><span class="detail-label">姓名</span><span class="detail-value">{{ ledgerDetail.row.personName }}</span></div>
            <div class="detail-item"><span class="detail-label">部门</span><span class="detail-value">{{ ledgerDetail.row.deptName }}</span></div>
            <div class="detail-item"><span class="detail-label">项目</span><span class="detail-value">{{ ledgerDetail.row.projectName }}</span></div>
            <div class="detail-item"><span class="detail-label">是否到岗</span><span class="detail-value">{{ ledgerDetail.row.attendText }}</span></div>
            <div class="detail-item"><span class="detail-label">冻结状态</span><span class="detail-value"><status-tag :status="ledgerDetail.row.frozen ? '已冻结' : '未冻结'" /></span></div>
            <div class="detail-item full"><span class="detail-label">对应诉求事项</span><span class="detail-value">{{ ledgerDetail.row.appealTitle }}</span></div>
            <div class="detail-item full"><span class="detail-label">当日工作开展情况</span><span class="detail-value">{{ ledgerDetail.row.workContent || '—' }}</span></div>
            <div class="detail-item full"><span class="detail-label">需协调解决问题</span><span class="detail-value">{{ ledgerDetail.row.newIssues || '无' }}</span></div>
          </div>
        </div>

        <div v-if="ledgerDetail.type === 'suggestions'" class="drawer-section">
          <div class="detail-grid">
            <div class="detail-item"><span class="detail-label">建议编号</span><span class="detail-value">{{ ledgerDetail.row.id }}</span></div>
            <div class="detail-item"><span class="detail-label">提出人</span><span class="detail-value">{{ ledgerDetail.row.proposerName }} / {{ ledgerDetail.row.proposerDeptName }}</span></div>
            <div class="detail-item"><span class="detail-label">主责部门</span><span class="detail-value">{{ ledgerDetail.row.deptName }}</span></div>
            <div class="detail-item"><span class="detail-label">审批状态</span><span class="detail-value"><status-tag :status="ledgerDetail.row.approvalStatus" /></span></div>
            <div class="detail-item full"><span class="detail-label">建议事项</span><span class="detail-value">{{ ledgerDetail.row.title }}</span></div>
            <div class="detail-item full"><span class="detail-label">涉及制度/流程</span><span class="detail-value">{{ ledgerDetail.row.flow }}</span></div>
            <div class="detail-item full"><span class="detail-label">问题描述</span><span class="detail-value">{{ ledgerDetail.row.desc }}</span></div>
            <div class="detail-item full"><span class="detail-label">回复意见</span><span class="detail-value">{{ ledgerDetail.row.replyText || '待部门确认' }}</span></div>
            <div v-if="ledgerDetail.row.archiveOpinion" class="detail-item full"><span class="detail-label">企划归档意见</span><span class="detail-value">{{ ledgerDetail.row.archiveOpinion }}</span></div>
          </div>
        </div>

      </template>
      <template slot="footer">
        <a-button @click="detailVisible = false">关闭</a-button>
        <a-button type="primary" ghost @click="jumpToModule">进入业务页面 <a-icon type="right" /></a-button>
      </template>
    </a-modal>
  </div>
</template>

<script>
import StatusTag from '../components/StatusTag.vue'
import ListQuery from '../components/ListQuery.vue'
import { todayStr } from '../utils/date'
import { emptyListFilters, listRows, listColumns } from '../utils/businessLists'

export default {
  name: 'OverviewView',
  components: { StatusTag, ListQuery },
  data () {
    return { today: todayStr(), ledgerTab: 'relations', ledgerFilters: emptyListFilters('relations', this.$store),
      ledgerApplied: emptyListFilters('relations', this.$store), ledgerScope: '',
      ledgerPagination: { current: 1, pageSize: 10, showSizeChanger: true, pageSizeOptions: ['10', '20', '50'], showTotal: total => '共 ' + total + ' 条' },
      tableHeight: 240, detailVisible: false, ledgerDetail: null, attendanceVisible: false }
  },
  computed: {
    stats () { return this.$store.overviewStats(this.today) },
    statGroups () {
      const s = this.stats
      const m = (label, value, unit, status = '', color = '') => ({ label, value, unit, status, color })
      return [
        { key: 'attendance', title: '人员今日到岗', icon: 'team', metrics: [m('服务人员数', s.serviceCount, '人'), m('今日到岗人数', s.attendedCount, '人', '', 'blue'), m('今日到岗率', s.expectedPeople ? s.attendanceRate : '—', '%')] },
        { key: 'works', title: '部门重点工作事项', icon: 'solution', metrics: [m('事项总数', s.workTotal, '项'), m('落实中', s.workProcessing, '项', '落实中', 'blue'), m('销项审批中', s.workClosing, '项', '销项审批中', 'orange'), m('已销项', s.workClosed, '项', '已销项', 'green')] },
        { key: 'appeals', title: '项目诉求', icon: 'profile', metrics: [m('诉求总数', s.appealTotal, '条'), m('办理中', s.processingCount, '条', '办理中', 'blue'), m('销项审批中', s.closingCount, '条', '销项审批中', 'orange'), m('已销项', s.closedCount, '条', '已销项', 'green')] },
        { key: 'reports', title: '今日日报填报', icon: 'form', metrics: [m('当日应填', s.dueCount, '份'), m('已填', s.submittedCount, '份', '已提交', 'blue'), m('未填', s.unfilledCount, '份', '未填写', 'orange')] }
      ]
    },
    ledgerRows () {
      let rows = listRows(this.ledgerTab, this.$store, this.ledgerApplied)
      if (this.ledgerScope === 'works') rows = rows.filter(r => ['落实中', '销项审批中', '已销项'].includes(r.status))
      if (this.ledgerScope === 'reports') rows = rows.filter(r => !r.appealDeleted)
      return rows
    },
    ledgerColumns () { return listColumns(this.ledgerTab, this, this.ledgerPagination, this.openLedgerDetail) },
    ledgerWidth () { return this.ledgerColumns.reduce((sum, column) => sum + column.width, 0) },
    ledgerDetailTitle () { return { relations: '帮扶关系详情', works: '重点工作详情', appeals: '项目诉求详情', reports: '日报详情', suggestions: '制度改进建议详情' }[this.ledgerTab] },
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
        const reports = this.$store.reportsForDate(this.today).filter(rep => rep.personId === r.personId && rep.projectId === r.projectId)
        reports.forEach(rep => map[r.personId].reports.push(rep))
      })
      return Object.values(map).map(row => {
        const submitted = row.reports.filter(r => r.status === '已提交')
        let attendance = '尚未填报'
        if (!row.reports.length) attendance = '无应填'
        else if (submitted.some(r => r.attend === true)) attendance = '已到岗'
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
  mounted () {
    this.tableObserver = new ResizeObserver(() => this.measureTable())
    this.tableObserver.observe(this.$refs.tableArea)
    this.measureTable()
  },
  beforeDestroy () { this.tableObserver.disconnect() },
  methods: {
    measureTable () { this.tableHeight = Math.max(100, this.$refs.tableArea.clientHeight - 110) },
    selectMetric (type, status) {
      if (type === 'attendance') { this.attendanceVisible = true; return }
      this.ledgerTab = type
      this.onLedgerTabChange()
      this.ledgerScope = type
      this.ledgerFilters.status = status || undefined
      this.queryLedger()
    },
    onLedgerTabChange () {
      this.ledgerScope = ''
      this.ledgerFilters = emptyListFilters(this.ledgerTab, this.$store)
      this.queryLedger()
    },
    resetLedger () { this.onLedgerTabChange() },
    queryLedger () { this.ledgerApplied = { ...this.ledgerFilters }; this.ledgerPagination.current = 1 },
    onLedgerTableChange ({ current, pageSize }) { Object.assign(this.ledgerPagination, { current, pageSize }) },
    openLedgerDetail (record) {
      this.ledgerDetail = { type: this.ledgerTab, row: record, result: record.result,
        projectNames: (record.projectExecutions || []).filter(e => e.inScope !== false).map(e => e.projectName).join('、') }
      this.detailVisible = true
    },
    jumpToModule () {
      const row = this.ledgerDetail.row
      const path = { relations: '/relations', works: '/works', appeals: '/appeals', reports: '/daily', suggestions: '/suggestions' }[this.ledgerTab]
      const query = { id: row.id }
      if (this.ledgerTab === 'works') query.tab = 'works'
      if (this.ledgerTab === 'reports') Object.assign(query, { tab: 'all', date: row.date })
      this.detailVisible = false
      this.$router.push({ path, query })
    }
  }
}
</script>

<style scoped>
.overview-page { display:flex; flex-direction:column; flex:1; min-height:0; }
.overview-title { margin-bottom:8px; }
.stat-groups { display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:10px; flex:none; }
.stat-group { border:1px solid #e2edf8; border-radius:3px; background:#fbfdff; overflow:hidden; }
.stat-group-title { padding:6px 12px; font-size:13px; font-weight:700; color:#2c4359; background:#f5faff; border-bottom:1px solid #eaf2fa; }
.stat-group-row { display:flex; }
.stat-group-cell { flex:1; min-width:0; padding:7px 12px; border-right:1px solid #eef4fa; cursor:pointer; }
.stat-group-cell:last-child { border-right:0; }
.stat-group-cell:hover { background:#f2f9ff; }
.stat-label { color:#7d90a5; font-size:12px; white-space:nowrap; }
.stat-value { margin-top:2px; font-size:23px; line-height:28px; font-weight:700; color:#1f3a56; }
.stat-value small { margin-left:4px; font-size:12px; color:#7d90a5; font-weight:400; }
.blue { color:#1890ff; }.orange { color:#fa8c16; }.green { color:#20a06b; }
.ledger-section { display:flex; flex-direction:column; flex:1; min-height:0; margin-top:12px; }
.ledger-section > .section-title { margin-bottom:0; }
.ledger-section ::v-deep .ant-tabs-bar { margin-bottom:8px; }
.ledger-section ::v-deep .business-query { flex:none; margin-bottom:8px; }
.ledger-section ::v-deep .query-field-area { max-height:145px; overflow-y:auto; }
.ledger-table-area { flex:1; min-height:0; overflow:hidden; }
@media(max-width:1000px) { .stat-groups { grid-template-columns:1fr; } .overview-page { min-height:900px; } }
</style>
