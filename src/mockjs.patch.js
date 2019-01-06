import Mock from 'mockjs'

let _items = Mock.valid.Diff.items
Mock.valid.Diff.items = function (schema, data, name, result) {
  let ret = _items.call(Mock.valid.Diff.items, schema, data, name, result)
  if (ret && schema.rule.count === 1) {
    let isMatched = false
    for (var i=0,n=schema.items.length; i<n; i++) {
      var it = schema.items[i]
      if (Mock.valid(it.template, data).length === 0) {
        isMatched = true
        break
      }
    }
    if (!isMatched) {
      Mock.valid.Assert.equal('equal', schema.path, data, schema.template, result)
    }
  }
  return ret
}
