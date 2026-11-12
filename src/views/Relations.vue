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
      <span class="toolbar-tip">每次配置一人一项目；同一人员多个项目、同一项目多名人员可多次新增。</span>
    </div>

    <a-table
      :columns="columns"
      :data-source="filteredRelations"
      :pagination="pagination"
      row-key="id"
      size="middle"
      :scroll="{ x: 1540 }"
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
          ? '每次配置一人一项目，保存后生成一条帮扶关系；可通过多次新增维护整体多对多关系。'
          : '人员与项目如需变更，请将原关系失效后重新配置。' }}
      </div>
      <a-form-model :label-col="{ span: 7 }" :wrapper-col="{ span: 17 }" class="relation-form">
        <a-row :gutter="20">
          <a-col :span="12">
            <a-form-model-item label="总部服务人员" required>
              <a-select
                v-model="form.personId"
                :disabled="formMode === 'edit'"
                placeholder="请选择一名总部服务人员"
                option-filter-prop="children"
                show-search
                style="width: 100%"
                @change="onPersonChange"
              >
                <a-select-option v-for="p in people" :key="p.id" :value="p.id">
                  {{ p.name }}（{{ p.employeeNo }}）
                </a-select-option>
              </a-select>
            </a-form-model-item>
          </a-col>
          <a-col :span="12">
            <a-form-model-item label="帮扶项目" required>
              <a-select
                v-model="form.projectId"
                :disabled="formMode === 'edit'"
                placeholder="请选择一个帮扶项目"
                option-filter-prop="children"
                show-search
                style="width: 100%"
                @change="onProjectChange"
              >
                <a-select-option v-for="p in projects" :key="p.id" :value="p.id">
                  {{ p.name }}（{{ p.company }}）
                </a-select-option>
              </a-select>
            </a-form-model-item>
          </a-col>
          <a-col :span="12">
            <a-form-model-item label="工号">
              <div class="readonly-box">{{ formPerson ? formPerson.employeeNo : '随人员带出' }}</div>
            </a-form-model-item>
          </a-col>
          <a-col :span="12">
            <a-form-model-item label="职务">
              <div class="readonly-box">{{ formPerson ? formPerson.title : '随人员带出' }}</div>
            </a-form-model-item>
          </a-col>
          <a-col :span="12">
            <a-form-model-item label="所属部门">
              <div class="readonly-box">{{ formPerson ? deptName(formPerson.deptId) : '随人员带出' }}</div>
            </a-form-model-item>
          </a-col>
          <a-col :span="12">
            <a-form-model-item label="联系方式">
              <div class="readonly-box">{{ formPerson ? formPerson.phone : '随人员带出' }}</div>
            </a-form-model-item>
          </a-col>
          <a-col :span="12">
            <a-form-model-item label="所属单位">
              <div class="readonly-box">{{ formProject ? formProject.company : '随项目带出' }}</div>
            </a-form-model-item>
          </a-col>
          <a-col :span="12">
            <a-form-model-item label="项目经理">
              <div class="readonly-box">{{ formProject ? formProject.manager : '随项目带出' }}</div>
            </a-form-model-item>
          </a-col>
          <a-col :span="12">
            <a-form-model-item label="项目经理联系方式">
              <div class="readonly-box">{{ formProject ? formProject.managerPhone : '随项目带出' }}</div>
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
      form: { personId: undefined, projectId: undefined, role: '主责', plannerId: 'P17', startDate: null, endDate: null, remark: '' },
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
    formPerson () {
      return this.form.personId ? this.$store.getPerson(this.form.personId) : null
    },
    formProject () {
      return this.form.projectId ? this.$store.getProject(this.form.projectId) : null
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
        { title: '关系编号', dataIndex: 'id', width: 112 },
        { title: '总部服务人员', dataIndex: 'personName', width: 92 },
        { title: '工号', dataIndex: 'personId', key: 'employeeNo', width: 86, customRender: id => this.personEmployeeNo(id) },
        { title: '所属部门', dataIndex: 'deptName', width: 150 },
        { title: '帮扶项目', dataIndex: 'projectName', width: 175 },
        { title: '所属单位', dataIndex: 'projectId', key: 'company', width: 110, customRender: id => this.projectCompany(id) },
        { title: '项目经理', dataIndex: 'projectManager', width: 82 },
        { title: '项目经理联系方式', dataIndex: 'projectId', key: 'managerPhone', width: 128, customRender: id => this.projectManagerPhone(id) },
        { title: '帮扶角色', dataIndex: 'role', width: 70, align: 'center' },
        { title: '有效期', dataIndex: 'startDate', width: 132, scopedSlots: { customRender: 'period' } },
        { title: '企划经办人', dataIndex: 'plannerName', width: 84 },
        { title: '关系状态', dataIndex: 'status', width: 86, scopedSlots: { customRender: 'status' } },
        { title: '操作', width: 120, scopedSlots: { customRender: 'action' } }
      ]
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
    personEmployeeNo (id) {
      const person = this.$store.getPerson(id)
      return person ? person.employeeNo || '—' : '—'
    },
    projectCompany (id) {
      const project = this.$store.getProject(id)
      return project ? project.company || '—' : '—'
    },
    projectManagerPhone (id) {
      const project = this.$store.getProject(id)
      return project ? project.managerPhone || '—' : '—'
    },
    onPersonChange () {},
    onProjectChange () {},
    query () {
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
        personId: undefined,
        projectId: undefined,
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
        personId: record.personId,
        projectId: record.projectId,
        role: record.role,
        plannerId: record.plannerId,
        startDate: record.startDate ? moment(record.startDate) : null,
        endDate: record.endDate ? moment(record.endDate) : null,
        remark: record.remark || ''
      }
      this.formVisible = true
    },
    saveForm (submit) {
      if (!this.form.personId) return this.$message.warning('请选择总部服务人员')
      if (!this.form.projectId) return this.$message.warning('请选择帮扶项目')
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
            personIds: [this.form.personId],
            projectIds: [this.form.projectId],
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
          this.$message.success('帮扶关系草稿已保存')
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
