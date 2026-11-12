<template>
  <div class="daily-page">
    <a-tabs v-model="activeTab">
      <!-- 我的日报 -->
      <a-tab-pane key="mine">
        <span slot="tab"><a-icon type="user" /> 我的日报</span>
        <div class="tab-body">
          <div class="alert-note">
            <a-icon type="info-circle" />
            请于当日 24:00 前完成填写，次日 00:00 自动冻结；冻结后个人不可修改，如需修订请联系企划部管理员在“全部日报”中处理。未提交日报不计为未到岗。
          </div>

          <div class="mine-toolbar">
            <span class="mine-toolbar-label">填报日期</span>
            <a-date-picker v-model="mineDate" :allow-clear="false" style="width: 160px" />
            <a-button size="small" @click="backToToday">回到今天</a-button>
            <span class="muted">当前共 {{ myReports.length }} 份项目日报任务</span>
          </div>

          <div class="mine-stats">
            <div class="mine-stat"><span>应填日报</span><b>{{ myStats.due }}</b></div>
            <div class="mine-stat"><span>已提交</span><b class="green">{{ myStats.submitted }}</b></div>
            <div class="mine-stat"><span>待填写</span><b class="red">{{ myStats.pending }}</b></div>
            <div class="mine-stat"><span>在办诉求</span><b>{{ myStats.appeals }}</b></div>
            <div class="mine-stat"><span>待反馈诉求</span><b class="orange">{{ myStats.unfed }}</b></div>
          </div>

          <div v-if="mineDateIsFuture" class="alert-note warn" style="margin-top:12px;">
            <a-icon type="clock-circle" /> 所选日期尚未到达，可提前查看应填任务，但需当日填报。
          </div>

          <div class="mine-cards">
            <div v-for="report in myReports" :key="report.id" class="mine-card">
              <div class="mine-card-top">
                <div class="mine-project">
                  <a-icon type="project" />
                  <span>{{ report.projectName }}</span>
                </div>
                <div class="mine-card-tags">
                  <status-tag :status="report.status" />
                  <status-tag v-if="report.frozen" status="已冻结" />
                  <status-tag v-if="report.status === '已提交'" :status="report.checkStatus" />
                </div>
              </div>
              <div class="mine-card-meta">
                <span>{{ report.date }}</span>
                <span class="divider">|</span>
                <span>{{ report.deptName }}</span>
                <span class="divider">|</span>
                <span>提交时间：{{ report.submitTime || '—' }}</span>
              </div>
              <div class="mine-card-needs">{{ report.projectNeeds }}</div>
              <div class="mine-card-foot">
                <div class="mine-counts">
                  <span>在办诉求 <b>{{ feedbackTotal(report) }}</b></span>
                  <span>已反馈 <b class="green">{{ feedbackDone(report) }}</b></span>
                  <span>待反馈 <b class="red">{{ feedbackPending(report) }}</b></span>
                </div>
                <div class="mine-actions">
                  <template v-if="report.frozen">
                    <a-button size="small" @click="openReport(report, 'view')">查看</a-button>
                  </template>
                  <template v-else-if="report.status === '已提交'">
                    <a-button size="small" type="primary" @click="openReport(report, 'mine')">当日重新编辑</a-button>
                    <a-button size="small" @click="openReport(report, 'view')">查看</a-button>
                  </template>
                  <template v-else>
                    <a-button size="small" type="primary" @click="openReport(report, 'mine')">
                      {{ report.status === '草稿' ? '继续填写' : '填写日报' }}
                    </a-button>
                    <a-button v-if="report.status === '草稿'" size="small" @click="openReport(report, 'view')">查看</a-button>
                  </template>
                </div>
              </div>
            </div>
            <div v-if="!myReports.length" class="empty-block">
              <a-empty description="所选日期没有应填的项目日报任务" />
            </div>
          </div>
        </div>
      </a-tab-pane>

      <!-- 全部日报 -->
      <a-tab-pane key="all">
        <span slot="tab"><a-icon type="profile" /> 全部日报</span>
        <div class="tab-body">
          <div class="filter-bar">
            <a-form layout="inline">
              <a-form-item label="填报日期">
                <a-date-picker v-model="allFilters.date" allow-clear placeholder="全部日期" style="width: 160px" @change="applyAllFilter" />
              </a-form-item>
              <a-form-item label="项目">
                <a-select v-model="allFilters.projectId" placeholder="全部项目" allow-clear show-search option-filter-prop="children" style="width: 180px">
                  <a-select-option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</a-select-option>
                </a-select>
              </a-form-item>
              <a-form-item label="人员">
                <a-select v-model="allFilters.personId" placeholder="全部人员" allow-clear show-search option-filter-prop="children" style="width: 150px">
                  <a-select-option v-for="p in people" :key="p.id" :value="p.id">{{ p.name }}</a-select-option>
                </a-select>
              </a-form-item>
              <a-form-item label="部门">
                <a-select v-model="allFilters.deptId" placeholder="全部部门" allow-clear show-search option-filter-prop="children" style="width: 170px">
                  <a-select-option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</a-select-option>
                </a-select>
              </a-form-item>
              <a-form-item label="填报状态">
                <a-select v-model="allFilters.status" placeholder="全部" allow-clear style="width: 110px">
                  <a-select-option v-for="s in ['未填写', '草稿', '已提交']" :key="s" :value="s">{{ s }}</a-select-option>
                </a-select>
              </a-form-item>
              <a-form-item label="校核状态">
                <a-select v-model="allFilters.checkStatus" placeholder="全部" allow-clear style="width: 120px">
                  <a-select-option v-for="s in ['待校核', '已校核', '需重新校核']" :key="s" :value="s">{{ s }}</a-select-option>
                </a-select>
              </a-form-item>
              <a-form-item>
                <div class="filter-actions">
                  <a-button type="primary" @click="applyAllFilter"><a-icon type="search" /> 查询</a-button>
                  <a-button @click="resetAllFilter"><a-icon type="reload" /> 重置</a-button>
                </div>
              </a-form-item>
            </a-form>
          </div>

          <div class="toolbar">
            <a-button @click="exportDailyExcelByDate"><a-icon type="download" /> 导出当日日报</a-button>
            <a-button @click="printDailyPdf"><a-icon type="printer" /> 打印日报 / PDF</a-button>
            <span class="muted toolbar-tip">完全未填写的日报任务同样列出，可在此校核或由管理员修订已冻结记录。</span>
          </div>

          <div class="inline-stats">
            <span>共 <b>{{ allReports.length }}</b> 条任务</span>
            <span>已提交 <b class="green">{{ allStats.submitted }}</b></span>
            <span>未填写 <b class="red">{{ allStats.unfilled }}</b></span>
            <span>待校核 <b class="orange">{{ allStats.unchecked }}</b></span>
          </div>

          <a-table
            :columns="allColumns"
            :data-source="allReports"
            :pagination="allPagination"
            row-key="id"
            size="middle"
            :scroll="{ x: 1264 }"
          >
            <div slot="status" slot-scope="text"><status-tag :status="text" /></div>
            <div slot="checkStatus" slot-scope="text, record">
              <status-tag v-if="record.status === '已提交'" :status="text" />
              <span v-else class="muted">—</span>
            </div>
            <div slot="frozen" slot-scope="text"><status-tag :status="text ? '已冻结' : '未冻结'" /></div>
            <div slot="attend" slot-scope="text">{{ text === true ? '是' : (text === false ? '否' : '—') }}</div>
            <div slot="submitTime" slot-scope="text">{{ text || '—' }}</div>
            <div slot="action" slot-scope="text, record" class="table-actions">
              <a class="link-btn" @click="openReport(record, 'view')">查看</a>
              <template v-if="record.status === '已提交' && record.checkStatus !== '已校核'">
                <a-divider type="vertical" />
                <a class="link-btn" @click="openCheck(record)">校核</a>
              </template>
              <a-divider type="vertical" />
              <a class="link-btn" @click="openReport(record, 'admin')">管理员修订</a>
            </div>
          </a-table>
        </div>
      </a-tab-pane>

      <!-- 诉求填报监控 -->
      <a-tab-pane key="monitor">
        <span slot="tab"><a-icon type="audit" /> 诉求填报监控</span>
        <div class="tab-body">
          <div class="monitor-head">
            <div class="monitor-date">
              <span class="mine-toolbar-label">监控日期</span>
              <a-date-picker v-model="monitorDate" :allow-clear="false" style="width: 160px" @change="applyMonitorFilter" />
            </div>
            <div class="alert-note" style="flex:1;margin:0;">
              <a-icon type="info-circle" />
              日报已提交不代表每条诉求均已反馈。日报提交率按“已提交人员-项目任务÷应填任务”计算，诉求反馈率按“已反馈在办诉求÷应反馈在办诉求”计算。
            </div>
          </div>

          <div class="stat-strip monitor-stats">
            <div class="stat-cell"><div class="stat-label">应填日报数</div><div class="stat-value">{{ monitorStats.due }}</div></div>
            <div class="stat-cell"><div class="stat-label">已提交日报数</div><div class="stat-value blue">{{ monitorStats.submitted }}</div></div>
            <div class="stat-cell"><div class="stat-label">未提交日报数</div><div class="stat-value red">{{ monitorStats.unsubmitted }}</div></div>
            <div class="stat-cell"><div class="stat-label">日报提交率</div><div class="stat-value">{{ monitorStats.submitRate }}<small>%</small></div></div>
            <div class="stat-cell"><div class="stat-label">在办诉求应反馈</div><div class="stat-value">{{ monitorStats.required }}</div></div>
            <div class="stat-cell"><div class="stat-label">已反馈诉求</div><div class="stat-value green">{{ monitorStats.fed }}</div></div>
            <div class="stat-cell"><div class="stat-label">未反馈诉求</div><div class="stat-value red">{{ monitorStats.unfed }}</div></div>
            <div class="stat-cell"><div class="stat-label">诉求反馈率</div><div class="stat-value green">{{ monitorStats.feedbackRate }}<small>%</small></div></div>
          </div>

          <div class="filter-bar" style="margin-top:12px;">
            <a-form layout="inline">
              <a-form-item label="项目">
                <a-select v-model="monitorFilters.projectId" placeholder="全部项目" allow-clear show-search option-filter-prop="children" style="width: 180px">
                  <a-select-option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</a-select-option>
                </a-select>
              </a-form-item>
              <a-form-item label="主责部门">
                <a-select v-model="monitorFilters.deptId" placeholder="全部部门" allow-clear show-search option-filter-prop="children" style="width: 170px">
                  <a-select-option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</a-select-option>
                </a-select>
              </a-form-item>
              <a-form-item label="责任人">
                <a-select v-model="monitorFilters.personId" placeholder="全部人员" allow-clear show-search option-filter-prop="children" style="width: 140px">
                  <a-select-option v-for="p in people" :key="p.id" :value="p.id">{{ p.name }}</a-select-option>
                </a-select>
              </a-form-item>
              <a-form-item label="日报状态">
                <a-select v-model="monitorFilters.reportStatus" placeholder="全部" allow-clear style="width: 110px">
                  <a-select-option v-for="s in ['未填写', '草稿', '已提交']" :key="s" :value="s">{{ s }}</a-select-option>
                </a-select>
              </a-form-item>
              <a-form-item label="诉求反馈">
                <a-select v-model="monitorFilters.feedbackStatus" placeholder="全部" allow-clear style="width: 150px">
                  <a-select-option v-for="s in feedbackOptions" :key="s" :value="s">{{ s }}</a-select-option>
                </a-select>
              </a-form-item>
              <a-form-item label="关键词">
                <a-input v-model="monitorFilters.keyword" placeholder="项目 / 诉求 / 责任人" allow-clear style="width: 190px" />
              </a-form-item>
              <a-form-item>
                <div class="filter-actions">
                  <a-button type="primary" @click="applyMonitorFilter"><a-icon type="search" /> 查询</a-button>
                  <a-button @click="resetMonitorFilter"><a-icon type="reload" /> 重置</a-button>
                </div>
              </a-form-item>
            </a-form>
          </div>

          <a-table
            :columns="monitorColumns"
            :data-source="monitorFilteredRows"
            :pagination="monitorPagination"
            row-key="appealId"
            size="middle"
            :scroll="{ x: 1270 }"
            :row-class-name="monitorRowClass"
          >
            <div slot="project" slot-scope="text, record">
              <a v-if="record.reportId" class="link-btn" @click="openMonitorReport(record)">{{ text }}</a>
              <span v-else>{{ text }}</span>
            </div>
            <div slot="appealTitle" slot-scope="text, record">
              <a class="link-btn appeal-title-link" @click="openMonitorAppeal(record)">{{ text }}</a>
            </div>
            <div slot="person" slot-scope="text, record">
              <a-popover trigger="click" placement="right">
                <template slot="content">
                  <div class="contact-card">
                    <div><span class="muted">姓名：</span>{{ record.personName }}</div>
                    <div><span class="muted">部门：</span>{{ record.deptName }}</div>
                    <div><span class="muted">联系电话：</span>{{ record.personPhone }}</div>
                    <div><span class="muted">负责项目：</span>{{ record.projectName }}</div>
                  </div>
                </template>
                <a>{{ text }}</a>
              </a-popover>
            </div>
            <div slot="reportStatus" slot-scope="text, record">
              <a v-if="record.reportId" class="link-btn" @click="openMonitorReport(record)">{{ text }}</a>
              <status-tag v-else :status="text" />
            </div>
            <div slot="feedback" slot-scope="text">
              <status-tag :status="text" />
            </div>
            <div slot="attend" slot-scope="text">
              <a-tag :color="text === '是' ? 'green' : (text === '否' ? 'orange' : '')">{{ text }}</a-tag>
            </div>
            <div slot="action" slot-scope="text, record" class="table-actions">
              <a class="link-btn" @click="openMonitorReport(record)">查看日报</a>
              <a-divider type="vertical" />
              <a class="link-btn" @click="openMonitorAppeal(record)">诉求详情</a>
            </div>
          </a-table>
          <div class="monitor-legend muted">
            红色行为当日未反馈的在办诉求；可点击责任人查看联系方式，便于企划部线下提醒。点击“查看日报”定位对应人员-项目日报。
          </div>
        </div>
      </a-tab-pane>

      <!-- 周度汇总 -->
      <a-tab-pane key="weekly">
        <span slot="tab"><a-icon type="schedule" /> 周度汇总</span>
        <div class="tab-body">
          <div class="weekly-toolbar">
            <span class="mine-toolbar-label">周起止日期</span>
            <a-range-picker v-model="reportWeek" :allow-clear="false" style="width: 260px" />
            <a-button size="small" @click="setWeek('current')">本周</a-button>
            <a-button size="small" @click="setWeek('last')">上周</a-button>
            <div class="weekly-actions">
              <a-button type="primary" size="small" @click="exportWeeklyExcel"><a-icon type="download" /> 导出 Excel</a-button>
              <a-button size="small" @click="printWeeklyPdf"><a-icon type="printer" /> 打印 / PDF</a-button>
            </div>
          </div>

          <div class="weekly-summary">{{ weekly.summary }}</div>

          <div class="weekly-section-title">未到岗人员情况（{{ weekly.absentRows.length }} 条）</div>
          <a-table
            :columns="weeklyAbsentColumns"
            :data-source="weekly.absentRows"
            :pagination="false"
            size="small"
            :row-key="(record, index) => 'absent_' + index"
            :scroll="{ x: 1300, y: 320 }"
          >
            <div slot="needs" slot-scope="text" class="needs-cell" :title="text">{{ text }}</div>
            <div slot="reason" slot-scope="text" class="needs-cell" :title="text">{{ text }}</div>
          </a-table>

          <div class="weekly-section-title" style="margin-top:16px;">服务项目人员情况（{{ weekly.serviceRows.length }} 条）</div>
          <a-table
            :columns="weeklyServiceColumns"
            :data-source="weekly.serviceRows"
            :pagination="false"
            size="small"
            :row-key="(record, index) => 'service_' + index"
            :scroll="{ x: 1500, y: 380 }"
          >
            <div slot="needs" slot-scope="text" class="needs-cell" :title="text">{{ text }}</div>
            <div slot="work" slot-scope="text" class="needs-cell" :title="text">{{ text }}</div>
            <div slot="issues" slot-scope="text" class="needs-cell" :title="text">{{ text }}</div>
          </a-table>

          <div class="weekly-foot muted">
            周度汇总仅根据每日日报数据生成，按预设人员顺序及日期排序，不含独立周报填写与审批。
          </div>
        </div>
      </a-tab-pane>
    </a-tabs>

    <!-- 日报详情 -->
    <a-modal
      :title="reportDrawerTitle"
      :visible="reportDrawerVisible"
      :width="1080"
      wrap-class-name="daily-report-modal"
      @cancel="reportDrawerVisible = false"
    >
      <template v-if="reportCurrent">
        <div v-if="reportCurrent.frozen && reportMode !== 'admin'" class="alert-note warn">
          <a-icon type="lock" /> 该日报已冻结，个人仅可查看。如需修改，请联系企划部管理员在“全部日报”中修订。
        </div>
        <div v-if="reportMode === 'admin'" class="alert-note warn" style="margin-bottom:12px;">
          <a-icon type="edit" /> 管理员修订：可修改已冻结日报，保存时须填写修订原因并保留修改前后内容。修订后校核状态将变为“需重新校核”，个人端不会重新开放编辑。
        </div>

        <div class="detail-grid">
          <div class="detail-item"><span class="detail-label">姓名</span><span class="detail-value">{{ reportCurrent.personName }}</span></div>
          <div class="detail-item"><span class="detail-label">部门</span><span class="detail-value">{{ reportCurrent.deptName }}</span></div>
          <div class="detail-item"><span class="detail-label">填报日期</span><span class="detail-value">{{ reportCurrent.date }}</span></div>
          <div class="detail-item"><span class="detail-label">项目</span><span class="detail-value">{{ reportCurrent.projectName }}</span></div>
          <div class="detail-item"><span class="detail-label">填报状态</span><span class="detail-value"><status-tag :status="reportCurrent.status" /></span></div>
          <div class="detail-item"><span class="detail-label">校核状态</span><span class="detail-value"><status-tag :status="reportCurrent.checkStatus" /></span></div>
          <div class="detail-item"><span class="detail-label">冻结状态</span><span class="detail-value"><status-tag :status="reportCurrent.frozen ? '已冻结' : '未冻结'" /></span></div>
          <div class="detail-item"><span class="detail-label">提交时间</span><span class="detail-value">{{ reportCurrent.submitTime || '—' }}</span></div>
          <div class="detail-item full"><span class="detail-label">项目层面服务需求</span><span class="detail-value">{{ reportCurrent.projectNeeds }}</span></div>
        </div>

        <div class="drawer-section" style="margin-top:16px;">
          <div class="drawer-section-title">当日填报</div>
          <a-form-model :label-col="{ span: 5 }" :wrapper-col="{ span: 19 }">
            <a-form-model-item label="是否到岗" required>
              <a-radio-group v-model="reportForm.attend" :disabled="!reportEditable">
                <a-radio :value="true">是</a-radio>
                <a-radio :value="false">否</a-radio>
              </a-radio-group>
            </a-form-model-item>
            <a-form-model-item v-if="reportForm.attend === false" label="未到岗原因" required>
              <a-textarea
                v-model="reportForm.absentReason"
                :rows="2"
                :max-length="200"
                :disabled="!reportEditable"
                placeholder="请说明未到岗原因"
              />
            </a-form-model-item>
            <a-form-model-item :label="reportForm.attend === false ? '当日工作开展情况（选填）' : '当日工作开展情况'" :required="reportForm.attend === true">
              <a-textarea
                v-model="reportForm.workContent"
                :rows="3"
                :max-length="500"
                :disabled="!reportEditable"
                placeholder="填写当天实际开展的项目帮扶工作，可分条填写"
              />
            </a-form-model-item>
            <a-form-model-item label="今日项目反馈需协调解决问题">
              <a-textarea
                v-model="reportForm.newIssues"
                :rows="2"
                :max-length="300"
                :disabled="!reportEditable"
                placeholder="无新增问题时填写“无”"
              />
            </a-form-model-item>
          </a-form-model>
        </div>

        <div class="drawer-section">
          <div class="drawer-section-title">
            在办诉求反馈
            <span class="extra">共 {{ reportForm.feedbacks.length }} 条</span>
          </div>
          <div v-if="reportForm.attend === false" class="alert-note" style="margin-bottom:10px;">
            <a-icon type="info-circle" /> 当前选择“未到岗”，诉求反馈允许不填写，监控中将显示“因未到岗未反馈”。
          </div>
          <div v-for="(fb, index) in reportForm.feedbacks" :key="fb.appealId" class="feedback-card">
            <div class="feedback-head">
              <span class="feedback-index">{{ index + 1 }}</span>
              <span class="feedback-title">{{ fb.appealTitle }}</span>
              <a-tag v-if="appealStatus(fb.appealId)" :color="appealStatus(fb.appealId) === '办理中' ? 'blue' : ''">{{ appealStatus(fb.appealId) }}</a-tag>
            </div>
            <div class="feedback-latest">
              <span class="muted">最近进展：</span>{{ fb.latestProgress || '暂无' }}
            </div>
            <div class="feedback-row">
              <span class="feedback-label">今日反馈类型 <span class="danger-text">*</span></span>
              <a-radio-group
                v-model="fb.type"
                size="small"
                :disabled="!reportEditable || reportForm.attend === false || appealStatus(fb.appealId) !== '办理中'"
              >
                <a-radio value="有新进展">有新进展</a-radio>
                <a-radio value="无新进展">无新进展</a-radio>
              </a-radio-group>
            </div>
            <div v-if="fb.type === '有新进展'" class="feedback-row">
              <span class="feedback-label">当日诉求进展 <span class="danger-text">*</span></span>
              <a-textarea v-model="fb.content" :rows="2" :max-length="300" :disabled="!reportEditable || appealStatus(fb.appealId) !== '办理中'" placeholder="填写该诉求今日具体办理进展" />
            </div>
            <div v-if="fb.type" class="feedback-row">
              <span class="feedback-label">新发现问题</span>
              <a-input v-model="fb.newIssue" :disabled="!reportEditable" placeholder="可选，不自动生成新诉求" />
            </div>
            <div v-if="fb.type" class="feedback-row">
              <span class="feedback-label">反馈附件</span>
              <file-uploader v-model="fb.attachments" :readonly="!reportEditable" />
            </div>
          </div>
          <div v-if="!reportForm.feedbacks.length" class="empty-hint">该项目当日没有需要反馈的在办诉求</div>
        </div>

        <div v-if="reportMode === 'admin'">
          <div class="drawer-section">
            <div class="drawer-section-title">修订原因 <span class="danger-text">*</span></div>
            <a-textarea v-model="adminReason" :rows="2" placeholder="请填写本次修订原因，保存后记录修订人、时间及修改前后内容" />
          </div>
          <div v-if="reportCurrent.revisions && reportCurrent.revisions.length" class="drawer-section">
            <div class="drawer-section-title">修订记录</div>
            <a-timeline>
              <a-timeline-item v-for="(rev, index) in reportCurrent.revisions" :key="index" color="orange">
                <div class="history-title">{{ rev.operator }} · {{ rev.time }}</div>
                <div class="history-remark">修订原因：{{ rev.reason }}</div>
                <div class="revision-diff">
                  <div><span class="muted">修改前到岗：</span>{{ rev.before.attend === true ? '是' : (rev.before.attend === false ? '否' : '未填') }}</div>
                  <div><span class="muted">修改前工作内容：</span>{{ rev.before.workContent || '—' }}</div>
                  <div><span class="muted">修改后工作内容：</span>{{ rev.after.workContent || '—' }}</div>
                </div>
              </a-timeline-item>
            </a-timeline>
          </div>
        </div>
      </template>
      <template slot="footer">
        <a-button @click="reportDrawerVisible = false">关闭</a-button>
        <template v-if="reportMode === 'admin'">
          <a-button type="primary" @click="saveAdminRevision">保存修订</a-button>
        </template>
        <template v-else-if="reportEditable">
          <a-button @click="saveDraft">暂存</a-button>
          <a-button type="primary" @click="saveSubmit">提交日报</a-button>
        </template>
      </template>
    </a-modal>

    <a-modal
      title="企划校核"
      :visible="checkVisible"
      :width="560"
      @cancel="checkVisible = false"
    >
      <div v-if="checkRecord" class="check-body">
        <div class="check-info">
          <span>{{ checkRecord.date }} · {{ checkRecord.personName }} · {{ checkRecord.projectName }}</span>
        </div>
        <a-textarea v-model="checkRemark" :rows="3" placeholder="可填写校核意见（选填）" />
      </div>
      <template slot="footer">
        <a-button @click="checkVisible = false">关闭</a-button>
        <a-button type="primary" @click="confirmCheck">确认校核</a-button>
      </template>
    </a-modal>
  </div>
</template>

<script>
import moment from 'moment'
import StatusTag from '../components/StatusTag.vue'
import FileUploader from '../components/FileUploader.vue'
import { todayStr, fmtDate, weekRange } from '../utils/date'
import { buildWeeklyReport } from '../utils/reportData'
import { exportDailyExcel, exportWeeklyExcel } from '../utils/exportExcel'
import { printDailyReport, printWeeklyReport } from '../utils/printReport'

export default {
  name: 'DailyView',
  components: { StatusTag, FileUploader },
  data () {
    const week = weekRange(0)
    return {
      activeTab: 'mine',
      mineDate: moment(),
      allFilters: { date: moment(), projectId: undefined, personId: undefined, deptId: undefined, status: undefined, checkStatus: undefined },
      appliedAll: { date: todayStr(), projectId: undefined, personId: undefined, deptId: undefined, status: undefined, checkStatus: undefined },
      allPagination: { pageSize: 10, showSizeChanger: true, showTotal: total => `共 ${total} 条`, pageSizeOptions: ['10', '20', '50'] },
      monitorDate: moment(),
      monitorFilters: { projectId: undefined, deptId: undefined, personId: undefined, reportStatus: undefined, feedbackStatus: undefined, keyword: '' },
      appliedMonitor: { projectId: undefined, deptId: undefined, personId: undefined, reportStatus: undefined, feedbackStatus: undefined, keyword: '' },
      monitorPagination: { pageSize: 10, showSizeChanger: true, showTotal: total => `共 ${total} 条`, pageSizeOptions: ['10', '20', '50'] },
      feedbackOptions: ['待反馈', '有新进展', '无新进展', '因未到岗未反馈'],
      reportWeek: [moment(week[0]), moment(week[1])],
      reportDrawerVisible: false,
      reportCurrent: null,
      reportMode: 'mine',
      reportForm: { attend: null, absentReason: '', workContent: '', newIssues: '', feedbacks: [] },
      adminReason: '',
      checkVisible: false,
      checkRecord: null,
      checkRemark: ''
    }
  },
  computed: {
    projects () {
      return this.$store.db.projects
    },
    people () {
      return this.$store.db.people
    },
    departments () {
      return this.$store.db.departments
    },
    myReports () {
      const date = fmtDate(this.mineDate)
      const order = {}
      this.projects.forEach((p, index) => { order[p.id] = index })
      return this.$store.db.dailyReports
        .filter(r => r.date === date && r.personId === this.$store.currentUser.id)
        .sort((a, b) => (order[a.projectId] || 0) - (order[b.projectId] || 0))
    },
    myStats () {
      const submitted = this.myReports.filter(r => r.status === '已提交').length
      const appeals = this.myReports.reduce((sum, r) => sum + this.reportAppeals(r).length, 0)
      const unfed = this.myReports.reduce((sum, r) => sum + this.feedbackPending(r), 0)
      return {
        due: this.myReports.length,
        submitted,
        pending: this.myReports.length - submitted,
        appeals,
        unfed
      }
    },
    mineDateIsFuture () {
      return fmtDate(this.mineDate) > todayStr()
    },
    allReports () {
      const f = this.appliedAll
      const order = {}
      this.people.forEach((p, index) => { order[p.id] = index })
      let rows = this.$store.db.dailyReports.slice()
      if (f.date) rows = rows.filter(r => r.date === f.date)
      if (f.projectId) rows = rows.filter(r => r.projectId === f.projectId)
      if (f.personId) rows = rows.filter(r => r.personId === f.personId)
      if (f.deptId) rows = rows.filter(r => r.deptId === f.deptId)
      if (f.status) rows = rows.filter(r => r.status === f.status)
      if (f.checkStatus) rows = rows.filter(r => r.status === '已提交' && r.checkStatus === f.checkStatus)
      return rows.sort((a, b) => b.date.localeCompare(a.date) || (order[a.personId] || 0) - (order[b.personId] || 0))
    },
    allStats () {
      const date = this.appliedAll.date
      const rows = date ? this.$store.db.dailyReports.filter(r => r.date === date) : this.allReports
      return {
        submitted: rows.filter(r => r.status === '已提交').length,
        unfilled: rows.filter(r => r.status === '未填写').length,
        unchecked: rows.filter(r => r.status === '已提交' && r.checkStatus !== '已校核').length
      }
    },
    allColumns () {
      return [
        { title: '序号', width: 54, align: 'center', customRender: (text, record, index) => index + 1 },
        { title: '日期', dataIndex: 'date', width: 100 },
        { title: '姓名', dataIndex: 'personName', width: 74 },
        { title: '部门', dataIndex: 'deptName', width: 150 },
        { title: '项目', dataIndex: 'projectName', width: 180 },
        { title: '填报状态', dataIndex: 'status', width: 90, scopedSlots: { customRender: 'status' } },
        { title: '校核状态', dataIndex: 'checkStatus', width: 104, scopedSlots: { customRender: 'checkStatus' } },
        { title: '冻结状态', dataIndex: 'frozen', width: 90, scopedSlots: { customRender: 'frozen' } },
        { title: '是否到岗', dataIndex: 'attend', width: 80, align: 'center', scopedSlots: { customRender: 'attend' } },
        { title: '提交时间', dataIndex: 'submitTime', width: 142, scopedSlots: { customRender: 'submitTime' } },
        { title: '操作', width: 190, scopedSlots: { customRender: 'action' } }
      ]
    },
    monitorRows () {
      return this.$store.monitorRows(fmtDate(this.monitorDate))
    },
    monitorFilteredRows () {
      const f = this.appliedMonitor
      let rows = this.monitorRows
      if (f.projectId) rows = rows.filter(r => r.projectId === f.projectId)
      if (f.deptId) rows = rows.filter(r => r.deptName === this.deptName(f.deptId))
      if (f.personId) rows = rows.filter(r => r.personId === f.personId)
      if (f.reportStatus) rows = rows.filter(r => r.reportStatus === f.reportStatus)
      if (f.feedbackStatus) rows = rows.filter(r => r.feedbackStatus === f.feedbackStatus)
      if (f.keyword) {
        const kw = f.keyword.trim()
        rows = rows.filter(r => `${r.projectName}${r.title}${r.personName}${r.deptName}`.indexOf(kw) > -1)
      }
      return rows
    },
    monitorStats () {
      const due = this.$store.reportsForDate(fmtDate(this.monitorDate))
      const submitted = due.filter(r => r.status === '已提交').length
      const requiredRows = this.monitorRows.filter(r => r.required)
      const fed = requiredRows.filter(r => r.feedbackType === '有新进展' || r.feedbackType === '无新进展').length
      return {
        due: due.length,
        submitted,
        unsubmitted: due.length - submitted,
        submitRate: due.length ? Math.round((submitted / due.length) * 1000) / 10 : 0,
        required: requiredRows.length,
        fed,
        unfed: requiredRows.length - fed,
        feedbackRate: requiredRows.length ? Math.round((fed / requiredRows.length) * 1000) / 10 : 0
      }
    },
    monitorColumns () {
      return [
        { title: '项目', dataIndex: 'projectName', width: 140, scopedSlots: { customRender: 'project' } },
        { title: '诉求事项', dataIndex: 'title', width: 210, scopedSlots: { customRender: 'appealTitle' } },
        { title: '总部责任人', dataIndex: 'personName', width: 90, scopedSlots: { customRender: 'person' } },
        { title: '主责部门', dataIndex: 'deptName', width: 135 },
        { title: '联系方式', dataIndex: 'personPhone', width: 110 },
        { title: '当日日报状态', dataIndex: 'reportStatus', width: 110, scopedSlots: { customRender: 'reportStatus' } },
        { title: '今日诉求反馈', dataIndex: 'feedbackStatus', width: 120, scopedSlots: { customRender: 'feedback' } },
        { title: '到岗情况', dataIndex: 'attend', width: 80, scopedSlots: { customRender: 'attend' } },
        { title: '最新进展时间', dataIndex: 'lastProgressTime', width: 125 },
        { title: '操作', width: 150, scopedSlots: { customRender: 'action' } }
      ]
    },
    weekly () {
      if (!this.reportWeek || this.reportWeek.length !== 2) {
        return { summary: '', absentRows: [], serviceRows: [] }
      }
      return buildWeeklyReport(this.$store.db, fmtDate(this.reportWeek[0]), fmtDate(this.reportWeek[1]))
    },
    weeklyAbsentColumns () {
      return [
        { title: '序号', dataIndex: 'rowKey', width: 52, align: 'center', customRender: (t, r, i) => i + 1 },
        { title: '姓名', dataIndex: 'personName', width: 76 },
        { title: '部门', dataIndex: 'deptName', width: 160 },
        { title: '日期', dataIndex: 'date', width: 108 },
        { title: '项目', dataIndex: 'projectName', width: 190 },
        { title: '项目层面服务需求(动态调整)', dataIndex: 'needs', width: 320, scopedSlots: { customRender: 'needs' } },
        { title: '是否到岗', dataIndex: 'attend', width: 80, align: 'center' },
        { title: '未到岗原因', dataIndex: 'reason', width: 260, scopedSlots: { customRender: 'reason' } }
      ]
    },
    weeklyServiceColumns () {
      return [
        { title: '序号', dataIndex: 'rowKey', width: 52, align: 'center', customRender: (t, r, i) => i + 1 },
        { title: '姓名', dataIndex: 'personName', width: 76 },
        { title: '部门', dataIndex: 'deptName', width: 160 },
        { title: '日期', dataIndex: 'date', width: 108 },
        { title: '项目', dataIndex: 'projectName', width: 190 },
        { title: '项目层面服务需求(动态调整)', dataIndex: 'needs', width: 300, scopedSlots: { customRender: 'needs' } },
        { title: '是否到岗', dataIndex: 'attend', width: 80, align: 'center' },
        { title: '当日工作开展情况', dataIndex: 'workContent', width: 320, scopedSlots: { customRender: 'work' } },
        { title: '今日项目反馈需协调解决问题', dataIndex: 'issues', width: 220, scopedSlots: { customRender: 'issues' } }
      ]
    },
    reportEditable () {
      if (!this.reportCurrent) return false
      if (this.reportMode === 'admin') return true
      if (this.reportMode === 'view') return false
      return !this.reportCurrent.frozen
    },
    reportDrawerTitle () {
      if (!this.reportCurrent) return '项目日报'
      if (this.reportMode === 'admin') return `管理员修订 · ${this.reportCurrent.projectName}`
      return `${this.reportCurrent.personName} · ${this.reportCurrent.projectName} 项目日报`
    }
  },
  mounted () {
    this.applyTabQuery()
  },
  watch: {
    '$route.query': function () {
      this.applyTabQuery()
    }
  },
  methods: {
    applyTabQuery () {
      const tab = this.$route.query.tab
      if (tab && ['mine', 'all', 'monitor', 'weekly'].indexOf(tab) > -1) this.activeTab = tab
    },
    deptName (id) {
      const dept = this.$store.getDept(id)
      return dept ? dept.name : id
    },
    reportAppeals (report) {
      return this.$store.feedbackAppeals(report.personId, report.projectId)
    },
    feedbackTotal (report) {
      return this.reportAppeals(report).length
    },
    feedbackDone (report) {
      return this.reportAppeals(report).filter(a => (report.feedbacks || []).some(f => f.appealId === a.id && f.type)).length
    },
    feedbackPending (report) {
      return this.feedbackTotal(report) - this.feedbackDone(report)
    },
    backToToday () {
      this.mineDate = moment()
    },
    applyAllFilter () {
      this.appliedAll = { ...this.allFilters, date: this.allFilters.date ? fmtDate(this.allFilters.date) : '' }
      this.allPagination = { ...this.allPagination, current: 1 }
    },
    resetAllFilter () {
      this.allFilters = { date: moment(), projectId: undefined, personId: undefined, deptId: undefined, status: undefined, checkStatus: undefined }
      this.applyAllFilter()
    },
    applyMonitorFilter () {
      this.appliedMonitor = { ...this.monitorFilters }
      this.monitorPagination = { ...this.monitorPagination, current: 1 }
    },
    resetMonitorFilter () {
      this.monitorFilters = { projectId: undefined, deptId: undefined, personId: undefined, reportStatus: undefined, feedbackStatus: undefined, keyword: '' }
      this.applyMonitorFilter()
    },
    setWeek (type) {
      const week = weekRange(type === 'last' ? -1 : 0)
      this.reportWeek = [moment(week[0]), moment(week[1])]
    },
    openReport (report, mode) {
      this.$store.ensureReportFeedbacks(report)
      this.reportCurrent = report
      this.reportMode = mode
      this.reportForm = {
        attend: report.attend,
        absentReason: report.absentReason || '',
        workContent: report.workContent || '',
        newIssues: report.newIssues || '',
        feedbacks: JSON.parse(JSON.stringify(report.feedbacks || []))
      }
      this.adminReason = ''
      this.reportDrawerVisible = true
    },
    openMonitorReport (record) {
      if (!record.reportId) return
      const report = this.$store.db.dailyReports.find(r => r.id === record.reportId)
      if (!report) return
      const editable = report.personId === this.$store.currentUser.id && !report.frozen
      this.openReport(report, editable ? 'mine' : 'view')
    },
    openMonitorAppeal (record) {
      this.$router.push({ path: '/appeals', query: { id: record.appealId } })
    },
    appealStatus (appealId) {
      const appeal = this.$store.db.appeals.find(a => a.id === appealId)
      return appeal ? appeal.status : ''
    },
    validateReport () {
      if (this.reportForm.attend === null || typeof this.reportForm.attend === 'undefined') {
        this.$message.warning('请选择是否到岗')
        return false
      }
      if (this.reportForm.attend === false && !this.reportForm.absentReason.trim()) {
        this.$message.warning('未到岗需填写未到岗原因')
        return false
      }
      if (this.reportForm.attend === true && !this.reportForm.workContent.trim()) {
        this.$message.warning('到岗时需填写当日工作开展情况')
        return false
      }
      if (this.reportForm.attend === true) {
        const activeIds = this.reportAppeals(this.reportCurrent).map(a => a.id)
        for (let i = 0; i < this.reportForm.feedbacks.length; i++) {
          const fb = this.reportForm.feedbacks[i]
          if (activeIds.indexOf(fb.appealId) === -1) continue
          if (!fb.type) {
            this.$message.warning(`请处理在办诉求“${fb.appealTitle}”：选择有新进展或无新进展`)
            return false
          }
          if (fb.type === '有新进展' && !fb.content.trim()) {
            this.$message.warning(`请填写“${fb.appealTitle}”的当日诉求进展`)
            return false
          }
        }
      }
      return true
    },
    saveDraft () {
      const res = this.$store.saveReport(this.reportCurrent.id, this.reportForm, 'draft')
      if (!res.ok) return this.$message.error(res.message)
      this.reportDrawerVisible = false
      this.$message.success('日报已暂存')
    },
    saveSubmit () {
      if (!this.validateReport()) return
      const res = this.$store.saveReport(this.reportCurrent.id, this.reportForm, 'submit')
      if (!res.ok) return this.$message.error(res.message)
      this.reportDrawerVisible = false
      this.$message.success('日报已提交，企划监控数据已同步更新')
    },
    saveAdminRevision () {
      if (!this.adminReason.trim()) return this.$message.warning('请填写修订原因')
      const res = this.$store.reviseReport(this.reportCurrent.id, this.reportForm, this.adminReason)
      if (!res.ok) return this.$message.error(res.message)
      this.reportDrawerVisible = false
      this.$message.success('日报已修订，已保留修订记录并标记为需重新校核')
    },
    openCheck (record) {
      this.checkRecord = record
      this.checkRemark = ''
      this.checkVisible = true
    },
    confirmCheck () {
      this.$store.checkReport(this.checkRecord.id, this.checkRemark)
      this.checkVisible = false
      this.$message.success('日报已校核')
    },
    monitorRowClass (record) {
      return record.required && !record.feedbackType ? 'row-unfed' : ''
    },
    exportDailyExcelByDate () {
      const date = this.appliedAll.date || todayStr()
      exportDailyExcel(date)
      this.$message.success('日报 Excel 文件已生成并开始下载')
    },
    printDailyPdf () {
      const date = this.appliedAll.date || todayStr()
      printDailyReport(date)
    },
    exportWeeklyExcel () {
      if (!this.reportWeek || this.reportWeek.length !== 2) return
      exportWeeklyExcel(fmtDate(this.reportWeek[0]), fmtDate(this.reportWeek[1]))
      this.$message.success('周报 Excel 文件已生成并开始下载')
    },
    printWeeklyPdf () {
      if (!this.reportWeek || this.reportWeek.length !== 2) return
      printWeeklyReport(fmtDate(this.reportWeek[0]), fmtDate(this.reportWeek[1]))
    }
  }
}
</script>

<style scoped>
.tab-body {
  padding-top: 6px;
}
.mine-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 12px 0;
}
.mine-toolbar-label {
  font-size: 13px;
  color: #4a5d72;
}
.mine-stats {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  border: 1px solid #e8eff7;
  border-radius: 3px;
  background: #fbfdff;
  margin-bottom: 14px;
}
.mine-stat {
  padding: 10px 16px;
  border-right: 1px solid #eef3f9;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12.5px;
  color: #6b8096;
}
.mine-stat:last-child {
  border-right: 0;
}
.mine-stat b {
  font-size: 20px;
  color: #1f3a56;
}
.mine-stat b.green { color: #20a06b; }
.mine-stat b.red { color: #e04b4b; }
.mine-stat b.orange { color: #fa8c16; }
.mine-cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}
.mine-card {
  border: 1px solid #e6eef7;
  border-radius: 3px;
  padding: 12px 14px;
  background: #fff;
  display: flex;
  flex-direction: column;
  min-height: 196px;
}
.mine-card:hover {
  box-shadow: 0 2px 8px rgba(50, 105, 160, 0.08);
}
.mine-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.mine-project {
  font-size: 14px;
  font-weight: 700;
  color: #22384e;
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.mine-project span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mine-project .anticon {
  color: #1890ff;
}
.mine-card-tags {
  display: flex;
  gap: 4px;
  flex: none;
}
.mine-card-meta {
  font-size: 11.5px;
  color: #8a9cb0;
  margin-top: 5px;
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.mine-card-meta .divider {
  color: #d5dfe9;
}
.mine-card-needs {
  margin-top: 8px;
  font-size: 12px;
  color: #5b7189;
  line-height: 18px;
  background: #f8fbff;
  border: 1px solid #eef5fc;
  border-radius: 2px;
  padding: 7px 9px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}
.mine-card-foot {
  margin-top: auto;
  padding-top: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.mine-counts {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #6b8096;
}
.mine-counts b {
  color: #2f4358;
}
.mine-counts b.green { color: #20a06b; }
.mine-counts b.red { color: #e04b4b; }
.mine-actions {
  display: flex;
  gap: 8px;
}
.empty-block {
  grid-column: 1 / -1;
  padding: 30px 0;
  background: #fafcfe;
  border: 1px dashed #e4eef8;
  border-radius: 3px;
}
.inline-stats {
  display: flex;
  gap: 20px;
  font-size: 12.5px;
  color: #6b8096;
  margin-bottom: 10px;
}
.inline-stats b {
  color: #2f4358;
  margin-left: 2px;
}
.inline-stats b.green { color: #20a06b; }
.inline-stats b.red { color: #e04b4b; }
.inline-stats b.orange { color: #fa8c16; }
.monitor-head {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 12px;
}
.monitor-date {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
}
.monitor-stats {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}
.contact-card {
  font-size: 12.5px;
  line-height: 21px;
  min-width: 180px;
}
.appeal-title-link {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-align: left;
  line-height: 18px;
}
.row-unfed td {
  background: #fff7f7 !important;
}
.monitor-legend {
  margin-top: 10px;
  font-size: 11.5px;
}
.weekly-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}
.weekly-actions {
  margin-left: auto;
  display: flex;
  gap: 8px;
}
.weekly-summary {
  background: #f7fbff;
  border: 1px solid #dcecfa;
  border-radius: 3px;
  padding: 10px 14px;
  font-size: 12.5px;
  color: #35536f;
  line-height: 22px;
  white-space: pre-line;
  margin-bottom: 14px;
}
.weekly-section-title {
  font-size: 13px;
  font-weight: 700;
  color: #263e55;
  margin-bottom: 8px;
  padding-left: 8px;
  border-left: 3px solid #1890ff;
  line-height: 15px;
}
.needs-cell {
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  line-height: 17px;
  font-size: 12px;
}
.weekly-foot {
  margin-top: 12px;
  font-size: 11.5px;
}
.feedback-card {
  border: 1px solid #e8eff7;
  border-radius: 3px;
  padding: 10px 12px;
  margin-bottom: 10px;
  background: #fcfdff;
}
.feedback-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 5px;
}
.feedback-index {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #e8f3ff;
  color: #1890ff;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
}
.feedback-title {
  font-size: 13px;
  font-weight: 600;
  color: #2c4359;
}
.feedback-latest {
  font-size: 12px;
  color: #5b7189;
  line-height: 18px;
  background: #f8fbfe;
  padding: 5px 8px;
  border-radius: 2px;
  margin-bottom: 8px;
}
.feedback-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 8px;
}
.feedback-label {
  width: 112px;
  flex: none;
  font-size: 12.5px;
  color: #4a5d72;
  padding-top: 5px;
}
.feedback-row > .ant-radio-group,
.feedback-row > .ant-input,
.feedback-row > .ant-input-affix-wrapper,
.feedback-row > *:not(.feedback-label) {
  flex: 1;
  min-width: 0;
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
.revision-diff {
  margin-top: 5px;
  background: #fffaf0;
  border: 1px solid #ffe9bf;
  border-radius: 2px;
  padding: 6px 9px;
  font-size: 11.5px;
  color: #8a6420;
  line-height: 18px;
}
.check-info {
  font-size: 12.5px;
  color: #52667c;
  margin-bottom: 10px;
}
.history-title {
  font-size: 13px;
  color: #2f4358;
  font-weight: 600;
}
.history-remark {
  font-size: 12px;
  color: #5b7189;
  line-height: 18px;
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
@media (max-width: 1360px) {
  .mine-cards {
    grid-template-columns: 1fr;
  }
  .mine-stats {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}
</style>
