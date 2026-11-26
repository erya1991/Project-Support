<template>
  <a-table :columns="columns" :data-source="rows" table-layout="fixed" row-key="id" :pagination="pagination"
    :size="compact ? 'small' : 'middle'" :scroll="height ? { y: height } : undefined" @change="onChange">
    <div slot="actions" slot-scope="text, row" class="table-actions"><slot name="actions" :row="row" /></div>
  </a-table>
</template>
<script>
import StatusTag from './StatusTag.vue'
import { listColumns, fitColumns, detailLinks } from '../utils/businessLists'

export default {
  name: 'BusinessTable',
  props: { type: { type: String, required: true }, rows: { type: Array, required: true }, height: Number, compact: Boolean,
    actionWidth: { type: Number, default: 120 } },
  data () {
    return { pagination: { current: 1, pageSize: 10, showSizeChanger: true, pageSizeOptions: ['10', '20', '50'],
      showTotal: total => '共 ' + total + ' 条' } }
  },
  computed: {
    columns () {
      const h = this.$createElement
      const result = listColumns(this.type).map(column => {
        const key = column.dataIndex
        return { title: column.title, dataIndex: key, key, width: column.width,
          customRender: (value, row) => {
            if (key === 'status' || key === 'frozenText') return h(StatusTag, { props: { status: value } })
            const content = value == null || value === '' ? '—' : String(value)
            const isProgress = this.type === 'works' && key === 'progressText'
            const link = isProgress || detailLinks[this.type].includes(key)
            const longText = key === 'content' || key === 'progressContent'
            const cellClass = { 'business-cell': true, 'business-long-text': longText }
            const cell = link
              ? h('a', { class: cellClass, attrs: { href: '#' }, on: { click: event => { event.preventDefault(); this.$emit(isProgress ? 'progress' : 'detail', row) } } }, content)
              : h('span', { class: cellClass }, content)
            return h('a-tooltip', { props: { title: content, overlayClassName: longText ? 'business-text-tooltip' : '' } }, [cell])
          } }
      })
      result.unshift({ title: '序号', key: 'sequence', width: 46, align: 'center',
        customRender: (value, row, i) => (this.pagination.current - 1) * this.pagination.pageSize + i + 1 })
      if (this.$scopedSlots.actions) result.push({ title: '操作', key: 'actions', width: this.actionWidth, scopedSlots: { customRender: 'actions' } })
      const fixedTextColumn = { works: 'content', mine: 'content', appeals: 'progressContent' }
      return fitColumns(result, fixedTextColumn[this.type])
    }
  },
  watch: {
    type () { this.firstPage() },
    rows (rows) {
      this.pagination.current = Math.min(this.pagination.current, Math.max(1, Math.ceil(rows.length / this.pagination.pageSize)))
    }
  },
  methods: {
    firstPage () { this.pagination.current = 1 },
    onChange ({ current, pageSize }) { Object.assign(this.pagination, { current, pageSize }) }
  }
}
</script>
