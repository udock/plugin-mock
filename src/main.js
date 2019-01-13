import extend from 'lodash/extend'
import isObject from 'lodash/isObject'
import mapValues from 'lodash/mapValues'
import defaults from 'lodash/defaults'
import merge from 'lodash/merge'
import has from 'lodash/has'
import pickBy from 'lodash/pickBy'
import path from 'path'
import axios from 'axios'
import wurl from 'wurl'
import Mock from 'mockjs'
import './mockjs.patch'

function valid (rule, data, unstrict) {
  if (unstrict) {
    let eg = Mock.mock(rule)
    let ex = pickBy(data, (value, key) => !has(eg, key))
    return Mock.valid(merge({}, rule, ex), data)
  } else {
    return Mock.valid(rule, data)
  }
}

function getQuery (request) {
  return extend(
    {},
    wurl('?', request.url),
    // 合并 req.params 的参数
    mapValues(request.params, (value, key) => JSON.stringify(value))
  )
}

function matching (confs, req) {
  for (let i=0, n=confs.length; i<n; i++) {
    const conf = confs[i]
    if (valid(conf.request, req, true).length === 0) {
      return conf
    }
  }
}

function mockWithContext (template, context) {
  // return Mock.mock(
  //   defaults(
  //     {response: template},
  //     mapValues(context, (val) => () => val)
  //   )
  // ).response
  return Mock.Handler.gen(template, undefined, {root: context})
}

export default {
  install (framework, options) {
    const config = defaults(options.load('config'), {
      global: {},
      local_server: {},
      third_party: {},
      bridge: {}
    })
    function mock (axios) {
      const mockErr = new Error()
      axios.interceptors.request.use((request) => {
        let hostname
        let url
        let mockData
        let originalRequest = request
        let defaultConf
        request = defaults({query: getQuery(request)}, request)
        if (config.global.enabled !== false) {
          url = wurl('path', request.url).replace(/\/$/, '/index')
          hostname = wurl('host', request.url)
          if (hostname) {
            if (config.third_party.enabled === false) {
              hostname = undefined
            } else {
              hostname = `third-party/${hostname}`
              defaultConf = config.third_party
            }
          } else {
            if (config.local_server.enabled === false) {
              hostname = undefined
            } else {
              hostname = 'local-server'
              defaultConf = config.local_server
            }
          }
        }
        if (hostname) {
          try {
            // 尝试根据请求路径精确匹配,并获取对应的模拟数据配置文件
            const mockConf = matching(options.load(hostname + url), request)
            if (isObject(mockConf) && mockConf.response) {
              // 匹配成功，并定义了 response, 进行数据模拟
              mockData = {response: mockWithContext(mockConf.response, {request})}
            }
          } catch (e) {
            // 尝试根据请求路径精确匹配,并获取对应的模拟数据配置文件失败
            // 尝试匹配默认模拟数据配置文件
            let def = path.relative('.', path.resolve(`${hostname}${url}`, '..', '_'))
            while (!mockData) {
              try {
                const mockConf = matching(options.load(def), request)
                if (isObject(mockConf)) {
                  if (!mockConf.response) { break }
                  // 匹配成功，并定义了 response, 跳出循环，进行数据模拟
                  mockData = {response: mockWithContext(mockConf.response, {request})}
                  break
                }
              } catch (e) {}
              if (def === '_') { break }
              def = path.relative('.', path.resolve(def, '..', '..', '_'))
            }
          }
        }
        if (mockData) {
          console.log(`mock: ${request.url}`)
          throw merge({url: mockErr, request}, config.global, defaultConf, mockData)
        } else {
          return originalRequest
        }
      })

      axios.interceptors.response.use(null, (error) => {
        if (error.url === mockErr) {
          // return Promise.resolve(error)
          return new Promise((resolve, reject) => {
            const timeout = error.request.timeout || axios.defaults.timeout || 240000
            const timeCost = error.response.time_cost || 0
            if (timeout > timeCost) {
              setTimeout(() => {
                if (error.response.status >= 200 && error.response.status < 300) {
                  resolve(error.response)
                } else {
                  reject(error.response)
                }
              }, timeCost)
            } else {
              setTimeout(() => {
                reject(new Error(`timeout of ${timeout}ms exceeded`))
              }, timeout)
            }
          })
        } else {
          return Promise.reject(error)
        }
      })
    }
    mock(axios)
  }
}
