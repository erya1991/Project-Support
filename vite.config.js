import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue2'

export default defineConfig({
  base: './',
  plugins: [vue()],
  resolve: {
    alias: [
      // ant-design-vue 1.x 以具名方式引用 moment 的 isMoment 等静态方法，
      // 指向 CommonJS 入口以保证构建时正确解析。
      { find: /^moment$/, replacement: 'moment/moment.js' }
    ]
  },
  server: {
    host: '127.0.0.1',
    port: 5173
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 2000
  }
})
