<template>
  <a-modal
    :visible="visible"
    :title="title || '审批办理'"
    :width="660"
    :mask-closable="false"
    @cancel="close"
  >
    <div class="approval-hint" v-if="entityDesc">
      <a-icon type="info-circle" /> {{ entityDesc }}
    </div>

    <div class="approval-nodes">
      <div v-for="(node, index) in nodes" :key="node.key || index" class="approval-node">
        <div class="approval-dot" :class="dotClass(node)">
          <a-icon v-if="node.result === '通过'" type="check" />
          <a-icon v-else-if="node.result === '退回'" type="close" />
          <span v-else>{{ index + 1 }}</span>
        </div>
        <div class="approval-body">
          <div class="approval-name">
            {{ node.name }}
            <status-tag :status="node.result" />
          </div>
          <div class="approval-meta">
            审批人：{{ node.approver || '—' }}
            <span v-if="node.time">　办理时间：{{ node.time }}</span>
          </div>
          <div v-if="node.comment" class="approval-comment">{{ node.comment }}</div>
        </div>
      </div>
      <a-empty v-if="!nodes || !nodes.length" description="暂无审批节点" />
    </div>

    <div v-if="pendingIndex > -1" class="approval-form">
      <div class="approval-current">
        当前待处理：<b>{{ pendingNode.name }}</b>（{{ pendingNode.approver }}）
      </div>
      <a-textarea
        v-model="comment"
        :rows="3"
        placeholder="请输入审批意见（退回时建议说明原因）"
        :max-length="200"
      />
    </div>
    <div v-else class="approval-done">
      <a-icon type="check-circle" /> 该审批事项已办结
    </div>

    <template slot="footer">
      <a-button @click="close">关闭</a-button>
      <a-button
        v-if="pendingIndex > -1"
        type="danger"
        ghost
        :loading="loading"
        @click="submit('reject')"
      >退回</a-button>
      <a-button
        v-if="pendingIndex > -1"
        type="primary"
        :loading="loading"
        @click="submit('pass')"
      >通过</a-button>
    </template>
  </a-modal>
</template>

<script>
import StatusTag from './StatusTag.vue'

export default {
  name: 'ApprovalModal',
  components: { StatusTag },
  props: {
    visible: { type: Boolean, default: false },
    title: { type: String, default: '' },
    nodes: { type: Array, default: () => [] },
    entityDesc: { type: String, default: '' },
    loading: { type: Boolean, default: false }
  },
  data () {
    return { comment: '' }
  },
  computed: {
    pendingIndex () {
      return (this.nodes || []).findIndex(n => n.result === '待处理')
    },
    pendingNode () {
      return this.pendingIndex > -1 ? this.nodes[this.pendingIndex] : {}
    }
  },
  watch: {
    visible (val) {
      if (val) this.comment = ''
    }
  },
  methods: {
    dotClass (node) {
      if (node.result === '通过') return 'pass'
      if (node.result === '退回') return 'reject'
      return 'pending'
    },
    close () {
      this.$emit('update:visible', false)
    },
    submit (action) {
      this.$emit('submit', { action, comment: this.comment })
    }
  }
}
</script>

<style scoped>
.approval-hint {
  background: #f6faff;
  border: 1px solid #dcedff;
  border-radius: 3px;
  padding: 8px 12px;
  color: #42688c;
  font-size: 12.5px;
  line-height: 19px;
  margin-bottom: 16px;
}
.approval-form {
  margin-top: 16px;
  border-top: 1px dashed #e8eff7;
  padding-top: 14px;
}
.approval-current {
  font-size: 12.5px;
  color: #52667c;
  margin-bottom: 7px;
}
.approval-current b {
  color: #1677d2;
}
.approval-done {
  margin-top: 14px;
  background: #f6ffed;
  border: 1px solid #d9f0c5;
  color: #3f8a1c;
  border-radius: 3px;
  padding: 9px 12px;
  font-size: 12.5px;
}
</style>
