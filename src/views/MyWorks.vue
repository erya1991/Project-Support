<template>
  <div>
    <div class="work-summary">
      <div>应填事项 <b>{{ summary.due }}</b></div><div>已填事项 <b class="success-text">{{ summary.filled }}</b></div>
      <div>待填事项 <b>{{ summary.pending }}</b></div>
    </div>
    <business-list type="mine" deep-link>
      <template #actions="{row}"><a class="link-btn" @click="open(row)">{{ row.status === '待填写' ? '填写' : '编辑' }}</a><a class="link-btn" @click="detail = row">查看</a></template>
    </business-list>
    <record-detail v-if="detail" type="executions" :record="detail" @close="detail = null" />
    <a-modal :visible="!!record" title="填写项目落实情况" :width="760" :mask-closable="false" ok-text="保存" @ok="save" @cancel="record = null">
      <template v-if="record">
        <div class="drawer-section-title">{{ record.title }}</div>
        <div class="alert-note pre-line">{{ record.workContent }}</div>
        <div class="detail-grid">
          <div class="detail-item"><span class="detail-label">所属分公司</span>{{ record.company }}</div>
          <div class="detail-item"><span class="detail-label">帮扶项目</span>{{ record.projectName }}</div>
          <div class="detail-item"><span class="detail-label">帮扶人员</span>{{ record.helperNames }}</div>
          <div class="detail-item"><span class="detail-label">当前填报人</span>{{ $store.currentUser.name }}</div>
        </div>
        <a-form-model layout="vertical" class="section-block">
          <a-form-model-item label="项目落实情况" required><a-textarea v-model="form.content" :rows="5" /></a-form-model-item>
          <a-form-model-item label="相关附件"><file-uploader v-model="form.attachments" /></a-form-model-item>
        </a-form-model>
      </template>
    </a-modal>
  </div>
</template>
<script>
import BusinessList from '../components/BusinessList.vue'
import RecordDetail from '../components/RecordDetail.vue'
import FileUploader from '../components/FileUploader.vue'
export default {
  name: 'MyWorksView', components: { BusinessList, RecordDetail, FileUploader },
  data: () => ({ record: null, detail: null, form: { content: '', attachments: [] } }),
  computed: { summary () { return this.$store.personalWork() } },
  methods: {
    open (row) { this.record = row; this.form = { content: row.content, attachments: row.attachments.slice() } },
    save () {
      const res = this.$store.saveExecution(this.record.workId, this.record.projectId, this.form)
      if (!res.ok) return this.$message.warning(res.message)
      this.record = null
      this.$message.success('项目落实情况已保存')
    }
  }
}
</script>
