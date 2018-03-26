const _ = require('lodash');
const path = require('path');
const Webpack = require('webpack');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');

module.exports = (pkg, webtaskJson, rootPath, args, externals) => {
  const extension = pkg['auth0-extension'] || { };
  const mappings = extension.externals || [];
  const settings = _.assign(extension.settings, {
    NODE_ENV: 'production',
    CLIENT_VERSION: webtaskJson.version
  });

  // Transform to JSON.
  Object.keys(settings).forEach((k) => {
    settings[k] = JSON.stringify(settings[k]);
  });

  // Add custom mappings to externals.
  mappings.forEach((mapping) => {
    if (mapping.indexOf('@') > -1) {
      externals.compatible[mapping.split('@')[0]] = mapping;
    } else {
      externals.compatible[mapping] = true;
    }
  });

  // Transform to commonjs.
  Object.keys(externals.compatible).forEach((k) => {
    if (typeof externals.compatible[k] === 'string') {
      externals.compatible[k] = `commonjs ${externals.compatible[k]}`;
    } else {
      externals.compatible[k] = `commonjs ${k}`;
    }
  });

  // Return config.
  return {
    entry: path.join(rootPath, args.entryPoint),
    target: 'node',
    output: {
      path: path.join(rootPath, args.destinationFolder),
      filename: `${webtaskJson.name}.extension.${webtaskJson.version}.js`,
      library: '${webtaskJson.name}.extension',
      libraryTarget: 'commonjs2'
    },
    externals: externals.compatible,
    module: {
      loaders: [
        {
          test: /\.jsx?$/,
          loader: 'babel-loader',
          exclude(modulePath) {
            return /node_modules/.test(modulePath) &&
              !/node_modules\/express-conditional-middleware/.test(modulePath) &&
              !/node_modules\/pino/.test(modulePath);
          }
        },
        {
          test: /\.json$/,
          loader: 'json-loader'
        }
      ]
    },
    plugins: [
      new UglifyJSPlugin({
        uglifyOptions: {
          ecma: 7,
          compress: {
            dead_code: true,
            unused: true,
            warnings: false,
          },
          output: {
            comments: false,
          }
        }
      }),
      new Webpack.DefinePlugin({
        'process.env': settings
      })
    ],
    resolve: {
      modules: [
        'node_modules',
        path.join(rootPath, './node_modules/')
      ],
      alias: { }
    }
  };
};
