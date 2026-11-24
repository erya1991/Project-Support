<template>
  <div class="business-list" :class="{ 'ledger-list': fill }">
    <list-query :type="type" v-model="filters" @query="query" @reset="reset" />
    <div v-if="$scopedSlots.toolbar" class="toolbar"><slot name="toolbar" :rows="rows" :filters="applied" /></div>
    <div ref="tableSpace" class="table-space">
      <business-table ref="table" :type="tableType || type" :rows="rows" :height="tableHeight" :compact="fill" :action-width="actionWidth" @detail="selected = $event">
        <template v-if="$scopedSlots.actions" #actions="{row}"><slot name="actions" :row="row" /></template>
      </business-table>
    </div>
    <record-detail v-if="selected" :type="type" :record="selected" @close="selected = null" />
  </div>
</template>
<script>
import BusinessTable from './BusinessTable.vue'
import ListQuery from './ListQuery.vue'
import RecordDetail from './RecordDetail.vue'
import { emptyListFilters, listRows } from '../utils/businessLists'

export default {
  name: 'BusinessList', components: { BusinessTable, ListQuery, RecordDetail },
  props: { type: { type: String, required: true }, tableType: String, preset: Object, fill: Boolean, actionWidth: Number, deepLink: Boolean },
  data () {
    const filters = { ...emptyListFilters(this.type, this.$store), ...this.preset }
    return { filters, applied: { ...filters }, selected: null, tableHeight: undefined }
  },
  computed: { rows () { return listRows(this.type, this.$store, this.applied) } },
  watch: {
    preset () { this.reset(this.preset) },
    '$route.fullPath' () { this.openLinked() },
    '$store.state.actorId' () { this.selected = null; this.$refs.table.firstPage() }
  },
  mounted () {
    this.openLinked()
    if (this.fill) {
      this.observer = new ResizeObserver(() => { this.tableHeight = Math.max(80, this.$refs.tableSpace.clientHeight - 106) })
      this.observer.observe(this.$refs.tableSpace)
    }
  },
  beforeDestroy () { if (this.observer) this.observer.disconnect() },
  methods: {
    query () { this.applied = { ...this.filters }; this.$refs.table.firstPage() },
    reset (preset) { this.filters = { ...emptyListFilters(this.type, this.$store), ...preset }; this.query() },
    openLinked () {
      if (!this.deepLink) return
      const id = this.$route.query.id
      this.selected = id ? listRows(this.type, this.$store).find(row => row.id === id) || null : null
    }
  }
}
</script>
