<template>
  <div class="daily-page">
    <a-tabs v-model="activeTab">
      <!-- 我的日报 -->
      <a-tab-pane key="mine">
        <span slot="tab"><a-icon type="user" /> 我的日报</span>
        <div class="tab-body">
          <div class="alert-note">
            <a-icon type="info-circle" />
            请于当日 24:00 前完成填写，次日 00:00 自动冻结；冻结后个人不可修改，如需修订请联系企划部管理员在“全部日报”中处理。未提交日报不计为未到岗。
          </div>

          <div class="mine-toolbar">
            <span class="mine-toolbar-label">填报日期</span>
            <a-date-picker v-model="mineDate" :allow-clear="false" style="width: 160px" />
            <a-button size="small" @click="backToToday">回到今天</a-button>
            <span class="muted">当前共 {{ myReports.length }} 份项目日报任务</span>
          </div>

          <div class="mine-stats">
            <div class="mine-stat"><span>应填日报</span><b>{{ myStats.due }}</b></div>
            <div class="mine-stat"><span>已提交</span><b class="green">{{ myStats.submitted }}</b></div>
            <div class="mine-stat"><span>待填写</span><b class="red">{{ myStats.pending }}</b></div>
            <div class="mine-stat"><span>关联诉求</span><b>{{ myStats.appeals }}</b></div>
          </div>

          <div v-if="mineDateIsFuture" class="alert-note warn" style="margin-top:12px;">
            <a-icon type="clock-circle" /> 所选日期尚未到达，可提前查看应填任务，但需当日填报。
          </div>

          <div class="mine-cards">
            <div v-for="report in myReports" :key="report.id" class="mine-card">
              <div class="mine-card-top">
                <div class="mine-project">
                  <a-icon type="project" />
                  <span>{{ report.projectName }}</span>
                </div>
                <div class="mine-card-tags">
                  <status-tag :status="report.status" />
                  <status-tag v-if="report.frozen" status="已冻结" />
                  <status-tag v-if="report.status === '已提交'" :status="report.checkStatus" />
                </div>
              </div>
              <div class="mine-card-meta">
                <span>{{ report.date }}</span>
                <span class="divider">|</span>
                <span>{{ report.deptName }}</span>
                <span class="divider">|</span>
                <span>提交时间：{{ report.submitTime || '—' }}</span>
              </div>
              <div class="mine-card-needs">{{ report.projectNeeds }}</div>
              <div class="mine-card-foot">
                <div class="mine-counts">
                  <span>关联诉求 <b>{{ (report.appealIds || []).length }}</b></span>
                </div>
                <div class="mine-actions">
                  <template v-if="report.frozen">
                    <a-button size="small" @click="openReport(report, 'view')">查看</a-button>
                  </template>
                  <template v-else-if="report.status === '已提交'">
                    <a-button size="small" type="primary" @click="openReport(report, 'mine')">当日重新编辑</a-button>
                    <a-button size="small" @click="openReport(report, 'view')">查看</a-button>
                  </template>
                  <template v-else>
                    <a-button size="small" type="primary" @click="openReport(report, 'mine')">
                      {{ report.status === '草稿' ? '继续填写' : '填写日报' }}
                    </a-button>
                    <a-button v-if="report.status === '草稿'" size="small" @click="openReport(report, 'view')">查看</a-button>
                  </template>
                </div>
              </div>
            </div>
            <div v-if="!myReports.length" class="empty-block">
              <a-empty description="所选日期没有应填的项目日报任务" />
            </div>
          </div>
        </div>
      </a-tab-pane>

      <!-- 全部日报 -->
      <a-tab-pane key="all">
        <span slot="tab"><a-icon type="profile" /> 全部日报</span>
        <div class="tab-body">
          <div class="filter-bar">
            <a-form layout="inline">
              <a-form-item label="填报日期">
                <a-date-picker v-model="allFilters.date" allow-clear placeholder="全部日期" style="width: 160px" @change="applyAllFilter" />
              </a-form-item>
              <a-form-item label="项目">
                <a-select v-model="allFilters.projectId" placeholder="全部项目" allow-clear show-search option-filter-prop="children" style="width: 180px">
                  <a-select-option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</a-select-option>
                </a-select>
              </a-form-item>
              <a-form-item label="人员">
                <a-select v-model="allFilters.personId" placeholder="全部人员" allow-clear show-search option-filter-prop="children" style="width: 150px">
                  <a-select-option v-for="p in people" :key="p.id" :value="p.id">{{ p.name }}</a-select-option>
                </a-select>
              </a-form-item>
              <a-form-item label="部门">
                <a-select v-model="allFilters.deptId" placeholder="全部部门" allow-clear show-search option-filter-prop="children" style="width: 170px">
                  <a-select-option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</a-select-option>
                </a-select>
              </a-form-item>
              <a-form-item label="填报状态">
                <a-select v-model="allFilters.status" placeholder="全部" allow-clear style="width: 110px">
                  <a-select-option v-for="s in ['未填写', '草稿', '已提交']" :key="s" :value="s">{{ s }}</a-select-option>
                </a-select>
              </a-form-item>
              <a-form-item label="校核状态">
                <a-select v-model="allFilters.checkStatus" placeholder="全部" allow-clear style="width: 120px">
                  <a-select-option v-for="s in ['待校核', '已校核', '需重新校核']" :key="s" :value="s">{{ s }}</a-select-option>
                </a-select>
              </a-form-item>
              <a-form-item>
                <div class="filter-actions">
                  <a-button type="primary" @click="applyAllFilter"><a-icon type="search" /> 查询</a-button>
                  <a-button @click="resetAllFilter"><a-icon type="reload" /> 重置</a-button>
                </div>
              </a-form-item>
            </a-form>
          </div>

          <div class="toolbar">
            <a-button @click="exportDailyExcelByDate"><a-icon type="download" /> 导出当日日报</a-button>
            <a-button @click="printDailyPdf"><a-icon type="printer" /> 打印日报 / PDF</a-button>
            <span class="muted toolbar-tip">完全未填写的日报任务同样列出，可在此校核或由管理员修订已冻结记录。</span>
          </div>

          <div class="inline-stats">
            <span>共 <b>{{ allReports.length }}</b> 条任务</span>
            <span>已提交 <b class="green">{{ allStats.submitted }}</b></span>
            <span>未填写 <b class="red">{{ allStats.unfilled }}</b></span>
            <span>待校核 <b class="orange">{{ allStats.unchecked }}</b></span>
          </div>

          <a-table
            :columns="allColumns"
            :data-source="allReports"
            :pagination="allPagination"
            row-key="id"
            size="middle"
            :scroll="{ x: 1500 }"
          >
            <div slot="appealTitles" slot-scope="text, record">
              <template v-if="reportAppeals(record).length">
                <a
                  v-for="appeal in reportAppeals(record)"
                  :key="appeal.id"
                  class="link-btn appeal-link"
                  @click="openAppealDetail(appeal.id)"
                >{{ appeal.title }}</a>
              </template>
              <span v-else class="muted">—</span>
            </div>
            <div slot="phone" slot-scope="text, record">{{ record.personPhone }}</div>
            <div slot="status" slot-scope="text"><status-tag :status="text" /></div>
            <div slot="checkStatus" slot-scope="text, record">
              <status-tag v-if="record.status === '已提交'" :status="text" />
              <span v-else class="muted">—</span>
            </div>
            <div slot="frozen" slot-scope="text"><status-tag :status="text ? '已冻结' : '未冻结'" /></div>
            <div slot="attend" slot-scope="text">{{ text === true ? '是' : (text === false ? '否' : '—') }}</div>
            <div slot="submitTime" slot-scope="text">{{ text || '—' }}</div>
            <div slot="action" slot-scope="text, record" class="table-actions">
              <a class="link-btn" @click="openReport(record, 'view')">查看</a>
              <template v-if="record.status === '已提交' && record.checkStatus !== '已校核'">
                <a-divider type="vertical" />
                <a class="link-btn" @click="openCheck(record)">校核</a>
              </template>
              <a-divider type="vertical" />
              <a class="link-btn" @click="openReport(record, 'admin')">管理员修订</a>
            </div>
          </a-table>
        </div>
      </a-tab-pane>

      <!-- 周度汇总 -->
      <a-tab-pane key="weekly">
        <span slot="tab"><a-icon type="schedule" /> 周度汇总</span>
        <div class="tab-body">
          <div class="weekly-toolbar">
            <span class="mine-toolbar-label">周起止日期</span>
            <a-range-picker v-model="reportWeek" :allow-clear="false" style="width: 260px" />
            <a-button size="small" @click="setWeek('current')">本周</a-button>
            <a-button size="small" @click="setWeek('last')">上周</a-button>
            <div class="weekly-actions">
              <a-button type="primary" size="small" @click="exportWeeklyExcel"><a-icon type="download" /> 导出 Excel</a-button>
              <a-button size="small" @click="printWeeklyPdf"><a-icon type="printer" /> 打印 / PDF</a-button>
            </div>
          </div>

          <div class="weekly-summary">{{ weekly.summary }}</div>

          <div class="weekly-section-title">未到岗人员情况（{{ weekly.absentRows.length }} 条）</div>
          <a-table
            :columns="weeklyAbsentColumns"
            :data-source="weekly.absentRows"
            :pagination="false"
            size="small"
            :row-key="(record, index) => 'absent_' + index"
            :scroll="{ x: 1300, y: 320 }"
          >
            <div slot="needs" slot-scope="text" class="needs-cell" :title="text">{{ text }}</div>
            <div slot="reason" slot-scope="text" class="needs-cell" :title="text">{{ text }}</div>
          </a-table>

          <div class="weekly-section-title" style="margin-top:16px;">服务项目人员情况（{{ weekly.serviceRows.length }} 条）</div>
          <a-table
            :columns="weeklyServiceColumns"
            :data-source="weekly.serviceRows"
            :pagination="false"
            size="small"
            :row-key="(record, index) => 'service_' + index"
            :scroll="{ x: 1500, y: 380 }"
          >
            <div slot="needs" slot-scope="text" class="needs-cell" :title="text">{{ text }}</div>
            <div slot="work" slot-scope="text" class="needs-cell" :title="text">{{ text }}</div>
            <div slot="issues" slot-scope="text" class="needs-cell" :title="text">{{ text }}</div>
          </a-table>

          <div class="weekly-foot muted">
            周度汇总仅根据每日日报数据生成，按预设人员顺序及日期排序，不含独立周报填写与审批。
          </div>
        </div>
      </a-tab-pane>
    </a-tabs>

    <!-- 日报详情 -->
    <a-modal
      :title="reportDrawerTitle"
      :visible="reportDrawerVisible"
      :width="1080"
      wrap-class-name="daily-report-modal"
      @cancel="reportDrawerVisible = false"
    >
      <template v-if="reportCurrent">
        <div v-if="reportCurrent.frozen && reportMode !== 'admin'" class="alert-note warn">
          <a-icon type="lock" /> 该日报已冻结，个人仅可查看。如需修改，请联系企划部管理员在“全部日报”中修订。
        </div>
        <div v-if="reportMode === 'admin'" class="alert-note warn" style="margin-bottom:12px;">
          <a-icon type="edit" /> 管理员修订：可修改已冻结日报，保存时须填写修订原因并保留修改前后内容。修订后校核状态将变为“需重新校核”，个人端不会重新开放编辑。
        </div>

        <div class="detail-grid">
          <div class="detail-item"><span class="detail-label">姓名</span><span class="detail-value">{{ reportCurrent.personName }}</span></div>
          <div class="detail-item"><span class="detail-label">部门</span><span class="detail-value">{{ reportCurrent.deptName }}</span></div>
          <div class="detail-item"><span class="detail-label">填报日期</span><span class="detail-value">{{ reportCurrent.date }}</span></div>
          <div class="detail-item"><span class="detail-label">项目</span><span class="detail-value">{{ reportCurrent.projectName }}</span></div>
          <div class="detail-item"><span class="detail-label">填报状态</span><span class="detail-value"><status-tag :status="reportCurrent.status" /></span></div>
          <div class="detail-item"><span class="detail-label">校核状态</span><span class="detail-value"><status-tag :status="reportCurrent.checkStatus" /></span></div>
          <div class="detail-item"><span class="detail-label">冻结状态</span><span class="detail-value"><status-tag :status="reportCurrent.frozen ? '已冻结' : '未冻结'" /></span></div>
          <div class="detail-item"><span class="detail-label">提交时间</span><span class="detail-value">{{ reportCurrent.submitTime || '—' }}</span></div>
          <div class="detail-item full"><span class="detail-label">项目层面服务需求</span><span class="detail-value">{{ reportCurrent.projectNeeds }}</span></div>
        </div>

        <div class="drawer-section" style="margin-top:16px;">
          <div class="drawer-section-title">当日填报</div>
          <a-form-model :label-col="{ span: 5 }" :wrapper-col="{ span: 19 }">
            <a-form-model-item label="是否到岗" required>
              <a-radio-group v-model="reportForm.attend" :disabled="!reportEditable">
                <a-radio :value="true">是</a-radio>
                <a-radio :value="false">否</a-radio>
              </a-radio-group>
            </a-form-model-item>
            <a-form-model-item v-if="reportForm.attend === false" label="未到岗原因" required>
              <a-textarea
                v-model="reportForm.absentReason"
                :rows="2"
                :max-length="200"
                :disabled="!reportEditable"
                placeholder="请说明未到岗原因"
              />
            </a-form-model-item>
            <a-form-model-item :label="reportForm.attend === false ? '当日工作开展情况（选填）' : '当日工作开展情况'" :required="reportForm.attend === true">
              <a-textarea
                v-model="reportForm.workContent"
                :rows="3"
                :max-length="500"
                :disabled="!reportEditable"
                placeholder="填写当天实际开展的项目帮扶工作，可分条填写"
              />
            </a-form-model-item>
            <a-form-model-item label="今日项目反馈需协调解决问题">
              <a-textarea
                v-model="reportForm.newIssues"
                :rows="2"
                :max-length="300"
                :disabled="!reportEditable"
                placeholder="无新增问题时填写“无”"
              />
            </a-form-model-item>
          </a-form-model>
        </div>

        <div class="drawer-section">
          <div class="drawer-section-title">
            关联诉求
            <span class="extra">选填，可多选</span>
          </div>
          <div class="form-tip" style="margin-bottom:8px;">
            仅可选择本人当前项目下“办理中”的诉求；未勾选不会自动关联。关联后可在诉求详情中查看本日报。
          </div>
          <a-select
            v-model="reportForm.appealIds"
            mode="multiple"
            :disabled="!reportEditable"
            placeholder="选择本日报关联的诉求事项"
            option-filter-prop="children"
            show-search
            style="width: 100%"
          >
            <a-select-option v-for="a in reportAppealOptions" :key="a.id" :value="a.id">
              {{ a.title }}（{{ a.id }}）
            </a-select-option>
          </a-select>
          <div v-if="reportForm.appealIds.length" class="selected-appeals">
            已关联 {{ reportForm.appealIds.length }} 条诉求
          </div>
        </div>

        <div v-if="reportMode === 'admin'">
          <div class="drawer-section">
            <div class="drawer-section-title">修订原因 <span class="danger-text">*</span></div>
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
          <a-button @click="saveDraft">暂存</a-button>
          <a-button type="primary" @click="saveSubmit">提交日报</a-button>
        </template>
      </template>
    </a-modal>

    <a-modal
      title="诉求详情"
      :visible="appealDetailVisible"
      :width="820"
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
          <div class="detail-item"><span class="detail-label">登记时间</span><span class="detail-value">{{ appealDetailCurrent.createdAt }}</span></div>
          <div class="detail-item full"><span class="detail-label">具体描述</span><span class="detail-value">{{ appealDetailCurrent.desc }}</span></div>
          <div class="detail-item full"><span class="detail-label">推进计划</span><span class="detail-value">{{ appealDetailCurrent.plan }}</span></div>
          <div class="detail-item full"><span class="detail-label">最新进展</span><span class="detail-value">{{ appealDetailCurrent.latestProgress }}</span></div>
        </div>
        <div class="drawer-section" style="margin-top:14px;">
          <div class="drawer-section-title">关联的已提交日报</div>
          <a-table
            :columns="appealReportColumns"
            :data-source="appealDetailReports"
            :pagination="false"
            size="small"
            row-key="id"
            :scroll="{ x: 760 }"
          >
            <div slot="workSummary" slot-scope="text" class="summary-cell" :title="text">{{ text }}</div>
          </a-table>
          <div v-if="!appealDetailReports.length" class="empty-hint">暂无关联日报</div>
        </div>
      </template>
      <template slot="footer">
        <a-button @click="appealDetailVisible = false">关闭</a-button>
      </template>
    </a-modal>

    <a-modal
      title="企划校核"
      :visible="checkVisible"
      :width="560"
      @cancel="checkVisible = false"
    >
      <div v-if="checkRecord" class="check-body">
        <div class="check-info">
          <span>{{ checkRecord.date }} · {{ checkRecord.personName }} · {{ checkRecord.projectName }}</span>
        </div>
        <a-textarea v-model="checkRemark" :rows="3" placeholder="可填写校核意见（选填）" />
      </div>
      <template slot="footer">
        <a-button @click="checkVisible = false">关闭</a-button>
        <a-button type="primary" @click="confirmCheck">确认校核</a-button>
      </template>
    </a-modal>
  </div>
</template>

<script>
import moment from 'moment'
import StatusTag from '../components/StatusTag.vue'
import { todayStr, fmtDate, weekRange, isFrozen } from '../utils/date'
import { buildWeeklyReport } from '../utils/reportData'
import { exportDailyExcel, exportWeeklyExcel } from '../utils/exportExcel'
import { printDailyReport, printWeeklyReport } from '../utils/printReport'

export default {
  name: 'DailyView',
  components: { StatusTag },
  data () {
    const week = weekRange(0)
    return {
      activeTab: 'mine',
      mineDate: moment(),
      allFilters: { date: moment(), projectId: undefined, personId: undefined, deptId: undefined, status: undefined, checkStatus: undefined },
      appliedAll: { date: todayStr(), projectId: undefined, personId: undefined, deptId: undefined, status: undefined, checkStatus: undefined },
      allPagination: { pageSize: 10, showSizeChanger: true, showTotal: total => `共 ${total} 条`, pageSizeOptions: ['10', '20', '50'] },
      reportWeek: [moment(week[0]), moment(week[1])],
      reportDrawerVisible: false,
      reportCurrent: null,
      reportMode: 'mine',
      reportForm: { attend: null, absentReason: '', workContent: '', newIssues: '', appealIds: [] },
      adminReason: '',
      checkVisible: false,
      checkRecord: null,
      checkRemark: '',
      appealDetailVisible: false,
      appealDetailCurrent: null
    }
  },
  computed: {
    projects () {
      return this.$store.db.projects
    },
    people () {
      return this.$store.db.people
    },
    departments () {
      return this.$store.db.departments
    },
    myReports () {
      const date = fmtDate(this.mineDate)
      const order = {}
      this.projects.forEach((p, index) => { order[p.id] = index })
      return this.$store.db.dailyReports
        .filter(r => r.date === date && r.personId === this.$store.currentUser.id)
        .sort((a, b) => (order[a.projectId] || 0) - (order[b.projectId] || 0))
    },
    myStats () {
      const submitted = this.myReports.filter(r => r.status === '已提交').length
      const appeals = this.myReports.reduce((sum, r) => sum + (r.appealIds || []).length, 0)
      return {
        due: this.myReports.length,
        submitted,
        pending: this.myReports.length - submitted,
        appeals
      }
    },
    mineDateIsFuture () {
      return fmtDate(this.mineDate) > todayStr()
    },
    allReports () {
      const f = this.appliedAll
      const order = {}
      this.people.forEach((p, index) => { order[p.id] = index })
      let rows = this.$store.db.dailyReports.slice()
      if (f.date) rows = rows.filter(r => r.date === f.date)
      if (f.projectId) rows = rows.filter(r => r.projectId === f.projectId)
      if (f.personId) rows = rows.filter(r => r.personId === f.personId)
      if (f.deptId) rows = rows.filter(r => r.deptId === f.deptId)
      if (f.status) rows = rows.filter(r => r.status === f.status)
      if (f.checkStatus) rows = rows.filter(r => r.status === '已提交' && r.checkStatus === f.checkStatus)
      return rows.sort((a, b) => b.date.localeCompare(a.date) || (order[a.personId] || 0) - (order[b.personId] || 0))
    },
    allStats () {
      const date = this.appliedAll.date
      const rows = date ? this.$store.db.dailyReports.filter(r => r.date === date) : this.allReports
      return {
        submitted: rows.filter(r => r.status === '已提交').length,
        unfilled: rows.filter(r => r.status === '未填写').length,
        unchecked: rows.filter(r => r.status === '已提交' && r.checkStatus !== '已校核').length
      }
    },
    allColumns () {
      return [
        { title: '序号', width: 54, align: 'center', customRender: (text, record, index) => index + 1 },
        { title: '日期', dataIndex: 'date', width: 96 },
        { title: '姓名', dataIndex: 'personName', width: 72 },
        { title: '联系方式', dataIndex: 'personPhone', width: 118, scopedSlots: { customRender: 'phone' } },
        { title: '部门', dataIndex: 'deptName', width: 140 },
        { title: '项目', dataIndex: 'projectName', width: 165 },
        { title: '对应诉求事项', dataIndex: 'appealIds', width: 190, scopedSlots: { customRender: 'appealTitles' } },
        { title: '填报状态', dataIndex: 'status', width: 86, scopedSlots: { customRender: 'status' } },
        { title: '校核状态', dataIndex: 'checkStatus', width: 100, scopedSlots: { customRender: 'checkStatus' } },
        { title: '冻结状态', dataIndex: 'frozen', width: 86, scopedSlots: { customRender: 'frozen' } },
        { title: '是否到岗', dataIndex: 'attend', width: 76, align: 'center', scopedSlots: { customRender: 'attend' } },
        { title: '提交时间', dataIndex: 'submitTime', width: 136, scopedSlots: { customRender: 'submitTime' } },
        { title: '操作', width: 186, scopedSlots: { customRender: 'action' } }
      ]
    },
    reportAppealOptions () {
      if (!this.reportCurrent) return []
      return this.$store.db.appeals.filter(a =>
        a.personId === this.reportCurrent.personId &&
        a.projectId === this.reportCurrent.projectId &&
        a.status === '办理中'
      )
    },
    appealDetailReports () {
      return this.appealDetailCurrent ? this.$store.reportsForAppeal(this.appealDetailCurrent.id) : []
    },
    appealReportColumns () {
      return [
        { title: '日期', dataIndex: 'date', width: 90 },
        { title: '填报人', dataIndex: 'personName', width: 70 },
        { title: '项目', dataIndex: 'projectName', width: 130 },
        { title: '到岗', dataIndex: 'attend', width: 50, align: 'center', customRender: text => text === true ? '是' : (text === false ? '否' : '未填') },
        { title: '当日工作开展情况摘要', dataIndex: 'workContent', width: 260, scopedSlots: { customRender: 'workSummary' } },
        { title: '校核状态', dataIndex: 'checkStatus', width: 90 }
      ]
    },
    weekly () {
      if (!this.reportWeek || this.reportWeek.length !== 2) {
        return { summary: '', absentRows: [], serviceRows: [] }
      }
      return buildWeeklyReport(this.$store.db, fmtDate(this.reportWeek[0]), fmtDate(this.reportWeek[1]))
    },
    weeklyAbsentColumns () {
      return [
        { title: '序号', dataIndex: 'rowKey', width: 52, align: 'center', customRender: (t, r, i) => i + 1 },
        { title: '姓名', dataIndex: 'personName', width: 76 },
        { title: '部门', dataIndex: 'deptName', width: 160 },
        { title: '日期', dataIndex: 'date', width: 108 },
        { title: '项目', dataIndex: 'projectName', width: 190 },
        { title: '项目层面服务需求(动态调整)', dataIndex: 'needs', width: 320, scopedSlots: { customRender: 'needs' } },
        { title: '是否到岗', dataIndex: 'attend', width: 80, align: 'center' },
        { title: '未到岗原因', dataIndex: 'reason', width: 260, scopedSlots: { customRender: 'reason' } }
      ]
    },
    weeklyServiceColumns () {
      return [
        { title: '序号', dataIndex: 'rowKey', width: 52, align: 'center', customRender: (t, r, i) => i + 1 },
        { title: '姓名', dataIndex: 'personName', width: 76 },
        { title: '部门', dataIndex: 'deptName', width: 160 },
        { title: '日期', dataIndex: 'date', width: 108 },
        { title: '项目', dataIndex: 'projectName', width: 190 },
        { title: '项目层面服务需求(动态调整)', dataIndex: 'needs', width: 300, scopedSlots: { customRender: 'needs' } },
        { title: '是否到岗', dataIndex: 'attend', width: 80, align: 'center' },
        { title: '当日工作开展情况', dataIndex: 'workContent', width: 320, scopedSlots: { customRender: 'work' } },
        { title: '今日项目反馈需协调解决问题', dataIndex: 'issues', width: 220, scopedSlots: { customRender: 'issues' } }
      ]
    },
    reportEditable () {
      if (!this.reportCurrent) return false
      if (this.reportMode === 'admin') return true
      if (this.reportMode === 'view') return false
      return !this.reportCurrent.frozen
    },
    reportDrawerTitle () {
      if (!this.reportCurrent) return '项目日报'
      if (this.reportMode === 'admin') return `管理员修订 · ${this.reportCurrent.projectName}`
      return `${this.reportCurrent.personName} · ${this.reportCurrent.projectName} 项目日报`
    }
  },
  mounted () {
    this.applyTabQuery()
  },
  watch: {
    '$route.query': function () {
      this.applyTabQuery()
    }
  },
  methods: {
    applyTabQuery () {
      const tab = this.$route.query.tab
      if (tab && ['mine', 'all', 'weekly'].indexOf(tab) > -1) this.activeTab = tab
    },
    deptName (id) {
      const dept = this.$store.getDept(id)
      return dept ? dept.name : id
    },
    reportAppeals (report) {
      const ids = report.appealIds || []
      return this.$store.db.appeals.filter(a => ids.indexOf(a.id) > -1)
    },
    openAppealDetail (appealId) {
      const appeal = this.$store.db.appeals.find(a => a.id === appealId)
      if (!appeal) return
      this.appealDetailCurrent = appeal
      this.appealDetailVisible = true
    },
    backToToday () {
      this.mineDate = moment()
    },
    applyAllFilter () {
      this.appliedAll = { ...this.allFilters, date: this.allFilters.date ? fmtDate(this.allFilters.date) : '' }
      this.allPagination = { ...this.allPagination, current: 1 }
    },
    resetAllFilter () {
      this.allFilters = { date: moment(), projectId: undefined, personId: undefined, deptId: undefined, status: undefined, checkStatus: undefined }
      this.applyAllFilter()
    },
    setWeek (type) {
      const week = weekRange(type === 'last' ? -1 : 0)
      this.reportWeek = [moment(week[0]), moment(week[1])]
    },
    openReport (report, mode) {
      this.reportCurrent = report
      this.reportMode = mode
      report.frozen = isFrozen(report.date)
      this.reportForm = {
        attend: report.attend,
        absentReason: report.absentReason || '',
        workContent: report.workContent || '',
        newIssues: report.newIssues || '',
        appealIds: (report.appealIds || []).slice()
      }
      this.adminReason = ''
      this.reportDrawerVisible = true
    },
    validateReport () {
      if (this.reportForm.attend === null || typeof this.reportForm.attend === 'undefined') {
        this.$message.warning('请选择是否到岗')
        return false
      }
      if (this.reportForm.attend === false && !this.reportForm.absentReason.trim()) {
        this.$message.warning('未到岗需填写未到岗原因')
        return false
      }
      if (this.reportForm.attend === true && !this.reportForm.workContent.trim()) {
        this.$message.warning('到岗时需填写当日工作开展情况')
        return false
      }
      return true
    },
    saveDraft () {
      const res = this.$store.saveReport(this.reportCurrent.id, this.reportForm, 'draft')
      if (!res.ok) return this.$message.error(res.message)
      this.reportDrawerVisible = false
      this.$message.success('日报已暂存')
    },
    saveSubmit () {
      if (!this.validateReport()) return
      const res = this.$store.saveReport(this.reportCurrent.id, this.reportForm, 'submit')
      if (!res.ok) return this.$message.error(res.message)
      this.reportDrawerVisible = false
      this.$message.success('日报已提交，关联诉求已同步更新')
    },
    saveAdminRevision () {
      if (!this.adminReason.trim()) return this.$message.warning('请填写修订原因')
      const res = this.$store.reviseReport(this.reportCurrent.id, this.reportForm, this.adminReason)
      if (!res.ok) return this.$message.error(res.message)
      this.reportDrawerVisible = false
      this.$message.success('日报已修订，已保留修订记录并标记为需重新校核')
    },
    openCheck (record) {
      this.checkRecord = record
      this.checkRemark = ''
      this.checkVisible = true
    },
    confirmCheck () {
      this.$store.checkReport(this.checkRecord.id, this.checkRemark)
      this.checkVisible = false
      this.$message.success('日报已校核')
    },
    exportDailyExcelByDate () {
      const date = this.appliedAll.date || todayStr()
      exportDailyExcel(date)
      this.$message.success('日报 Excel 文件已生成并开始下载')
    },
    printDailyPdf () {
      const date = this.appliedAll.date || todayStr()
      printDailyReport(date)
    },
    exportWeeklyExcel () {
      if (!this.reportWeek || this.reportWeek.length !== 2) return
      exportWeeklyExcel(fmtDate(this.reportWeek[0]), fmtDate(this.reportWeek[1]))
      this.$message.success('周报 Excel 文件已生成并开始下载')
    },
    printWeeklyPdf () {
      if (!this.reportWeek || this.reportWeek.length !== 2) return
      printWeeklyReport(fmtDate(this.reportWeek[0]), fmtDate(this.reportWeek[1]))
    }
  }
}
</script>

<style scoped>
.tab-body {
  padding-top: 6px;
}
.mine-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 12px 0;
}
.mine-toolbar-label {
  font-size: 13px;
  color: #4a5d72;
}
.mine-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border: 1px solid #e8eff7;
  border-radius: 3px;
  background: #fbfdff;
  margin-bottom: 14px;
}
.mine-stat {
  padding: 10px 16px;
  border-right: 1px solid #eef3f9;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12.5px;
  color: #6b8096;
}
.mine-stat:last-child {
  border-right: 0;
}
.mine-stat b {
  font-size: 20px;
  color: #1f3a56;
}
.mine-stat b.green { color: #20a06b; }
.mine-stat b.red { color: #e04b4b; }
.mine-stat b.orange { color: #fa8c16; }
.mine-cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}
.mine-card {
  border: 1px solid #e6eef7;
  border-radius: 3px;
  padding: 12px 14px;
  background: #fff;
  display: flex;
  flex-direction: column;
  min-height: 196px;
}
.mine-card:hover {
  box-shadow: 0 2px 8px rgba(50, 105, 160, 0.08);
}
.mine-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.mine-project {
  font-size: 14px;
  font-weight: 700;
  color: #22384e;
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.mine-project span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mine-project .anticon {
  color: #1890ff;
}
.mine-card-tags {
  display: flex;
  gap: 4px;
  flex: none;
}
.mine-card-meta {
  font-size: 11.5px;
  color: #8a9cb0;
  margin-top: 5px;
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.mine-card-meta .divider {
  color: #d5dfe9;
}
.mine-card-needs {
  margin-top: 8px;
  font-size: 12px;
  color: #5b7189;
  line-height: 18px;
  background: #f8fbff;
  border: 1px solid #eef5fc;
  border-radius: 2px;
  padding: 7px 9px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}
.mine-card-foot {
  margin-top: auto;
  padding-top: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.mine-counts {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #6b8096;
}
.mine-counts b {
  color: #2f4358;
}
.mine-counts b.green { color: #20a06b; }
.mine-counts b.red { color: #e04b4b; }
.mine-actions {
  display: flex;
  gap: 8px;
}
.empty-block {
  grid-column: 1 / -1;
  padding: 30px 0;
  background: #fafcfe;
  border: 1px dashed #e4eef8;
  border-radius: 3px;
}
.inline-stats {
  display: flex;
  gap: 20px;
  font-size: 12.5px;
  color: #6b8096;
  margin-bottom: 10px;
}
.inline-stats b {
  color: #2f4358;
  margin-left: 2px;
}
.inline-stats b.green { color: #20a06b; }
.inline-stats b.red { color: #e04b4b; }
.inline-stats b.orange { color: #fa8c16; }
.weekly-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}
.weekly-actions {
  margin-left: auto;
  display: flex;
  gap: 8px;
}
.weekly-summary {
  background: #f7fbff;
  border: 1px solid #dcecfa;
  border-radius: 3px;
  padding: 10px 14px;
  font-size: 12.5px;
  color: #35536f;
  line-height: 22px;
  white-space: pre-line;
  margin-bottom: 14px;
}
.weekly-section-title {
  font-size: 13px;
  font-weight: 700;
  color: #263e55;
  margin-bottom: 8px;
  padding-left: 8px;
  border-left: 3px solid #1890ff;
  line-height: 15px;
}
.needs-cell {
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  line-height: 17px;
  font-size: 12px;
}
.weekly-foot {
  margin-top: 12px;
  font-size: 11.5px;
}
.appeal-link {
  display: block;
  text-align: left;
  line-height: 18px;
  margin-bottom: 2px;
}
.summary-cell {
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 18px;
}
.selected-appeals {
  margin-top: 8px;
  font-size: 12px;
  color: #1890ff;
}
.appeal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.appeal-id {
  font-size: 13px;
  font-weight: 600;
  color: #2c4359;
}
.empty-hint {
  font-size: 12px;
  color: #a5b4c4;
  background: #fafcfe;
  border: 1px dashed #e4eef8;
  border-radius: 3px;
  padding: 12px;
  text-align: center;
}
.revision-diff {
  margin-top: 5px;
  background: #fffaf0;
  border: 1px solid #ffe9bf;
  border-radius: 2px;
  padding: 6px 9px;
  font-size: 11.5px;
  color: #8a6420;
  line-height: 18px;
}
.check-info {
  font-size: 12.5px;
  color: #52667c;
  margin-bottom: 10px;
}
.history-title {
  font-size: 13px;
  color: #2f4358;
  font-weight: 600;
}
.history-remark {
  font-size: 12px;
  color: #5b7189;
  line-height: 18px;
}
.drawer-actions {
  position: sticky;
  bottom: -16px;
  margin: 18px -18px -16px;
  padding: 10px 18px;
  background: #fff;
  border-top: 1px solid #eef2f7;
  text-align: right;
}
.drawer-actions .ant-btn {
  margin-left: 8px;
}
@media (max-width: 1360px) {
  .mine-cards {
    grid-template-columns: 1fr;
  }
  .mine-stats {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}
</style>
