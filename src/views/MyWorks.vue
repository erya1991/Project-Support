<template>
  <div>
    <div class="work-summary">
      <div>应填任务 <b>{{ summary.due }}</b></div><div>已填任务 <b class="success-text">{{ summary.filled }}</b></div>
      <div>待填任务 <b>{{ summary.pending }}</b></div>
    </div>
    <business-list type="mine" deep-link>
      <template #actions="{row}"><a class="link-btn" @click="record = row">{{ row.status === '待填写' ? '填写' : '编辑' }}</a><a class="link-btn" @click="detail = row">查看</a></template>
    </business-list>
    <record-detail v-if="detail" type="executions" :record="detail" @close="detail = null" />
    <execution-editor v-if="record" :record="record" @close="record = null" />
  </div>
</template>
<script>
import BusinessList from '../components/BusinessList.vue'
import RecordDetail from '../components/RecordDetail.vue'
import ExecutionEditor from '../components/ExecutionEditor.vue'
export default {
  name: 'MyWorksView', components: { BusinessList, RecordDetail, ExecutionEditor },
  data: () => ({ record: null, detail: null }),
  computed: { summary () { return this.$store.personalWork() } }
}
</script>
