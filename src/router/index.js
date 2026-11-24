import Vue from 'vue'
import Router from 'vue-router'
import Overview from '../views/Overview.vue'
import Relations from '../views/Relations.vue'
import Works from '../views/Works.vue'
import MyWorks from '../views/MyWorks.vue'
import Appeals from '../views/Appeals.vue'
import Daily from '../views/Daily.vue'
import Suggestions from '../views/Suggestions.vue'

Vue.use(Router)
export const MODULE_MENUS = [
  { path: '/overview', title: '工作总览', icon: 'dashboard', component: Overview },
  { path: '/relations', title: '帮扶关系管理', icon: 'apartment', component: Relations },
  { path: '/works', title: '部门重点工作', icon: 'profile', component: Works },
  { path: '/works/mine', title: '我的重点工作', icon: 'form', child: true, component: MyWorks },
  { path: '/appeals', title: '基层诉求办理', icon: 'message', component: Appeals },
  { path: '/daily', title: '日报管理', icon: 'form', component: Daily },
  { path: '/suggestions', title: '制度改进建议', icon: 'bulb', component: Suggestions }
]
export default new Router({
  mode: 'hash',
  routes: [{ path: '/', redirect: '/overview' },
    ...MODULE_MENUS.map(({ path, title, component }) => ({ path, component, meta: { title } })),
    { path: '*', redirect: '/overview' }],
  scrollBehavior: () => ({ x: 0, y: 0 })
})
