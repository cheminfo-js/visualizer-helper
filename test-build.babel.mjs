export default {
  ignore: ['node_modules', 'build'],
  plugins: [
    '@babel/plugin-transform-destructuring',
    '@zakodium/babel-plugin-transform-modules-amd',
  ],
};
