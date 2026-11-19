import pluginVue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'
import eslintConfigPrettier from 'eslint-config-prettier'

/**
 * 把某个 flat config 集合里的规则统一降级为 warn（用于渐进式治理存量代码）。
 */
const toWarnRules = configs =>
  Object.fromEntries(
    configs
      .flatMap(config => Object.entries(config.rules ?? {}))
      .map(([ruleName]) => [ruleName, 'warn'])
  )

const vueConfigs = pluginVue.configs['flat/recommended']

/**
 * ESLint flat config
 *
 * 约定：
 * - 存量代码较多，除少量明确关闭的规则外，其余规则统一为 warn，不阻塞本地开发与构建；
 * - 渲染进程禁止 Node API 的约束由 TypeScript / review 兜底；
 * - 与 Prettier 冲突的格式规则全部关闭（eslint-config-prettier 放在末尾）。
 */
export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'dist-electron/**',
      'dist-ssr/**',
      'release/**',
      'coverage/**',
      'public/**',
      'package-lock.json',
    ],
  },
  ...tseslint.configs.recommended,
  ...vueConfigs,
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.vue'],
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
  },
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx,vue}'],
    rules: {
      // TypeScript 与 Vue 官方推荐规则统一降级为 warn
      ...toWarnRules(tseslint.configs.recommended),
      ...toWarnRules(vueConfigs),
      // --- 噪声治理：这些规则在 TS 项目里由编译器负责，重复检查只会产生误报 ---
      // no-undef 无法识别 TS 的全局类型（URL/document/window/NodeJS 等），TS 的 tsc 已覆盖
      'no-undef': 'off',
      // 基础 no-unused-vars 会把 TS 接口方法参数误报为未使用，改用 @typescript-eslint 版本
      'no-unused-vars': 'off',
      // 允许 warn/error/info 级别的日志（渲染进程内已不再使用 console.log）
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      // 存量代码的显式约定
      'vue/multi-word-component-names': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // 组件 name 使用小写以匹配 keep-alive 的 include/exclude，且 Header/Footer 为保留名
      'vue/component-definition-name-casing': 'off',
      'vue/no-reserved-component-names': 'off',
      // 存量模板风格，避免产生大量噪音
      'vue/attributes-order': 'off',
      'vue/attribute-hyphenation': 'off',
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/html-self-closing': 'off',
      'vue/require-default-prop': 'off',
    },
  },
  eslintConfigPrettier
)
