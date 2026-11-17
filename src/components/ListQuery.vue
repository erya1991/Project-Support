<template>
  <div class="filter-bar business-query" :class="{ expanded }">
    <a-form layout="inline" @submit.prevent="$emit('query')">
      <div class="query-field-area">
      <a-form-item v-for="field in visibleFields" :key="field.key" :label="field.label">
        <a-input v-if="field.kind === 'text'" :value="value[field.key]" :placeholder="'请输入' + field.label" allow-clear style="width:160px" @input="update(field.key, $event.target.value)" @pressEnter="$emit('query')" />
        <a-select v-else-if="field.kind === 'select'" :value="value[field.key]" :placeholder="'全部' + field.label" allow-clear show-search option-filter-prop="children" style="width:160px" @change="update(field.key, $event)">
          <a-select-option v-for="option in field.options" :key="option.value" :value="option.value">{{ option.label }}</a-select-option>
        </a-select>
        <a-date-picker v-else-if="field.kind === 'date'" :value="value[field.key]" placeholder="全部日期" style="width:150px" @change="update(field.key, $event)" />
        <a-range-picker v-else-if="field.kind === 'range'" :value="value[field.key]" style="width:230px" @change="update(field.key, $event)" />
        <a-input-number v-else :value="value[field.key]" :min="0" :precision="0" placeholder="全部数量" style="width:130px" @change="update(field.key, $event)" />
      </a-form-item>
      </div>
      <a-form-item class="query-actions"><div class="filter-actions">
        <a-button type="primary" @click="$emit('query')"><a-icon type="search" />查询</a-button>
        <a-button @click="$emit('reset')"><a-icon type="reload" />重置</a-button>
        <a class="filter-toggle" @click="expanded = !expanded">{{ expanded ? '收起' : '展开' }} <a-icon :type="expanded ? 'up' : 'down'" /></a>
      </div></a-form-item>
    </a-form>
  </div>
</template>

<script>
import { listFilterFields } from '../utils/businessLists'
export default {
  name: 'ListQuery',
  props: { type: { type: String, required: true }, value: { type: Object, required: true } },
  data: () => ({ expanded: false }),
  computed: {
    fields () { return listFilterFields(this.type, this.$store) },
    visibleFields () { return this.expanded ? this.fields : this.fields.slice(0, 4) }
  },
  watch: { type () { this.expanded = false } },
  methods: { update (key, value) { this.$emit('input', { ...this.value, [key]: value }) } }
}
</script>

<style scoped>
.business-query { margin-bottom:12px; padding:10px 12px 0; }
.business-query .ant-form { display:flex; align-items:flex-start; gap:8px; }
.query-field-area { flex:1; min-width:0; }
.business-query .ant-form-item { margin-bottom:10px; }
.business-query .query-actions { margin-right:0; flex:none; }
</style>
