// webpack.config.js
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: "development",
  entry: './src/playground/playground.ts',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'devDist'),
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/playground/index.html',
    }),
  ],
  devServer: {
    static: path.resolve(__dirname, 'devDist'), // Specify the directory for serving static files
  },
};