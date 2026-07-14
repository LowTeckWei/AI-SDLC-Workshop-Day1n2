import nextConfig from 'eslint-config-next';

const eslintConfig = [
  ...nextConfig,
  {
    ignores: ['tests/**', 'playwright-report/**', 'test-results/**'],
  },
];

export default eslintConfig;
