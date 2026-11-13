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

          <a-table
            :columns="workColumns"
            :data-source="filteredWorks"
            :pagination="workPagination"
            row-key="id"
            size="middle"
            :scroll="{ x: 1250 }"
          >
            <div slot="cellTitle" slot-scope="text" class="work-title-cell" :title="text">{{ text }}</div>
            <div slot="progress" slot-scope="text, record" class="progress-cell">
              <div class="progress-scope">{{ workProgressText(record) }}</div>
              <div v-if="workMissingText(record)" class="muted progress-summary">{{ workMissingText(record) }}</div>
            </div>
            <div slot="status" slot-scope="text"><status-tag :status="text" /></div>
            <div slot="action" slot-scope="text, record" class="table-actions">
              <template v-if="record.status === '落实中'">
                <a class="link-btn" @click="openExec(record)">填写执行情况</a>
                <a-divider type="vertical" />
                <a
                  class="link-btn"
                  :class="{ disabled: !canClose(record) }"
                  :title="canClose(record) ? '' : '请先补齐全部应填项目'"
                  @click="canClose(record) && openClose(record)"
                >申请销项</a>
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
              <a-select v-model="sheetForm.system" placeholder="请选择体系" :disabled="sheetFormMode === 'edit'" style="width: 100%" @change="onSystemChange">
                <a-select-option v-for="s in systems" :key="s" :value="s">{{ s }}</a-select-option>
              </a-select>
            </a-form-model-item>
          </a-col>
          <a-col :span="8">
            <a-form-model-item label="归属部门" required>
              <a-select
                v-model="sheetForm.deptId"
                :placeholder="sheetForm.system ? '请选择部门' : '请先选择体系'"
                :disabled="!sheetForm.system || sheetFormMode === 'edit'"
                show-search
                option-filter-prop="children"
                style="width: 100%"
                @change="onSheetDeptChange"
              >
                <a-select-option v-for="d in availableDepts" :key="d.id" :value="d.id">{{ d.name }}</a-select-option>
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
        <a-button size="small" type="primary" ghost @click="addSheetItem"><a-icon type="plus" /> 新增行</a-button>
        <span class="items-title">重点工作明细 <span class="muted">（{{ sheetForm.items.length }} 条）</span></span>
      </div>

      <a-table
        :columns="sheetItemColumns"
        :data-source="sheetForm.items"
        :pagination="false"
        size="small"
        bordered
        row-key="_key"
        :scroll="{ x: 1250 }"
      >
        <div slot="titleCell" slot-scope="text, record">
          <a-textarea v-model="record.title" :rows="2" :max-length="200" placeholder="请输入单条重点工作内容" />
        </div>
        <div slot="leadCell" slot-scope="text, record">
          <a-select v-model="record.leadId" placeholder="选择牵头人" show-search option-filter-prop="children" style="width: 100%">
            <a-select-option v-for="p in leadOptions" :key="p.id" :value="p.id">{{ p.name }}</a-select-option>
          </a-select>
        </div>
        <div slot="dueCell" slot-scope="text, record">
          <a-date-picker v-model="record.dueDate" :allow-clear="false" placeholder="完成时限" style="width: 100%" />
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
            :scroll="{ x: 1050 }"
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
          <div class="detail-item"><span class="detail-label">完成时限</span><span class="detail-value">{{ workCurrent.dueDate || '—' }}</span></div>
          <div class="detail-item full"><span class="detail-label">存在问题</span><span class="detail-value">{{ workCurrent.problem || '—' }}</span></div>
          <div class="detail-item full"><span class="detail-label">改进建议</span><span class="detail-value">{{ workCurrent.suggestion || '—' }}</span></div>
        </div>

        <div class="drawer-section" style="margin-top:16px;">
          <div class="drawer-section-title">
            执行情况
            <span class="extra">{{ workProgressText(workCurrent) }}</span>
          </div>

          <template v-if="workDrawerMode === 'exec'">
            <div class="exec-field">
              <div class="form-label">总体执行情况 <span class="danger-text">*</span></div>
              <a-textarea
                v-model="overallContent"
                :rows="4"
                :max-length="800"
                placeholder="填写本项工作的总体推进情况、成果及下一步安排"
              />
            </div>
            <div class="exec-field">
              <div class="form-label">总体证明附件</div>
              <file-uploader v-model="overallAttachments" tip="可上传总体执行情况说明、会议纪要等材料" />
            </div>

            <div class="project-subtable">
              <div class="alert-note" style="margin-bottom:8px;">
                <a-icon type="info-circle" />
                项目按该事项牵头人的有效帮扶关系自动生成，主责／协同均计入并按项目去重；可分批填写，申请销项时须全部填写完整。
              </div>
              <div class="subtable-head">
                <span class="items-title">项目落实情况 <span class="muted">（{{ workProgressText(workCurrent) }}）</span></span>
              </div>
              <a-table
                v-if="currentProjectRows.length"
                :columns="projectExecColumns"
                :data-source="currentProjectRows"
                :pagination="false"
                size="small"
                bordered
                row-key="id"
                :scroll="{ x: 960 }"
              >
                <div slot="projectCell" slot-scope="text, record">
                  <span class="project-readonly">{{ record.projectName }}</span>
                  <status-tag v-if="record.needsConfirm" status="需重新确认" />
                </div>
                <div slot="contentCell" slot-scope="text, record">
                  <a-textarea v-model="record.content" :rows="2" :max-length="500" placeholder="可分批填写该项目落实情况" />
                </div>
                <div slot="fileCell" slot-scope="text, record">
                  <file-uploader v-model="record.attachments" button-text="上传" />
                </div>
                <div slot="rowStatus" slot-scope="text, record">
                  <status-tag :status="record.needsConfirm ? '需重新确认' : (record.content && record.content.trim() ? '已填写' : '未填写')" />
                </div>
              </a-table>
              <div v-else class="exec-empty">未配置有效帮扶项目，请先检查该事项牵头人的帮扶关系</div>
            </div>
          </template>

          <template v-else>
            <div class="overall-view">
              <div class="overall-label">总体执行情况</div>
              <div class="overall-content">{{ workCurrent.overallContent || '尚未填写' }}</div>
              <div v-if="workCurrent.overallAttachments && workCurrent.overallAttachments.length" class="exec-files">
                <span v-for="(f, i) in workCurrent.overallAttachments" :key="i" class="file-chip">
                  <a-icon type="paper-clip" /> {{ f.name }}
                </span>
              </div>
            </div>

            <div v-if="currentProjectRows.length" class="project-view">
              <a-table
                :columns="projectViewColumns"
                :data-source="currentProjectRows"
                :pagination="false"
                size="small"
                bordered
                row-key="id"
                :scroll="{ x: 860 }"
              >
                <div slot="viewContent" slot-scope="text, record" class="view-content">
                  {{ execDisplay(record) }}
                </div>
                <div slot="viewFiles" slot-scope="text, record">
                  <span v-for="(f, i) in record.attachments" :key="i" class="file-chip">
                    <a-icon type="paper-clip" /> {{ f.name }}
                  </span>
                  <span v-if="!record.attachments || !record.attachments.length" class="muted">—</span>
                </div>
              </a-table>
            </div>
            <div v-else class="exec-empty">未配置有效帮扶项目</div>

            <div v-if="historyProjectRows.length" class="history-projects">
              <div class="drawer-section-title" style="margin-top:12px;">历史项目记录</div>
              <a-table
                :columns="historyColumns"
                :data-source="historyProjectRows"
                :pagination="false"
                size="small"
                row-key="id"
                :scroll="{ x: 760 }"
              >
                <div slot="historyContent" slot-scope="text" class="view-content">{{ text || '—' }}</div>
                <div slot="historyReason" slot-scope="text" class="muted">{{ text || '—' }}</div>
              </a-table>
            </div>
          </template>
        </div>

        <div class="drawer-section">
          <div class="drawer-section-title">
            销项申请
            <span class="extra" v-if="workCurrent.closeRequest">{{ workCurrent.closeRequest.id }}</span>
          </div>

          <template v-if="workDrawerMode === 'close' && workCurrent.status === '落实中'">
            <div class="alert-note warn" style="margin-bottom:12px;">
              <a-icon type="exclamation-circle" /> 销项将包含本事项总体执行情况及全部当前应填项目，请填写办结说明并上传佐证材料。
            </div>
            <div class="close-snapshot">
              <div class="overall-label">总体执行情况</div>
              <div class="overall-content">{{ workCurrent.overallContent }}</div>
              <div class="close-projects">
                当前应填项目：{{ currentProjectRows.length ? currentProjectRows.map(e => e.projectName).join('、') : '未配置有效帮扶项目' }}
              </div>
              <div class="close-projects">项目落实进展：{{ workProgressText(workCurrent) }}</div>
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
              <div class="detail-item full"><span class="detail-label">总体执行情况</span><span class="detail-value">{{ workCurrent.closeRequest.overallContent || workCurrent.overallContent }}</span></div>
              <div class="detail-item full"><span class="detail-label">包含项目</span><span class="detail-value">{{ (workCurrent.closeRequest.projectExecutions || workCurrent.projectExecutions || []).map(e => e.projectName).join('、') || '无关联项目' }}</span></div>
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
            <a-button
              v-if="workCurrent.status === '落实中'"
              type="primary"
              :disabled="!canClose(workCurrent)"
              :title="canClose(workCurrent) ? '' : '请先补齐全部应填项目'"
              @click="startCloseFromView"
            >申请销项</a-button>
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
import moment from 'moment'
import StatusTag from '../components/StatusTag.vue'
import ApprovalModal from '../components/ApprovalModal.vue'
import FileUploader from '../components/FileUploader.vue'
import { todayStr, fmtDate } from '../utils/date'

function newSheetItem (deptId) {
  return {
    _key: `row_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    title: '',
    leadId: undefined,
    dueDate: null,
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
      overallContent: '',
      overallAttachments: [],
      projectRows: [],
      closeReason: '',
      closeAttachments: [],
      workApprovalVisible: false,
      workApprovalRecord: null
    }
  },
  computed: {
    departments () {
      return this.$store.db.departments
    },
    availableDepts () {
      if (!this.sheetForm.system) return []
      return this.departments.filter(d => d.system === this.sheetForm.system)
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
        { title: '完成时限', dataIndex: 'dueDate', width: 110, align: 'center' },
        { title: '项目落实进展', dataIndex: 'projectExecutions', key: 'progress', width: 170, scopedSlots: { customRender: 'progress' } },
        { title: '状态', dataIndex: 'status', width: 92, scopedSlots: { customRender: 'status' } },
        { title: '操作', width: 200, scopedSlots: { customRender: 'action' } }
      ]
    },
    sheetDetailColumns () {
      return [
        { title: '序号', dataIndex: 'seq', width: 56, align: 'center' },
        { title: '重点工作', dataIndex: 'title', width: 280 },
        { title: '工作牵头人', dataIndex: 'leadName', width: 100 },
        { title: '完成时限', dataIndex: 'dueDate', width: 110 },
        { title: '存在问题', dataIndex: 'problem', width: 200 },
        { title: '改进建议', dataIndex: 'suggestion', width: 200 },
        { title: '状态', width: 90, scopedSlots: { customRender: 'statusCol' } }
      ]
    },
    projectExecColumns () {
      return [
        { title: '序号', width: 50, align: 'center', customRender: (text, record, index) => index + 1 },
        { title: '关联项目', width: 220, scopedSlots: { customRender: 'projectCell' } },
        { title: '落实情况', width: 340, scopedSlots: { customRender: 'contentCell' } },
        { title: '附件', width: 170, scopedSlots: { customRender: 'fileCell' } },
        { title: '状态', width: 100, align: 'center', scopedSlots: { customRender: 'rowStatus' } }
      ]
    },
    projectViewColumns () {
      return [
        { title: '序号', width: 50, align: 'center', customRender: (text, record, index) => index + 1 },
        { title: '关联项目', dataIndex: 'projectName', width: 220 },
        { title: '落实情况', dataIndex: 'content', width: 380, scopedSlots: { customRender: 'viewContent' } },
        { title: '附件', width: 160, scopedSlots: { customRender: 'viewFiles' } }
      ]
    },
    historyColumns () {
      return [
        { title: '序号', width: 50, align: 'center', customRender: (text, record, index) => index + 1 },
        { title: '历史项目', dataIndex: 'projectName', width: 220 },
        { title: '历史落实情况', dataIndex: 'content', width: 360, scopedSlots: { customRender: 'historyContent' } },
        { title: '移出原因', dataIndex: 'removedReason', width: 180, scopedSlots: { customRender: 'historyReason' } }
      ]
    },
    currentProjectRows () {
      if (!this.workCurrent) return []
      return (this.workCurrent.projectExecutions || []).filter(e => e.inScope !== false)
    },
    historyProjectRows () {
      if (!this.workCurrent) return []
      return (this.workCurrent.projectExecutions || []).filter(e => e.inScope === false)
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
      { title: '重点工作', width: 280, scopedSlots: { customRender: 'titleCell' }, customHeaderCell: () => ({ class: 'required-col' }) },
      { title: '工作牵头人', width: 120, scopedSlots: { customRender: 'leadCell' }, customHeaderCell: () => ({ class: 'required-col' }) },
      { title: '完成时限', width: 150, scopedSlots: { customRender: 'dueCell' }, customHeaderCell: () => ({ class: 'required-col' }) },
      { title: '项目落实情况', width: 120, scopedSlots: { customRender: 'resultCell' } },
      { title: '存在问题', width: 180, scopedSlots: { customRender: 'problemCell' } },
      { title: '改进建议', width: 180, scopedSlots: { customRender: 'suggestionCell' } },
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
    workProgress (work) {
      return work ? this.$store.getWorkProgress(work) : { A: 0, B: 0, missing: [] }
    },
    workProgressText (work) {
      const p = this.workProgress(work)
      if (!p.B) return '未配置有效帮扶项目'
      return `${p.A}/${p.B}`
    },
    workMissingText (work) {
      const p = this.workProgress(work)
      if (!p.B) return '请先检查牵头人帮扶关系'
      if (p.A === p.B) return '项目已全部填写'
      return `未填 ${p.B - p.A} 项`
    },
    canClose (work) {
      const p = this.workProgress(work)
      return p.B > 0 && p.A === p.B
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
      const valid = this.availableDepts.some(d => d.id === this.sheetForm.deptId)
      if (!valid) {
        this.sheetForm.deptId = undefined
        this.sheetForm.items.forEach(item => { item.leadId = undefined })
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
      let system = this.appliedSheet.system || ''
      let deptId = this.appliedSheet.deptId || undefined
      if (deptId) {
        const dept = this.$store.getDept(deptId)
        if (dept) {
          if (!system) system = dept.system
          if (dept.system !== system) deptId = undefined
        }
      }
      this.sheetForm = {
        id: null,
        deptId,
        system,
        remark: '',
        items: [newSheetItem(deptId)]
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
          dueDate: item.dueDate ? moment(item.dueDate) : null,
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
      let dueDate = null
      if (source.dueDate) dueDate = typeof source.dueDate.clone === 'function' ? source.dueDate.clone() : moment(source.dueDate)
      this.sheetForm.items.splice(index + 1, 0, {
        ...source,
        _key: `row_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        dueDate
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
      if (!this.sheetForm.system) return this.$message.warning('请选择所属体系')
      if (!this.sheetForm.deptId) return this.$message.warning('请选择归属部门')
      if (!this.sheetForm.items.length) return this.$message.warning('请至少添加一条重点工作')
      for (let i = 0; i < this.sheetForm.items.length; i++) {
        const item = this.sheetForm.items[i]
        if (!item.title || !item.title.trim()) return this.$message.warning(`第 ${i + 1} 条重点工作内容不能为空`)
        if (!item.leadId) return this.$message.warning(`第 ${i + 1} 条重点工作请选择工作牵头人`)
        if (!item.dueDate) return this.$message.warning(`第 ${i + 1} 条重点工作请选择完成时限`)
      }
      const sheet = this.$store.saveSheet({
        id: this.sheetForm.id,
        deptId: this.sheetForm.deptId,
        system: this.sheetForm.system,
        remark: this.sheetForm.remark,
        items: this.sheetForm.items.map(item => ({
          title: item.title,
          leadId: item.leadId,
          dueDate: fmtDate(item.dueDate),
          problem: item.problem,
          suggestion: item.suggestion
        }))
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
    openWorkDetail (work) {
      this.workCurrent = work
      if (work.status === '落实中') this.$store.syncWorkProjectScope(work)
      this.workDrawerMode = 'view'
      this.workDrawerVisible = true
    },
    openExec (work) {
      this.workCurrent = work
      this.workDrawerMode = 'exec'
      this.$store.syncWorkProjectScope(work)
      this.initExecForm(work)
      this.workDrawerVisible = true
    },
    openClose (work) {
      this.workCurrent = work
      if (!work.overallContent || !work.overallContent.trim()) {
        this.$message.warning('请先填写总体执行情况，再申请销项')
        this.openExec(work)
        return
      }
      this.$store.syncWorkProjectScope(work)
      const p = this.$store.getWorkProgress(work)
      if (!p.B) {
        return this.$message.warning('未配置有效帮扶项目，无法申请销项，请先检查牵头人帮扶关系')
      }
      if (p.A !== p.B) {
        this.$message.warning(`项目落实进展 ${p.A}/${p.B}，请先补齐：${p.missing.map(m => m.projectName).join('、')}`)
        this.openExec(work)
        return
      }
      this.workDrawerMode = 'close'
      this.closeReason = ''
      this.closeAttachments = []
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
      this.overallContent = work.overallContent || ''
      this.overallAttachments = (work.overallAttachments || []).slice()
      this.projectRows = (work.projectExecutions || [])
        .filter(e => e.inScope !== false)
        .map(e => ({
          _key: e.id || `prow_${e.projectId}_${Math.random()}`,
          projectId: e.projectId,
          projectName: e.projectName,
          content: this.execDisplay(e),
          attachments: (e.attachments || []).slice(),
          needsConfirm: !!e.needsConfirm
        }))
    },
    saveExec () {
      const work = this.workCurrent
      if (!work) return
      if (!this.overallContent.trim()) return this.$message.warning('请填写总体执行情况')
      const res = this.$store.saveWorkExecutions(work.id, {
        overallContent: this.overallContent,
        overallAttachments: this.overallAttachments,
        projects: this.projectRows.map(row => ({
          projectId: row.projectId,
          content: row.content,
          attachments: row.attachments
        }))
      })
      if (!res.ok) return this.$message.error(res.message)
      this.$message.success(`执行情况已保存，项目落实进展 ${res.progress.A}/${res.progress.B}`)
      this.workDrawerMode = 'view'
    },
    startExecFromView () {
      this.workDrawerMode = 'exec'
      this.$store.syncWorkProjectScope(this.workCurrent)
      this.initExecForm(this.workCurrent)
    },
    startCloseFromView () {
      if (!this.workCurrent.overallContent || !this.workCurrent.overallContent.trim()) {
        return this.$message.warning('请先填写总体执行情况，再申请销项')
      }
      this.$store.syncWorkProjectScope(this.workCurrent)
      const p = this.$store.getWorkProgress(this.workCurrent)
      if (!p.B) return this.$message.warning('未配置有效帮扶项目，无法申请销项，请先检查牵头人帮扶关系')
      if (p.A !== p.B) {
        return this.$message.warning(`项目落实进展 ${p.A}/${p.B}，请先补齐：${p.missing.map(m => m.projectName).join('、')}`)
      }
      this.workDrawerMode = 'close'
      this.closeReason = ''
      this.closeAttachments = []
    },
    submitClose () {
      if (!this.closeReason.trim()) return this.$message.warning('请填写办结说明')
      if (!this.closeAttachments.length) return this.$message.warning('请上传销项佐证附件')
      const res = this.$store.submitWorkClose(this.workCurrent.id, {
        reason: this.closeReason,
        attachments: this.closeAttachments
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
.project-subtable {
  margin-top: 14px;
}
.subtable-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.overall-view {
  background: #f8fbff;
  border: 1px solid #e8f1fa;
  border-radius: 3px;
  padding: 10px 12px;
}
.overall-label {
  font-size: 12px;
  color: #7d90a5;
  margin-bottom: 4px;
}
.overall-content {
  font-size: 12.5px;
  line-height: 20px;
  color: #2f4358;
  white-space: pre-wrap;
}
.project-view {
  margin-top: 12px;
}
.view-content {
  white-space: pre-wrap;
  line-height: 18px;
}
.close-snapshot {
  background: #fbfdff;
  border: 1px solid #e8f1fa;
  border-radius: 3px;
  padding: 10px 12px;
  margin-bottom: 12px;
}
.close-projects {
  margin-top: 6px;
  font-size: 12px;
  color: #5b7189;
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
  justify-content: flex-start;
  gap: 10px;
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
.exec-files {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}
</style>
