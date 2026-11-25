<template>
  <div>
    <business-list type="works" deep-link :action-width="178">
      <template #toolbar="{rows}">
        <a-button type="primary" icon="plus" @click="open()">新增重点工作</a-button>
        <a-button icon="download" @click="download(rows)">导出 Excel</a-button>
        <router-link class="toolbar-right" to="/works/mine">我的重点工作 <a-icon type="right" /></router-link>
      </template>
      <template #actions="{row}">
        <a class="link-btn" @click="open(row)">编辑</a>
        <a class="link-btn" @click="showDetail(row, 'admin')">管理员编辑</a>
        <a-popconfirm :title="'确认' + nextStatus(row) + '该事项？'" @confirm="toggle(row)"><a class="link-btn">{{ nextStatus(row) }}</a></a-popconfirm>
        <a class="link-btn" @click="showDetail(row)">详情</a>
      </template>
    </business-list>
    <record-detail v-if="detail" type="works" :record="detail" :mode="detailMode" @close="detail = null" />
    <a-modal :visible="visible" :title="id ? '编辑重点工作' : '新增重点工作'" :width="750" :mask-closable="false" @cancel="visible = false" @ok="save" ok-text="保存">
      <a-form-model layout="vertical">
        <a-form-model-item v-if="id" label="事项编码"><div class="readonly-box">{{ id }}</div></a-form-model-item>
        <div class="form-grid">
          <a-form-model-item label="所属体系" required>
            <a-select v-model="form.system" placeholder="请选择体系" @change="form.deptId = undefined"><a-select-option v-for="s in $store.db.systems" :key="s">{{ s }}</a-select-option></a-select>
          </a-form-model-item>
          <a-form-model-item label="归属部门" required>
            <a-select v-model="form.deptId" :disabled="!form.system" placeholder="请选择总部部门"><a-select-option v-for="d in departments" :key="d.id">{{ d.name }}</a-select-option></a-select>
          </a-form-model-item>
        </div>
        <a-form-model-item label="重点工作名称" required><a-input v-model="form.title" :max-length="100" /></a-form-model-item>
        <a-form-model-item label="重点工作内容" required><a-textarea v-model="form.content" :rows="4" /></a-form-model-item>
        <a-form-model-item label="状态" required><a-radio-group v-model="form.status"><a-radio value="启用">启用</a-radio><a-radio value="停用">停用</a-radio></a-radio-group></a-form-model-item>
      </a-form-model>
    </a-modal>
  </div>
</template>
<script>
import BusinessList from '../components/BusinessList.vue'
import RecordDetail from '../components/RecordDetail.vue'
import { exportWorksExcel } from '../utils/exportExcel'

const blank = () => ({ system: undefined, deptId: undefined, title: '', content: '', status: '启用' })
export default {
  name: 'WorksView', components: { BusinessList, RecordDetail },
  data: () => ({ form: blank(), visible: false, id: '', detail: null, detailMode: 'detail' }),
  computed: { departments () { return this.$store.db.departments.filter(d => d.system === this.form.system) } },
  methods: {
    showDetail (row, mode = 'detail') { this.detailMode = mode; this.detail = row },
    open (row) { this.id = row && row.id; this.form = row ? { ...row } : blank(); this.visible = true },
    nextStatus (row) { return row.status === '启用' ? '停用' : '启用' },
    toggle (row) {
      const res = this.$store.setWorkStatus(row.id, this.nextStatus(row))
      if (!res.ok) return this.$message.warning(res.message)
      this.$message.success('事项已' + this.nextStatus(row))
    },
    save () {
      const res = this.$store.saveWork(this.form, this.id)
      if (!res.ok) return this.$message.warning(res.message)
      this.visible = false
      this.$message.success('重点工作已保存')
    },
    download (rows) { exportWorksExcel(rows); this.$message.success('重点工作明细已导出') }
  }
}
</script>
