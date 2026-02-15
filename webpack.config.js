const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  entry: {
    background: "./src/background/service-worker.js",
    content: "./src/content/content-script.js",
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        type: "asset/source",
      },
    ],
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: "src/manifest.json", to: "manifest.json" },
        { from: "src/content/page.css", to: "content/page.css" },
        { from: "src/icons/**/*.png", to: "icons/[name][ext]", noErrorOnMissing: true },
      ],
    }),
  ],
};
