<template>
  <div>
    <business-list type="suggestions" deep-link :action-width="132">
      <template #toolbar><a-button type="primary" icon="plus" @click="open()">新增制度改进建议</a-button></template>
      <template #actions="{row}">
        <template v-if="row.status === '待回复'">
          <a class="link-btn" @click="openReply(row)">审批回复</a><a class="link-btn" @click="open(row)">编辑</a>
          <a-popconfirm title="确认删除这条建议？" @confirm="remove(row)"><a class="link-btn danger">删除</a></a-popconfirm>
        </template>
        <a class="link-btn" @click="detail = row">详情</a>
      </template>
    </business-list>
    <record-detail v-if="detail" type="suggestions" :record="detail" @close="detail = null" />
    <a-modal :visible="editing" :title="original ? '编辑制度改进建议' : '新增制度改进建议'" :width="780" :mask-closable="false" ok-text="提交" @ok="submit" @cancel="editing = false">
      <a-form-model layout="vertical">
        <div class="form-grid">
          <a-form-model-item label="发起人"><div class="readonly-box">{{ author.name }}</div></a-form-model-item>
          <a-form-model-item label="主责总部部门" required><a-select v-model="form.deptId" placeholder="请选择总部部门" show-search option-filter-prop="children">
            <a-select-option v-for="d in $store.db.departments" :key="d.id">{{ d.name }}</a-select-option>
          </a-select></a-form-model-item>
          <a-form-model-item label="所属分公司"><div class="readonly-box">{{ org.company }}</div></a-form-model-item>
          <a-form-model-item label="所属部门／项目"><div class="readonly-box">{{ org.unitName }}</div></a-form-model-item>
        </div>
        <a-form-model-item label="建议标题" required><a-input v-model="form.title" :max-length="80" /></a-form-model-item>
        <a-form-model-item label="涉及制度/流程" required><a-input v-model="form.flow" :max-length="80" /></a-form-model-item>
        <a-form-model-item label="建议内容" required><a-textarea v-model="form.desc" :rows="4" /></a-form-model-item>
        <a-form-model-item label="附件"><file-uploader v-model="form.attachments" /></a-form-model-item>
      </a-form-model>
    </a-modal>
    <a-modal :visible="!!review" title="主责部门经理回复" :width="720" :mask-closable="false" ok-text="提交回复" @cancel="review = null" @ok="saveReply">
      <template v-if="review">
        <div class="drawer-section-title">{{ review.title }}</div>
        <div class="detail-grid">
          <div class="detail-item"><span class="detail-label">发起人</span>{{ review.creatorName }}</div>
          <div class="detail-item"><span class="detail-label">所属组织</span>{{ review.company }} · {{ review.unitName }}</div>
          <div class="detail-item"><span class="detail-label">涉及制度/流程</span>{{ review.flow }}</div>
          <div class="detail-item"><span class="detail-label">主责部门</span>{{ review.deptName }}</div>
          <div class="detail-item full"><span class="detail-label">建议内容</span><span class="detail-value">{{ review.desc }}</span></div>
          <div v-if="review.attachments.length" class="detail-item full"><span class="detail-label">附件</span><file-uploader :value="review.attachments" readonly /></div>
        </div>
        <a-form-model layout="vertical" class="section-block">
          <div class="form-grid">
            <a-form-model-item label="回复人"><div class="readonly-box">{{ review.manager }}</div></a-form-model-item>
            <a-form-model-item label="回复建议" required><a-radio-group v-model="reply.decision" @change="onDecision">
              <a-radio v-for="option in decisionOptions" :key="option.value" :value="option.value">{{ option.label }}</a-radio>
            </a-radio-group></a-form-model-item>
          </div>
          <a-form-model-item v-if="reply.decision === '改'" label="计划完成时间"><a-date-picker v-model="reply.deadline" /></a-form-model-item>
          <a-form-model-item label="回复说明" required><a-textarea v-model="reply.comment" :rows="3" /></a-form-model-item>
        </a-form-model>
      </template>
    </a-modal>
  </div>
</template>
<script>
import BusinessList from '../components/BusinessList.vue'
import RecordDetail from '../components/RecordDetail.vue'
import FileUploader from '../components/FileUploader.vue'
import { fmtDate } from '../utils/date'
import { SUGGESTION_DECISIONS } from '../utils/workflow'

const blank = () => ({ title: '', flow: '', desc: '', deptId: undefined, attachments: [] })
export default {
  name: 'SuggestionsView', components: { BusinessList, RecordDetail, FileUploader },
  data: () => ({ form: blank(), editing: false, original: null, detail: null, review: null,
    decisionOptions: SUGGESTION_DECISIONS, reply: { decision: '', comment: '', deadline: null } }),
  computed: {
    author () { return this.original ? this.$store.getPerson(this.original.creatorId) : this.$store.currentUser },
    org () { return this.$store.orgOf(this.author) }
  },
  methods: {
    open (row) { this.original = row; this.form = row ? { ...row, attachments: row.attachments.slice() } : blank(); this.editing = true },
    submit () {
      const res = this.$store.saveSuggestion(this.form, this.original && this.original.id)
      if (!res.ok) return this.$message.warning(res.message)
      this.editing = false
      this.$message.success('建议已提交主责部门经理')
    },
    openReply (row) { this.review = row; this.reply = { decision: '', comment: '', deadline: null } },
    onDecision (event) { if (event.target.value === '不改') this.reply.deadline = null },
    saveReply () {
      const res = this.$store.replySuggestion(this.review.id, { ...this.reply, deadline: fmtDate(this.reply.deadline) })
      if (!res.ok) return this.$message.warning(res.message)
      this.review = null
      this.$message.success('回复已保存')
    },
    remove (row) {
      const res = this.$store.removeRequest('suggestions', row.id)
      if (!res.ok) return this.$message.warning(res.message)
      this.$message.success('建议已删除')
    }
  }
}
</script>
