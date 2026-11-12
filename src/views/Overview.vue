<template>
  <div class="overview-page">
    <div class="section-title">
      服务项目概览
      <span class="section-extra">
        <span style="margin-right:6px;">统计日期</span>
        <a-date-picker v-model="statDate" size="small" :allow-clear="false" style="width: 138px; margin-right: 10px;" />
        数据来源：帮扶关系、诉求台账、诉求日报实时汇总
      </span>
    </div>

    <div class="stat-groups">
      <div class="stat-group">
        <div class="stat-group-title"><a-icon type="team" /> 人员服务与到岗</div>
        <div class="stat-group-row">
          <div class="stat-group-cell clickable" @click="openAttendance">
            <div class="stat-label">服务人员数</div>
            <div class="stat-value">{{ stats.serviceCount }}<small>人</small></div>
          </div>
          <div class="stat-group-cell clickable" @click="openAttendance">
            <div class="stat-label">今日到岗人数</div>
            <div class="stat-value blue">{{ stats.attendedCount }}<small>人</small></div>
          </div>
          <div class="stat-group-cell">
            <div class="stat-label">今日到岗率</div>
            <div class="stat-value">{{ stats.expectedPeople ? stats.attendanceRate + '%' : '—' }}</div>
          </div>
        </div>
      </div>

      <div class="stat-group">
        <div class="stat-group-title"><a-icon type="profile" /> 项目诉求</div>
        <div class="stat-group-row">
          <div class="stat-group-cell clickable" @click="goAppeals('')">
            <div class="stat-label">诉求总数</div>
            <div class="stat-value">{{ stats.appealTotal }}<small>条</small></div>
          </div>
          <div class="stat-group-cell clickable" @click="goAppeals('办理中')">
            <div class="stat-label">办理中</div>
            <div class="stat-value orange">{{ stats.processingCount }}<small>条</small></div>
          </div>
          <div class="stat-group-cell clickable" @click="goAppeals('销项审批中')">
            <div class="stat-label">销项审批中</div>
            <div class="stat-value orange">{{ stats.closingCount }}<small>条</small></div>
          </div>
          <div class="stat-group-cell clickable" @click="goAppeals('已销项')">
            <div class="stat-label">已销项</div>
            <div class="stat-value green">{{ stats.closedCount }}<small>条</small></div>
          </div>
        </div>
      </div>

      <div class="stat-group">
        <div class="stat-group-title"><a-icon type="form" /> 日报填报</div>
        <div class="stat-group-row">
          <div class="stat-group-cell clickable" @click="goDaily('')">
            <div class="stat-label">当日应填</div>
            <div class="stat-value">{{ stats.dueCount }}<small>份</small></div>
          </div>
          <div class="stat-group-cell clickable" @click="goDaily('已提交')">
            <div class="stat-label">已填</div>
            <div class="stat-value blue">{{ stats.submittedCount }}<small>份</small></div>
          </div>
          <div class="stat-group-cell clickable" @click="goDaily('未填写')">
            <div class="stat-label">未填</div>
            <div class="stat-value red">{{ stats.unfilledCount }}<small>份</small></div>
          </div>
        </div>
      </div>
    </div>

    <div class="section-block">
      <div class="section-title">
        综合台账
        <span class="section-extra">点击编号或日报日期查看详情，其他列不响应点击</span>
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
          v-if="ledgerStatusOptions.length"
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
      >
        <div slot="status" slot-scope="text">
          <status-tag :status="text" />
        </div>
        <div slot="idLink" slot-scope="text, record">
          <a class="ledger-link" @click="openLedgerDetail(record)">{{ text }}</a>
        </div>
        <div slot="dateLink" slot-scope="text, record">
          <a class="ledger-link" @click="openLedgerDetail(record)">{{ text }}</a>
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
            <a-form-model-item>
              <span slot="label"><span class="required-mark">*</span>清单类型</span>
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
          <div class="report-card-title"><a-icon type="form" /> 日报（附件4）</div>
          <div class="report-field">
            <span class="report-label"><span class="required-mark">*</span>日报日期</span>
            <a-date-picker v-model="reportDate" :allow-clear="false" style="width: 100%" />
          </div>
          <div class="report-desc">按选定日期汇总诉求日报，包含情况汇总、未到岗人员情况、服务项目人员情况。</div>
          <div class="report-actions">
            <a-button type="primary" size="small" @click="exportDaily"><a-icon type="download" /> 导出 Excel</a-button>
            <a-button size="small" @click="printDaily"><a-icon type="printer" /> 打印 / PDF</a-button>
          </div>
        </div>

        <div class="report-card">
          <div class="report-card-title"><a-icon type="schedule" /> 周度汇总（附件5）</div>
          <div class="report-field">
            <span class="report-label"><span class="required-mark">*</span>自然周</span>
            <a-week-picker v-model="reportWeekValue" :allow-clear="false" style="width: 100%" />
            <div class="report-week-actions">
              <a-button size="small" @click="setReportWeek(0)">本周</a-button>
              <a-button size="small" @click="setReportWeek(-1)">上周</a-button>
            </div>
            <div class="report-desc">统计范围：{{ reportWeekStart.format('YYYY-MM-DD') }} 至 {{ reportWeekEnd.format('YYYY-MM-DD') }}</div>
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
          </div>
        </div>

        <div v-if="ledgerDetail.type === 'reports'" class="drawer-section">
          <div class="detail-grid">
            <div class="detail-item"><span class="detail-label">填报日期</span><span class="detail-value">{{ ledgerDetail.row.date }}</span></div>
            <div class="detail-item"><span class="detail-label">填报状态</span><span class="detail-value"><status-tag :status="ledgerDetail.row.status" /></span></div>
            <div class="detail-item"><span class="detail-label">姓名</span><span class="detail-value">{{ ledgerDetail.row.personName }}</span></div>
            <div class="detail-item"><span class="detail-label">部门</span><span class="detail-value">{{ ledgerDetail.row.deptName }}</span></div>
            <div class="detail-item"><span class="detail-label">项目</span><span class="detail-value">{{ ledgerDetail.row.projectName }}</span></div>
            <div class="detail-item"><span class="detail-label">是否到岗</span><span class="detail-value">{{ ledgerDetail.row.attend === true ? '是' : (ledgerDetail.row.attend === false ? '否' : '尚未填报') }}</span></div>
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
import moment from 'moment'
import StatusTag from '../components/StatusTag.vue'
import { todayStr, fmtDate } from '../utils/date'
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
    return {
      today: todayStr(),
      statDate: moment(),
      ledgerTab: 'relations',
      ledgerKeyword: '',
      ledgerStatus: undefined,
      detailVisible: false,
      ledgerDetail: null,
      attendanceVisible: false,
      reportType: 'works',
      reportProject: '',
      reportDate: moment(),
      reportWeekValue: moment().startOf('isoWeek')
    }
  },
  computed: {
    stats () {
      return this.$store.overviewStats(this.statDay)
    },
    statDay () {
      return fmtDate(this.statDate) || this.today
    },
    projects () {
      return this.$store.db.projects
    },
    reportWeekStart () {
      return this.reportWeekValue ? moment(this.reportWeekValue).startOf('isoWeek') : moment().startOf('isoWeek')
    },
    reportWeekEnd () {
      return this.reportWeekStart.clone().add(6, 'day')
    },
    ledgerStatusOptions () {
      const map = {
        relations: ['草稿', '待审批', '已生效', '已驳回', '已失效'],
        works: ['待生效', '落实中', '销项审批中', '已销项'],
        appeals: ['办理中', '销项审批中', '已销项', '已删除'],
        reports: ['未填写', '已提交'],
        suggestions: []
      }
      return map[this.ledgerTab] || []
    },
    ledgerColumns () {
      const statusCol = { title: '状态', dataIndex: 'status', width: 100, scopedSlots: { customRender: 'status' } }
      if (this.ledgerTab === 'relations') {
        return [
          { title: '序号', width: 50, align: 'center', customRender: (text, record, index) => index + 1 },
          { title: '关系编号', dataIndex: 'id', width: 118, scopedSlots: { customRender: 'idLink' } },
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
          { title: '事项编号', dataIndex: 'id', width: 108, scopedSlots: { customRender: 'idLink' } },
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
          { title: '诉求编号', dataIndex: 'id', width: 110, scopedSlots: { customRender: 'idLink' } },
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
          { title: '日期', dataIndex: 'date', width: 106, scopedSlots: { customRender: 'dateLink' } },
          { title: '姓名', dataIndex: 'personName', width: 76 },
          { title: '部门', dataIndex: 'deptName', width: 145 },
          { title: '项目', dataIndex: 'projectName', width: 165 },
          { title: '对应诉求事项', dataIndex: 'appealTitle', width: 190, scopedSlots: { customRender: 'content' } },
          { title: '到岗', dataIndex: 'attendText', width: 62 },
          statusCol
        ]
      }
      return [
        { title: '序号', width: 50, align: 'center', customRender: (text, record, index) => index + 1 },
        { title: '建议编号', dataIndex: 'id', width: 106, scopedSlots: { customRender: 'idLink' } },
        { title: '建议事项', dataIndex: 'title', width: 300, scopedSlots: { customRender: 'content' } },
        { title: '主责部门', dataIndex: 'deptName', width: 170 },
        { title: '提出人', dataIndex: 'proposerName', width: 82 },
        { title: '回复结论', dataIndex: 'replyText', width: 100 }
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
        rows = this.$store.db.appeals.filter(a => a.status !== '已删除')
        if (st === '已删除') rows = this.$store.db.appeals.filter(a => a.status === '已删除')
        if (kw) rows = rows.filter(r => `${r.title}${r.projectName}${r.personName}`.indexOf(kw) > -1)
        if (st && st !== '已删除') rows = rows.filter(r => r.status === st)
      } else if (this.ledgerTab === 'reports') {
        rows = this.$store.reportsForDate(this.today)
          .map(r => ({
            ...r,
            attendText: r.attend === true ? '是' : (r.attend === false ? '否' : '未填')
          }))
        if (kw) rows = rows.filter(r => `${r.personName}${r.deptName}${r.projectName}${r.appealTitle || ''}`.indexOf(kw) > -1)
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
        const reports = this.$store.db.dailyReports.filter(rep =>
          !rep.legacy && rep.date === this.statDay && rep.personId === r.personId && rep.projectId === r.projectId
        )
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
  methods: {
    openAttendance () {
      this.attendanceVisible = true
    },
    goAppeals (status) {
      const query = status ? { status } : {}
      this.$router.push({ path: '/appeals', query })
    },
    goDaily (status) {
      const query = { tab: 'all' }
      if (status) query.status = status
      this.$router.push({ path: '/daily', query })
    },
    setReportWeek (offset) {
      this.reportWeekValue = moment().startOf('isoWeek').add(offset, 'week')
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
    exportListExcel () {      if (this.reportType === 'works') exportWorksExcel()
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
      exportWeeklyExcel(this.reportWeekStart.format('YYYY-MM-DD'), this.reportWeekEnd.format('YYYY-MM-DD'))
      this.$message.success('周报 Excel 文件已生成并开始下载')
    },
    printWeekly () {
      printWeeklyReport(this.reportWeekStart.format('YYYY-MM-DD'), this.reportWeekEnd.format('YYYY-MM-DD'))
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
.stat-groups {
  display: grid;
  grid-template-columns: 1.1fr 1.25fr 1fr;
  gap: 12px;
}
.stat-group {
  border: 1px solid #e2edf8;
  border-radius: 3px;
  background: #fbfdff;
  overflow: hidden;
}
.stat-group-title {
  padding: 8px 14px;
  font-size: 12.5px;
  font-weight: 700;
  color: #2c4359;
  background: #f5faff;
  border-bottom: 1px solid #eaf2fa;
}
.stat-group-row {
  display: flex;
  align-items: stretch;
}
.stat-group-cell {
  flex: 1;
  min-width: 0;
  padding: 10px 14px;
  border-right: 1px solid #eef4fa;
}
.stat-group-cell:last-child {
  border-right: 0;
}
.stat-group-cell.clickable {
  cursor: pointer;
}
.stat-group-cell.clickable:hover {
  background: #f2f9ff;
}
.stat-group-cell .stat-label {
  font-size: 11.5px;
  color: #7d90a5;
  white-space: nowrap;
}
.stat-group-cell .stat-value {
  margin-top: 3px;
  font-size: 22px;
  line-height: 28px;
  font-weight: 700;
  color: #1f3a56;
}
.stat-group-cell .stat-value small {
  margin-left: 3px;
  font-size: 11px;
  color: #7d90a5;
  font-weight: 400;
}
.stat-group-cell .stat-value.blue { color: #1890ff; }
.stat-group-cell .stat-value.orange { color: #fa8c16; }
.stat-group-cell .stat-value.green { color: #20a06b; }
.stat-group-cell .stat-value.red { color: #e04b4b; }
.ledger-link {
  color: #1890ff;
  cursor: pointer;
}
.ledger-link:hover {
  color: #40a9ff;
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
.report-week-actions {
  margin-top: 8px;
  display: flex;
  gap: 6px;
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
