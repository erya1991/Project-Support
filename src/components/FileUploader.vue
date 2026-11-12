<template>
  <div class="file-box">
    <div v-if="value && value.length" class="file-list">
      <div v-for="(file, index) in value" :key="index" class="file-chip">
        <a-icon type="paper-clip" />
        <span class="file-name" :title="file.name">{{ file.name }}</span>
        <a-icon v-if="!readonly" type="close" class="file-remove" @click="remove(index)" />
      </div>
    </div>
    <div v-else class="file-empty">{{ readonly ? '暂无附件' : '暂未上传附件' }}</div>
    <a-upload
      v-if="!readonly"
      :before-upload="beforeUpload"
      :show-upload-list="false"
      :multiple="multiple"
      accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
    >
      <a-button size="small" class="upload-btn">
        <a-icon type="upload" /> {{ buttonText }}
      </a-button>
    </a-upload>
    <div v-if="tip" class="file-tip">{{ tip }}</div>
  </div>
</template>

<script>
export default {
  name: 'FileUploader',
  props: {
    value: { type: Array, default: () => [] },
    readonly: { type: Boolean, default: false },
    multiple: { type: Boolean, default: true },
    buttonText: { type: String, default: '上传附件' },
    tip: { type: String, default: '' }
  },
  methods: {
    beforeUpload (file) {
      const list = (this.value || []).slice()
      list.push({ name: file.name, size: file.size })
      this.$emit('input', list)
      this.$emit('change', list)
      return false
    },
    remove (index) {
      const list = (this.value || []).slice()
      list.splice(index, 1)
      this.$emit('input', list)
      this.$emit('change', list)
    }
  }
}
</script>

<style scoped>
.file-box {
  width: 100%;
}
.file-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 7px;
}
.file-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  background: #f5f9fe;
  border: 1px solid #e1ecf8;
  border-radius: 2px;
  padding: 3px 8px;
  font-size: 12px;
  color: #456d92;
  max-width: 100%;
}
.file-name {
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.file-remove {
  cursor: pointer;
  color: #a5b7c9;
  font-size: 10px;
}
.file-remove:hover {
  color: #f5222d;
}
.file-empty {
  font-size: 12px;
  color: #a5b4c4;
  margin-bottom: 5px;
}
.file-tip {
  font-size: 11.5px;
  color: #9aabbf;
  margin-top: 4px;
  line-height: 17px;
}
.upload-btn {
  font-size: 12px;
  color: #1890ff;
  border-color: #b7d9f8;
  background: #f8fcff;
}
</style>
