<template>
  <div>
    <business-list type="relations" deep-link :action-width="120">
      <template #toolbar><a-button type="primary" icon="plus" @click="open()">新增帮扶关系</a-button></template>
      <template #actions="{row}">
        <a class="link-btn" @click="open(row)">编辑</a>
        <a-popconfirm :title="'确认' + nextStatus(row) + '这条帮扶关系？'" @confirm="toggle(row)">
          <a class="link-btn">{{ nextStatus(row) }}</a>
        </a-popconfirm>
        <a class="link-btn" @click="selected = row">历史</a>
      </template>
    </business-list>
    <record-detail v-if="selected" type="relations" :record="selected" @close="selected = null" />
    <a-modal :visible="visible" :title="id ? '编辑帮扶关系' : '新增帮扶关系'" :width="740" :mask-closable="false" @cancel="visible = false" @ok="save" ok-text="保存">
      <a-form-model layout="vertical">
        <div class="form-grid">
          <a-form-model-item label="总部帮扶人员" required><person-select v-model="form.personId" headquarters /></a-form-model-item>
          <a-form-model-item label="总部所属部门"><div class="readonly-box">{{ person ? $store.orgOf(person).unitName : '选择人员后带出' }}</div></a-form-model-item>
          <a-form-model-item label="工号及职务"><div class="readonly-box">{{ person ? person.employeeNo + ' · ' + person.title : '—' }}</div></a-form-model-item>
          <a-form-model-item label="人员联系方式"><div class="readonly-box">{{ person ? person.phone : '—' }}</div></a-form-model-item>
        </div>
        <org-target-fields :type="form.type" :company="form.company" :target-id="form.targetId" relation @change="updateTarget" />
        <a-form-model-item label="帮扶状态"><status-tag :status="form.status" /></a-form-model-item>
      </a-form-model>
    </a-modal>
  </div>
</template>
<script>
import BusinessList from '../components/BusinessList.vue'
import RecordDetail from '../components/RecordDetail.vue'
import OrgTargetFields from '../components/OrgTargetFields.vue'
import PersonSelect from '../components/PersonSelect.vue'
import StatusTag from '../components/StatusTag.vue'

const blank = () => ({ personId: undefined, type: '项目级', company: undefined, targetId: undefined, status: '启用' })
export default {
  name: 'RelationsView', components: { BusinessList, RecordDetail, OrgTargetFields, PersonSelect, StatusTag },
  data: () => ({ visible: false, id: '', selected: null, form: blank() }),
  computed: { person () { return this.$store.getPerson(this.form.personId) } },
  methods: {
    nextStatus (row) { return row.status === '启用' ? '停用' : '启用' },
    open (row) { this.id = row && row.id; this.form = row ? { ...row } : blank(); this.visible = true },
    updateTarget (values) { Object.assign(this.form, values) },
    save () {
      const res = this.$store.saveRelation(this.form, this.id)
      if (!res.ok) return this.$message.warning(res.message)
      this.visible = false
      this.$message.success('帮扶关系已保存')
    },
    toggle (row) {
      const result = this.$store.setRelationStatus(row.id, this.nextStatus(row))
      if (!result.ok) return this.$message.warning(result.message)
      this.$message.success('帮扶关系已' + this.nextStatus(row))
    }
  }
}
</script>
