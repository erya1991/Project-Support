<template>
  <a-config-provider :locale="locale">
    <main-layout />
  </a-config-provider>
</template>

<script>
import zhCN from 'ant-design-vue/lib/locale-provider/zh_CN'
import MainLayout from './layout/MainLayout.vue'

export default {
  name: 'App',
  components: { MainLayout },
  data () {
    return { locale: zhCN }
  }
}
</script>
