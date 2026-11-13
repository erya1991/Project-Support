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
        <a-form-item label="配置状态">
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
          <a-form-item label="有效期">
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
      <span class="toolbar-tip">每次配置一人一项目，保存后直接启用；停用和重新启用均不需要审批。</span>
    </div>

    <a-table
      :columns="columns"
      :data-source="filteredRelations"
      :pagination="pagination"
      row-key="id"
      size="middle"
      :scroll="{ x: 1530 }"
    >
      <div slot="period" slot-scope="text, record" class="period-cell">
        <div>{{ record.startDate }}</div>
        <div class="muted">至 {{ record.endDate || '长期' }}</div>
      </div>
      <div slot="status" slot-scope="text">
        <status-tag :status="text" />
      </div>
      <div slot="validity" slot-scope="text, record" class="validity-cell">
        <span :class="{ 'validity-current': relationValidity(record) === '当前有效' }">{{ relationValidity(record) }}</span>
      </div>
      <div slot="action" slot-scope="text, record" class="table-actions">
        <a v-if="canEdit(record)" class="link-btn" @click="openEdit(record)">编辑</a>
        <a-divider v-if="canEdit(record) && record.configStatus !== '历史归档'" type="vertical" />
        <a v-if="record.configStatus === '启用'" class="link-btn" @click="openStop(record)">停用</a>
        <a v-else-if="record.configStatus === '停用'" class="link-btn" @click="enableRelation(record)">启用</a>
        <a-divider type="vertical" />
        <a class="link-btn" @click="openDetail(record)">详情</a>
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
          ? '每次配置一人一项目，保存后直接启用；无需提交审批。'
          : '人员与项目不可变更；可调整角色或有效期，保存后立即生效。' }}
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
            <a-form-model-item label="开始日期" required>
              <a-date-picker v-model="form.startDate" style="width: 100%" placeholder="请选择开始日期" />
            </a-form-model-item>
          </a-col>
          <a-col :span="12">
            <a-form-model-item label="结束日期">
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
        <a-button type="primary" :loading="saving" @click="saveForm">保存并启用</a-button>
      </template>
    </a-modal>

    <a-modal
      title="停用帮扶关系"
      :visible="invalidateVisible"
      :width="560"
      :mask-closable="false"
      @cancel="invalidateVisible = false"
    >
      <div v-if="invalidateRecord" class="invalidate-body">
        <div class="alert-note warn">
          <a-icon type="exclamation-circle" />
          停用后该关系不再参与业务有效判断，也不再生成新的日报任务和重点工作应填项目；历史日报、诉求、项目执行记录保留。
        </div>
        <div v-if="invalidateAppealCount" class="alert-note error" style="margin-top:10px;">
          <a-icon type="warning" /> 该人员在该项目仍有 <b>{{ invalidateAppealCount }}</b> 条办理中诉求。若这是其最后一条有效关系，系统将阻止停用，请先转办或销项。
        </div>
        <div class="detail-grid one-col" style="margin-top:12px;">
          <div class="detail-item"><span class="detail-label">服务人员</span><span class="detail-value">{{ invalidateRecord.personName }}（{{ invalidateRecord.deptName }}）</span></div>
          <div class="detail-item"><span class="detail-label">服务项目</span><span class="detail-value">{{ invalidateRecord.projectName }}</span></div>
          <div class="detail-item"><span class="detail-label">当前有效期</span><span class="detail-value">{{ invalidateRecord.startDate }} 至 {{ invalidateRecord.endDate || '长期' }}</span></div>
        </div>
        <div style="margin-top:12px;">
          <div class="form-label">停用原因 <span class="danger-text">*</span></div>
          <a-textarea v-model="invalidateReason" :rows="3" placeholder="请填写停用原因，不少于5个字" />
        </div>
      </div>
      <template slot="footer">
        <a-button @click="invalidateVisible = false">关闭</a-button>
        <a-button type="danger" :disabled="!canInvalidate" @click="confirmInvalidate">确认停用</a-button>
      </template>
    </a-modal>

    <a-modal
      title="帮扶关系详情"
      :visible="detailVisible"
      :width="760"
      @cancel="detailVisible = false"
    >
      <template v-if="current">
        <div class="detail-grid">
          <div class="detail-item"><span class="detail-label">关系编号</span><span class="detail-value">{{ current.id }}</span></div>
          <div class="detail-item"><span class="detail-label">配置状态</span><span class="detail-value"><status-tag :status="current.configStatus" /></span></div>
          <div class="detail-item"><span class="detail-label">当前有效性</span><span class="detail-value">{{ relationValidity(current) }}</span></div>
          <div class="detail-item"><span class="detail-label">总部服务人员</span><span class="detail-value">{{ current.personName }}</span></div>
          <div class="detail-item"><span class="detail-label">所属部门</span><span class="detail-value">{{ current.deptName }}</span></div>
          <div class="detail-item"><span class="detail-label">服务项目</span><span class="detail-value">{{ current.projectName }}</span></div>
          <div class="detail-item"><span class="detail-label">项目经理</span><span class="detail-value">{{ current.projectManager }}</span></div>
          <div class="detail-item"><span class="detail-label">帮扶角色</span><span class="detail-value">{{ current.role }}</span></div>
          <div class="detail-item full"><span class="detail-label">有效期</span><span class="detail-value">{{ current.startDate }} 至 {{ current.endDate || '长期' }}</span></div>
          <div class="detail-item full"><span class="detail-label">配置说明</span><span class="detail-value">{{ current.remark || '—' }}</span></div>
          <div v-if="current.stopReason" class="detail-item full"><span class="detail-label">停用原因</span><span class="detail-value">{{ current.stopReason }}（{{ current.stoppedAt }}，{{ current.stoppedBy }}）</span></div>
        </div>
      </template>
      <template slot="footer">
        <a-button @click="detailVisible = false">关闭</a-button>
        <a-button v-if="current && current.configStatus === '启用'" danger @click="openStop(current)">停用</a-button>
        <a-button v-if="current && current.configStatus === '停用'" type="primary" @click="enableRelation(current)">启用</a-button>
        <a-button v-if="current && canEdit(current)" @click="openEdit(current)">编辑</a-button>
      </template>
    </a-modal>
  </div>
</template>

<script>
import moment from 'moment'
import StatusTag from '../components/StatusTag.vue'
import { fmtDate } from '../utils/date'

export default {
  name: 'RelationsView',
  components: { StatusTag },
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
      form: { personId: undefined, projectId: undefined, role: '主责', startDate: null, endDate: null, remark: '' },
      invalidateVisible: false,
      invalidateRecord: null,
      invalidateReason: '',
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
    statusOptions () {
      return ['启用', '停用', '历史归档']
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
        if (f.status && r.configStatus !== f.status) return false
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
        { title: '配置状态', dataIndex: 'configStatus', width: 90, scopedSlots: { customRender: 'status' } },
        { title: '当前有效', dataIndex: 'configStatus', key: 'validity', width: 96, scopedSlots: { customRender: 'validity' } },
        { title: '操作', width: 150, scopedSlots: { customRender: 'action' } }
      ]
    },
    invalidateAppealCount () {
      if (!this.invalidateRecord) return 0
      return this.$store.db.appeals.filter(a =>
        a.personId === this.invalidateRecord.personId &&
        a.projectId === this.invalidateRecord.projectId &&
        a.status === '办理中'
      ).length
    },
    canInvalidate () {
      if (!this.invalidateRecord) return false
      return this.invalidateReason.trim().length >= 5
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
        startDate: record.startDate ? moment(record.startDate) : null,
        endDate: record.endDate ? moment(record.endDate) : null,
        remark: record.remark || ''
      }
      this.formVisible = true
    },
    canEdit (record) {
      return !!record && !record.archived && record.configStatus !== '历史归档'
    },
    relationValidity (record) {
      return this.$store.relationValidity(record)
    },
    saveForm () {
      if (!this.form.personId) return this.$message.warning('请选择总部服务人员')
      if (!this.form.projectId) return this.$message.warning('请选择帮扶项目')
      if (!this.form.startDate) return this.$message.warning('请选择开始日期')
      if (this.form.endDate && fmtDate(this.form.endDate) < fmtDate(this.form.startDate)) {
        return this.$message.warning('结束日期不得早于开始日期')
      }
      this.saving = true
      try {
        if (this.formMode === 'edit') {
          const res = this.$store.updateRelation(this.editingId, {
            role: this.form.role,
            startDate: fmtDate(this.form.startDate),
            endDate: fmtDate(this.form.endDate),
            remark: this.form.remark
          })
          if (!res.ok) {
            this.$message.error(res.message)
            return
          }
          this.$message.success('帮扶关系已更新')
        } else {
          const res = this.$store.createRelations({
            personIds: [this.form.personId],
            projectIds: [this.form.projectId],
            role: this.form.role,
            startDate: fmtDate(this.form.startDate),
            endDate: fmtDate(this.form.endDate),
            remark: this.form.remark
          })
          if (res.skipped.length) {
            this.$message.warning(`已跳过重复关系：${res.skipped[0]}`)
          }
          if (!res.created.length) {
            this.$message.error('未生成新的帮扶关系，请检查人员与项目是否已存在重叠的启用关系')
            return
          }
          this.$message.success('帮扶关系已保存并启用')
        }
        this.formVisible = false
        this.query()
      } finally {
        this.saving = false
      }
    },
    openStop (record) {
      this.invalidateRecord = record
      this.invalidateReason = ''
      this.invalidateVisible = true
    },
    confirmInvalidate () {
      const res = this.$store.stopRelation(this.invalidateRecord.id, this.invalidateReason)
      if (!res.ok) return this.$message.error(res.message)
      this.invalidateVisible = false
      this.$message.success('帮扶关系已停用')
      this.query()
    },
    enableRelation (record) {
      const self = this
      this.$confirm({
        title: '启用帮扶关系',
        content: `确认重新启用 ${record.personName} — ${record.projectName} 的帮扶关系？启用后按有效期参与业务判断。`,
        okText: '启用',
        cancelText: '取消',
        onOk () {
          const res = self.$store.enableRelation(record.id)
          if (!res.ok) return self.$message.error(res.message)
          self.$message.success('帮扶关系已启用')
          self.query()
        }
      })
    },
    openDetail (record) {
      this.current = record
      this.detailVisible = true
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
