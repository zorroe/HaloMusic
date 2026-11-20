/**
 * Conventional Commits 规范配置（提交门禁）
 * @see https://www.conventionalcommits.org/
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // 允许的提交类型
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'perf',
        'refactor',
        'docs',
        'chore',
        'build',
        'ci',
        'test',
        'style',
      ],
    ],
    // 标题长度上限（宽松，避免中文描述被误伤）
    'header-max-length': [2, 'always', 100],
    // 中文标题的大小写不敏感
    'subject-case': [0],
  },
}
