// webpack.config.js
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = [
  {
    mode: "development",
    entry: { index:'./src/playground/playground.ts', physicsWorker:'./src/workerscripts/physicsWorker.ts', playgroundWorker: './src/workerscripts/playgroundWorker.ts'},
    output: {
      filename: '[name].js',
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
        chunks: ['index'],
        template: './src/playground/index.html',
      }),
    ],
    devServer: {
      static: path.resolve(__dirname, 'devDist'), // Specify the directory for serving static files
    },
  }
];