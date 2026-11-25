<template>
  <div class="overview-page">
    <div class="section-title overview-title">服务项目概览<span class="section-extra">{{ $store.state.day }}</span></div>
    <div class="stat-groups">
      <div v-for="group in groups" :key="group.title" class="stat-group">
        <div class="stat-group-title"><a-icon :type="group.icon" /> {{ group.title }}</div>
        <div class="stat-group-row">
          <button v-for="m in group.metrics" :key="m.label" type="button" class="stat-group-cell" @click="select(m)">
            <span class="stat-label">{{ m.label }}</span><span class="stat-value" :class="m.color">{{ m.value }}<small>{{ m.unit }}</small></span>
          </button>
        </div>
      </div>
    </div>
    <section class="ledger-section">
      <div class="section-title">综合台账</div>
      <a-tabs :active-key="tab" @change="switchTab"><a-tab-pane v-for="key in tabs" :key="key" :tab="titles[key]" /></a-tabs>
      <business-list :key="tab" :type="tab" :table-type="tab === 'reports' ? 'allReports' : tab" :preset="preset" fill />
    </section>
    <a-modal v-if="attendanceMetric" visible title="人员到岗明细" :width="850" @cancel="attendanceMetric = null">
      <div class="toolbar">{{ $store.state.day }} · {{ attendanceMetric.label }}　{{ attendanceMetric.filters.eligible ? '应填' : '共' }} {{ attendanceDetails.length }} 人</div>
      <business-table type="attendance" :rows="attendanceDetails" compact />
      <template slot="footer"><a-button @click="attendanceMetric = null">关闭</a-button></template>
    </a-modal>
  </div>
</template>
<script>
import moment from 'moment'
import BusinessList from '../components/BusinessList.vue'
import BusinessTable from '../components/BusinessTable.vue'
import { LIST_TITLES } from '../utils/businessLists'
import { APPEAL_STATES } from '../utils/serviceData'
export default {
  name: 'OverviewView', components: { BusinessList, BusinessTable },
  data: () => ({ tab: 'relations', tabs: ['relations', 'works', 'appeals', 'reports', 'suggestions'], titles: LIST_TITLES, preset: {}, attendanceMetric: null }),
  computed: {
    stats () { return this.$store.overviewStats() },
    attendanceDetails () {
      const filter = this.attendanceMetric.filters
      return this.stats.attendance.filter(r => (!filter.eligible || r.eligible) && (!filter.attendance || r.attendance === filter.attendance))
    },
    groups () {
      const s = this.stats
      const date = moment(this.$store.state.day)
      const metric = (label, value, unit, tab, filters, color) => ({ label, value, unit, tab, filters, color })
      return [
        { title: '人员到岗统计', icon: 'team', metrics: [
          metric('服务人员数', s.serviceCount, '人', 'attendance', {}),
          metric('今日到岗人数', s.attended, '人', 'attendance', { attendance: '已到岗' }, 'blue'),
          metric('今日到岗率', s.attendanceRate ?? '—', s.due ? '%' : '', 'attendance', { eligible: true })] },
        { title: '部门重点工作', icon: 'solution', metrics: [
          metric('启用事项', s.works, '项', 'works', { status: '启用' }),
          metric('项目执行进度', s.filled + '/' + s.executions, '', 'works', { status: '启用' }, 'blue')] },
        { title: '基层诉求办理', icon: 'profile', metrics: APPEAL_STATES.map((status, i) =>
          metric(status, s.appeals[status], '条', 'appeals', { status }, ['orange', 'blue', 'orange', 'green'][i])) },
        { title: '服务日报填报', icon: 'form', metrics: [
          metric('今日应填报人数', s.due, '人', 'reports', { date, eligible: true }),
          metric('今日已填报人数', s.submitted, '人', 'reports', { date, eligible: true, status: '已提交' }, 'green')] }
      ]
    }
  },
  methods: {
    select (metric) {
      if (metric.tab === 'attendance') { this.attendanceMetric = metric; return }
      this.tab = metric.tab
      this.preset = { ...metric.filters }
    },
    switchTab (tab) { this.tab = tab; this.preset = {} }
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
.stat-group-cell { flex:1; min-width:0; padding:7px 12px; border:0; border-right:1px solid #eef4fa; background:transparent; cursor:pointer; text-align:left; }
.stat-group-cell:last-child { border-right:0; }
.stat-group-cell:hover, .stat-group-cell:focus-visible { background:#edf6ff; }
.stat-label { display:block; color:#687d91; font-size:12px; }
.stat-value { display:block; margin-top:2px; font-size:23px; line-height:28px; font-weight:700; color:#1f3a56; }
.stat-value small { margin-left:4px; font-size:12px; color:#7d90a5; font-weight:400; }
.blue { color:#1677c9; } .orange { color:#b56810; } .green { color:#15815f; }
.ledger-section { display:flex; flex-direction:column; flex:1; min-height:0; margin-top:12px; }
.ledger-section > .section-title { margin-bottom:0; }
.ledger-section ::v-deep .ant-tabs-bar { margin-bottom:8px; }
.ledger-section ::v-deep .business-query { flex:none; margin-bottom:8px; }
.ledger-section ::v-deep .query-field-area { max-height:145px; overflow-y:auto; }
.ledger-section ::v-deep .ledger-list { display:flex; flex:1; flex-direction:column; min-height:0; }
.ledger-section ::v-deep .table-space { flex:1; min-height:0; }
@media(max-width:1000px) { .stat-groups { grid-template-columns:1fr; } }
</style>
