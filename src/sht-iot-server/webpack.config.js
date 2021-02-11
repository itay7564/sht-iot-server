var webpack = require("webpack");

module.exports = {
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader"
                }
            }
        ]
    },
    plugins: [
        new webpack.ContextReplacementPlugin(/moment[\/\\]locale$/, /de|fr|hu/)
        // new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/)
    ],
    optimization: {
        splitChunks: {
            chunks: "all"
        }
    }
};