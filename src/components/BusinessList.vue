<template>
  <div class="business-list" :class="{ 'ledger-list': fill }">
    <list-query :type="type" v-model="filters" @query="query" @reset="reset" />
    <div v-if="$scopedSlots.toolbar" class="toolbar"><slot name="toolbar" :rows="rows" :filters="applied" /></div>
    <div ref="tableSpace" class="table-space">
      <business-table ref="table" :type="tableType || type" :rows="rows" :height="tableHeight" :available-width="tableWidth" :compact="fill" :action-width="actionWidth"
        @detail="openDetail($event)" @progress="openDetail($event, 'projects')">
        <template v-if="$scopedSlots.actions" #actions="{row}"><slot name="actions" :row="row" /></template>
      </business-table>
    </div>
    <record-detail v-if="selected" :type="type" :record="selected" :mode="detailMode" @close="selected = null" />
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
    return { filters, applied: { ...filters }, selected: null, detailMode: 'detail', tableHeight: undefined, tableWidth: undefined }
  },
  computed: { rows () { return listRows(this.type, this.$store, this.applied) } },
  watch: {
    preset () { this.reset(this.preset) },
    '$route.fullPath' () { this.openLinked() },
    '$store.state.actorId' () { this.selected = null; this.$refs.table.firstPage() }
  },
  mounted () {
    this.openLinked()
    const measureWidth = ['appeals', 'suggestions'].includes(this.type)
    if (this.fill || measureWidth) {
      const space = this.$refs.tableSpace
      const resize = () => {
        if (measureWidth) this.tableWidth = space.clientWidth
        if (this.fill) this.tableHeight = Math.max(80, space.clientHeight - 106)
      }
      resize()
      this.observer = new ResizeObserver(resize)
      this.observer.observe(space)
    }
  },
  beforeDestroy () { if (this.observer) this.observer.disconnect() },
  methods: {
    openDetail (row, mode = 'detail') { this.detailMode = mode; this.selected = row },
    query () { this.applied = { ...this.filters }; this.$refs.table.firstPage() },
    reset (preset) { this.filters = { ...emptyListFilters(this.type, this.$store), ...preset }; this.query() },
    openLinked () {
      if (!this.deepLink) return
      const id = this.$route.query.id
      this.openDetail(id ? listRows(this.type, this.$store).find(row => row.id === id) : null)
    }
  }
}
</script>
