const CopyPlugin = require('copy-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')

const config = {
    entry: {
        background: './src/background.ts',
        content: './src/content.ts',
        'options_ui': './src/options_ui/options_ui.ts',
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
            { test: /\.styl(us)?$/, use: [ 'vue-style-loader', 'css-loader', 'stylus-loader' ] },
            { test: /\.(gif|svg|jpg|png)$/, loader: "file-loader" },
            { test: /\.css$/, use: ['style-loader', 'css-loader'] }
        ]
    },
    resolve: {
      extensions: [ '.tsx', '.ts', '.js' ]
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './src/options_ui/options_ui.pug',
            filename: 'options_ui.html',
        }),
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
        //...
    }

    return config
};
