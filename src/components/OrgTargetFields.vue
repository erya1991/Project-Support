<template>
  <div class="form-grid">
    <a-form-model-item :label="relation ? '帮扶对象类型' : '所属对象类型'" required>
      <a-radio-group :value="type" @change="changeType($event.target.value)">
        <a-radio value="部门级">{{ relation ? '部门级' : '部门' }}</a-radio><a-radio value="项目级">{{ relation ? '项目级' : '项目' }}</a-radio>
      </a-radio-group>
    </a-form-model-item>
    <a-form-model-item label="所属分公司" required>
      <a-select :value="company" placeholder="请选择分公司" @change="$emit('change', { company: $event, targetId: undefined })">
        <a-select-option v-for="c in $store.db.companies" :key="c">{{ c }}</a-select-option>
      </a-select>
    </a-form-model-item>
    <a-form-model-item :label="(relation ? '帮扶' : '所属') + unitLabel" required>
      <a-select :value="targetId" :disabled="!company || !type" show-search option-filter-prop="children" :placeholder="'请选择' + unitLabel"
        @change="$emit('change', { targetId: $event })">
        <a-select-option v-for="unit in units" :key="unit.id">{{ unit.name }}</a-select-option>
      </a-select>
    </a-form-model-item>
    <a-form-model-item v-if="relation" label="对应负责人及联系方式">
      <div class="readonly-box">{{ selected ? selected.manager + ' · ' + selected.managerPhone : '选择对象后带出' }}</div>
    </a-form-model-item>
  </div>
</template>
<script>
export default {
  name: 'OrgTargetFields',
  props: { type: String, company: String, targetId: String, relation: Boolean },
  computed: {
    unitLabel () { return this.type === '项目级' ? '项目' : '部门' },
    units () { return (this.type === '项目级' ? this.$store.db.projects : this.$store.db.branchDepartments).filter(x => x.company === this.company) },
    selected () { return this.units.find(x => x.id === this.targetId) }
  },
  methods: { changeType (type) { this.$emit('change', { type, targetId: undefined }) } }
}
</script>
