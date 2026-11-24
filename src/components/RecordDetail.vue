<template>
  <a-modal :visible="!!record" :title="heading" :width="kind === 'works' ? 1060 : 810" wrap-class-name="work-detail-modal" @cancel="$emit('close')">
    <template v-if="row">
      <div class="detail-grid">
        <div v-for="[label, key, wide] in fields" :key="key" class="detail-item" :class="{ full: wide }">
          <span class="detail-label">{{ label }}</span>
          <span class="detail-value">{{ value(key) }}</span>
        </div>
      </div>
      <section v-if="row.attachments" class="drawer-section"><div class="drawer-section-title">附件</div><file-uploader :value="row.attachments" readonly /></section>
      <section v-if="kind === 'works'" class="drawer-section">
        <div class="drawer-section-title">各项目执行情况</div>
        <business-table type="workDetail" :rows="row.executions" compact @detail="child = $event" />
      </section>
      <section v-if="kind === 'appeals' && row.completion" class="drawer-section">
        <div class="drawer-section-title">销项申请</div>
        <div class="detail-grid">
          <div class="detail-item full"><span class="detail-label">完成情况</span><span class="detail-value">{{ row.completion.content }}</span></div>
          <div class="detail-item"><span class="detail-label">完成日期</span>{{ row.completion.date }}</div>
          <div class="detail-item"><span class="detail-label">佐证附件</span><file-uploader :value="row.completion.attachments" readonly /></div>
        </div>
      </section>
      <section v-if="kind === 'suggestions' && row.reply" class="drawer-section">
        <div class="drawer-section-title">主责部门经理回复</div>
        <div class="detail-grid">
          <div class="detail-item"><span class="detail-label">回复建议</span>{{ row.reply.decision }}</div>
          <div v-if="row.reply.decision === '改'" class="detail-item"><span class="detail-label">计划完成时间</span>{{ row.reply.deadline || '—' }}</div>
          <div class="detail-item full"><span class="detail-label">回复说明</span><span class="detail-value">{{ row.reply.comment }}</span></div>
          <div class="detail-item"><span class="detail-label">回复人</span>{{ row.manager }}</div>
          <div class="detail-item"><span class="detail-label">回复时间</span>{{ row.reply.time }}</div>
        </div>
      </section>
      <section v-if="row.history && row.history.length" class="drawer-section">
        <div class="drawer-section-title">{{ kind === 'relations' ? '配置历史' : '办理记录' }}</div>
        <a-timeline><a-timeline-item v-for="(entry, i) in row.history" :key="i">
          <b>{{ entry.action }}</b>　{{ entry.time }}　<span class="muted">操作人 {{ entry.operator }}</span>
          <span v-if="entry.responsible" class="muted"> · 节点办理人 {{ entry.responsible }}</span>
          <div class="detail-value">{{ historyNote(entry) }}</div>
          <file-uploader v-if="entry.attachments && entry.attachments.length" :value="entry.attachments" readonly />
        </a-timeline-item></a-timeline>
      </section>
      <section v-if="kind === 'reports' && row.revisions.length" class="drawer-section">
        <div class="drawer-section-title">修订记录</div>
        <a-timeline><a-timeline-item v-for="(rev, i) in row.revisions" :key="i">
          <b>{{ rev.operator }}</b>　{{ rev.time }}　{{ rev.reason }}
          <div v-for="change in changes(rev)" :key="change.label" class="detail-value">{{ change.label }}　{{ change.before }} → {{ change.after }}</div>
        </a-timeline-item></a-timeline>
      </section>
    </template>
    <a-empty v-else-if="record" description="该记录已退出当前范围" />
    <template slot="footer"><a-button v-if="child" @click="child = null">返回事项</a-button><a-button @click="$emit('close')">关闭</a-button></template>
  </a-modal>
</template>
<script>
import BusinessTable from './BusinessTable.vue'
import FileUploader from './FileUploader.vue'
import { LIST_TITLES, listRows } from '../utils/businessLists'
import { targetOf, personName, workRows } from '../utils/serviceData'

const details = {
  relations: [['关系编号', 'id'], ['状态', 'status'], ['总部帮扶人员', 'personName'], ['工号', 'employeeNo'],
    ['职务', 'personTitle'], ['总部部门', 'deptName'], ['人员联系方式', 'phone'], ['对象类型', 'type'], ['所属分公司', 'company'],
    ['帮扶部门／项目', 'targetName'], ['对应负责人', 'manager'], ['负责人联系方式', 'managerPhone']],
  works: [['重点工作名称', 'title', true], ['所属体系', 'system'], ['归属部门', 'deptName'], ['重点工作内容', 'content', true],
    ['状态', 'status'], ['项目落实进展', 'progressText'], ['创建人', 'creatorName'], ['创建时间', 'createdAt']],
  executions: [['重点工作事项', 'title', true], ['工作内容', 'workContent', true], ['归属部门', 'deptName'], ['所属分公司', 'company'],
    ['项目名称', 'projectName'], ['帮扶人员', 'helperNames'], ['填报状态', 'status'], ['统计范围', 'scope'], ['项目落实情况', 'content', true],
    ['首次填报人', 'firstName'], ['首次录入时间', 'firstAt'], ['最后修改人', 'lastName'], ['最后修改时间', 'lastAt']],
  appeals: [['诉求单号', 'id'], ['状态', 'status'], ['诉求标题', 'title', true], ['诉求内容', 'desc', true],
    ['发起人', 'creatorName'], ['提交时间', 'submittedAt'], ['所属分公司', 'company'], ['所属部门／项目', 'unitName'],
    ['主责总部部门', 'deptName'], ['主责部门经理', 'manager'], ['承办人', 'handlerName'], ['销项批准时间', 'closedAt']],
  suggestions: [['建议编号', 'id'], ['状态', 'status'], ['建议标题', 'title', true], ['涉及制度/流程', 'flow', true],
    ['建议内容', 'desc', true], ['发起人', 'creatorName'], ['提交时间', 'createdAt'], ['所属分公司', 'company'],
    ['所属部门／项目', 'unitName'], ['主责总部部门', 'deptName']],
  reports: [['填报人', 'personName'], ['填报日期', 'date'], ['总部部门', 'deptName'], ['填报状态', 'status'],
    ['帮扶项目及分公司', 'projectDetails', true], ['项目层面服务需求', 'projectNeeds', true],
    ['是否到岗', 'attendText'], ['冻结状态', 'frozenText'], ['提交时间', 'submitTime'], ['未到岗原因', 'absentReason', true],
    ['当日工作开展情况', 'workContent', true], ['今日需协调问题', 'newIssues', true]]
}
export default {
  name: 'RecordDetail', components: { BusinessTable, FileUploader },
  props: { type: String, record: Object },
  data: () => ({ child: null }),
  computed: {
    currentRecord () {
      if (!this.record) return null
      if (['mine', 'executions'].includes(this.type)) {
        const work = workRows(this.$store.db).find(w => w.id === this.record.workId)
        return work && work.executions.find(e => e.id === this.record.id)
      }
      const filters = this.type === 'reports' ? { date: this.record.date } : {}
      return listRows(this.type, this.$store, filters).find(r => r.id === this.record.id)
    },
    row () {
      if (this.child && this.currentRecord) return this.currentRecord.executions.find(e => e.id === this.child.id)
      return this.currentRecord
    },
    kind () { return (this.child || this.type === 'mine') ? 'executions' : this.type },
    fields () { return details[this.kind] },
    heading () { return (LIST_TITLES[this.kind] || '业务') + '详情' }
  },
  watch: { record () { this.child = null } },
  methods: {
    value (key) {
      if (key === 'projectDetails') return this.row.projects.map(p => p.company + ' · ' + p.name).join('\n')
      return this.row[key] || '—'
    },
    historyNote (entry) {
      if (entry.note || !entry.values) return entry.note
      const v = entry.values
      const target = targetOf(this.$store.db, v.type, v.targetId)
      return [personName(this.$store.db, v.personId), v.type, target.company, target.name, v.status].join(' · ')
    },
    changes (rev) {
      const fields = { projectNeeds: '项目层面服务需求', attend: '是否到岗', absentReason: '未到岗原因', workContent: '当日工作',
        newIssues: '需协调问题', attachments: '附件' }
      const show = v => Array.isArray(v) ? v.map(f => f.name).join('、') || '无' : typeof v === 'boolean' ? (v ? '是' : '否') : v || '—'
      return Object.entries(fields).filter(([key]) => JSON.stringify(rev.before[key]) !== JSON.stringify(rev.after[key]))
        .map(([key, label]) => ({ label, before: show(rev.before[key]), after: show(rev.after[key]) }))
    }
  }
}
</script>
