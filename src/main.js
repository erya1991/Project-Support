import Vue from 'vue'
import Antd from 'ant-design-vue/lib/index.js'
import 'ant-design-vue/dist/antd.css'
import App from './App.vue'
import router from './router'
import store from './store'
import { todayStr } from './utils/date'
import './styles/global.css'

Vue.config.productionTip = false
Vue.use(Antd)
store.init()

Vue.prototype.$store = store
Vue.prototype.$today = todayStr

// 代码层提供清空本地业务数据并重新初始化的入口，页面不展示该按钮
window.__hqResetData = () => {
  store.reset()
  window.location.reload()
}

new Vue({
  router,
  render: h => h(App)
}).$mount('#app')
