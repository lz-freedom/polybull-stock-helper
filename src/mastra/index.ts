import { register } from 'tsconfig-paths';

register({
  baseUrl: './',
  paths: { '@/*': ['./src/*'], '@features/*': ['./src/features/*'] }
});

export { mastra } from '../features/mastra';
