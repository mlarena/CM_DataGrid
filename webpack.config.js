import path from 'path';
import { fileURLToPath } from 'url';
import HtmlWebpackPlugin from 'html-webpack-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default (env, argv) => {
    const isProduction = argv.mode === 'production';

    return {
        entry: './src/index.js',
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: isProduction ? 'cm-data-grid.min.js' : 'cm-data-grid.js',
            library: {
                name: 'CMDataGrid',
                type: 'umd',
                export: 'default'
            },
            globalObject: 'this'
        },
        module: {
            rules: [
                {
                    test: /\.css$/,
                    use: ['style-loader', 'css-loader']
                }
            ]
        },
        plugins: [
            new HtmlWebpackPlugin({
                template: './examples/index.html',
                inject: 'body'
            })
        ],
        devServer: {
            static: {
                directory: path.join(__dirname, 'examples')
            },
            hot: true,
            port: 3000
        },
        devtool: isProduction ? 'source-map' : 'eval-source-map'
    };
};
