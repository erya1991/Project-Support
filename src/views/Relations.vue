<template>
  <div class="relations-page">
    <div class="filter-bar">
      <a-form layout="inline" class="filter-form">
        <a-form-item label="服务人员">
          <a-select
            v-model="filters.personId"
            placeholder="全部人员"
            allow-clear
            show-search
            option-filter-prop="children"
            style="width: 180px"
          >
            <a-select-option v-for="p in people" :key="p.id" :value="p.id">
              {{ p.name }}（{{ deptName(p.deptId) }}）
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="服务项目">
          <a-select v-model="filters.projectId" placeholder="全部项目" allow-clear show-search option-filter-prop="children" style="width: 190px">
            <a-select-option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="所属部门">
          <a-select v-model="filters.deptId" placeholder="全部部门" allow-clear show-search option-filter-prop="children" style="width: 180px">
            <a-select-option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="关系状态">
          <a-select v-model="filters.status" placeholder="全部状态" allow-clear style="width: 130px">
            <a-select-option v-for="s in statusOptions" :key="s" :value="s">{{ s }}</a-select-option>
          </a-select>
        </a-form-item>
        <template v-if="expanded">
          <a-form-item label="帮扶角色">
            <a-select v-model="filters.role" placeholder="全部角色" allow-clear style="width: 110px">
              <a-select-option value="主责">主责</a-select-option>
              <a-select-option value="协同">协同</a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="生效日期">
            <a-range-picker v-model="filters.dateRange" style="width: 240px" />
          </a-form-item>
        </template>
        <a-form-item>
          <div class="filter-actions">
            <a-button type="primary" @click="query"><a-icon type="search" /> 查询</a-button>
            <a-button @click="reset"><a-icon type="reload" /> 重置</a-button>
            <span class="filter-toggle" @click="expanded = !expanded">
              {{ expanded ? '收起' : '展开' }}
              <a-icon :type="expanded ? 'up' : 'down'" />
            </span>
          </div>
        </a-form-item>
      </a-form>
    </div>

    <div class="toolbar">
      <a-button type="primary" @click="openCreate"><a-icon type="plus" /> 新增帮扶关系</a-button>
      <a-button :disabled="!selectedRowKeys.length" @click="batchSubmit">
        <a-icon type="audit" /> 批量提交审批
      </a-button>
      <a v-if="selectedRowKeys.length" class="link-btn clear-selection" @click="selectedRowKeys = []">
        已选择 {{ selectedRowKeys.length }} 项，清空
      </a>
      <span class="toolbar-tip">支持一次选择多名总部人员和多个项目，保存后按“人员×项目”生成关系。</span>
    </div>

    <a-table
      :columns="columns"
      :data-source="filteredRelations"
      :pagination="pagination"
      row-key="id"
      size="middle"
      :row-selection="rowSelection"
    >
      <div slot="period" slot-scope="text, record" class="period-cell">
        <div>{{ record.startDate }}</div>
        <div class="muted">至 {{ record.endDate || '长期' }}</div>
      </div>
      <div slot="status" slot-scope="text">
        <status-tag :status="text" />
      </div>
      <div slot="action" slot-scope="text, record" class="table-actions">
        <a v-if="record.status === '草稿' || record.status === '已驳回'" class="link-btn" @click="submitOne(record)">提交审批</a>
        <a v-else-if="record.status === '待审批'" class="link-btn" @click="openApproval(record)">审批</a>
        <a v-else-if="record.status === '已生效'" class="link-btn" @click="openAdjust(record)">调整</a>
        <a v-else class="link-btn" @click="openDetail(record)">详情</a>
        <a-divider type="vertical" />
        <a-dropdown :trigger="['click']">
          <a class="link-btn" @click.stop>更多 <a-icon type="down" /></a>
          <a-menu slot="overlay" @click="onMoreClick($event, record)">
            <a-menu-item key="detail"><a-icon type="eye" /> 查看详情</a-menu-item>
            <a-menu-item v-if="record.status === '草稿' || record.status === '已驳回'" key="edit"><a-icon type="edit" /> 编辑配置</a-menu-item>
            <a-menu-item v-if="record.status === '草稿' || record.status === '已驳回'" key="submit"><a-icon type="audit" /> 提交审批</a-menu-item>
            <a-menu-item v-if="record.status === '已生效'" key="invalidate"><a-icon type="stop" /> 关系失效</a-menu-item>
          </a-menu>
        </a-dropdown>
      </div>
    </a-table>

    <a-modal
      :title="formMode === 'create' ? '新增帮扶关系' : '编辑帮扶关系'"
      :visible="formVisible"
      :width="920"
      :mask-closable="false"
      @cancel="formVisible = false"
    >
      <div class="alert-note" style="margin-bottom:14px;">
        <a-icon type="info-circle" />
        {{ formMode === 'create'
          ? '选择多名人员与多个项目后，系统按“人员×项目”生成独立帮扶关系。'
          : '人员与项目如需变更，请将原关系失效后重新配置。' }}
      </div>
      <a-form-model :label-col="{ span: 7 }" :wrapper-col="{ span: 17 }" class="relation-form">
        <a-row :gutter="20">
          <a-col :span="12">
            <a-form-model-item label="总部服务人员" required>
              <a-select
                v-model="form.personIds"
                mode="multiple"
                :disabled="formMode === 'edit'"
                placeholder="请选择总部服务人员，可多选"
                :max-tag-count="3"
                option-filter-prop="children"
                show-search
                style="width: 100%"
              >
                <a-select-option v-for="p in people" :key="p.id" :value="p.id">
                  {{ p.name }}（{{ deptName(p.deptId) }}）
                </a-select-option>
              </a-select>
            </a-form-model-item>
          </a-col>
          <a-col :span="12">
            <a-form-model-item label="服务项目" required>
              <a-select
                v-model="form.projectIds"
                mode="multiple"
                :disabled="formMode === 'edit'"
                placeholder="请选择服务项目，可多选"
                :max-tag-count="2"
                option-filter-prop="children"
                show-search
                style="width: 100%"
              >
                <a-select-option v-for="p in projects" :key="p.id" :value="p.id">
                  {{ p.name }}（项目经理：{{ p.manager }}）
                </a-select-option>
              </a-select>
            </a-form-model-item>
          </a-col>
          <a-col :span="12">
            <a-form-model-item label="所属部门">
              <div class="readonly-box">{{ formDeptText }}</div>
            </a-form-model-item>
          </a-col>
          <a-col :span="12">
            <a-form-model-item label="项目经理">
              <div class="readonly-box">{{ formManagerText }}</div>
            </a-form-model-item>
          </a-col>
          <a-col :span="12">
            <a-form-model-item label="帮扶角色" required>
              <a-radio-group v-model="form.role">
                <a-radio value="主责">主责</a-radio>
                <a-radio value="协同">协同</a-radio>
              </a-radio-group>
            </a-form-model-item>
          </a-col>
          <a-col :span="12">
            <a-form-model-item label="企划业务经办人" required>
              <a-select v-model="form.plannerId" placeholder="请选择" style="width: 100%">
                <a-select-option v-for="p in plannerOptions" :key="p.id" :value="p.id">
                  {{ p.name }}（{{ deptName(p.deptId) }}）
                </a-select-option>
              </a-select>
            </a-form-model-item>
          </a-col>
          <a-col :span="12">
            <a-form-model-item label="生效日期" required>
              <a-date-picker v-model="form.startDate" style="width: 100%" placeholder="请选择生效日期" />
            </a-form-model-item>
          </a-col>
          <a-col :span="12">
            <a-form-model-item label="失效日期">
              <a-date-picker v-model="form.endDate" style="width: 100%" placeholder="可为空，表示长期" />
            </a-form-model-item>
          </a-col>
          <a-col :span="24">
            <a-form-model-item label="配置说明" :label-col="{ span: 4 }" :wrapper-col="{ span: 20 }">
              <a-textarea
                v-model="form.remark"
                :rows="2"
                :max-length="200"
                placeholder="填写安排或调整原因，关系失效时需说明原因"
              />
            </a-form-model-item>
          </a-col>
        </a-row>
      </a-form-model>

      <div v-if="formMode === 'create'" class="preview-block">
        <div class="preview-title">
          将生成 <b>{{ formCombos.length }}</b> 条帮扶关系
          <span v-if="duplicateWarnings.length" class="danger-text">（{{ duplicateWarnings.length }} 条与现有关系重叠，将自动跳过）</span>
        </div>
        <div class="preview-list">
          <div v-for="(combo, index) in formCombos.slice(0, 8)" :key="index" class="preview-item">
            <a-icon type="user" /> {{ combo.personName }}
            <a-icon type="arrow-right" class="preview-arrow" />
            <a-icon type="project" /> {{ combo.projectName }}
          </div>
          <span v-if="formCombos.length > 8" class="muted">等 {{ formCombos.length }} 条</span>
          <span v-if="!formCombos.length" class="muted">请选择人员和项目</span>
        </div>
      </div>

      <template slot="footer">
        <a-button @click="formVisible = false">关闭</a-button>
        <a-button type="primary" :loading="saving" @click="saveForm(false)">保存</a-button>
      </template>
    </a-modal>

    <a-modal
      title="调整帮扶关系"
      :visible="adjustVisible"
      :width="640"
      :mask-closable="false"
      @cancel="adjustVisible = false"
    >
      <div class="alert-note" style="margin-bottom:14px;">
        <a-icon type="info-circle" /> 调整后关系继续生效，历史日报与事项不受影响。
      </div>
      <a-form-model :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
        <a-form-model-item label="服务人员">
          <div class="readonly-box">{{ adjustForm.personName }}</div>
        </a-form-model-item>
        <a-form-model-item label="服务项目">
          <div class="readonly-box">{{ adjustForm.projectName }}</div>
        </a-form-model-item>
        <a-form-model-item label="帮扶角色" required>
          <a-radio-group v-model="adjustForm.role">
            <a-radio value="主责">主责</a-radio>
            <a-radio value="协同">协同</a-radio>
          </a-radio-group>
        </a-form-model-item>
        <a-form-model-item label="生效日期" required>
          <a-date-picker v-model="adjustForm.startDate" style="width: 100%" />
        </a-form-model-item>
        <a-form-model-item label="失效日期">
          <a-date-picker v-model="adjustForm.endDate" style="width: 100%" />
        </a-form-model-item>
        <a-form-model-item label="调整说明">
          <a-textarea v-model="adjustForm.remark" :rows="2" placeholder="填写本次调整原因" />
        </a-form-model-item>
      </a-form-model>
      <template slot="footer">
        <a-button @click="adjustVisible = false">关闭</a-button>
        <a-button type="primary" @click="saveAdjust">保存调整</a-button>
      </template>
    </a-modal>

    <a-modal
      title="关系失效"
      :visible="invalidateVisible"
      :width="560"
      :mask-closable="false"
      @cancel="invalidateVisible = false"
    >
      <div v-if="invalidateRecord" class="invalidate-body">
        <div class="alert-note warn">
          <a-icon type="exclamation-circle" />
          失效后该关系不再生成新的日报任务，也不能再选择该关系登记新的项目诉求或项目执行记录；历史数据保留。
        </div>
        <div v-if="invalidateAppealCount" class="alert-note error" style="margin-top:10px;">
          <a-icon type="warning" /> 该人员仍有 <b>{{ invalidateAppealCount }}</b> 条未办结诉求，请先移交责任或明确后续责任人。
        </div>
        <div class="detail-grid one-col" style="margin-top:12px;">
          <div class="detail-item"><span class="detail-label">服务人员</span><span class="detail-value">{{ invalidateRecord.personName }}（{{ invalidateRecord.deptName }}）</span></div>
          <div class="detail-item"><span class="detail-label">服务项目</span><span class="detail-value">{{ invalidateRecord.projectName }}</span></div>
          <div class="detail-item"><span class="detail-label">当前有效期</span><span class="detail-value">{{ invalidateRecord.startDate }} 至 {{ invalidateRecord.endDate || '长期' }}</span></div>
        </div>
        <div style="margin-top:12px;">
          <div class="form-label">失效原因 <span class="danger-text">*</span></div>
          <a-textarea v-model="invalidateReason" :rows="3" placeholder="请填写关系失效原因，不少于5个字" />
        </div>
        <a-checkbox v-if="invalidateAppealCount" v-model="invalidateAck" style="margin-top:10px;">
          我已确认后续诉求处理责任人
        </a-checkbox>
      </div>
      <template slot="footer">
        <a-button @click="invalidateVisible = false">关闭</a-button>
        <a-button type="danger" :disabled="!canInvalidate" @click="confirmInvalidate">确认失效</a-button>
      </template>
    </a-modal>

    <approval-modal
      :visible.sync="approvalVisible"
      title="帮扶关系联合审批"
      :nodes="approvalNodes"
      :entity-desc="approvalDesc"
      @submit="handleApproval"
    />

    <a-modal
      title="帮扶关系详情"
      :visible="detailVisible"
      :width="760"
      @cancel="detailVisible = false"
    >
      <template v-if="current">
        <div class="detail-grid">
          <div class="detail-item"><span class="detail-label">关系编号</span><span class="detail-value">{{ current.id }}</span></div>
          <div class="detail-item"><span class="detail-label">关系状态</span><span class="detail-value"><status-tag :status="current.status" /></span></div>
          <div class="detail-item"><span class="detail-label">总部服务人员</span><span class="detail-value">{{ current.personName }}</span></div>
          <div class="detail-item"><span class="detail-label">所属部门</span><span class="detail-value">{{ current.deptName }}</span></div>
          <div class="detail-item"><span class="detail-label">服务项目</span><span class="detail-value">{{ current.projectName }}</span></div>
          <div class="detail-item"><span class="detail-label">项目经理</span><span class="detail-value">{{ current.projectManager }}</span></div>
          <div class="detail-item"><span class="detail-label">帮扶角色</span><span class="detail-value">{{ current.role }}</span></div>
          <div class="detail-item"><span class="detail-label">企划经办人</span><span class="detail-value">{{ current.plannerName }}</span></div>
          <div class="detail-item full"><span class="detail-label">有效期</span><span class="detail-value">{{ current.startDate }} 至 {{ current.endDate || '长期' }}</span></div>
          <div class="detail-item full"><span class="detail-label">配置说明</span><span class="detail-value">{{ current.remark || '—' }}</span></div>
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
import ApprovalModal from '../components/ApprovalModal.vue'
import { fmtDate } from '../utils/date'

export default {
  name: 'RelationsView',
  components: { StatusTag, ApprovalModal },
  data () {
    return {
      expanded: false,
      selectedRowKeys: [],
      filters: { personId: undefined, projectId: undefined, deptId: undefined, status: undefined, role: undefined, dateRange: null },
      applied: { personId: undefined, projectId: undefined, deptId: undefined, status: undefined, role: undefined, dateRange: null },
      pagination: {
        pageSize: 10,
        showSizeChanger: true,
        showTotal: total => `共 ${total} 条`,
        pageSizeOptions: ['10', '20', '50']
      },
      formVisible: false,
      formMode: 'create',
      editingId: null,
      saving: false,
      form: { personIds: [], projectIds: [], role: '主责', plannerId: 'P17', startDate: null, endDate: null, remark: '' },
      adjustVisible: false,
      adjustForm: { id: '', personName: '', projectName: '', role: '主责', startDate: null, endDate: null, remark: '' },
      invalidateVisible: false,
      invalidateRecord: null,
      invalidateReason: '',
      invalidateAck: false,
      approvalVisible: false,
      approvalRecord: null,
      detailVisible: false,
      current: null
    }
  },
  computed: {
    people () {
      return this.$store.db.people
    },
    projects () {
      return this.$store.db.projects
    },
    departments () {
      return this.$store.db.departments
    },
    plannerOptions () {
      return this.$store.staffOfDept('D14')
    },
    statusOptions () {
      return ['草稿', '待审批', '已生效', '已驳回', '已失效']
    },
    rowSelection () {
      return {
        selectedRowKeys: this.selectedRowKeys,
        onChange: keys => { this.selectedRowKeys = keys },
        getCheckboxProps: record => ({
          props: {
            disabled: record.status !== '草稿' && record.status !== '已驳回'
          }
        })
      }
    },
    filteredRelations () {
      const f = this.applied
      return this.$store.db.relations.filter(r => {
        if (f.personId && r.personId !== f.personId) return false
        if (f.projectId && r.projectId !== f.projectId) return false
        if (f.deptId && r.deptId !== f.deptId) return false
        if (f.status && r.status !== f.status) return false
        if (f.role && r.role !== f.role) return false
        if (f.dateRange && f.dateRange.length === 2) {
          const start = fmtDate(f.dateRange[0])
          const end = fmtDate(f.dateRange[1])
          const relEnd = r.endDate || '9999-12-31'
          if (!(start <= relEnd && end >= r.startDate)) return false
        }
        return true
      })
    },
    columns () {
      return [
        { title: '序号', width: 54, align: 'center', customRender: (text, record, index) => index + 1 },
        { title: '关系编号', dataIndex: 'id', width: 120 },
        { title: '总部服务人员', dataIndex: 'personName', width: 96 },
        { title: '所属部门', dataIndex: 'deptName', width: 165 },
        { title: '服务项目', dataIndex: 'projectName', width: 195 },
        { title: '项目经理', dataIndex: 'projectManager', width: 80 },
        { title: '帮扶角色', dataIndex: 'role', width: 70, align: 'center' },
        { title: '有效期', dataIndex: 'startDate', width: 140, scopedSlots: { customRender: 'period' } },
        { title: '企划经办人', dataIndex: 'plannerName', width: 88 },
        { title: '关系状态', dataIndex: 'status', width: 88, scopedSlots: { customRender: 'status' } },
        { title: '操作', width: 125, scopedSlots: { customRender: 'action' } }
      ]
    },
    formCombos () {
      const list = []
      this.form.personIds.forEach(pid => {
        const person = this.$store.getPerson(pid)
        this.form.projectIds.forEach(jid => {
          const project = this.$store.getProject(jid)
          if (person && project) list.push({ personName: person.name, projectName: project.name })
        })
      })
      return list
    },
    duplicateWarnings () {
      const list = []
      this.form.personIds.forEach(pid => {
        this.form.projectIds.forEach(jid => {
          const start = fmtDate(this.form.startDate) || '0000-00-00'
          const end = fmtDate(this.form.endDate) || '9999-12-31'
          const dup = this.$store.db.relations.find(r => {
            if (r.personId !== pid || r.projectId !== jid) return false
            if (r.status === '已失效' || r.status === '已驳回') return false
            const relEnd = r.endDate || '9999-12-31'
            return start <= relEnd && end >= r.startDate
          })
          if (dup) list.push(dup.id)
        })
      })
      return list
    },
    formDeptText () {
      const names = [...new Set(this.form.personIds.map(pid => {
        const p = this.$store.getPerson(pid)
        return p ? this.deptName(p.deptId) : ''
      }).filter(Boolean))]
      return names.length ? names.join('、') : '随人员选择自动带出'
    },
    formManagerText () {
      const names = [...new Set(this.form.projectIds.map(jid => {
        const p = this.$store.getProject(jid)
        return p ? p.manager : ''
      }).filter(Boolean))]
      return names.length ? names.join('、') : '随项目选择自动带出'
    },
    approvalNodes () {
      return this.approvalRecord ? this.approvalRecord.approvals : []
    },
    approvalDesc () {
      if (!this.approvalRecord) return ''
      const count = this.$store.db.relations.filter(r => r.batchId === this.approvalRecord.batchId && r.status === '待审批').length
      return `本次联合审批对应批次 ${this.approvalRecord.batchId}，共 ${count} 条关系，审批通过后整批生效。`
    },
    invalidateAppealCount () {
      if (!this.invalidateRecord) return 0
      return this.$store.db.appeals.filter(a => a.personId === this.invalidateRecord.personId && a.status !== '已销项').length
    },
    canInvalidate () {
      if (!this.invalidateRecord) return false
      if (this.invalidateReason.trim().length < 5) return false
      if (this.invalidateAppealCount && !this.invalidateAck) return false
      return true
    }
  },
  methods: {
    deptName (id) {
      const dept = this.$store.getDept(id)
      return dept ? dept.name : ''
    },
    query () {
      this.selectedRowKeys = []
      this.applied = {
        personId: this.filters.personId,
        projectId: this.filters.projectId,
        deptId: this.filters.deptId,
        status: this.filters.status,
        role: this.filters.role,
        dateRange: this.filters.dateRange
      }
      this.pagination = { ...this.pagination, current: 1 }
    },
    reset () {
      this.filters = { personId: undefined, projectId: undefined, deptId: undefined, status: undefined, role: undefined, dateRange: null }
      this.query()
    },
    openCreate () {
      this.formMode = 'create'
      this.editingId = null
      this.form = {
        personIds: [],
        projectIds: [],
        role: '主责',
        plannerId: 'P17',
        startDate: moment(),
        endDate: null,
        remark: ''
      }
      this.formVisible = true
    },
    openEdit (record) {
      this.formMode = 'edit'
      this.editingId = record.id
      this.form = {
        personIds: [record.personId],
        projectIds: [record.projectId],
        role: record.role,
        plannerId: record.plannerId,
        startDate: record.startDate ? moment(record.startDate) : null,
        endDate: record.endDate ? moment(record.endDate) : null,
        remark: record.remark || ''
      }
      this.formVisible = true
    },
    saveForm (submit) {
      if (!this.form.personIds.length) return this.$message.warning('请选择总部服务人员')
      if (!this.form.projectIds.length) return this.$message.warning('请选择服务项目')
      if (!this.form.startDate) return this.$message.warning('请选择生效日期')
      if (this.form.endDate && fmtDate(this.form.endDate) < fmtDate(this.form.startDate)) {
        return this.$message.warning('失效日期不得早于生效日期')
      }
      this.saving = true
      try {
        if (this.formMode === 'edit') {
          this.$store.updateDraftRelation(this.editingId, {
            role: this.form.role,
            startDate: fmtDate(this.form.startDate),
            endDate: fmtDate(this.form.endDate),
            plannerId: this.form.plannerId,
            remark: this.form.remark
          })
          if (submit) this.$store.submitRelations([this.editingId])
          this.$message.success(submit ? '已提交联合审批' : '配置草稿已保存')
        } else {
          const res = this.$store.createRelations({
            personIds: this.form.personIds,
            projectIds: this.form.projectIds,
            role: this.form.role,
            startDate: fmtDate(this.form.startDate),
            endDate: fmtDate(this.form.endDate),
            plannerId: this.form.plannerId,
            remark: this.form.remark
          })
          if (res.skipped.length) {
            this.$message.warning(`已跳过 ${res.skipped.length} 条重复关系：${res.skipped[0]}`)
          }
          if (!res.created.length) {
            this.$message.error('未生成新的帮扶关系，请检查人员与项目是否均已存在有效关系')
            this.saving = false
            return
          }
          if (submit) this.$store.submitRelations(res.created.map(r => r.id))
          this.$message.success(`已生成 ${res.created.length} 条帮扶关系${submit ? '并提交联合审批' : '草稿'}`)
        }
        this.formVisible = false
        this.query()
      } finally {
        this.saving = false
      }
    },
    submitOne (record) {
      this.$confirm({
        title: '提交联合审批',
        content: `将提交 ${record.personName} — ${record.projectName} 所在批次的全部关系至工程管理部、企划部联合审批，确认提交？`,
        okText: '提交',
        cancelText: '取消',
        onOk: () => {
          this.$store.submitRelations([record.id])
          this.$message.success('已提交联合审批')
          this.query()
        }
      })
    },
    batchSubmit () {
      if (!this.selectedRowKeys.length) return
      const selected = this.dbRelations().filter(r => this.selectedRowKeys.indexOf(r.id) > -1)
      const batches = [...new Set(selected.map(r => r.batchId))]
      this.$confirm({
        title: '批量提交联合审批',
        content: `已选择 ${selected.length} 条关系，涉及 ${batches.length} 个配置批次。提交时将按批次整体提交工程管理部、企划部联合审批，确认提交？`,
        okText: '提交',
        cancelText: '取消',
        onOk: () => {
          this.$store.submitRelations(this.selectedRowKeys)
          this.$message.success('已提交联合审批')
          this.query()
        }
      })
    },
    dbRelations () {
      return this.$store.db.relations
    },
    openApproval (record) {
      this.approvalRecord = record
      this.approvalVisible = true
    },
    handleApproval ({ action, comment }) {
      const record = this.approvalRecord
      if (!record) return
      const res = this.$store.approveRelationBatch(record.batchId, action, comment)
      if (!res.ok) {
        this.$message.error(res.message)
        return
      }
      this.approvalVisible = false
      this.$message.success(action === 'pass' ? (res.finished ? '联合审批已通过，关系已生效' : '当前审批节点已通过') : '已退回配置人修改')
      this.query()
    },
    openAdjust (record) {
      this.adjustForm = {
        id: record.id,
        personName: record.personName,
        projectName: record.projectName,
        role: record.role,
        startDate: record.startDate ? moment(record.startDate) : null,
        endDate: record.endDate ? moment(record.endDate) : null,
        remark: ''
      }
      this.adjustVisible = true
    },
    saveAdjust () {
      if (!this.adjustForm.startDate) return this.$message.warning('请选择生效日期')
      if (this.adjustForm.endDate && fmtDate(this.adjustForm.endDate) < fmtDate(this.adjustForm.startDate)) {
        return this.$message.warning('失效日期不得早于生效日期')
      }
      this.$store.adjustRelation(this.adjustForm.id, {
        role: this.adjustForm.role,
        startDate: fmtDate(this.adjustForm.startDate),
        endDate: fmtDate(this.adjustForm.endDate),
        remark: this.adjustForm.remark
      })
      this.adjustVisible = false
      this.$message.success('帮扶关系已调整，变更历史已保留')
      this.query()
    },
    openInvalidate (record) {
      this.invalidateRecord = record
      this.invalidateReason = ''
      this.invalidateAck = false
      this.invalidateVisible = true
    },
    confirmInvalidate () {
      const res = this.$store.invalidateRelation(this.invalidateRecord.id, this.invalidateReason)
      if (!res.ok) return
      this.invalidateVisible = false
      this.$message.success('帮扶关系已失效')
      this.query()
    },
    openDetail (record) {
      this.current = record
      this.detailVisible = true
    },
    onMoreClick (event, record) {
      this.handleMore(event.key, record)
    },
    handleMore (key, record) {
      if (key === 'detail') this.openDetail(record)
      else if (key === 'edit') this.openEdit(record)
      else if (key === 'submit') this.submitOne(record)
      else if (key === 'invalidate') this.openInvalidate(record)
    }
  }
}
</script>

<style scoped>
.filter-form {
  line-height: 1;
}
.toolbar-tip {
  font-size: 12px;
  margin-left: 4px;
  color: #8a9cb0;
}
.clear-selection {
  font-size: 12px;
}
.period-cell {
  line-height: 18px;
  font-size: 12px;
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
.relation-form .ant-form-item {
  margin-bottom: 14px;
}
.preview-block {
  background: #f8fbff;
  border: 1px dashed #cfe4f8;
  border-radius: 3px;
  padding: 10px 12px;
}
.preview-title {
  font-size: 12.5px;
  color: #42688c;
  margin-bottom: 7px;
}
.preview-title b {
  color: #1890ff;
  font-size: 15px;
  margin: 0 2px;
}
.preview-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  font-size: 12px;
  color: #4a5f75;
}
.preview-item {
  background: #fff;
  border: 1px solid #e3edf8;
  border-radius: 2px;
  padding: 3px 8px;
}
.preview-arrow {
  color: #a9bfd5;
  margin: 0 4px;
  font-size: 10px;
}
.invalidate-body {
  font-size: 13px;
}
.form-label {
  font-size: 13px;
  color: #4a5d72;
  margin-bottom: 5px;
}
.history-head {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13.5px;
  font-weight: 600;
  color: #2d4358;
  padding-bottom: 12px;
  border-bottom: 1px solid #eef3f9;
  margin-bottom: 14px;
}
.history-title {
  font-size: 13px;
  color: #2f4358;
  font-weight: 600;
}
.history-time {
  font-size: 11.5px;
  color: #9aabbf;
  margin: 2px 0;
}
.history-remark {
  font-size: 12px;
  color: #5b7189;
  line-height: 18px;
}
</style>
