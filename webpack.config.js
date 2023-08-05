const CopyPlugin = require('copy-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const TerserPlugin = require("terser-webpack-plugin");

const config = {
    entry: {
        background: './src/background.ts',
        content: './src/content.ts',
        contentCss: './src/content.scss',
        'options_ui': './src/options_ui/options_ui.ts',
        'internal_pages_script': './src/internal_pages/common_script.ts',
    },
    output: {
        filename: '[name].js',
        path: __dirname + '/dist'
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/, use: {
                    loader: 'ts-loader',
                }
            },
            {
                test: /\.pug$/,
                // use: [
                //     // 'html-loader',
                //     'pug-html-loader'
                // ],
                use: [
                    //{
                    //    loader: 'html-loader',
                    //    options: { minimize: false }
                    //},
                    {
                        loader: 'raw-loader',
                    },
                    {
                        loader: 'pug-html-loader',
                        options: { pretty: true }
                    }
                ]
            },
            { test: /\.styl(us)?$/, use: [ 'css-loader', 'stylus-loader' ] },
            { test: /\.(gif|svg|jpg|png)$/, loader: "file-loader" },
            { test: /\.css$/, use: ['style-loader', 'css-loader'] },
            {
                test: /\.scss$/i, use: [
                    {
                        loader: 'file-loader',
                        options: { outputPath: '', name: '[name].css' }
                    },
                    "sass-loader"
                ]
            }
        ]
    },
    resolve: {
      extensions: [ '.tsx', '.ts', '.js' ]
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './src/options_ui/options_ui.pug',
            filename: 'options_ui.html',
            chunks: [],  // 'options_ui'  // IMPORTANT: If you don't add this manually, this shitty HtmlWebpackPlugin will add ALL entries into options_ui.html...
        }),
        new HtmlWebpackPlugin({
            template: './src/internal_pages/updated.pug',
            filename: 'internal_pages/updated.html',
            chunks: [],  // IMPORTANT: If you don't add this manually, this shitty HtmlWebpackPlugin will add ALL entries into <script>
        }),
        new HtmlWebpackPlugin({
            template: './src/internal_pages/download_count_1000.pug',
            filename: 'internal_pages/download_count_1000.html',
            chunks: [],  // IMPORTANT: If you don't add this manually, this shitty HtmlWebpackPlugin will add ALL entries into <script>
        }),
        new CopyPlugin([
            { from: 'src/internal_pages/common_style.css', to: 'internal_pages/common_style.css', force: true, toType: 'file' },
        ]),
        new CopyPlugin([
            { from: 'src/options_ui/style/', to: 'options_ui_style/', force: true, toType: 'dir' },
        ]),

    ]
}

module.exports = (env, argv) => {
    console.log('mode =', argv.mode)
    if (argv.mode === 'development') {
        config.devtool = 'source-map';
    }

    if (argv.mode === 'production') {
        config.plugins.push(
            new TerserPlugin({
                terserOptions: {
                    compress: {
                        drop_console: true,
                    }
                }
            })
        )
    }

    return config
};
