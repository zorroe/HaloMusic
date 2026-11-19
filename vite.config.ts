import { rmSync } from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron'
import pkg from './package.json'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  // 每次启动/构建前清空主进程与预加载脚本产物，避免旧 chunk 残留
  rmSync('dist-electron', { recursive: true, force: true })

  const isServe = command === 'serve'
  const isBuild = command === 'build'
  const sourcemap = isServe || !!process.env.VSCODE_DEBUG

  // 主进程 / preload 里 import 的运行时依赖不打包进 bundle，由 node_modules 提供
  const externalDependencies = Object.keys(pkg.dependencies ?? {})

  return {
    plugins: [
      vue(),
      electron([
        {
          // Electron 主进程入口
          entry: 'electron/main/index.ts',
          onstart(options) {
            if (process.env.VSCODE_DEBUG) {
              // 供 .vscode/tasks.json 的 problemMatcher 捕获启动信号
              console.info('[startup] Electron App')
            } else {
              options.startup()
            }
          },
          vite: {
            build: {
              sourcemap,
              minify: isBuild,
              outDir: 'dist-electron/main',
              rollupOptions: {
                external: externalDependencies,
              },
            },
          },
        },
        {
          // Electron preload 入口
          entry: 'electron/preload/index.ts',
          onstart(options) {
            // preload 重建时只刷新渲染进程，不重启整个应用
            options.reload()
          },
          vite: {
            build: {
              sourcemap: sourcemap ? 'inline' : undefined,
              minify: isBuild,
              outDir: 'dist-electron/preload',
              rollupOptions: {
                external: externalDependencies,
              },
            },
          },
        },
      ]),
    ],
    server: {
      host: '127.0.0.1',
      port: 3344,
      strictPort: true,
    },
    resolve: {
      alias: {
        '@': path.resolve('./src'), // @ 代替 src
      },
    },
    build: {
      target: 'esnext',
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          // 拆出体积大且低频变化的依赖，提升缓存命中率
          manualChunks: {
            'vue-vendor': ['vue', 'vue-router', 'pinia', '@vueuse/core'],
            axios: ['axios'],
            'icon-park': ['@icon-park/vue-next'],
          },
        },
      },
    },
    clearScreen: false,
  }
})
