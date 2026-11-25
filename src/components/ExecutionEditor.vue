<template>
  <a-modal visible :title="admin ? '管理员编辑项目落实情况' : '填写项目落实情况'" :width="760" :mask-closable="false"
    :ok-text="admin ? '保存修改' : '保存'" @ok="save" @cancel="$emit('close')">
    <div class="detail-grid">
      <div class="detail-item"><span class="detail-label">事项编码</span><span class="detail-value">{{ record.workId }}</span></div>
      <div class="detail-item"><span class="detail-label">重点工作名称</span><span class="detail-value">{{ record.title }}</span></div>
      <div class="detail-item full"><span class="detail-label">重点工作内容</span><span class="detail-value">{{ record.workContent }}</span></div>
      <div class="detail-item"><span class="detail-label">所属分公司</span>{{ record.company }}</div>
      <div class="detail-item"><span class="detail-label">帮扶项目</span>{{ record.projectName }}</div>
      <div class="detail-item"><span class="detail-label">帮扶人员</span>{{ record.helperNames }}</div>
      <div class="detail-item"><span class="detail-label">当前操作人</span>{{ $store.currentUser.name }}</div>
    </div>
    <a-form-model layout="vertical" class="section-block">
      <a-form-model-item label="项目落实情况" required><a-textarea v-model="form.content" :rows="3" /></a-form-model-item>
      <a-form-model-item label="存在问题"><a-textarea v-model="form.issues" :rows="2" /></a-form-model-item>
      <a-form-model-item label="改进建议"><a-textarea v-model="form.suggestions" :rows="2" /></a-form-model-item>
      <a-form-model-item label="相关附件"><file-uploader v-model="form.attachments" /></a-form-model-item>
    </a-form-model>
  </a-modal>
</template>
<script>
import FileUploader from './FileUploader.vue'

export default {
  name: 'ExecutionEditor',
  components: { FileUploader },
  props: { record: { type: Object, required: true }, admin: Boolean },
  data () {
    const { content, issues, suggestions, attachments } = this.record
    return { form: { content, issues: issues || '', suggestions: suggestions || '', attachments: attachments.slice() } }
  },
  methods: {
    save () {
      const result = this.$store.saveExecution(this.record.workId, this.record.projectId, this.form, this.admin)
      if (!result.ok) return this.$message.warning(result.message)
      this.$message.success('项目落实情况已保存')
      this.$emit('close')
    }
  }
}
</script>
