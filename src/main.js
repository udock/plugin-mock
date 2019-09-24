import extend from 'lodash/extend'
import isObject from 'lodash/isObject'
import isFunction from 'lodash/isFunction'
import mapValues from 'lodash/mapValues'
import defaults from 'lodash/defaults'
import merge from 'lodash/merge'
import has from 'lodash/has'
import pickBy from 'lodash/pickBy'
import path from 'path'
import axios from 'axios'
import wurl from 'wurl'
import Mock from 'mockjs'
import convert from 'xml-js'
import './mockjs.patch'

function looseValid (rule, data) {
  const eg = Mock.mock(rule)
  const ex = pickBy(data, (_, key) => !has(eg, key))
  const items = Mock.valid(merge({}, rule, ex), data)
  return items
}

function valid (rule, data) {
  if (!rule) {
    return true
  } else {
    // 匹配 method
    if (!data.method.match(typeof rule.method === 'string'
      ? rule.method.toLowerCase()
      : rule.method)
    ) {
      return false
    }

    // 匹配 headers，只要包含所有规则项就算匹配
    if (rule.headers) {
      const items = looseValid(rule.headers, data.headers)
      if (items.length > 0) {
        return false
      }
    }

    // 匹配 query
    if (rule.query) {
      const items = looseValid(rule.query, data.query)
      if (items.length > 0) {
        return false
      }
    }

    // 匹配 data
    if (rule.data) {
      let body = data.data.toString()
      if (rule._format) {
        if (isFunction(rule._format)) {
          // 自定义请求报文解析
          body = rule._format(body)
        } else if (rule._format === 'xml') {
          // 解析 xml
          body = convert.xml2json(body, {compact: true})
        }
      }

      // 解析 JSON
      try {
        body = JSON.parse(body)
        data.body = body
      } catch (e) {}

      if (typeof body === 'string') {
        return body.match(rule.data)
      } else {
        const items = looseValid(rule.data, body)
        if (items.length > 0) {
          return false
        }
      }
    }

    return true
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
  if (confs == false) throw {}
  for (let i=0, n=confs.length; i<n; i++) {
    const conf = confs[i]
    if (valid(conf.request, req)) {
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
  const _format = template._format
  delete template._format
  try {
    const response = Mock.Handler.gen(template, undefined, {root: context})
    if (_format) {
      if (isFunction(_format)) {
        // 自定义响应输出
        response.data = _format(response.data)
      } else if (_format === 'xml') {
        // xml 格式
        response.data = convert.json2xml(response.data, {
          compact: true,
          spaces: 2
        })
      }
    }
    return response
  } catch (e) {
    return { time_cost: 200,
      status: 500,
      header: {},
      data: JSON.stringify({
        error: `respone temmplate error: ${e.message}`
      })
    }
  }
}

const mockErr = new Error()
const useProxy = new Error()

export default {
  useProxy,
  install (framework, options) {
    const config = defaults(options.load('config'), {
      global: {},
      local_server: {},
      third_party: {},
      bridge: {}
    })
    function mock (axios) {
      axios.interceptors.request.use((request) => {
        let hostname
        let url
        let mockData
        let originalRequest = request
        let defaultConf
        request = defaults({query: getQuery(request)}, request)
        if (config.global.enabled !== false) {
          url = wurl('path', request.url).replace(/\/$/, '/index')
          hostname = wurl('hostname', request.url).replace(/^www\./, '')
          const port = parseInt(wurl('port', request.url))
          if (port !==80 && port !== 443) {
            hostname += `:${port}`
          }
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
        if (options.useProxy) {
          mockData = mockData || {useProxy}
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
          if (error.useProxy === useProxy) {
            return Promise.reject(useProxy)
          }
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
