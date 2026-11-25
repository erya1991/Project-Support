<template>
  <a-select :value="value" show-search option-filter-prop="children" :placeholder="placeholder" style="width:100%" @change="$emit('input', $event)">
    <a-select-opt-group v-for="group in groups" :key="group.name" :label="group.name">
      <a-select-option v-for="p in group.people" :key="p.id" :value="p.id">{{ nameOnly ? p.name : p.name + ' · ' + $store.orgOf(p).unitName }}</a-select-option>
    </a-select-opt-group>
  </a-select>
</template>
<script>
export default {
  name: 'PersonSelect', props: { value: String, headquarters: Boolean, nameOnly: Boolean, placeholder: { type: String, default: '请选择人员' } },
  computed: {
    groups () {
      return (this.headquarters ? ['总部'] : ['总部', '分公司', '项目'])
        .map(name => ({ name, people: this.$store.db.people.filter(p => p.orgType === name) }))
    }
  }
}
</script>
