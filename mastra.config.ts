import { register } from 'tsconfig-paths';
register({
  baseUrl: './',
  paths: { '@/*': ['./src/*'], '@features/*': ['./src/features/*'] }
});
import { mastra } from './src/features/mastra';
export { mastra };
export default mastra;
