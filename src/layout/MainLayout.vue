<template>
  <div class="app-shell">
    <div class="secret-bar">
      <a-icon type="sound" />
      <span>本平台为非涉密平台，严禁在本平台处理、上传国家机密文件资料！</span>
    </div>

    <header class="platform-header">
      <div class="brand">
        <div class="brand-logo"><a-icon type="bank" /></div>
        <div class="brand-text">
          <div class="brand-cn">中建八局第三建设有限公司</div>
          <div class="brand-en">THE THIRD CONSTRUCTION CO.,LTD OF CHINA CONSTRUCTION EIGHTH ENGINEERING BUREAU</div>
        </div>
      </div>

      <div class="header-notice" @click="showNotice = true">
        <a-icon type="notification" class="notice-icon" />
        <div class="notice-text">{{ notices.length ? notices[0].title : '暂无新的待办提醒' }}</div>
        <span class="notice-more">更多 <a-icon type="right" /></span>
      </div>

      <div class="header-right">
        <div class="header-search">
          <a-icon type="search" style="cursor: pointer" @click="doSearch" />
          <input v-model="keyword" placeholder="搜索菜单" @keyup.enter="doSearch" />
        </div>
        <a-tooltip title="消息中心">
          <a-icon type="mail" class="head-icon" @click="showMessages = true" />
        </a-tooltip>
        <a-tooltip title="我的待办">
          <span class="head-icon-wrap" @click="showTodo = true">
            <a-badge :count="todoTotal" :offset="[2, -2]">
              <a-icon type="bell" class="head-icon" />
            </a-badge>
          </span>
        </a-tooltip>
        <a-tooltip title="刷新当前页面">
          <a-icon type="reload" class="head-icon" @click="reloadPage" />
        </a-tooltip>
      </div>
    </header>

    <div class="body-area">
      <aside class="work-sidebar">
        <div class="user-card">
          <div class="user-avatar">{{ user.name.slice(0, 1) }}</div>
          <div class="user-meta">
            <div class="user-name">{{ user.name }}</div>
            <div class="user-dept">{{ deptName }} · {{ user.title }}</div>
          </div>
          <button class="user-tag switch-person" type="button" @click="openPerson">切换演示人员</button>
        </div>

        <div class="todo-entry" @click="showTodo = true">
          <a-icon type="bell" class="todo-icon" />
          <span class="todo-label">公司待办</span>
          <span class="todo-count">{{ todoTotal }} 项</span>
          <a-icon type="right" class="todo-arrow" />
        </div>

        <div class="side-block">
          <div class="side-heading">
            <span><a-icon type="appstore" /> 工作台</span>
            <a-icon type="ellipsis" class="side-more" />
          </div>
          <div class="work-grid">
            <div
              v-for="tile in workTiles"
              :key="tile.label"
              class="work-tile"
              :class="{ active: tile.active }"
              :title="tile.active ? '进入服务项目' : tile.label"
              @click="tile.active && go('/overview')"
            >
              <a-icon :type="tile.icon" class="tile-icon" :class="tile.color" />
              <span class="tile-label">{{ tile.label }}</span>
            </div>
          </div>
        </div>

        <div class="side-block module-block">
          <div class="side-heading module-heading">
            <span><a-icon type="rocket" /> 服务项目</span>
            <span class="module-sub">业务办理</span>
          </div>
          <div class="module-menu">
            <div
              v-for="menu in menus"
              :key="menu.path"
              class="module-item"
              :class="{ active: currentPath === menu.path, child: menu.child }"
              @click="go(menu.path)"
            >
              <a-icon :type="menu.icon" />
              <span>{{ menu.title }}</span>
            </div>
          </div>
        </div>

        <div class="sidebar-foot">中建八局第三建设有限公司 · 企划管理</div>
      </aside>

      <main class="work-main">
        <div class="page-tabs">
          <div
            v-for="tab in tabs"
            :key="tab.path"
            class="page-tab"
            :class="{ active: currentPath === tab.path }"
            @click="go(tab.path)"
          >
            <span>{{ tab.title }}</span>
            <a-icon
              v-if="tab.closable"
              type="close"
              class="tab-close"
              @click.stop="closeTab(tab.path)"
            />
          </div>
        </div>

        <div class="page-panel" :class="{ 'overview-panel': currentPath === '/overview' }">
          <div class="breadcrumb-row">
            <a-icon type="home" />
            <span>服务项目</span>
            <a-icon type="right" class="crumb-sep" />
            <span class="crumb-current">{{ currentTitle }}</span>
          </div>
          <router-view />
        </div>
      </main>
    </div>

    <a-modal title="切换演示人员" :visible="showPerson" :width="500" ok-text="切换" @ok="changePerson" @cancel="showPerson = false">
      <a-form-model layout="vertical"><a-form-model-item label="演示人员"><person-select v-model="selectedPerson" /></a-form-model-item></a-form-model>
    </a-modal>

    <a-modal
      :visible="showNotice"
      title="通知提醒"
      :footer="null"
      :width="620"
      @cancel="showNotice = false"
    >
      <a-list :data-source="notices" item-layout="horizontal" size="small">
        <a-list-item slot="renderItem" slot-scope="item" class="notice-item" @click="goAndClose(item.path)">
          <a-list-item-meta>
            <span slot="title" class="notice-item-title">{{ item.title }}</span>
            <span slot="description">{{ item.desc }}</span>
          </a-list-item-meta>
          <div slot="actions" class="notice-time">{{ item.time }}</div>
        </a-list-item>
      </a-list>
      <a-empty v-if="!notices.length" description="暂无通知" />
    </a-modal>

    <a-drawer
      title="消息中心"
      placement="right"
      :width="440"
      :visible="showMessages"
      @close="showMessages = false"
    >
      <div class="message-summary">
        <a-icon type="notification" />
        共 {{ messageList.length }} 条服务项目提醒
      </div>
      <div
        v-for="(item, index) in messageList"
        :key="index"
        class="message-row"
        @click="goAndClose(item.path)"
      >
        <div class="message-icon"><a-icon :type="item.icon" /></div>
        <div class="message-body">
          <div class="message-title">{{ item.title }}</div>
          <div class="message-desc">{{ item.desc }}</div>
          <div class="message-time">{{ item.time }}</div>
        </div>
      </div>
      <a-empty v-if="!messageList.length" description="暂无消息" />
    </a-drawer>

    <a-drawer
      title="我的待办"
      placement="right"
      :width="420"
      :visible="showTodo"
      @close="showTodo = false"
    >
      <div class="todo-drawer">
        <div class="todo-summary">
          <a-icon type="bell" />
          当前共有 <b>{{ todoTotal }}</b> 项待办需要处理
        </div>
        <div v-for="group in todoGroups" :key="group.key" class="todo-group">
          <div class="todo-group-title">
            <span>{{ group.title }}</span>
            <a-tag :color="group.color">{{ group.items.length }}</a-tag>
          </div>
          <div
            v-for="(item, index) in group.items"
            :key="index"
            class="todo-row"
            @click="goAndClose(item.path)"
          >
            <div class="todo-row-main">{{ item.title }}</div>
            <div class="todo-row-desc">{{ item.desc }}</div>
            <a-icon type="right" class="todo-row-arrow" />
          </div>
          <div v-if="!group.items.length" class="todo-empty">暂无</div>
        </div>
      </div>
    </a-drawer>
  </div>
</template>

<script>
import { MODULE_MENUS } from '../router'
import PersonSelect from '../components/PersonSelect.vue'

export default {
  name: 'MainLayout',
  components: { PersonSelect },
  data () {
    return {
      keyword: '',
      showPerson: false,
      selectedPerson: undefined,
      visited: [],
      showNotice: false,
      showMessages: false,
      showTodo: false,
      workTiles: [
        { label: '工程管理', icon: 'build', color: 'c-blue' },
        { label: '人力资源', icon: 'team', color: 'c-green' },
        { label: '企划管理', icon: 'project', color: 'c-cyan' },
        { label: '办公管理', icon: 'laptop', color: 'c-blue' },
        { label: '流程设计', icon: 'partition', color: 'c-green' },
        { label: '系统管理', icon: 'setting', color: 'c-cyan' },
        { label: '个人中心', icon: 'user', color: 'c-blue' },
        { label: '商务管理', icon: 'account-book', color: 'c-blue' },
        { label: '法律合规', icon: 'safety-certificate', color: 'c-orange' },
        { label: '科技公司', icon: 'experiment', color: 'c-blue' },
        { label: '安全生产', icon: 'alert', color: 'c-orange' },
        { label: '服务项目', icon: 'rocket', color: 'c-blue', active: true }
      ]
    }
  },
  computed: {
    menus () {
      return MODULE_MENUS
    },
    user () {
      return this.$store.currentUser
    },
    deptName () {
      return this.$store.orgOf(this.user).unitName
    },
    currentPath () {
      return this.$route.path
    },
    currentTitle () {
      return this.$route.meta.title || '工作总览'
    },
    tabs () {
      const base = [{ path: '/overview', title: '首页', closable: false }]
      return base.concat(this.visited)
    },
    todoGroups () { return this.$store.todoGroups() },
    todoTotal () { return this.todoGroups.reduce((count, group) => count + group.items.length, 0) },
    notices () {
      return this.todoGroups.filter(group => group.items.length).map(group => ({
        title: group.title + ' · ' + group.items.length + ' 项',
        desc: group.items[0].title, path: group.items[0].path, time: '待处理'
      }))
    },
    messageList () { return this.notices.map(n => ({ ...n, icon: 'notification' })) }
  },
  watch: {
    $route: {
      immediate: true,
      handler (route) {
        if (route.path === '/overview') return
        if (!this.visited.some(t => t.path === route.path)) {
          this.visited.push({ path: route.path, title: route.meta.title, closable: true })
        }
      }
    }
  },
  methods: {
    openPerson () { this.selectedPerson = this.user.id; this.showPerson = true },
    changePerson () {
      this.$store.selectPerson(this.selectedPerson)
      this.showPerson = false
    },
    go (path) {
      if (this.$route.fullPath !== this.$router.resolve(path).route.fullPath) this.$router.push(path)
    },
    goAndClose (path) {
      this.showNotice = false
      this.showMessages = false
      this.showTodo = false
      this.go(path)
    },
    closeTab (path) {
      const index = this.visited.findIndex(t => t.path === path)
      if (index < 0) return
      this.visited.splice(index, 1)
      if (this.currentPath === path) {
        const next = this.visited[this.visited.length - 1]
        this.$router.push(next ? next.path : '/overview')
      }
    },
    doSearch () {
      const kw = this.keyword.trim()
      if (!kw) return
      const menu = MODULE_MENUS.find(m => m.title.indexOf(kw) > -1)
      if (menu) {
        this.go(menu.path)
        this.keyword = ''
      } else {
        this.$message.info('未找到匹配的菜单，请尝试输入“日报”“诉求”“帮扶”等关键词')
      }
    },
    reloadPage () {
      window.location.reload()
    }
  }
}
</script>
