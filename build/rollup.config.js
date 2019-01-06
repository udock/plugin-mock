module.exports = {
  external: (id) => /^(path|axios|wurl|mockjs|lodash\/.*)$/.test(id),
  globals: {
    'axios': 'axios',
    'babel-runtime/core-js/promise': 'core.Promise',
    'babel-runtime/core-js/get-iterator': 'core.getIterator',
    'babel-runtime/core-js/json/stringify': 'core.JSON.stringify',
    'lodash/defaults': '_.defaults',
    'lodash/extend': '_.extend',
    'lodash/has': '_.has',
    'lodash/isObject': '_.isObject',
    'lodash/mapValues': '_.mapValues',
    'lodash/merge': '_.merge',
    'lodash/pickBy': '_.pickBy',
    'mockjs': 'Mock',
    'path': 'path',
    'wurl': 'wurl'
  }
}
