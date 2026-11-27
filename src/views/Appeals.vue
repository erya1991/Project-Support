<template>
  <div>
    <business-list type="appeals" deep-link :action-width="156">
      <template #toolbar="{rows}">
        <a-button type="primary" icon="plus" @click="openForm()">新增基层诉求</a-button>
        <a-button icon="download" @click="exportAppealProgress(rows)">导出进展汇总</a-button>
      </template>
      <template #actions="{row}">
        <a v-if="row.status === '待审批'" class="link-btn" @click="openReview(row)">受理审批</a>
        <a v-if="['待审批','已退回'].includes(row.status)" class="link-btn" @click="openForm(row)">{{ row.status === '已退回' ? '修改重提' : '编辑' }}</a>
        <template v-if="row.status === '办理中'">
          <a class="link-btn" @click="openProgress(row)">更新进展</a>
          <a class="link-btn" @click="openClosure(row)">申请销项</a>
        </template>
        <a v-if="row.status === '待销项审批'" class="link-btn" @click="openReview(row)">销项审批</a>
        <a class="link-btn" @click="detail = row">详情</a>
        <a-popconfirm v-if="['待审批','已退回','办理中'].includes(row.status) && !row.completion" title="确认删除该诉求？" @confirm="remove(row)">
          <a class="link-btn danger">删除</a>
        </a-popconfirm>
      </template>
    </business-list>
    <record-detail v-if="detail" type="appeals" :record="detail" @close="detail = null" />
    <a-modal :visible="editing" :title="original ? '编辑基层诉求' : '新增基层诉求'" :width="790" :mask-closable="false"
      :ok-text="original && original.status === '待审批' ? '保存' : '提交'" wrap-class-name="appeal-detail-modal" @ok="submit" @cancel="editing = false">
      <a-form-model layout="vertical">
        <div class="form-grid">
          <a-form-model-item label="发起人"><div class="readonly-box">{{ author.name }} · {{ author.orgType }}</div></a-form-model-item>
          <a-form-model-item label="主责总部部门" required><a-select v-model="form.deptId" placeholder="请选择总部部门" show-search option-filter-prop="children">
            <a-select-option v-for="d in $store.db.departments" :key="d.id">{{ d.name }}</a-select-option>
          </a-select></a-form-model-item>
        </div>
        <org-target-fields v-if="author.orgType === '总部'" :company="form.company" :type="form.type" :target-id="form.targetId" @change="updateTarget" />
        <div v-else class="form-grid">
          <a-form-model-item label="所属分公司"><div class="readonly-box">{{ org.company }}</div></a-form-model-item>
          <a-form-model-item label="所属部门／项目"><div class="readonly-box">{{ org.unitName }}</div></a-form-model-item>
        </div>
        <a-form-model-item label="诉求标题" required><a-input v-model="form.title" :max-length="100" /></a-form-model-item>
        <a-form-model-item label="诉求内容" required><a-textarea v-model="form.desc" :rows="4" /></a-form-model-item>
        <a-form-model-item label="附件"><file-uploader v-model="form.attachments" /></a-form-model-item>
      </a-form-model>
    </a-modal>
    <approval-modal v-if="review" :visible="true" :title="acceptance ? '受理审批' : '销项审批'" :nodes="reviewNodes"
      :entity-desc="review.id + ' · ' + review.title" @update:visible="review = null" @submit="approve">
      <template #summary>
        <div class="detail-grid">
          <div class="detail-item"><span class="detail-label">发起人</span>{{ review.creatorName }}</div>
          <div class="detail-item"><span class="detail-label">所属组织</span>{{ review.company }} · {{ review.unitName }}</div>
          <div class="detail-item"><span class="detail-label">主责部门</span>{{ review.deptName }}</div>
          <div class="detail-item"><span class="detail-label">提交时间</span>{{ review.submittedAt }}</div>
          <div class="detail-item full"><span class="detail-label">诉求内容</span><span class="detail-value">{{ review.desc }}</span></div>
          <div v-if="review.attachments.length" class="detail-item full"><span class="detail-label">诉求附件</span><file-uploader :value="review.attachments" readonly /></div>
          <template v-if="!acceptance">
            <div class="detail-item"><span class="detail-label">承办人</span>{{ review.handlerName }}</div>
            <div class="detail-item"><span class="detail-label">完成日期</span>{{ review.completion.date }}</div>
            <div class="detail-item full"><span class="detail-label">完成情况</span><span class="detail-value">{{ review.completion.content }}</span></div>
            <div class="detail-item full"><span class="detail-label">佐证附件</span><file-uploader :value="review.completion.attachments" readonly /></div>
          </template>
        </div>
      </template>
      <a-form-model v-if="acceptance" layout="vertical"><a-form-model-item label="承办人（受理通过时必选）" required>
        <person-select v-model="handlerId" placeholder="从全公司人员中选择" />
      </a-form-model-item></a-form-model>
    </approval-modal>
    <a-modal v-if="updating" :visible="true" title="更新进展" :width="720" :mask-closable="false"
      wrap-class-name="appeal-detail-modal" ok-text="保存" @cancel="updating = null" @ok="saveProgress">
      <div class="detail-grid">
        <div class="detail-item"><span class="detail-label">诉求单号</span>{{ updating.id }}</div>
        <div class="detail-item"><span class="detail-label">承办人</span>{{ updating.handlerName }}</div>
        <div class="detail-item full"><span class="detail-label">诉求标题</span><span class="detail-value">{{ updating.title }}</span></div>
        <div class="detail-item full"><span class="detail-label">诉求内容</span><span class="detail-value">{{ updating.desc }}</span></div>
        <div class="detail-item full"><span class="detail-label">主责部门</span>{{ updating.deptName }}</div>
      </div>
      <a-form-model class="drawer-section" layout="vertical">
        <a-form-model-item label="问题解决进展" required><a-textarea v-model="progress.content" :rows="4" /></a-form-model-item>
        <a-form-model-item label="附件"><file-uploader v-model="progress.attachments" /></a-form-model-item>
      </a-form-model>
    </a-modal>
    <a-modal :visible="!!closing" title="申请诉求销项" :width="720" :mask-closable="false" ok-text="提交销项" @cancel="closing = null" @ok="closeRequest">
      <template v-if="closing">
        <div class="alert-note">{{ closing.id }} · {{ closing.title }}　承办人 {{ closing.handlerName }}</div>
        <a-form-model layout="vertical">
          <a-form-model-item label="完成情况" required><a-textarea v-model="closure.content" :rows="4" /></a-form-model-item>
          <a-form-model-item label="完成日期" required><a-date-picker v-model="closure.date" /></a-form-model-item>
          <a-form-model-item label="佐证附件"><file-uploader v-model="closure.attachments" /></a-form-model-item>
        </a-form-model>
      </template>
    </a-modal>
  </div>
</template>
<script>
import moment from 'moment'
import BusinessList from '../components/BusinessList.vue'
import RecordDetail from '../components/RecordDetail.vue'
import ApprovalModal from '../components/ApprovalModal.vue'
import FileUploader from '../components/FileUploader.vue'
import OrgTargetFields from '../components/OrgTargetFields.vue'
import PersonSelect from '../components/PersonSelect.vue'
import { fmtDate, todayStr } from '../utils/date'
import { exportAppealProgress } from '../utils/exportExcel'

const blank = () => ({ title: '', desc: '', deptId: undefined, company: undefined, type: '项目级', targetId: undefined, attachments: [] })
export default {
  name: 'AppealsView', components: { BusinessList, RecordDetail, ApprovalModal, FileUploader, OrgTargetFields, PersonSelect },
  data: () => ({ editing: false, original: null, form: blank(), detail: null, review: null, handlerId: undefined,
    updating: null, progress: { content: '', attachments: [] }, closing: null, closure: { content: '', date: null, attachments: [] } }),
  computed: {
    author () { return this.original ? this.$store.getPerson(this.original.creatorId) : this.$store.currentUser },
    org () { return this.$store.orgOf(this.author) },
    acceptance () { return this.review && this.review.status === '待审批' },
    reviewNodes () { return [{ name: this.acceptance ? '主责部门经理受理' : '主责部门经理审批销项', approver: this.review.manager, result: '待处理' }] }
  },
  methods: {
    exportAppealProgress,
    openForm (row) { this.original = row; this.form = row ? { ...row, targetId: row.unitId, attachments: row.attachments.slice() } : blank(); this.editing = true },
    updateTarget (values) { Object.assign(this.form, values) },
    submit () {
      const res = this.$store.saveAppeal({ ...this.form, unitId: this.form.targetId }, this.original && this.original.id)
      if (!res.ok) return this.$message.warning(res.message)
      this.editing = false
      this.$message.success('诉求已保存，等待主责部门经理受理')
    },
    openReview (row) { this.review = row; this.handlerId = undefined },
    approve ({ action, comment }) {
      const res = this.$store.reviewAppeal(this.review.id, this.review.status, action === 'pass', this.handlerId, comment)
      if (!res.ok) return this.$message.warning(res.message)
      this.review = null
      this.$message.success(action === 'pass' ? '审批已通过' : '已退回')
    },
    openProgress (row) {
      this.updating = row
      this.progress = { content: row.progressContent, attachments: [] }
    },
    saveProgress () {
      const res = this.$store.updateAppealProgress(this.updating.id, this.progress)
      if (!res.ok) return this.$message.warning(res.message)
      this.updating = null
      this.$message.success('问题解决进展已保存')
    },
    openClosure (row) {
      this.closing = row
      this.closure = { content: '', date: moment(todayStr()), attachments: (row.completion?.attachments || []).slice() }
    },
    closeRequest () {
      const res = this.$store.requestClosure(this.closing.id, { ...this.closure, date: fmtDate(this.closure.date) })
      if (!res.ok) return this.$message.warning(res.message)
      this.closing = null
      this.$message.success('销项申请已提交')
    },
    remove (row) {
      const res = this.$store.removeRequest('appeals', row.id)
      if (!res.ok) return this.$message.warning(res.message)
      this.$message.success('诉求已删除')
    }
  }
}
</script>
