<template>
  <div class="suggestions-page">
    <div class="filter-bar">
      <a-form layout="inline">
        <a-form-item label="主责部门">
          <a-select v-model="filters.deptId" placeholder="全部部门" allow-clear show-search option-filter-prop="children" style="width: 190px">
            <a-select-option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="提出人">
          <a-select v-model="filters.proposerId" placeholder="全部人员" allow-clear show-search option-filter-prop="children" style="width: 150px">
            <a-select-option v-for="p in people" :key="p.id" :value="p.id">{{ p.name }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="回复结论">
          <a-select v-model="filters.adopt" placeholder="全部" allow-clear style="width: 120px">
            <a-select-option value="改">改</a-select-option>
            <a-select-option value="不改">不改</a-select-option>
            <a-select-option value="待回复">待回复</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="建议状态">
          <a-select v-model="filters.status" placeholder="全部" allow-clear style="width: 120px">
            <a-select-option v-for="s in ['待确认', '已回复', '已归档', '已退回']" :key="s" :value="s">{{ s }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="提出日期">
          <a-range-picker v-model="filters.dateRange" style="width: 230px" />
        </a-form-item>
        <a-form-item label="关键词">
          <a-input v-model="filters.keyword" placeholder="建议事项 / 制度流程" allow-clear style="width: 180px" />
        </a-form-item>
        <a-form-item>
          <div class="filter-actions">
            <a-button type="primary" @click="query"><a-icon type="search" /> 查询</a-button>
            <a-button @click="reset"><a-icon type="reload" /> 重置</a-button>
          </div>
        </a-form-item>
      </a-form>
    </div>

    <div class="toolbar">
      <a-button type="primary" @click="openCreate"><a-icon type="plus" /> 新增建议</a-button>
      <a-button @click="exportExcel"><a-icon type="download" /> 导出附件3</a-button>
      <a-button @click="printPdf"><a-icon type="printer" /> 打印 / PDF</a-button>
      <span class="muted toolbar-tip">部门负责人逐人确认“改/不改”，全部确认后由企划部填写归档意见并归档。</span>
    </div>

    <a-table
      :columns="columns"
      :data-source="filteredSuggestions"
      :pagination="pagination"
      row-key="id"
      size="middle"
    >
      <div slot="cellTitle" slot-scope="text" class="title-cell" :title="text">{{ text }}</div>
      <div slot="proposer" slot-scope="text, record">
        <div>{{ record.proposerName }}</div>
        <div class="muted cell-sub">{{ record.proposerDeptName }}</div>
      </div>
      <div slot="confirmers" slot-scope="text, record">
        {{ record.confirmers.map(c => c.name).join('、') }}
      </div>
      <div slot="reply" slot-scope="text, record">
        <template v-if="replyReplies(record).length">
          <a-tag :color="replyHasAdopt(record) ? 'green' : ''">{{ replyHasAdopt(record) ? '改' : '不改' }}</a-tag>
          <span class="reply-text" :title="replySummary(record)">{{ replySummary(record) }}</span>
        </template>
        <span v-else class="muted">{{ record.status === '已退回' ? '已退回' : '待部门确认' }}</span>
      </div>
      <div slot="createdAt" slot-scope="text">{{ (text || '').slice(0, 10) }}</div>
      <div slot="status" slot-scope="text"><status-tag :status="text" /></div>
      <div slot="action" slot-scope="text, record" class="table-actions">
        <template v-if="record.status === '待确认' || record.status === '已回复'">
          <a class="link-btn" @click="openFlow(record)">流程办理</a>
          <a-divider type="vertical" />
        </template>
        <a class="link-btn" @click="openDetail(record)">详情</a>
      </div>
    </a-table>

    <!-- 新增建议 -->
    <a-modal
      title="新增制度改进建议"
      :visible="formVisible"
      :width="880"
      :mask-closable="false"
      @cancel="formVisible = false"
    >
      <div class="alert-note" style="margin-bottom:14px;">
        <a-icon type="info-circle" />
        请填写建议事项及涉及制度/流程，可上传说明材料。
      </div>
      <a-form-model :label-col="{ span: 7 }" :wrapper-col="{ span: 17 }">
        <a-row :gutter="18">
          <a-col :span="12">
            <a-form-model-item label="提出人 / 部门">
              <div class="readonly-box">{{ currentUser.name }} / {{ proposerDeptName }}</div>
            </a-form-model-item>
          </a-col>
          <a-col :span="12">
            <a-form-model-item label="主责部门" required>
              <a-select v-model="form.deptId" placeholder="请选择主责部门" show-search option-filter-prop="children" style="width: 100%" @change="onDeptChange">
                <a-select-option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</a-select-option>
              </a-select>
            </a-form-model-item>
          </a-col>
          <a-col :span="24">
            <a-form-model-item label="建议事项" :label-col="{ span: 4 }" :wrapper-col="{ span: 20 }" required>
              <a-input v-model="form.title" :max-length="80" placeholder="简明标题，一事一条" />
            </a-form-model-item>
          </a-col>
          <a-col :span="24">
            <a-form-model-item label="涉及制度/流程" :label-col="{ span: 4 }" :wrapper-col="{ span: 20 }" required>
              <a-input v-model="form.flow" :max-length="80" placeholder="对应制度名称或流程环节" />
            </a-form-model-item>
          </a-col>
          <a-col :span="24">
            <a-form-model-item label="问题描述" :label-col="{ span: 4 }" :wrapper-col="{ span: 20 }" required>
              <a-textarea v-model="form.desc" :rows="4" :max-length="600" placeholder="存在问题及影响，可附初步建议" />
            </a-form-model-item>
          </a-col>
          <a-col :span="24">
            <a-form-model-item label="确认部门负责人" :label-col="{ span: 4 }" :wrapper-col="{ span: 20 }" required>
              <a-select v-model="form.confirmerIds" mode="multiple" placeholder="请选择参与确认的部门经理" :max-tag-count="3" style="width: 100%">
                <a-select-option v-for="p in confirmerOptions" :key="p.id" :value="p.id">
                  {{ p.name }}（{{ p.title || '部门负责人' }}）
                </a-select-option>
              </a-select>
              <div class="form-tip">按选择生成确认事项，部门经理独立给出确认意见。</div>
            </a-form-model-item>
          </a-col>
          <a-col :span="24">
            <a-form-model-item label="部门回复" :label-col="{ span: 4 }" :wrapper-col="{ span: 20 }">
              <a-textarea :rows="3" disabled placeholder="由部门负责人确认后填写，新增阶段不可编辑" />
              <div class="form-tip">新增建议时不可代填部门回复，须由所选部门负责人按流程确认。</div>
            </a-form-model-item>
          </a-col>
          <a-col :span="24">
            <a-form-model-item label="附件" :label-col="{ span: 4 }" :wrapper-col="{ span: 20 }">
              <file-uploader v-model="form.attachments" tip="可上传建议说明材料" />
            </a-form-model-item>
          </a-col>
        </a-row>
      </a-form-model>
      <template slot="footer">
        <a-button @click="formVisible = false">关闭</a-button>
        <a-button type="primary" @click="saveSuggestion">保存</a-button>
      </template>
    </a-modal>

    <!-- 流程办理 -->
    <a-modal
      title="制度建议流程办理"
      :visible="flowVisible"
      :width="760"
      :mask-closable="false"
      @cancel="flowVisible = false"
    >
      <template v-if="flowRecord">
        <div class="reply-head">
          <div class="reply-title">{{ flowRecord.title }}</div>
          <div class="muted">{{ flowRecord.id }} · 主责部门：{{ flowRecord.deptName }}</div>
        </div>
        <div class="reply-origin">
          <div><span class="muted">涉及制度/流程：</span>{{ flowRecord.flow }}</div>
          <div><span class="muted">问题描述：</span>{{ flowRecord.desc }}</div>
        </div>

        <div class="flow-nodes">
          <div v-for="node in flowRecord.nodes" :key="node.key" class="flow-node" :class="{ active: currentFlowNode && currentFlowNode.key === node.key }">
            <div class="flow-node-main">
              <span class="flow-node-name">{{ node.name }}</span>
              <status-tag :status="node.result" />
            </div>
            <div class="flow-node-meta">
              {{ node.approver }}<span v-if="node.time"> · {{ node.time }}</span>
            </div>
            <div v-if="node.comment" class="flow-node-comment">{{ node.comment }}</div>
          </div>
        </div>

        <template v-if="currentFlowNode">
          <div class="alert-note" style="margin:12px 0;">
            <a-icon type="info-circle" />
            当前节点：{{ currentFlowNode.name }}，办理人 {{ currentFlowNode.approver }}。
          </div>
          <a-form-model v-if="currentFlowNode.type === 'confirmer'" :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
            <a-form-model-item label="回复意见" required>
              <a-radio-group v-model="flowForm.adopt">
                <a-radio value="改">改（采纳改进）</a-radio>
                <a-radio value="不改">不改（不采纳）</a-radio>
              </a-radio-group>
            </a-form-model-item>
            <a-form-model-item v-if="flowForm.adopt === '不改'" label="不采纳理由" required>
              <a-textarea v-model="flowForm.reason" :rows="3" placeholder="请说明不采纳的原因" />
            </a-form-model-item>
            <template v-if="flowForm.adopt === '改'">
              <a-form-model-item label="整改计划" required>
                <a-textarea v-model="flowForm.plan" :rows="3" placeholder="填写整改措施、责任人和推进安排" />
              </a-form-model-item>
              <a-form-model-item label="完成时限" required>
                <a-date-picker v-model="flowForm.deadline" style="width: 100%" placeholder="请选择计划完成时间" />
              </a-form-model-item>
            </template>
            <a-form-model-item label="补充说明">
              <a-textarea v-model="flowForm.comment" :rows="2" placeholder="可选，作为本节点办理意见" />
            </a-form-model-item>
          </a-form-model>
          <a-form-model v-else :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
            <a-form-model-item label="归档意见" required>
              <a-textarea v-model="flowForm.archiveOpinion" :rows="3" placeholder="填写归档意见，确认后建议状态变为已归档" />
            </a-form-model-item>
          </a-form-model>
        </template>
      </template>
      <template slot="footer">
        <a-button @click="flowVisible = false">关闭</a-button>
        <template v-if="currentFlowNode">
          <a-button v-if="currentFlowNode.type === 'confirmer'" danger @click="submitFlow('reject')">退回</a-button>
          <a-button type="primary" @click="submitFlow('pass')">
            {{ currentFlowNode.type === 'archive' ? '提交归档' : '通过并保存' }}
          </a-button>
        </template>
      </template>
    </a-modal>

    <!-- 详情 -->
    <a-modal
      title="制度改进建议详情"
      :visible="detailVisible"
      :width="780"
      @cancel="detailVisible = false"
    >
      <template v-if="current">
        <div class="detail-head">
          <div class="detail-title">{{ current.title }}</div>
          <status-tag :status="current.status" />
        </div>
        <div class="detail-grid">
          <div class="detail-item"><span class="detail-label">建议编号</span><span class="detail-value">{{ current.id }}</span></div>
          <div class="detail-item"><span class="detail-label">提出时间</span><span class="detail-value">{{ current.createdAt }}</span></div>
          <div class="detail-item"><span class="detail-label">提出人</span><span class="detail-value">{{ current.proposerName }}</span></div>
          <div class="detail-item"><span class="detail-label">提出部门</span><span class="detail-value">{{ current.proposerDeptName }}</span></div>
          <div class="detail-item"><span class="detail-label">主责部门</span><span class="detail-value">{{ current.deptName }}</span></div>
          <div class="detail-item"><span class="detail-label">确认负责人</span><span class="detail-value">{{ current.confirmers.map(c => c.name).join('、') }}</span></div>
          <div class="detail-item full"><span class="detail-label">涉及制度/流程</span><span class="detail-value">{{ current.flow }}</span></div>
          <div class="detail-item full"><span class="detail-label">问题描述</span><span class="detail-value">{{ current.desc }}</span></div>
          <div class="detail-item full">
            <span class="detail-label">附件</span>
            <span class="detail-value">
              <span v-for="(f, i) in current.attachments" :key="i" class="file-chip"><a-icon type="paper-clip" /> {{ f.name }}</span>
              <span v-if="!current.attachments || !current.attachments.length" class="muted">无</span>
            </span>
          </div>
        </div>

        <div class="drawer-section" style="margin-top:16px;">
          <div class="drawer-section-title">部门负责人确认意见</div>
          <div v-for="c in current.confirmers" :key="c.id" class="reply-card">
            <div class="reply-card-head">
              <span class="reply-person">{{ c.name }}</span>
              <span class="muted">{{ c.title }}</span>
              <status-tag :status="c.status" />
            </div>
            <template v-if="c.reply">
              <div class="reply-line">
                <a-tag :color="c.reply.adopt === '改' ? 'green' : ''">{{ c.reply.adopt }}</a-tag>
                <span v-if="c.reply.adopt === '改'">整改计划：{{ c.reply.plan }}</span>
                <span v-else>不采纳理由：{{ c.reply.reason }}</span>
              </div>
              <div class="reply-meta">
                <span v-if="c.reply.deadline">完成时限：{{ c.reply.deadline }}</span>
                <span v-if="c.reply.time">确认时间：{{ c.reply.time }}</span>
              </div>
              <div v-if="c.reply.comment" class="reply-meta">补充说明：{{ c.reply.comment }}</div>
            </template>
            <div v-else class="empty-hint">待该负责人确认</div>
          </div>
        </div>

        <div v-if="current.archiveOpinion" class="drawer-section">
          <div class="drawer-section-title">企划归档意见</div>
          <div class="detail-grid">
            <div class="detail-item full"><span class="detail-label">归档意见</span><span class="detail-value">{{ current.archiveOpinion }}</span></div>
            <div class="detail-item"><span class="detail-label">归档人</span><span class="detail-value">{{ current.archivedBy }}</span></div>
            <div class="detail-item"><span class="detail-label">归档时间</span><span class="detail-value">{{ current.archivedAt }}</span></div>
          </div>
        </div>
      </template>
      <template slot="footer">
        <a-button @click="detailVisible = false">关闭</a-button>
      </template>
    </a-modal>
  </div>
</template>

<script>
import moment from 'moment'
import StatusTag from '../components/StatusTag.vue'
import FileUploader from '../components/FileUploader.vue'
import { fmtDate } from '../utils/date'
import { exportSuggestionsExcel } from '../utils/exportExcel'
import { printSuggestionsList } from '../utils/printReport'

export default {
  name: 'SuggestionsView',
  components: { StatusTag, FileUploader },
  data () {
    return {
      filters: { deptId: undefined, proposerId: undefined, adopt: undefined, status: undefined, dateRange: null, keyword: '' },
      applied: { deptId: undefined, proposerId: undefined, adopt: undefined, status: undefined, dateRange: null, keyword: '' },
      pagination: { pageSize: 10, showSizeChanger: true, showTotal: total => `共 ${total} 条`, pageSizeOptions: ['10', '20', '50'] },
      formVisible: false,
      form: { deptId: undefined, title: '', flow: '', desc: '', confirmerIds: [], attachments: [] },
      flowVisible: false,
      flowRecord: null,
      flowForm: { adopt: '', reason: '', plan: '', deadline: null, comment: '', archiveOpinion: '' },
      detailVisible: false,
      current: null
    }
  },
  computed: {
    currentUser () {
      return this.$store.currentUser
    },
    proposerDeptName () {
      const dept = this.$store.getDept(this.currentUser.deptId)
      return dept ? dept.name : ''
    },
    departments () {
      return this.$store.db.departments
    },
    people () {
      return this.$store.db.people
    },
    confirmerOptions () {
      if (!this.form.deptId) return []
      return this.$store.staffOfDept(this.form.deptId)
    },
    filteredSuggestions () {
      const f = this.applied
      let rows = this.$store.db.suggestions.slice()
      if (f.deptId) rows = rows.filter(s => s.deptId === f.deptId)
      if (f.proposerId) rows = rows.filter(s => s.proposerId === f.proposerId)
      if (f.status) rows = rows.filter(s => s.status === f.status)
      if (f.adopt) {
        if (f.adopt === '待回复') rows = rows.filter(s => !(s.confirmers || []).some(c => c.reply))
        else rows = rows.filter(s => (s.confirmers || []).some(c => c.reply && c.reply.adopt === f.adopt))
      }
      if (f.dateRange && f.dateRange.length === 2) {
        const start = fmtDate(f.dateRange[0])
        const end = fmtDate(f.dateRange[1])
        rows = rows.filter(s => s.createdAt.slice(0, 10) >= start && s.createdAt.slice(0, 10) <= end)
      }
      if (f.keyword) {
        const kw = f.keyword.trim()
        rows = rows.filter(s => `${s.id}${s.title}${s.flow}${s.proposerName}`.indexOf(kw) > -1)
      }
      return rows
    },
    currentFlowNode () {
      if (!this.flowRecord || !this.flowRecord.nodes) return null
      return this.flowRecord.nodes.find(n => n.result === '待处理') || null
    },
    columns () {
      return [
        { title: '序号', width: 54, align: 'center', customRender: (text, record, index) => index + 1 },
        { title: '建议编号', dataIndex: 'id', width: 96 },
        { title: '建议事项', dataIndex: 'title', width: 190, scopedSlots: { customRender: 'cellTitle' } },
        { title: '涉及制度/流程', dataIndex: 'flow', width: 150 },
        { title: '提出人/部门', dataIndex: 'proposerName', width: 100, scopedSlots: { customRender: 'proposer' } },
        { title: '主责部门', dataIndex: 'deptName', width: 130 },
        { title: '确认负责人', dataIndex: 'confirmers', width: 90, scopedSlots: { customRender: 'confirmers' } },
        { title: '回复意见', dataIndex: 'reply', width: 190, scopedSlots: { customRender: 'reply' } },
        { title: '建议状态', dataIndex: 'status', width: 82, scopedSlots: { customRender: 'status' } },
        { title: '提出时间', dataIndex: 'createdAt', width: 100, scopedSlots: { customRender: 'createdAt' } },
        { title: '操作', width: 120, scopedSlots: { customRender: 'action' } }
      ]
    }
  },
  methods: {
    query () {
      this.applied = { ...this.filters }
      this.pagination = { ...this.pagination, current: 1 }
    },
    reset () {
      this.filters = { deptId: undefined, proposerId: undefined, adopt: undefined, status: undefined, dateRange: null, keyword: '' }
      this.applied = { ...this.filters }
    },
    openCreate () {
      this.form = { deptId: undefined, title: '', flow: '', desc: '', confirmerIds: [], attachments: [] }
      this.formVisible = true
    },
    onDeptChange (deptId) {
      const dept = this.$store.getDept(deptId)
      this.form.confirmerIds = dept ? [dept.managerId] : []
    },
    saveSuggestion () {
      if (!this.form.deptId) return this.$message.warning('请选择主责部门')
      if (!this.form.title.trim()) return this.$message.warning('请填写建议事项')
      if (!this.form.flow.trim()) return this.$message.warning('请填写涉及制度/流程')
      if (!this.form.desc.trim()) return this.$message.warning('请填写问题描述')
      if (!this.form.confirmerIds.length) return this.$message.warning('请选择确认部门负责人')
      this.$store.createSuggestion({
        deptId: this.form.deptId,
        title: this.form.title,
        flow: this.form.flow,
        desc: this.form.desc,
        confirmerIds: this.form.confirmerIds,
        attachments: this.form.attachments
      })
      this.formVisible = false
      this.$message.success('制度改进建议已保存')
    },
    replyReplies (record) {
      return (record.confirmers || []).filter(c => c.reply)
    },
    replyHasAdopt (record) {
      return this.replyReplies(record).some(c => c.reply.adopt === '改')
    },
    replySummary (record) {
      const replies = this.replyReplies(record)
      if (!replies.length) return ''
      return replies.map(c => `${c.name}：${c.reply.adopt}${c.reply.adopt === '不改' ? `（${c.reply.reason}）` : ''}`).join('；')
    },
    openFlow (record) {
      this.flowRecord = record
      this.flowForm = { adopt: '改', reason: '', plan: '', deadline: moment().add(15, 'day'), comment: '', archiveOpinion: '' }
      this.flowVisible = true
      this.detailVisible = false
    },
    resetFlowForm () {
      if (!this.currentFlowNode) return
      this.flowForm = { adopt: '改', reason: '', plan: '', deadline: moment().add(15, 'day'), comment: '', archiveOpinion: '' }
    },
    submitFlow (action) {
      if (!this.flowRecord || !this.currentFlowNode) return
      const payload = { comment: this.flowForm.comment }
      if (this.currentFlowNode.type === 'archive') {
        payload.archiveOpinion = this.flowForm.archiveOpinion
      } else if (action === 'pass') {
        payload.adopt = this.flowForm.adopt
        payload.reason = this.flowForm.reason
        payload.plan = this.flowForm.plan
        payload.deadline = this.flowForm.deadline ? fmtDate(this.flowForm.deadline) : ''
      } else {
        payload.reason = this.flowForm.reason || this.flowForm.comment
      }
      const res = this.$store.approveSuggestionNode(this.flowRecord.id, action, payload)
      if (!res.ok) return this.$message.error(res.message)
      if (res.rejected) {
        this.$message.success('已退回发起人')
        this.flowVisible = false
        return
      }
      if (res.archived) {
        this.$message.success('建议已归档')
        this.flowVisible = false
        return
      }
      this.$message.success(this.flowRecord.status === '已回复' ? '部门确认已完成，待企划归档' : '当前负责人意见已保存')
      this.$nextTick(() => {
        if (this.currentFlowNode) this.resetFlowForm()
        else this.flowVisible = false
      })
    },
    openDetail (record) {
      this.current = record
      this.detailVisible = true
    },
    exportExcel () {
      exportSuggestionsExcel()
      this.$message.success('附件3 Excel 文件已生成并开始下载')
    },
    printPdf () {
      printSuggestionsList()
    }
  }
}
</script>

<style scoped>
.title-cell {
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 18px;
}
.cell-sub {
  font-size: 11px;
  line-height: 16px;
}
.reply-text {
  display: inline-block;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
  font-size: 12px;
  color: #5b7189;
}
.readonly-box {
  min-height: 32px;
  background: #f7f9fc;
  border: 1px solid #e8eef6;
  border-radius: 2px;
  padding: 5px 10px;
  color: #5b7189;
  line-height: 20px;
  font-size: 13px;
}
.reply-head {
  padding-bottom: 10px;
  border-bottom: 1px solid #eef3f9;
  margin-bottom: 10px;
}
.flow-nodes {
  margin-top: 12px;
  border: 1px solid #e8eff7;
  border-radius: 3px;
  overflow: hidden;
}
.flow-node {
  padding: 8px 12px;
  border-bottom: 1px solid #eef3f9;
  background: #fbfdff;
}
.flow-node:last-child {
  border-bottom: 0;
}
.flow-node.active {
  background: #f0f8ff;
}
.flow-node-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.flow-node-name {
  font-size: 12.5px;
  font-weight: 600;
  color: #2c4359;
}
.flow-node-meta {
  font-size: 11.5px;
  color: #7d90a5;
  margin-top: 3px;
}
.flow-node-comment {
  font-size: 12px;
  color: #52667c;
  margin-top: 4px;
  line-height: 18px;
}
.reply-card {
  border: 1px solid #e8eff7;
  border-radius: 3px;
  padding: 10px 12px;
  margin-bottom: 8px;
  background: #fcfdff;
}
.reply-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.reply-person {
  font-size: 13px;
  font-weight: 600;
  color: #2c4359;
}
.reply-line {
  font-size: 12.5px;
  color: #3c536a;
  line-height: 19px;
}
.reply-meta {
  font-size: 12px;
  color: #6b8096;
  line-height: 18px;
  margin-top: 3px;
}
.reply-title {
  font-size: 14px;
  font-weight: 700;
  color: #22384e;
  margin-bottom: 3px;
}
.reply-origin {
  background: #f8fbff;
  border: 1px solid #e9f3fc;
  border-radius: 3px;
  padding: 9px 11px;
  font-size: 12.5px;
  color: #4a5f75;
  line-height: 20px;
  margin-bottom: 14px;
}
.detail-head {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 12px;
}
.detail-title {
  flex: 1;
  font-size: 15px;
  font-weight: 700;
  color: #22384e;
  line-height: 22px;
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
</style>
