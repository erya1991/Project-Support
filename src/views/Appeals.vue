<template>
  <div class="appeals-page">
    <div class="filter-bar">
      <a-form layout="inline">
        <a-form-item label="所属项目">
          <a-select v-model="filters.projectId" placeholder="全部项目" allow-clear show-search option-filter-prop="children" style="width: 190px">
            <a-select-option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="主责部门">
          <a-select v-model="filters.deptId" placeholder="全部部门" allow-clear show-search option-filter-prop="children" style="width: 180px">
            <a-select-option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="责任人">
          <a-select v-model="filters.personId" placeholder="全部人员" allow-clear show-search option-filter-prop="children" style="width: 150px">
            <a-select-option v-for="p in people" :key="p.id" :value="p.id">{{ p.name }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="办理状态">
          <a-select v-model="filters.status" placeholder="全部状态" allow-clear style="width: 130px">
            <a-select-option value="在办">在办（未销项）</a-select-option>
            <a-select-option v-for="s in statusOptions" :key="s" :value="s">{{ s }}</a-select-option>
          </a-select>
        </a-form-item>
        <template v-if="expanded">
          <a-form-item label="完成时限">
            <a-range-picker v-model="filters.dueRange" style="width: 240px" />
          </a-form-item>
          <a-form-item label="超期状态">
            <a-select v-model="filters.overdue" placeholder="全部" allow-clear style="width: 100px">
              <a-select-option value="是">已超期</a-select-option>
              <a-select-option value="否">未超期</a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="关键词">
            <a-input v-model="filters.keyword" placeholder="诉求编号 / 事项 / 描述" allow-clear style="width: 220px" />
          </a-form-item>
        </template>
        <a-form-item>
          <div class="filter-actions">
            <a-button type="primary" @click="query"><a-icon type="search" /> 查询</a-button>
            <a-button @click="reset"><a-icon type="reload" /> 重置</a-button>
            <span class="filter-toggle" @click="expanded = !expanded">
              {{ expanded ? '收起' : '展开' }} <a-icon :type="expanded ? 'up' : 'down'" />
            </span>
          </div>
        </a-form-item>
      </a-form>
    </div>

    <div class="toolbar">
      <a-button type="primary" @click="openCreate"><a-icon type="plus" /> 新增项目诉求</a-button>
      <a-button @click="exportExcel"><a-icon type="download" /> 导出附件2</a-button>
      <a-button @click="printPdf"><a-icon type="printer" /> 打印 / PDF</a-button>
      <span class="muted toolbar-tip">一条诉求固定一个项目和一名总部帮扶责任人，该责任人同时是实际执行承办人。</span>
    </div>

    <a-table
      :columns="columns"
      :data-source="filteredAppeals"
      :pagination="pagination"
      row-key="id"
      size="middle"
      :scroll="{ x: 1280 }"
    >
      <div slot="cellTitle" slot-scope="text" class="title-cell" :title="text">{{ text }}</div>
      <div slot="plan" slot-scope="text" class="plan-cell" :title="text">{{ text }}</div>
      <div slot="due" slot-scope="text, record">
        <div class="due-cell">
          <span :class="{ 'danger-text': isOverdue(record) }">{{ text }}</span>
          <a-tag v-if="isOverdue(record)" color="red">超期</a-tag>
        </div>
      </div>
      <div slot="latest" slot-scope="text, record">
        <div class="latest-cell" :title="text">{{ text }}</div>
        <div class="latest-time muted">{{ latestTime(record) }}</div>
      </div>
      <div slot="status" slot-scope="text"><status-tag :status="text" /></div>
      <div slot="action" slot-scope="text, record" class="table-actions">
        <template v-if="record.status === '待受理'">
          <a class="link-btn" @click="acceptAppeal(record)">受理</a>
          <a-divider type="vertical" />
        </template>
        <template v-else-if="record.status === '办理中'">
          <a class="link-btn" @click="openProgress(record)">追加进展</a>
          <a-divider type="vertical" />
          <a class="link-btn" @click="openClose(record)">申请销项</a>
          <a-divider type="vertical" />
        </template>
        <template v-else-if="record.status === '销项审批中'">
          <a class="link-btn" @click="openApproval(record)">办理审批</a>
          <a-divider type="vertical" />
        </template>
        <a class="link-btn" @click="openDetail(record)">详情</a>
        <template v-if="record.status === '待受理' || record.status === '办理中'">
          <a-divider type="vertical" />
          <a class="link-btn" @click="openEdit(record)">编辑</a>
        </template>
      </div>
    </a-table>

    <!-- 新增 / 编辑 -->
    <a-modal
      :title="formMode === 'create' ? '新增项目诉求' : '编辑项目诉求'"
      :visible="formVisible"
      :width="920"
      :mask-closable="false"
      @cancel="formVisible = false"
    >
      <div class="alert-note" style="margin-bottom:14px;">
        <a-icon type="info-circle" />
        一条诉求只关联一个具体项目、一名总部帮扶责任人；责任人来自该项目有效帮扶关系，同时承担日报反馈与办理销项。
      </div>
      <a-form-model :label-col="{ span: 8 }" :wrapper-col="{ span: 16 }">
        <a-row :gutter="18">
          <a-col :span="12">
            <a-form-model-item label="所属项目" required>
              <a-select
                v-model="form.projectId"
                placeholder="请选择项目"
                :disabled="formMode === 'edit'"
                show-search
                option-filter-prop="children"
                style="width: 100%"
                @change="onProjectChange"
              >
                <a-select-option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</a-select-option>
              </a-select>
            </a-form-model-item>
          </a-col>
          <a-col :span="12">
            <a-form-model-item label="总部帮扶责任人" required>
              <a-select
                v-model="form.personId"
                placeholder="请选择责任人"
                :disabled="!form.projectId"
                show-search
                option-filter-prop="children"
                style="width: 100%"
                @change="onPersonChange"
              >
                <a-select-option v-for="p in projectPersons" :key="p.id" :value="p.id">
                  {{ p.name }}（{{ p.title }}）
                </a-select-option>
              </a-select>
              <div v-if="form.projectId && !projectPersons.length" class="form-tip danger-text">该项目暂无有效帮扶关系，请先在帮扶关系管理中配置。</div>
            </a-form-model-item>
          </a-col>
          <a-col :span="12">
            <a-form-model-item label="主责部门">
              <div class="readonly-box">{{ formDeptName || '随责任人带出' }}</div>
            </a-form-model-item>
          </a-col>
          <a-col :span="12">
            <a-form-model-item label="协同部门">
              <a-select v-model="form.coDepts" mode="multiple" placeholder="可选" :max-tag-count="2" style="width: 100%">
                <a-select-option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</a-select-option>
              </a-select>
            </a-form-model-item>
          </a-col>
          <a-col :span="24">
            <a-form-model-item label="诉求事项" :label-col="{ span: 4 }" :wrapper-col="{ span: 20 }" required>
              <a-input v-model="form.title" :max-length="80" placeholder="简明标题，如“施工许可办理后渣土准运证及土场落实”" />
            </a-form-model-item>
          </a-col>
          <a-col :span="24">
            <a-form-model-item label="具体描述" :label-col="{ span: 4 }" :wrapper-col="{ span: 20 }" required>
              <a-textarea v-model="form.desc" :rows="3" :max-length="500" placeholder="背景、问题、影响、期望结果" />
            </a-form-model-item>
          </a-col>
          <a-col :span="24">
            <a-form-model-item label="推进计划" :label-col="{ span: 4 }" :wrapper-col="{ span: 20 }" required>
              <a-textarea v-model="form.plan" :rows="3" :max-length="500" placeholder="分阶段办理措施与节点" />
            </a-form-model-item>
          </a-col>
          <a-col :span="12">
            <a-form-model-item label="完成时限" required>
              <a-date-picker v-model="form.dueDate" style="width: 100%" placeholder="请选择完成时限" />
            </a-form-model-item>
          </a-col>
          <a-col :span="12">
            <a-form-model-item label="诉求来源" required>
              <a-select v-model="form.source" placeholder="请选择来源" style="width: 100%">
                <a-select-option v-for="s in sourceOptions" :key="s" :value="s">{{ s }}</a-select-option>
              </a-select>
            </a-form-model-item>
          </a-col>
          <a-col v-if="formMode === 'edit' && dueChanged" :span="24">
            <a-form-model-item label="延期原因" :label-col="{ span: 4 }" :wrapper-col="{ span: 20 }" required>
              <a-textarea v-model="form.extendReason" :rows="2" placeholder="调整完成时限需说明延期原因" />
            </a-form-model-item>
          </a-col>
          <a-col :span="24">
            <a-form-model-item label="附件" :label-col="{ span: 4 }" :wrapper-col="{ span: 20 }">
              <file-uploader v-model="form.attachments" tip="可上传项目诉求说明材料" />
            </a-form-model-item>
          </a-col>
        </a-row>
      </a-form-model>
      <template slot="footer">
        <a-button @click="formVisible = false">关闭</a-button>
        <a-button type="primary" @click="saveAppeal">保存</a-button>
      </template>
    </a-modal>

    <!-- 追加进展 -->
    <a-modal title="追加办理进展" :visible="progressVisible" :width="620" @cancel="progressVisible = false">
      <div class="alert-note" style="margin-bottom:12px;">
        <a-icon type="info-circle" /> 此处补录的进展会写入诉求办理时间线；日常进展也可通过项目日报提交后自动回写。
      </div>
      <a-textarea v-model="progressContent" :rows="4" :max-length="300" placeholder="请输入本次办理进展" />
      <template slot="footer">
        <a-button @click="progressVisible = false">关闭</a-button>
        <a-button type="primary" @click="saveProgress">保存进展</a-button>
      </template>
    </a-modal>

    <!-- 发起销项 -->
    <a-modal title="发起诉求销项" :visible="closeVisible" :width="680" @cancel="closeVisible = false">
      <div class="alert-note warn" style="margin-bottom:12px;">
        <a-icon type="exclamation-circle" /> 请填写办结说明并上传销项附件。
      </div>
      <div class="close-field">
        <div class="form-label">办结说明 <span class="danger-text">*</span></div>
        <a-textarea v-model="closeReason" :rows="4" :max-length="500" placeholder="说明实际解决情况和办结结果" />
      </div>
      <div class="close-field">
        <div class="form-label">销项附件 <span class="danger-text">*</span></div>
        <file-uploader v-model="closeAttachments" tip="上传办结成果证明，如会议纪要、验收记录、现场照片" />
      </div>
      <template slot="footer">
        <a-button @click="closeVisible = false">关闭</a-button>
        <a-button type="primary" @click="submitClose">提交销项申请</a-button>
      </template>
    </a-modal>

    <!-- 详情 -->
    <a-modal
      :title="current ? current.title : '项目诉求详情'"
      :visible="detailVisible"
      :width="900"
      wrap-class-name="appeal-detail-modal"
      @cancel="detailVisible = false"
    >
      <template v-if="current">
        <div class="appeal-head">
          <div class="appeal-id">{{ current.id }} · {{ current.projectName }}</div>
          <status-tag :status="current.status" />
        </div>
        <div class="detail-grid">
          <div class="detail-item"><span class="detail-label">主责部门</span><span class="detail-value">{{ current.deptName }}</span></div>
          <div class="detail-item"><span class="detail-label">责任人</span><span class="detail-value">{{ current.personName }}　<span class="muted">{{ current.personPhone }}</span></span></div>
          <div class="detail-item"><span class="detail-label">完成时限</span><span class="detail-value" :class="{ 'danger-text': isOverdue(current) }">{{ current.dueDate }}<a-tag v-if="isOverdue(current)" color="red" style="margin-left:6px">超期</a-tag></span></div>
          <div class="detail-item"><span class="detail-label">诉求来源</span><span class="detail-value">{{ current.source }}</span></div>
          <div class="detail-item"><span class="detail-label">登记时间</span><span class="detail-value">{{ current.createdAt }}</span></div>
          <div class="detail-item"><span class="detail-label">受理时间</span><span class="detail-value">{{ current.acceptedAt || '待受理' }}</span></div>
          <div class="detail-item"><span class="detail-label">协同部门</span><span class="detail-value">{{ current.coDepts && current.coDepts.length ? current.coDepts.map(deptName).join('、') : '无' }}</span></div>
          <div class="detail-item"><span class="detail-label">最近反馈</span><span class="detail-value">{{ latestTime(current) }}</span></div>
          <div class="detail-item full"><span class="detail-label">具体描述</span><span class="detail-value">{{ current.desc }}</span></div>
          <div class="detail-item full"><span class="detail-label">推进计划</span><span class="detail-value">{{ current.plan }}</span></div>
          <div class="detail-item full"><span class="detail-label">最新进展</span><span class="detail-value">{{ current.latestProgress }}</span></div>
          <div class="detail-item full">
            <span class="detail-label">登记附件</span>
            <span class="detail-value">
              <span v-for="(f, i) in current.attachments" :key="i" class="file-chip"><a-icon type="paper-clip" /> {{ f.name }}</span>
              <span v-if="!current.attachments || !current.attachments.length" class="muted">无</span>
            </span>
          </div>
        </div>

        <div class="drawer-section" style="margin-top:16px;">
          <div class="drawer-section-title">办理进展时间线</div>
          <a-timeline>
            <a-timeline-item v-for="(p, index) in currentProgress" :key="index" :color="progressColor(p.source)">
              <div class="progress-head">
                <a-tag :color="sourceColor(p.source)">{{ p.source }}</a-tag>
                <span class="muted">{{ p.time }} · {{ p.operator }}</span>
              </div>
              <div class="progress-text">{{ p.content }}</div>
            </a-timeline-item>
          </a-timeline>
        </div>

        <div class="drawer-section">
          <div class="drawer-section-title">
            销项申请
            <span class="extra" v-if="current.closeRequest">{{ current.closeRequest.id }}</span>
          </div>
          <template v-if="current.closeRequest">
            <div class="detail-grid">
              <div class="detail-item"><span class="detail-label">销项状态</span><span class="detail-value"><status-tag :status="current.closeRequest.status === '已通过' ? '已销项' : (current.closeRequest.status === '审批中' ? '销项审批中' : '已退回')" :text="current.closeRequest.status" /></span></div>
              <div class="detail-item full"><span class="detail-label">办结说明</span><span class="detail-value">{{ current.closeRequest.reason }}</span></div>
              <div class="detail-item full">
                <span class="detail-label">销项附件</span>
                <span class="detail-value">
                  <span v-for="(f, i) in current.closeRequest.attachments" :key="i" class="file-chip"><a-icon type="paper-clip" /> {{ f.name }}</span>
                </span>
              </div>
            </div>
          </template>
          <div v-else class="close-empty">尚未提交销项申请。日报反馈进展不等同于销项，办理完成后需单独提交办结申请。</div>
        </div>
      </template>
      <template slot="footer">
        <a-button @click="detailVisible = false">关闭</a-button>
        <a-button v-if="current && current.status === '待受理'" type="primary" @click="acceptAppeal(current)">受理诉求</a-button>
        <a-button v-if="current && (current.status === '待受理' || current.status === '办理中')" @click="openEdit(current)">编辑</a-button>
        <a-button v-if="current && current.status === '办理中'" type="primary" ghost @click="openProgress(current)">追加进展</a-button>
        <a-button v-if="current && current.status === '办理中'" type="primary" @click="openClose(current)">申请销项</a-button>
      </template>
    </a-modal>

    <approval-modal
      :visible.sync="approvalVisible"
      title="项目诉求销项审批"
      :nodes="approvalNodes"
      :entity-desc="approvalDesc"
      @submit="handleApproval"
    />
  </div>
</template>

<script>
import moment from 'moment'
import StatusTag from '../components/StatusTag.vue'
import ApprovalModal from '../components/ApprovalModal.vue'
import FileUploader from '../components/FileUploader.vue'
import { todayStr, fmtDate, isOverdue as checkOverdue } from '../utils/date'
import { exportAppealsExcel } from '../utils/exportExcel'
import { printAppealsList } from '../utils/printReport'

export default {
  name: 'AppealsView',
  components: { StatusTag, ApprovalModal, FileUploader },
  data () {
    return {
      expanded: false,
      filters: {
        projectId: undefined,
        deptId: undefined,
        personId: undefined,
        status: undefined,
        dueRange: null,
        overdue: undefined,
        keyword: ''
      },
      applied: {
        projectId: undefined,
        deptId: undefined,
        personId: undefined,
        status: undefined,
        dueRange: null,
        overdue: undefined,
        keyword: ''
      },
      pagination: { pageSize: 10, showSizeChanger: true, showTotal: total => `共 ${total} 条`, pageSizeOptions: ['10', '20', '50'] },
      statusOptions: ['待受理', '办理中', '销项审批中', '已销项'],
      sourceOptions: ['工程部梳理', '项目反馈', '日报', '现场', '其他'],
      formVisible: false,
      formMode: 'create',
      editingId: null,
      form: {
        projectId: undefined,
        personId: undefined,
        coDepts: [],
        title: '',
        desc: '',
        plan: '',
        dueDate: null,
        source: '项目反馈',
        extendReason: '',
        attachments: []
      },
      editingDueDate: '',
      progressVisible: false,
      progressContent: '',
      progressRecord: null,
      closeVisible: false,
      closeReason: '',
      closeAttachments: [],
      closeRecord: null,
      detailVisible: false,
      current: null,
      approvalVisible: false,
      approvalRecord: null
    }
  },
  computed: {
    projects () {
      return this.$store.db.projects
    },
    departments () {
      return this.$store.db.departments
    },
    people () {
      return this.$store.db.people
    },
    projectPersons () {
      if (!this.form.projectId) return []
      return this.$store.peopleOfProject(this.form.projectId)
    },
    formDeptName () {
      if (!this.form.personId) return ''
      const person = this.$store.getPerson(this.form.personId)
      return person ? this.deptName(person.deptId) : ''
    },
    dueChanged () {
      if (this.formMode !== 'edit' || !this.form.dueDate) return false
      return fmtDate(this.form.dueDate) !== this.editingDueDate
    },
    filteredAppeals () {
      const f = this.applied
      const today = todayStr()
      let rows = this.$store.db.appeals.slice()
      if (f.projectId) rows = rows.filter(a => a.projectId === f.projectId)
      if (f.deptId) rows = rows.filter(a => a.deptId === f.deptId)
      if (f.personId) rows = rows.filter(a => a.personId === f.personId)
      if (f.status) {
        if (f.status === '在办') rows = rows.filter(a => a.status !== '已销项')
        else rows = rows.filter(a => a.status === f.status)
      }
      if (f.dueRange && f.dueRange.length === 2) {
        const start = fmtDate(f.dueRange[0])
        const end = fmtDate(f.dueRange[1])
        rows = rows.filter(a => a.dueDate >= start && a.dueDate <= end)
      }
      if (f.overdue === '是') rows = rows.filter(a => a.dueDate < today && a.status !== '已销项')
      if (f.overdue === '否') rows = rows.filter(a => !(a.dueDate < today && a.status !== '已销项'))
      if (f.keyword) {
        const kw = f.keyword.trim()
        rows = rows.filter(a => `${a.id}${a.title}${a.desc}${a.personName}${a.projectName}`.indexOf(kw) > -1)
      }
      return rows
    },
    columns () {
      return [
        { title: '序号', width: 54, align: 'center', customRender: (text, record, index) => index + 1 },
        { title: '诉求编号', dataIndex: 'id', width: 100 },
        { title: '诉求事项', dataIndex: 'title', width: 170, scopedSlots: { customRender: 'cellTitle' } },
        { title: '所属项目', dataIndex: 'projectName', width: 130 },
        { title: '主责部门', dataIndex: 'deptName', width: 115 },
        { title: '责任人', dataIndex: 'personName', width: 70 },
        { title: '推进计划', dataIndex: 'plan', width: 110, scopedSlots: { customRender: 'plan' } },
        { title: '完成时限', dataIndex: 'dueDate', width: 138, scopedSlots: { customRender: 'due' } },
        { title: '最新进展', dataIndex: 'latestProgress', width: 120, scopedSlots: { customRender: 'latest' } },
        { title: '状态', dataIndex: 'status', width: 88, scopedSlots: { customRender: 'status' } },
        { title: '操作', width: 180, scopedSlots: { customRender: 'action' } }
      ]
    },
    currentProgress () {
      if (!this.current) return []
      return this.current.progress.slice().reverse()
    },
    approvalNodes () {
      return this.approvalRecord && this.approvalRecord.closeRequest ? this.approvalRecord.closeRequest.nodes : []
    },
    approvalDesc () {
      if (!this.approvalRecord || !this.approvalRecord.closeRequest) return ''
      const a = this.approvalRecord
      return `${a.closeRequest.id} · ${a.projectName} · ${a.title}。项目经理确认办结结果后，由企划部归档并回写诉求状态。`
    }
  },
  mounted () {
    this.applyQuery()
  },
  watch: {
    '$route.query': function () {
      this.applyQuery()
    }
  },
  methods: {
    applyQuery () {
      const q = this.$route.query
      if (q.status) {
        this.filters.status = q.status
        this.applied.status = q.status
      }
      if (q.id) {
        const appeal = this.$store.db.appeals.find(a => a.id === q.id)
        if (appeal) this.openDetail(appeal)
      }
    },
    deptName (id) {
      const dept = this.$store.getDept(id)
      return dept ? dept.name : id
    },
    isOverdue (record) {
      return checkOverdue(record.dueDate, record.status)
    },
    latestTime (record) {
      if (!record.progress || !record.progress.length) return ''
      return record.progress[record.progress.length - 1].time
    },
    progressColor (source) {
      if (source === '日报') return 'green'
      if (source === '销项') return 'blue'
      if (source === '受理') return 'blue'
      return 'gray'
    },
    sourceColor (source) {
      if (source === '日报') return 'green'
      if (source === '销项') return 'blue'
      if (source === '受理') return 'cyan'
      return ''
    },
    query () {
      this.applied = { ...this.filters }
      this.pagination = { ...this.pagination, current: 1 }
    },
    reset () {
      this.filters = {
        projectId: undefined,
        deptId: undefined,
        personId: undefined,
        status: undefined,
        dueRange: null,
        overdue: undefined,
        keyword: ''
      }
      this.applied = { ...this.filters }
    },
    openCreate () {
      this.formMode = 'create'
      this.editingId = null
      this.editingDueDate = ''
      this.form = {
        projectId: undefined,
        personId: undefined,
        coDepts: [],
        title: '',
        desc: '',
        plan: '',
        dueDate: moment().add(7, 'day'),
        source: '项目反馈',
        extendReason: '',
        attachments: []
      }
      this.formVisible = true
    },
    openEdit (record) {
      this.formMode = 'edit'
      this.editingId = record.id
      this.editingDueDate = record.dueDate
      this.form = {
        projectId: record.projectId,
        personId: record.personId,
        coDepts: (record.coDepts || []).slice(),
        title: record.title,
        desc: record.desc,
        plan: record.plan,
        dueDate: record.dueDate ? moment(record.dueDate) : null,
        source: record.source,
        extendReason: '',
        attachments: (record.attachments || []).slice()
      }
      this.formVisible = true
    },
    onProjectChange (projectId) {
      if (this.form.personId && !this.projectPersons.some(p => p.id === this.form.personId)) {
        this.form.personId = undefined
      }
    },
    onPersonChange () {
      // 主责部门随责任人带出
    },
    saveAppeal () {
      if (!this.form.projectId) return this.$message.warning('请选择所属项目')
      if (!this.form.personId) return this.$message.warning('请选择总部帮扶责任人')
      if (!this.form.title || !this.form.title.trim()) return this.$message.warning('请填写诉求事项')
      if (!this.form.desc || !this.form.desc.trim()) return this.$message.warning('请填写具体描述')
      if (!this.form.plan || !this.form.plan.trim()) return this.$message.warning('请填写推进计划')
      if (!this.form.dueDate) return this.$message.warning('请选择完成时限')
      if (!this.form.source) return this.$message.warning('请选择诉求来源')
      const due = fmtDate(this.form.dueDate)
      if (this.formMode === 'create' && due < todayStr()) {
        return this.$message.warning('完成时限不得早于今天')
      }
      if (this.formMode === 'edit' && due !== this.editingDueDate && !this.form.extendReason.trim()) {
        return this.$message.warning('调整完成时限需填写延期原因')
      }
      if (this.formMode === 'edit') {
        const res = this.$store.updateAppeal(this.editingId, {
          personId: this.form.personId,
          title: this.form.title,
          desc: this.form.desc,
          plan: this.form.plan,
          dueDate: due,
          source: this.form.source,
          coDepts: this.form.coDepts,
          attachments: this.form.attachments,
          extendReason: this.form.extendReason
        })
        if (res && !res.ok) return this.$message.error(res.message)
        this.$message.success('诉求信息已更新')
      } else {
        const person = this.$store.getPerson(this.form.personId)
        this.$store.createAppeal({
          projectId: this.form.projectId,
          personId: this.form.personId,
          deptId: person.deptId,
          title: this.form.title,
          desc: this.form.desc,
          plan: this.form.plan,
          dueDate: due,
          source: this.form.source,
          coDepts: this.form.coDepts,
          attachments: this.form.attachments
        })
        this.$message.success('项目诉求已登记')
      }
      this.formVisible = false
      this.query()
    },
    acceptAppeal (record) {
      this.$confirm({
        title: '受理项目诉求',
        content: `确认受理“${record.title}”并由 ${record.personName} 跟进办理？`,
        okText: '受理',
        cancelText: '取消',
        onOk: () => {
          this.$store.acceptAppeal(record.id)
          this.$message.success('诉求已受理，状态变更为办理中')
        }
      })
    },
    openProgress (record) {
      this.progressRecord = record
      this.progressContent = ''
      this.progressVisible = true
    },
    saveProgress () {
      if (!this.progressContent.trim()) return this.$message.warning('请填写办理进展')
      this.$store.addAppealProgress(this.progressRecord.id, this.progressContent)
      this.progressVisible = false
      this.$message.success('办理进展已记录，并同步到诉求时间线')
    },
    openClose (record) {
      this.closeRecord = record
      this.closeReason = ''
      this.closeAttachments = []
      this.closeVisible = true
    },
    submitClose () {
      if (!this.closeReason.trim()) return this.$message.warning('请填写办结说明')
      if (!this.closeAttachments.length) return this.$message.warning('请上传销项附件')
      const res = this.$store.submitAppealClose(this.closeRecord.id, {
        reason: this.closeReason,
        attachments: this.closeAttachments
      })
      if (!res.ok) return this.$message.error(res.message)
      this.closeVisible = false
      this.$message.success('销项申请已提交')
    },
    openDetail (record) {
      this.current = record
      this.detailVisible = true
    },
    openApproval (record) {
      this.approvalRecord = record
      this.approvalVisible = true
    },
    handleApproval ({ action, comment }) {
      const record = this.approvalRecord
      if (!record) return
      const res = this.$store.approveAppealClose(record.id, action, comment)
      if (!res.ok) return this.$message.error(res.message)
      this.approvalVisible = false
      this.$message.success(action === 'pass' ? (record.status === '已销项' ? '销项审批通过，诉求已办结归档' : '审批节点已通过') : '销项申请已退回责任人补充材料')
    },
    exportExcel () {
      exportAppealsExcel(this.applied.projectId)
      this.$message.success('附件2 Excel 文件已生成并开始下载')
    },
    printPdf () {
      printAppealsList(this.applied.projectId)
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
.plan-cell {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.due-cell {
  display: flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
}
.latest-cell {
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 18px;
}
.latest-time {
  font-size: 11px;
  line-height: 16px;
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
.appeal-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.appeal-id {
  flex: 1;
  font-size: 13px;
  color: #5b7189;
}
.progress-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}
.progress-text {
  font-size: 12.5px;
  color: #3a4d61;
  line-height: 19px;
  margin-top: 4px;
  white-space: pre-wrap;
}
.close-empty {
  font-size: 12px;
  color: #9aabbf;
  background: #fafcfe;
  border: 1px dashed #e4eef8;
  border-radius: 3px;
  padding: 12px;
  line-height: 19px;
}
.close-field {
  margin-bottom: 14px;
}
.form-label {
  font-size: 13px;
  color: #4a5d72;
  margin-bottom: 5px;
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
