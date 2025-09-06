const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { WebpackManifestPlugin } = require('webpack-manifest-plugin');

module.exports = {
  entry: './src/index.ts',
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'tools.[contenthash].js',
    library: { type: 'module' },   // ES Module output
    module: true,
    clean: true,
  },
  experiments: {
    outputModule: true,
  },
  module: {
    rules: [
      {
        test: /\.ts?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html'
    }),
    new WebpackManifestPlugin({
      fileName: 'tools.json',
      publicPath: '',
      generate: (seed, files, entrypoints) => {
        return {
          js: entrypoints.main.find((file) => file.endsWith('.js')),
        }
      },
    })
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'build'),
    },
    compress: true,
    port: 9004
  }
};
