<template>
  <a-tag :color="color" class="status-tag" :class="{ 'status-neutral': !color }">{{ text || status }}</a-tag>
</template>

<script>
const COLOR_MAP = {
  草稿: '',
  待审批: 'orange',
  已生效: 'green',
  已驳回: 'red',
  已失效: '',
  审核中: 'orange',
  已退回: 'red',
  待生效: '',
  落实中: 'blue',
  销项审批中: 'orange',
  已销项: 'green',
  待受理: 'orange',
  办理中: 'blue',
  待校核: 'gold',
  已校核: 'green',
  需重新校核: 'orange',
  未填写: '',
  已提交: 'blue',
  未冻结: '',
  已冻结: 'red',
  待确认: 'orange',
  已回复: 'blue',
  已归档: 'green',
  通过: 'green',
  退回: 'red',
  待处理: '',
  审批中: 'orange',
  已通过: 'green',
  有新进展: 'green',
  无新进展: '',
  因未到岗未反馈: 'orange',
  待反馈: 'red',
  已反馈: 'green'
}

export default {
  name: 'StatusTag',
  props: {
    status: { type: String, default: '' },
    text: { type: String, default: '' }
  },
  computed: {
    color () {
      return COLOR_MAP[this.status] === undefined ? '' : COLOR_MAP[this.status]
    }
  }
}
</script>

<style scoped>
.status-tag {
  margin-right: 0;
  white-space: nowrap;
}
.status-neutral {
  color: #4f5f70;
  background: #f5f7fa;
  border-color: #dde5ee;
}
</style>
