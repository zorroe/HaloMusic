/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  // 这里必须用 any：SFC 的类型由 vue-tsc 在编译期补全，声明处无法给出精确泛型
  const component: DefineComponent<object, object, any>
  export default component
}
