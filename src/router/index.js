import Vue from 'vue'
import Router from 'vue-router'
import Overview from '../views/Overview.vue'
import Relations from '../views/Relations.vue'
import Works from '../views/Works.vue'
import Appeals from '../views/Appeals.vue'
import Daily from '../views/Daily.vue'
import Suggestions from '../views/Suggestions.vue'

Vue.use(Router)

export const MODULE_MENUS = [
  { path: '/overview', title: '工作总览', icon: 'dashboard', desc: '个人待办、综合台账与报表导出' },
  { path: '/relations', title: '帮扶关系管理', icon: 'apartment', desc: '总部人员与项目帮扶关系配置及联合审批' },
  { path: '/works', title: '部门重点工作', icon: 'profile', desc: '按部门批量建单，逐项填报执行情况与销项' },
  { path: '/appeals', title: '项目诉求办理', icon: 'message', desc: '按项目登记诉求，跟踪办理并独立销项' },
  { path: '/daily', title: '日报管理', icon: 'form', desc: '项目日报填报、校核、监控与周度汇总' },
  { path: '/suggestions', title: '制度改进建议', icon: 'bulb', desc: '制度流程建议提出、部门确认与归档' }
]

const routes = [
  { path: '/', redirect: '/overview' },
  { path: '/overview', component: Overview, meta: { title: '工作总览' } },
  { path: '/relations', component: Relations, meta: { title: '帮扶关系管理' } },
  { path: '/works', component: Works, meta: { title: '部门重点工作' } },
  { path: '/appeals', component: Appeals, meta: { title: '项目诉求办理' } },
  { path: '/daily', component: Daily, meta: { title: '日报管理' } },
  { path: '/suggestions', component: Suggestions, meta: { title: '制度改进建议' } },
  { path: '*', redirect: '/overview' }
]

export default new Router({
  mode: 'hash',
  routes,
  scrollBehavior: () => ({ x: 0, y: 0 })
})
