export default {
  ignore: ['node_modules', 'build'],
  presets: ['@babel/preset-env'],
  plugins: [
    '@babel/plugin-transform-destructuring',
    '@zakodium/babel-plugin-transform-modules-amd',
  ],
};
