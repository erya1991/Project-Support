<template>
  <div class="works-page">
    <a-tabs v-model="activeTab">
      <a-tab-pane key="sheets">
        <span slot="tab"><a-icon type="profile" /> 部门重点工作梳理单</span>
        <div class="tab-body">
          <div class="filter-bar">
            <a-form layout="inline">
              <a-form-item label="所属体系">
                <a-select v-model="sheetFilters.system" placeholder="全部体系" allow-clear style="width: 130px">
                  <a-select-option v-for="s in systems" :key="s" :value="s">{{ s }}</a-select-option>
                </a-select>
              </a-form-item>
              <a-form-item label="归属部门">
                <a-select v-model="sheetFilters.deptId" placeholder="全部部门" allow-clear show-search option-filter-prop="children" style="width: 200px">
                  <a-select-option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</a-select-option>
                </a-select>
              </a-form-item>
              <a-form-item label="梳理单状态">
                <a-select v-model="sheetFilters.status" placeholder="全部状态" allow-clear style="width: 130px">
                  <a-select-option v-for="s in sheetStatusOptions" :key="s" :value="s">{{ s }}</a-select-option>
                </a-select>
              </a-form-item>
              <a-form-item label="关键词">
                <a-input v-model="sheetFilters.keyword" placeholder="梳理单编号 / 部门" allow-clear style="width: 190px" />
              </a-form-item>
              <a-form-item>
                <div class="filter-actions">
                  <a-button type="primary" @click="applySheetFilter"><a-icon type="search" /> 查询</a-button>
                  <a-button @click="resetSheetFilter"><a-icon type="reload" /> 重置</a-button>
                </div>
              </a-form-item>
            </a-form>
          </div>

          <div class="toolbar">
            <a-button type="primary" @click="openSheetCreate"><a-icon type="plus" /> 新建梳理单</a-button>
            <a-button @click="exportWorks"><a-icon type="download" /> 导出附件1</a-button>
            <a-button @click="printWorks"><a-icon type="printer" /> 打印 / PDF</a-button>
            <span class="muted toolbar-tip">一张梳理单只归属一个总部部门，可一次批量新增多条重点工作并整单提交创建审批。</span>
          </div>

          <a-table
            :columns="sheetColumns"
            :data-source="filteredSheets"
            :pagination="sheetPagination"
            row-key="id"
            size="middle"
            :scroll="{ x: 1250 }"
          >
            <div slot="remark" slot-scope="text" class="cell-ellipsis" :title="text">{{ text }}</div>
            <div slot="itemCount" slot-scope="text">{{ text.length }}</div>
            <div slot="status" slot-scope="text"><status-tag :status="text" /></div>
            <div slot="action" slot-scope="text, record" class="table-actions">
              <template v-if="record.status === '草稿' || record.status === '已退回'">
                <a class="link-btn" @click="openSheetEdit(record)">编辑</a>
                <a-divider type="vertical" />
                <a class="link-btn" @click="submitSheet(record)">提交审批</a>
                <a-divider type="vertical" />
              </template>
              <template v-else-if="record.status === '审核中'">
                <a class="link-btn" @click="openSheetApproval(record)">审批</a>
                <a-divider type="vertical" />
              </template>
              <a class="link-btn" @click="openSheetDetail(record)">详情</a>
              <template v-if="record.status === '已生效'">
                <a-divider type="vertical" />
                <a class="link-btn" @click="viewSheetWorks(record)">查看事项</a>
              </template>
            </div>
          </a-table>
        </div>
      </a-tab-pane>

      <a-tab-pane key="works">
        <span slot="tab"><a-icon type="solution" /> 重点工作事项</span>
        <div class="tab-body">
          <div class="filter-bar">
            <a-form layout="inline">
              <a-form-item label="所属体系">
                <a-select v-model="workFilters.system" placeholder="全部体系" allow-clear style="width: 130px">
                  <a-select-option v-for="s in systems" :key="s" :value="s">{{ s }}</a-select-option>
                </a-select>
              </a-form-item>
              <a-form-item label="归属部门">
                <a-select v-model="workFilters.deptId" placeholder="全部部门" allow-clear show-search option-filter-prop="children" style="width: 200px">
                  <a-select-option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</a-select-option>
                </a-select>
              </a-form-item>
              <a-form-item label="工作状态">
                <a-select v-model="workFilters.status" placeholder="全部状态" allow-clear style="width: 130px">
                  <a-select-option v-for="s in workStatusOptions" :key="s" :value="s">{{ s }}</a-select-option>
                </a-select>
              </a-form-item>
              <a-form-item label="关键词">
                <a-input v-model="workFilters.keyword" placeholder="事项编号 / 工作内容 / 牵头人" allow-clear style="width: 220px" />
              </a-form-item>
              <a-form-item>
                <div class="filter-actions">
                  <a-button type="primary" @click="applyWorkFilter"><a-icon type="search" /> 查询</a-button>
                  <a-button @click="resetWorkFilter"><a-icon type="reload" /> 重置</a-button>
                </div>
              </a-form-item>
            </a-form>
          </div>

          <div class="toolbar">
            <a-button type="primary" @click="exportWorks"><a-icon type="download" /> 导出附件1</a-button>
            <a-button @click="printWorks"><a-icon type="printer" /> 打印 / PDF</a-button>
            <span class="muted toolbar-tip">可直接在事项列表填写项目级或公司级执行情况，并按单条事项申请销项。</span>
          </div>

          <a-table
            :columns="workColumns"
            :data-source="filteredWorks"
            :pagination="workPagination"
            row-key="id"
            size="middle"
            :scroll="{ x: 1245 }"
          >
            <div slot="cellTitle" slot-scope="text" class="work-title-cell" :title="text">{{ text }}</div>
            <div slot="projectCount" slot-scope="text, record" class="project-count-cell">{{ projectCountText(record) }}</div>
            <div slot="progress" slot-scope="text, record" class="progress-cell">
              <div class="progress-scope">{{ scopeText(record) }}</div>
              <div v-if="record.executions && record.executions.length" class="muted progress-summary">{{ resultSummary(record) }}</div>
            </div>
            <div slot="status" slot-scope="text"><status-tag :status="text" /></div>
            <div slot="action" slot-scope="text, record" class="table-actions">
              <template v-if="record.status === '落实中'">
                <a class="link-btn" @click="openExec(record)">填写执行情况</a>
                <a-divider type="vertical" />
                <a class="link-btn" @click="openClose(record)">申请销项</a>
                <a-divider type="vertical" />
              </template>
              <template v-else-if="record.status === '销项审批中'">
                <a class="link-btn" @click="openCloseApproval(record)">查看审批</a>
                <a-divider type="vertical" />
              </template>
              <a class="link-btn" @click="openWorkDetail(record)">详情</a>
            </div>
          </a-table>
        </div>
      </a-tab-pane>
    </a-tabs>

    <!-- 新建/编辑梳理单 -->
    <a-modal
      :title="sheetFormMode === 'create' ? '新建部门重点工作梳理单' : '编辑部门重点工作梳理单'"
      :visible="sheetFormVisible"
      :width="1180"
      :mask-closable="false"
      @cancel="sheetFormVisible = false"
    >
      <div class="alert-note" style="margin-bottom:14px;">
        <a-icon type="info-circle" />
        一张梳理单只归属一个总部部门，可一次批量新增多条重点工作。
      </div>
      <a-form-model :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }" class="sheet-form">
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-model-item label="所属体系" required>
              <a-select v-model="sheetForm.system" placeholder="请选择体系" style="width: 100%" @change="onSystemChange">
                <a-select-option v-for="s in systems" :key="s" :value="s">{{ s }}</a-select-option>
              </a-select>
            </a-form-model-item>
          </a-col>
          <a-col :span="8">
            <a-form-model-item label="归属部门" required>
              <a-select
                v-model="sheetForm.deptId"
                placeholder="请选择部门"
                :disabled="sheetFormMode === 'edit'"
                show-search
                option-filter-prop="children"
                style="width: 100%"
                @change="onSheetDeptChange"
              >
                <a-select-option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</a-select-option>
              </a-select>
            </a-form-model-item>
          </a-col>
          <a-col :span="8">
            <a-form-model-item label="填报人 / 日期">
              <div class="readonly-box">叶清和　{{ today }}</div>
            </a-form-model-item>
          </a-col>
          <a-col :span="24">
            <a-form-model-item label="创建说明" :label-col="{ span: 2 }" :wrapper-col="{ span: 22 }">
              <a-textarea v-model="sheetForm.remark" :rows="2" :max-length="200" placeholder="本批工作来源及说明，用于会审解释" />
            </a-form-model-item>
          </a-col>
        </a-row>
      </a-form-model>

      <div class="items-head">
        <span class="items-title">重点工作明细 <span class="muted">（{{ sheetForm.items.length }} 条）</span></span>
        <a-button size="small" type="primary" ghost @click="addSheetItem"><a-icon type="plus" /> 新增行</a-button>
      </div>

      <a-table
        :columns="sheetItemColumns"
        :data-source="sheetForm.items"
        :pagination="false"
        size="small"
        bordered
        row-key="_key"
        :scroll="{ x: 1100 }"
      >
        <div slot="titleCell" slot-scope="text, record">
          <a-textarea v-model="record.title" :rows="2" :max-length="200" placeholder="请输入单条重点工作内容" />
        </div>
        <div slot="leadCell" slot-scope="text, record">
          <a-select v-model="record.leadId" placeholder="选择牵头人" show-search option-filter-prop="children" style="width: 100%">
            <a-select-option v-for="p in leadOptions" :key="p.id" :value="p.id">{{ p.name }}</a-select-option>
          </a-select>
        </div>
        <div slot="resultCell" slot-scope="text, record">
          <span class="muted">待落实</span>
          <div class="cell-tip">生效后由执行记录汇总</div>
        </div>
        <div slot="problemCell" slot-scope="text, record">
          <a-input v-model="record.problem" placeholder="当前工作存在的问题" />
        </div>
        <div slot="suggestionCell" slot-scope="text, record">
          <a-input v-model="record.suggestion" placeholder="处理建议" />
        </div>
        <div slot="rowAction" slot-scope="text, record, index">
          <div class="row-actions">
            <a class="link-btn" @click="copySheetItem(index)">复制</a>
            <a-divider type="vertical" />
            <a class="link-btn danger" :class="{ disabled: sheetForm.items.length <= 1 }" @click="removeSheetItem(index)">删除</a>
          </div>
        </div>
      </a-table>

      <template slot="footer">
        <a-button @click="sheetFormVisible = false">关闭</a-button>
        <a-button type="primary" @click="saveSheet(false)">保存</a-button>
      </template>
    </a-modal>

    <a-modal
      title="部门重点工作梳理单详情"
      :visible="sheetDetailVisible"
      :width="1000"
      @cancel="sheetDetailVisible = false"
    >
      <template v-if="sheetCurrent">
        <div class="detail-grid">
          <div class="detail-item"><span class="detail-label">梳理单编号</span><span class="detail-value">{{ sheetCurrent.id }}</span></div>
          <div class="detail-item"><span class="detail-label">梳理单状态</span><span class="detail-value"><status-tag :status="sheetCurrent.status" /></span></div>
          <div class="detail-item"><span class="detail-label">所属体系</span><span class="detail-value">{{ sheetCurrent.system }}</span></div>
          <div class="detail-item"><span class="detail-label">归属部门</span><span class="detail-value">{{ sheetCurrent.deptName }}</span></div>
          <div class="detail-item"><span class="detail-label">填报人</span><span class="detail-value">{{ sheetCurrent.creatorName }}</span></div>
          <div class="detail-item"><span class="detail-label">填报日期</span><span class="detail-value">{{ sheetCurrent.createDate }}</span></div>
          <div class="detail-item full"><span class="detail-label">创建说明</span><span class="detail-value">{{ sheetCurrent.remark || '—' }}</span></div>
        </div>

        <div class="drawer-section" style="margin-top:16px;">
          <div class="drawer-section-title">重点工作明细（{{ sheetCurrent.items.length }} 条）</div>
          <a-table
            :columns="sheetDetailColumns"
            :data-source="sheetCurrent.items"
            :pagination="false"
            size="small"
            row-key="id"
            :scroll="{ x: 900 }"
          >
            <div slot="statusCol">
              <status-tag :status="sheetCurrent.status === '已生效' ? '落实中' : (sheetCurrent.status === '已退回' ? '已退回' : '待生效')" />
            </div>
          </a-table>
        </div>
      </template>
      <template slot="footer">
        <a-button @click="sheetDetailVisible = false">关闭</a-button>
      </template>
    </a-modal>

    <!-- 重点工作详情 / 执行 / 销项 -->
    <a-modal
      :title="workDrawerTitle"
      :visible="workDrawerVisible"
      :width="1100"
      wrap-class-name="work-detail-modal"
      @cancel="closeWorkDrawer"
    >
      <template v-if="workCurrent">
        <div class="work-head">
          <div class="work-head-title">{{ workCurrent.title }}</div>
          <status-tag :status="workCurrent.status" />
        </div>
        <div class="detail-grid">
          <div class="detail-item"><span class="detail-label">事项编号</span><span class="detail-value">{{ workCurrent.id }}</span></div>
          <div class="detail-item"><span class="detail-label">所属体系</span><span class="detail-value">{{ workCurrent.system }}</span></div>
          <div class="detail-item"><span class="detail-label">归属部门</span><span class="detail-value">{{ workCurrent.deptName }}</span></div>
          <div class="detail-item"><span class="detail-label">工作牵头人</span><span class="detail-value">{{ workCurrent.leadName }}</span></div>
          <div class="detail-item full"><span class="detail-label">存在问题</span><span class="detail-value">{{ workCurrent.problem || '—' }}</span></div>
          <div class="detail-item full"><span class="detail-label">改进建议</span><span class="detail-value">{{ workCurrent.suggestion || '—' }}</span></div>
        </div>

        <div class="drawer-section" style="margin-top:16px;">
          <div class="drawer-section-title">
            执行情况
            <span class="extra">{{ scopeText(workCurrent) }}</span>
          </div>

          <template v-if="workDrawerMode === 'exec'">
            <div class="alert-note" style="margin-bottom:12px;">
              <a-icon type="info-circle" />
              选择“项目级”时按项目分别填报执行情况，每个项目一名跟进人；选择“公司级”时不关联项目，填写总体执行情况。
            </div>
            <a-radio-group v-model="execScope" class="scope-radio" @change="onScopeChange">
              <a-radio-button value="project">项目级</a-radio-button>
              <a-radio-button value="company">公司级 / 业务线级</a-radio-button>
            </a-radio-group>

            <template v-if="execScope === 'project'">
              <div class="exec-field">
                <div class="form-label">关联项目 <span class="danger-text">*</span></div>
                <a-select
                  v-model="selectedProjectIds"
                  mode="multiple"
                  placeholder="选择本项目工作的关联项目，可多选"
                  :max-tag-count="4"
                  show-search
                  option-filter-prop="children"
                  style="width: 100%"
                  @change="syncProjectRows"
                >
                  <a-select-option v-for="p in projectOptions" :key="p.id" :value="p.id">{{ p.name }}</a-select-option>
                </a-select>
                <div class="form-tip">项目范围取自本部门服务人员、工作牵头人及本人的有效帮扶关系。</div>
              </div>
              <div v-if="!execRows.length" class="exec-empty">请选择至少一个关联项目</div>
              <div v-for="row in execRows" :key="row.projectId" class="exec-project-card">
                <div class="exec-project-head">
                  <span class="exec-project-name"><a-icon type="project" /> {{ row.projectName }}</span>
                  <span class="muted">项目跟进人：{{ row.personName }}</span>
                  <a class="link-btn" @click="removeProjectRow(row.projectId)">移除</a>
                </div>
                <a-textarea
                  v-model="row.content"
                  :rows="3"
                  :max-length="500"
                  placeholder="填写该项目落实本项工作的具体进展、成果及下一步安排"
                />
                <file-uploader v-model="row.attachments" tip="可上传现场照片、会议纪要等佐证材料" />
              </div>
            </template>

            <template v-else>
              <div class="exec-field">
                <div class="form-label">总体执行情况 <span class="danger-text">*</span></div>
                <a-textarea
                  v-model="companyContent"
                  :rows="4"
                  :max-length="800"
                  placeholder="填写公司级/业务线级总体推进情况、成果及下一步安排"
                />
              </div>
              <file-uploader v-model="companyAttachments" tip="可上传相关佐证材料" />
            </template>
          </template>

          <template v-else>
            <div v-if="workCurrent.executions.length" class="exec-list">
              <div v-for="exec in workCurrent.executions" :key="exec.id" class="exec-item">
                <div class="exec-item-head">
                  <span class="exec-item-scope">
                    {{ exec.scope === 'company' ? '公司级 / 业务线级' : exec.projectName }}
                  </span>
                  <span class="muted">跟进人：{{ exec.personName }}　更新于 {{ exec.updatedAt }}</span>
                </div>
                <div class="exec-item-content">{{ execDisplay(exec) }}</div>
                <div v-if="exec.attachments && exec.attachments.length" class="exec-files">
                  <span v-for="(f, i) in exec.attachments" :key="i" class="file-chip"><a-icon type="paper-clip" /> {{ f.name }}</span>
                </div>
              </div>
            </div>
            <div v-else class="exec-empty">尚未填写执行情况</div>
          </template>
        </div>

        <div class="drawer-section">
          <div class="drawer-section-title">
            销项申请
            <span class="extra" v-if="workCurrent.closeRequest">{{ workCurrent.closeRequest.id }}</span>
          </div>

          <template v-if="workDrawerMode === 'close' && workCurrent.status === '落实中'">
            <div class="alert-note warn" style="margin-bottom:12px;">
              <a-icon type="exclamation-circle" /> 请填写办结说明并上传佐证材料。
            </div>
            <div class="exec-field">
              <div class="form-label">关联执行范围 <span class="danger-text">*</span></div>
              <a-checkbox-group v-model="closeExecutionIds" class="exec-check-group">
                <a-checkbox v-for="exec in workCurrent.executions" :key="exec.id" :value="exec.id" class="exec-check-item">
                  <b>{{ exec.scope === 'company' ? '公司级总体执行' : exec.projectName }}</b>
                  <span class="muted">　{{ execDisplay(exec).slice(0, 50) }}{{ execDisplay(exec).length > 50 ? '…' : '' }}</span>
                </a-checkbox>
              </a-checkbox-group>
            </div>
            <div class="exec-field">
              <div class="form-label">办结说明 <span class="danger-text">*</span></div>
              <a-textarea v-model="closeReason" :rows="4" :max-length="500" placeholder="说明工作达到的结果、完成情况" />
            </div>
            <div class="exec-field">
              <div class="form-label">佐证附件 <span class="danger-text">*</span></div>
              <file-uploader v-model="closeAttachments" tip="销项时须上传完成情况说明、现场照片等证明材料" />
            </div>
          </template>

          <template v-else-if="workCurrent.closeRequest">
            <div class="detail-grid">
              <div class="detail-item"><span class="detail-label">申请编号</span><span class="detail-value">{{ workCurrent.closeRequest.id }}</span></div>
              <div class="detail-item"><span class="detail-label">销项状态</span><span class="detail-value"><status-tag :status="workCurrent.closeRequest.status === '已通过' ? '已销项' : (workCurrent.closeRequest.status === '审批中' ? '销项审批中' : '已退回')" :text="workCurrent.closeRequest.status" /></span></div>
              <div class="detail-item full"><span class="detail-label">办结说明</span><span class="detail-value">{{ workCurrent.closeRequest.reason }}</span></div>
              <div class="detail-item full">
                <span class="detail-label">佐证附件</span>
                <span class="detail-value">
                  <span v-for="(f, i) in workCurrent.closeRequest.attachments" :key="i" class="file-chip"><a-icon type="paper-clip" /> {{ f.name }}</span>
                </span>
              </div>
            </div>
          </template>

          <template v-else>
            <div class="exec-empty">
              尚未提交销项申请{{ workCurrent.status === '落实中' ? '，填写执行情况后可申请销项。' : '。' }}
            </div>
          </template>
        </div>
      </template>
      <template slot="footer">
        <a-button @click="closeWorkDrawer">关闭</a-button>
        <template v-if="workCurrent">
          <template v-if="workDrawerMode === 'exec'">
            <a-button @click="workDrawerMode = 'view'">取消</a-button>
            <a-button type="primary" @click="saveExec">保存执行情况</a-button>
          </template>
          <template v-else-if="workDrawerMode === 'close'">
            <a-button @click="workDrawerMode = 'view'">取消</a-button>
            <a-button type="primary" @click="submitClose">提交销项申请</a-button>
          </template>
          <template v-else>
            <a-button v-if="workCurrent.status === '落实中'" type="primary" ghost @click="startExecFromView">填写执行情况</a-button>
            <a-button v-if="workCurrent.status === '落实中'" type="primary" @click="startCloseFromView">申请销项</a-button>
          </template>
        </template>
      </template>
    </a-modal>

    <approval-modal
      :visible.sync="sheetApprovalVisible"
      title="部门重点工作创建审批"
      :nodes="sheetApprovalNodes"
      :entity-desc="sheetApprovalDesc"
      @submit="handleSheetApproval"
    />

    <approval-modal
      :visible.sync="workApprovalVisible"
      title="重点工作单项销项审批"
      :nodes="workApprovalNodes"
      :entity-desc="workApprovalDesc"
      @submit="handleWorkApproval"
    />
  </div>
</template>

<script>
import StatusTag from '../components/StatusTag.vue'
import ApprovalModal from '../components/ApprovalModal.vue'
import FileUploader from '../components/FileUploader.vue'
import { todayStr } from '../utils/date'
import { exportWorksExcel } from '../utils/exportExcel'
import { printWorksList } from '../utils/printReport'
import { workResultText } from '../utils/reportData'

function newSheetItem (deptId) {
  return {
    _key: `row_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    title: '',
    leadId: undefined,
    problem: '',
    suggestion: '',
    deptId
  }
}

export default {
  name: 'WorksView',
  components: { StatusTag, ApprovalModal, FileUploader },
  data () {
    return {
      activeTab: 'sheets',
      today: todayStr(),
      systems: [],
      sheetFilters: { system: undefined, deptId: undefined, status: undefined, keyword: '' },
      appliedSheet: { system: undefined, deptId: undefined, status: undefined, keyword: '' },
      workFilters: { system: undefined, deptId: undefined, status: undefined, keyword: '' },
      appliedWork: { system: undefined, deptId: undefined, status: undefined, keyword: '' },
      sheetStatusOptions: ['草稿', '审核中', '已生效', '已退回'],
      workStatusOptions: ['待生效', '落实中', '销项审批中', '已销项'],
      sheetPagination: { pageSize: 10, showSizeChanger: true, showTotal: total => `共 ${total} 条`, pageSizeOptions: ['10', '20', '50'] },
      workPagination: { pageSize: 10, showSizeChanger: true, showTotal: total => `共 ${total} 条`, pageSizeOptions: ['10', '20', '50'] },

      sheetFormVisible: false,
      sheetFormMode: 'create',
      sheetForm: { id: null, deptId: undefined, system: '', remark: '', items: [] },
      sheetItemColumns: [],
      sheetDetailVisible: false,
      sheetCurrent: null,
      sheetApprovalVisible: false,
      sheetApprovalRecord: null,

      workDrawerVisible: false,
      workCurrent: null,
      workDrawerMode: 'view',
      execScope: 'project',
      selectedProjectIds: [],
      execRows: [],
      companyContent: '',
      companyAttachments: [],
      closeReason: '',
      closeAttachments: [],
      closeExecutionIds: [],
      workApprovalVisible: false,
      workApprovalRecord: null
    }
  },
  computed: {
    departments () {
      return this.$store.db.departments
    },
    leadOptions () {
      if (!this.sheetForm.deptId) return []
      return this.$store.staffOfDept(this.sheetForm.deptId)
    },
    filteredSheets () {
      const f = this.appliedSheet
      return this.$store.db.sheets.filter(s => {
        if (f.system && s.system !== f.system) return false
        if (f.deptId && s.deptId !== f.deptId) return false
        if (f.status && s.status !== f.status) return false
        if (f.keyword) {
          const kw = f.keyword.trim()
          if (`${s.id}${s.deptName}${s.creatorName}`.indexOf(kw) === -1) return false
        }
        return true
      })
    },
    sheetColumns () {
      return [
        { title: '序号', width: 54, align: 'center', customRender: (text, record, index) => index + 1 },
        { title: '梳理单编号', dataIndex: 'id', width: 118 },
        { title: '体系', dataIndex: 'system', width: 78 },
        { title: '归属部门', dataIndex: 'deptName', width: 176 },
        { title: '重点工作数', dataIndex: 'items', width: 92, align: 'center', scopedSlots: { customRender: 'itemCount' } },
        { title: '填报人', dataIndex: 'creatorName', width: 84 },
        { title: '填报日期', dataIndex: 'createDate', width: 106 },
        { title: '创建说明', dataIndex: 'remark', width: 250, scopedSlots: { customRender: 'remark' } },
        { title: '梳理单状态', dataIndex: 'status', width: 96, scopedSlots: { customRender: 'status' } },
        { title: '操作', width: 190, scopedSlots: { customRender: 'action' } }      ]
    },
    filteredWorks () {
      const f = this.appliedWork
      return this.$store.db.works.filter(w => {
        if (f.system && w.system !== f.system) return false
        if (f.deptId && w.deptId !== f.deptId) return false
        if (f.status && w.status !== f.status) return false
        if (f.keyword) {
          const kw = f.keyword.trim()
          if (`${w.id}${w.title}${w.leadName}${w.deptName}`.indexOf(kw) === -1) return false
        }
        return true
      })
    },
    workColumns () {
      return [
        { title: '序号', width: 54, align: 'center', customRender: (text, record, index) => index + 1 },
        { title: '事项编号', dataIndex: 'id', width: 104 },
        { title: '体系', dataIndex: 'system', width: 66 },
        { title: '部门', dataIndex: 'deptName', width: 150 },
        { title: '重点工作', dataIndex: 'title', width: 240, scopedSlots: { customRender: 'cellTitle' } },
        { title: '牵头人', dataIndex: 'leadName', width: 74 },
        { title: '关联项目', dataIndex: 'executions', key: 'projectCount', width: 90, align: 'center', scopedSlots: { customRender: 'projectCount' } },
        { title: '落实进展', dataIndex: 'executions', key: 'progress', width: 170, scopedSlots: { customRender: 'progress' } },
        { title: '状态', dataIndex: 'status', width: 92, scopedSlots: { customRender: 'status' } },
        { title: '操作', width: 200, scopedSlots: { customRender: 'action' } }
      ]
    },
    sheetDetailColumns () {
      return [
        { title: '序号', dataIndex: 'seq', width: 56, align: 'center' },
        { title: '重点工作', dataIndex: 'title', width: 300 },
        { title: '工作牵头人', dataIndex: 'leadName', width: 100 },
        { title: '存在问题', dataIndex: 'problem', width: 220 },
        { title: '改进建议', dataIndex: 'suggestion', width: 220 },
        { title: '状态', width: 90, scopedSlots: { customRender: 'statusCol' } }
      ]
    },
    projectOptions () {
      const work = this.workCurrent
      if (!work) return []
      const allowed = new Set()
      const deptStaff = new Set(this.$store.staffOfDept(work.deptId).map(p => p.id))
      this.$store.db.relations.filter(r => r.status === '已生效').forEach(r => {
        if (r.personId === work.leadId || deptStaff.has(r.personId) || r.personId === this.$store.currentUser.id) {
          allowed.add(r.projectId)
        }
      });
      (work.executions || []).forEach(e => { if (e.projectId) allowed.add(e.projectId) })
      if (!allowed.size) this.$store.db.projects.forEach(p => allowed.add(p.id))
      return this.$store.db.projects.filter(p => allowed.has(p.id))
    },
    workDrawerTitle () {
      if (!this.workCurrent) return '重点工作'
      const map = { view: '重点工作详情', exec: '填写执行情况', close: '申请销项' }
      return `${map[this.workDrawerMode] || '重点工作详情'} · ${this.workCurrent.id}`
    },
    sheetApprovalNodes () {
      return this.sheetApprovalRecord ? this.sheetApprovalRecord.approvals : []
    },
    sheetApprovalDesc () {
      if (!this.sheetApprovalRecord) return ''
      const sheet = this.sheetApprovalRecord
      return `${sheet.id} · ${sheet.deptName} · 共 ${sheet.items.length} 条重点工作。审批通过后本批明细逐项生效。`
    },
    workApprovalNodes () {
      return this.workApprovalRecord && this.workApprovalRecord.closeRequest ? this.workApprovalRecord.closeRequest.nodes : []
    },
    workApprovalDesc () {
      if (!this.workApprovalRecord || !this.workApprovalRecord.closeRequest) return ''
      const w = this.workApprovalRecord
      return `${w.closeRequest.id} · ${w.deptName} · ${w.title}。项目级执行结果由各项目经理分别确认，公司级无项目时直接由部门负责人审核、企划归档。`
    }
  },
  created () {
    this.systems = this.$store.db.systems
    this.sheetItemColumns = [
      { title: '序号', dataIndex: '_key', width: 52, align: 'center', customRender: (text, record, index) => index + 1 },
      { title: '重点工作', width: 300, scopedSlots: { customRender: 'titleCell' } },
      { title: '工作牵头人', width: 130, scopedSlots: { customRender: 'leadCell' } },
      { title: '项目落实情况', width: 130, scopedSlots: { customRender: 'resultCell' } },
      { title: '存在问题', width: 200, scopedSlots: { customRender: 'problemCell' } },
      { title: '改进建议', width: 200, scopedSlots: { customRender: 'suggestionCell' } },
      { title: '操作', width: 88, scopedSlots: { customRender: 'rowAction' } }
    ]
    this.watchQuery()
  },
  watch: {
    '$route.query': function () {
      this.watchQuery()
    }
  },
  methods: {
    watchQuery () {
      const tab = this.$route.query.tab
      if (tab === 'works' || tab === 'sheets') this.activeTab = tab
      if (this.$route.query.deptId) {
        this.workFilters.deptId = this.$route.query.deptId
        this.applyWorkFilter()
      }
      if (this.$route.query.status) {
        this.workFilters.status = this.$route.query.status
        this.applyWorkFilter()
      }
    },
    resultSummary (work) {
      if (!work.executions || !work.executions.length) return '待落实'
      const exec = work.executions[0]
      return this.execDisplay(exec)
    },
    projectCountText (work) {
      if (!work.executions || !work.executions.length) return '待落实'
      const projects = work.executions.filter(e => e.scope === 'project')
      if (!projects.length) return '公司级'
      return `${projects.length} 个`
    },
    execDisplay (exec) {
      if (!exec) return ''
      const content = exec.content || ''
      if (!exec.projectName) return content
      const prefix = `${exec.projectName}：`
      const prefix2 = `${exec.projectName}:`
      if (content.indexOf(prefix) === 0) return content.slice(prefix.length)
      if (content.indexOf(prefix2) === 0) return content.slice(prefix2.length)
      return content
    },
    scopeText (work) {
      const projects = (work.executions || []).filter(e => e.scope === 'project')
      if (!work.executions || !work.executions.length) return '待落实'
      if (!projects.length) return '公司级 / 业务线级 · 不关联项目'
      return `${projects.length} 个项目：${projects.map(p => p.projectName).join('、')}`
    },
    applySheetFilter () {
      this.appliedSheet = { ...this.sheetFilters }
      this.sheetPagination = { ...this.sheetPagination, current: 1 }
    },
    resetSheetFilter () {
      this.sheetFilters = { system: undefined, deptId: undefined, status: undefined, keyword: '' }
      this.applySheetFilter()
    },
    applyWorkFilter () {
      this.appliedWork = { ...this.workFilters }
      this.workPagination = { ...this.workPagination, current: 1 }
    },
    resetWorkFilter () {
      this.workFilters = { system: undefined, deptId: undefined, status: undefined, keyword: '' }
      this.applyWorkFilter()
    },
    onSystemChange () {
      // 体系与部门联动：选择体系后提示按部门确认归属
      if (this.sheetForm.deptId) {
        const dept = this.$store.getDept(this.sheetForm.deptId)
        if (dept && dept.system !== this.sheetForm.system) {
          this.sheetForm.deptId = undefined
        }
      }
    },
    onSheetDeptChange (deptId) {
      const dept = this.$store.getDept(deptId)
      if (dept) this.sheetForm.system = dept.system
      const validIds = this.leadOptions.map(p => p.id)
      this.sheetForm.items.forEach(item => {
        if (item.leadId && validIds.indexOf(item.leadId) === -1) item.leadId = undefined
      })
    },
    openSheetCreate () {
      this.sheetFormMode = 'create'
      this.sheetForm = {
        id: null,
        deptId: undefined,
        system: '',
        remark: '',
        items: [newSheetItem()]
      }
      this.sheetFormVisible = true
    },
    openSheetEdit (sheet) {
      this.sheetFormMode = 'edit'
      this.sheetForm = {
        id: sheet.id,
        deptId: sheet.deptId,
        system: sheet.system,
        remark: sheet.remark,
        items: sheet.items.map(item => ({
          _key: `row_${item.id || Date.now()}_${Math.random()}`,
          title: item.title,
          leadId: item.leadId,
          problem: item.problem,
          suggestion: item.suggestion,
          deptId: sheet.deptId
        }))
      }
      this.sheetFormVisible = true
    },
    addSheetItem () {
      this.sheetForm.items.push(newSheetItem(this.sheetForm.deptId))
    },
    copySheetItem (index) {
      const source = this.sheetForm.items[index]
      this.sheetForm.items.splice(index + 1, 0, {
        ...source,
        _key: `row_${Date.now()}_${Math.floor(Math.random() * 10000)}`
      })
    },
    removeSheetItem (index) {
      if (this.sheetForm.items.length <= 1) {
        this.$message.warning('至少保留一条重点工作')
        return
      }
      this.sheetForm.items.splice(index, 1)
    },
    saveSheet (submit) {
      if (!this.sheetForm.deptId) return this.$message.warning('请选择归属部门')
      if (!this.sheetForm.system) return this.$message.warning('请选择所属体系')
      if (!this.sheetForm.items.length) return this.$message.warning('请至少添加一条重点工作')
      for (let i = 0; i < this.sheetForm.items.length; i++) {
        const item = this.sheetForm.items[i]
        if (!item.title || !item.title.trim()) return this.$message.warning(`第 ${i + 1} 条重点工作内容不能为空`)
        if (!item.leadId) return this.$message.warning(`第 ${i + 1} 条重点工作请选择工作牵头人`)
      }
      const sheet = this.$store.saveSheet({
        id: this.sheetForm.id,
        deptId: this.sheetForm.deptId,
        system: this.sheetForm.system,
        remark: this.sheetForm.remark,
        items: this.sheetForm.items
      }, submit)
      this.sheetFormVisible = false
      this.$message.success(submit ? `梳理单 ${sheet.id} 已提交创建审批` : '梳理单草稿已保存')
      this.applySheetFilter()
    },
    submitSheet (sheet) {
      this.$confirm({
        title: '提交创建审批',
        content: `将梳理单 ${sheet.id}（${sheet.items.length} 条重点工作）提交部门负责人、企划部审核，确认提交？`,
        okText: '提交',
        cancelText: '取消',
        onOk: () => {
          const res = this.$store.submitSheetById(sheet.id)
          if (!res.ok) return this.$message.error(res.message)
          this.$message.success('已提交创建审批')
          this.sheetDetailVisible = false
        }
      })
    },
    openSheetDetail (sheet) {
      this.sheetCurrent = sheet
      this.sheetDetailVisible = true
    },
    openSheetApproval (sheet) {
      this.sheetApprovalRecord = sheet
      this.sheetApprovalVisible = true
    },
    handleSheetApproval ({ action, comment }) {
      const sheet = this.sheetApprovalRecord
      if (!sheet) return
      const res = this.$store.approveSheet(sheet.id, action, comment)
      if (!res.ok) return this.$message.error(res.message)
      this.sheetApprovalVisible = false
      this.$message.success(action === 'pass' ? (sheet.status === '已生效' ? '创建审批已通过，本批重点工作已生效' : '审批节点已通过') : '创建审批已退回')
      this.sheetDetailVisible = false
    },
    viewSheetWorks (sheet) {
      this.activeTab = 'works'
      this.workFilters = { system: sheet.system, deptId: sheet.deptId, status: undefined, keyword: '' }
      this.applyWorkFilter()
    },
    exportWorks () {
      exportWorksExcel()
      this.$message.success('附件1 Excel 文件已生成并开始下载')
    },
    printWorks () {
      printWorksList()
    },
    openWorkDetail (work) {
      this.workCurrent = work
      this.workDrawerMode = 'view'
      this.workDrawerVisible = true
    },
    openExec (work) {
      this.workCurrent = work
      this.workDrawerMode = 'exec'
      this.initExecForm(work)
      this.workDrawerVisible = true
    },
    openClose (work) {
      this.workCurrent = work
      if (!work.executions || !work.executions.length) {
        this.$message.warning('请先填写执行情况，再申请销项')
        this.openExec(work)
        return
      }
      this.workDrawerMode = 'close'
      this.closeReason = ''
      this.closeAttachments = []
      this.closeExecutionIds = work.executions.map(e => e.id)
      this.workDrawerVisible = true
    },
    openCloseApproval (work) {
      if (!work.closeRequest) return
      this.workApprovalRecord = work
      this.workApprovalVisible = true
    },
    closeWorkDrawer () {
      this.workDrawerVisible = false
      this.workCurrent = null
      this.workDrawerMode = 'view'
    },
    initExecForm (work) {
      const projectExecs = (work.executions || []).filter(e => e.scope === 'project')
      const companyExec = (work.executions || []).find(e => e.scope === 'company')
      this.execScope = projectExecs.length || !companyExec ? 'project' : 'company'
      this.selectedProjectIds = projectExecs.map(e => e.projectId)
      this.execRows = projectExecs.map(e => ({
        projectId: e.projectId,
        projectName: e.projectName,
        personId: e.personId,
        personName: e.personName,
        content: this.execDisplay(e),
        attachments: (e.attachments || []).slice()
      }))
      this.companyContent = companyExec ? companyExec.content : ''
      this.companyAttachments = companyExec ? (companyExec.attachments || []).slice() : []
    },
    onScopeChange () {
      if (this.execScope === 'project' && !this.selectedProjectIds.length) {
        this.selectedProjectIds = []
        this.execRows = []
      }
    },
    syncProjectRows (ids) {
      const existing = {}
      this.execRows.forEach(row => { existing[row.projectId] = row })
      this.execRows = ids.map(id => {
        if (existing[id]) return existing[id]
        const project = this.$store.getProject(id)
        const person = this.$store.primaryPersonOfProject(id) || this.$store.getPerson(this.workCurrent.leadId)
        return {
          projectId: id,
          projectName: project.name,
          personId: person ? person.id : '',
          personName: person ? person.name : '',
          content: '',
          attachments: []
        }
      })
    },
    removeProjectRow (projectId) {
      this.selectedProjectIds = this.selectedProjectIds.filter(id => id !== projectId)
      this.execRows = this.execRows.filter(row => row.projectId !== projectId)
    },
    saveExec () {
      const work = this.workCurrent
      if (!work) return
      if (this.execScope === 'company') {
        if (!this.companyContent.trim()) return this.$message.warning('请填写公司级总体执行情况')
        const res = this.$store.saveWorkExecutions(work.id, {
          scope: 'company',
          companyContent: this.companyContent,
          attachments: this.companyAttachments
        })
        if (!res.ok) return this.$message.error(res.message)
      } else {
        if (!this.selectedProjectIds.length) return this.$message.warning('请选择关联项目')
        for (let i = 0; i < this.execRows.length; i++) {
          if (!this.execRows[i].content || !this.execRows[i].content.trim()) {
            return this.$message.warning(`请填写“${this.execRows[i].projectName}”项目的执行情况`)
          }
        }
        const res = this.$store.saveWorkExecutions(work.id, {
          scope: 'project',
          projects: this.execRows.map(row => ({
            projectId: row.projectId,
            personId: row.personId,
            content: row.content,
            attachments: row.attachments
          }))
        })
        if (!res.ok) return this.$message.error(res.message)
      }
      this.$message.success('执行情况已保存')
      this.workDrawerMode = 'view'
    },
    startExecFromView () {
      this.workDrawerMode = 'exec'
      this.initExecForm(this.workCurrent)
    },
    startCloseFromView () {
      if (!this.workCurrent.executions.length) {
        return this.$message.warning('请先填写执行情况，再申请销项')
      }
      this.workDrawerMode = 'close'
      this.closeReason = ''
      this.closeAttachments = []
      this.closeExecutionIds = this.workCurrent.executions.map(e => e.id)
    },
    submitClose () {
      if (!this.closeExecutionIds.length) return this.$message.warning('请选择本次销项覆盖的执行范围')
      if (!this.closeReason.trim()) return this.$message.warning('请填写办结说明')
      if (!this.closeAttachments.length) return this.$message.warning('请上传销项佐证附件')
      const res = this.$store.submitWorkClose(this.workCurrent.id, {
        reason: this.closeReason,
        attachments: this.closeAttachments,
        executionIds: this.closeExecutionIds
      })
      if (!res.ok) return this.$message.error(res.message)
      this.$message.success('销项申请已提交')
      this.workDrawerMode = 'view'
    },
    handleWorkApproval ({ action, comment }) {
      const work = this.workApprovalRecord
      if (!work) return
      const res = this.$store.approveWorkClose(work.id, action, comment)
      if (!res.ok) return this.$message.error(res.message)
      this.workApprovalVisible = false
      this.$message.success(action === 'pass' ? (work.status === '已销项' ? '销项审批已通过，事项已销项' : '审批节点已通过') : '销项申请已退回')
    }
  }
}
</script>

<style scoped>
.tab-body {
  padding-top: 4px;
}
.toolbar-tip {
  font-size: 12px;
  margin-left: 4px;
}
.cell-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.work-title-cell {
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 18px;
}
.progress-cell {
  line-height: 18px;
}
.project-count-cell {
  font-size: 12px;
  color: #3c5a78;
  white-space: nowrap;
}
.progress-scope {
  font-size: 12px;
  color: #3c5a78;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.progress-summary {
  font-size: 11.5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
.sheet-form .ant-form-item {
  margin-bottom: 12px;
}
.items-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 4px 0 8px;
}
.items-title {
  font-size: 13px;
  font-weight: 700;
  color: #263e55;
}
.cell-tip {
  font-size: 10.5px;
  color: #a5b4c4;
  line-height: 15px;
}
.row-actions {
  display: flex;
  align-items: center;
  white-space: nowrap;
}
.work-head {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 12px;
}
.work-head-title {
  flex: 1;
  font-size: 15px;
  font-weight: 700;
  color: #22384e;
  line-height: 22px;
}
.scope-radio {
  margin-bottom: 14px;
}
.exec-field {
  margin-bottom: 14px;
}
.form-label {
  font-size: 13px;
  color: #4a5d72;
  margin-bottom: 5px;
}
.exec-empty {
  color: #a5b4c4;
  font-size: 12px;
  padding: 14px;
  background: #fafcfe;
  border: 1px dashed #e4eef8;
  border-radius: 3px;
  text-align: center;
}
.exec-project-card {
  border: 1px solid #e4eef8;
  border-radius: 3px;
  padding: 10px 12px;
  margin-bottom: 10px;
  background: #fbfdff;
}
.exec-project-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 7px;
  font-size: 12px;
}
.exec-project-name {
  font-weight: 600;
  color: #2c4359;
}
.exec-project-head .link-btn {
  margin-left: auto;
}
.exec-list {
  border: 1px solid #e8eff7;
  border-radius: 3px;
}
.exec-item {
  padding: 10px 12px;
  border-bottom: 1px solid #f0f4f9;
}
.exec-item:last-child {
  border-bottom: 0;
}
.exec-item-head {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  margin-bottom: 4px;
}
.exec-item-scope {
  font-weight: 600;
  color: #2c4359;
}
.exec-item-content {
  font-size: 12.5px;
  color: #465a70;
  line-height: 19px;
  white-space: pre-wrap;
}
.exec-files {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}
.exec-check-group {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.exec-check-item {
  display: flex;
  align-items: flex-start;
  font-size: 12px;
  line-height: 18px;
  white-space: normal;
}
.exec-check-item .muted {
  font-size: 11.5px;
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
