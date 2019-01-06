module.exports = function (loader, options) {
  return {
    install: `framework.use(
      ${options.$plugin},
      {
        load: (file) => require('@/mock/' + file)
      })`
  }
}

module.exports.env = {
  production: false
}
