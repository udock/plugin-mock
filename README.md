# 模拟数据模块

## 概述

该库用于提供模拟数据功能，统一的模拟数据配置格式，支持多种使用方式。

## 特性

* 基于文件的模拟数据配置
* 支持本地服务和第三方服务模拟
* 支持返回约定格式的随机数据，参见 [mockjs](http://mockjs.com)
* 支持根据简单的规则返回不同数据
* 支持多种引入方式
  * 支持前端数据模拟，基于 axios 库，参见 [@udock/vue-plugin-mock](https://github.com/udock/vue-plugin-mock)
  * 支持后端数据模拟，参见 [@udock/mock-server](https://github.com/udock/mock-server)
  * 支持使用代理方式进行数据模拟，参见 [@udock/mock-server](https://github.com/udock/mock-server)
* 模拟数据支持热加载
* 支持细粒度的开启关闭模拟数据

## 安装

### 单独安装使用

安装插件

```bash
npm i -D @udock/plugin-mock
```

普通（Webpack）项目，可使用如下方式引入

```js
import mock from '@udock/plugin-mock'

mock.install(null, {
  load: file => require('@/mock/' + file)
})
```

Vue 项目使用如下方式引入

```js
import Vue from 'vue'
import mock from '@udock/plugin-mock'

Vue.use(mock, {
  load: file => require('@/mock/' + file)
})
```

### 配合 udock 框架使用

对于 vue-cli 3 脚手架生成的项目，可使用 ``@udock/vue-cli-plugin-udock``, 详情参见 [@udock/vue-cli-plugin-udock](https://github.com/udock/vue-cli-plugin-udock)

### 配合 mock-server 使用

如果需要在后端进行模拟可配合 ``@udock/udock-server`` 使用，详情参见  [@udock/udock-server](https://github.com/udock/udock-server)

## 配置模拟数据

模拟数据基于 js 文件配置，请求路径匹配基于文件目录结构，请求参数匹配在模拟数据文件内部进行配置。模拟数据生成基于 [mockjs](http://mockjs.com)，可实现随机数据的生成。

### 模拟数据目录结构

模拟数据目录，主要分为本地模拟数据和第三方服务器模拟数据目录，第三方模拟数据又使用服务器域名作为目录名分别存放。

另外每个目录可以有特殊配置文件 ``_.js``，用于匹配该路径下没有得到精确匹配的路径。

以下为典型的模拟数据配置目录结构:

* mock
  * local-server // 本地服务器模拟数据配置目录
    * api/v1/hello.js // 为 /api/v1/hello 请求配置模拟数据
    * api/v2/hello.js // 为 /api/v2/hello 请求配置模拟数据
    * _.js // 为所有本地请求配置模拟数据（以上规则均不匹配的情况）
  * third-party // 第三方服务器模拟数据配置目录
    * baidu.com // baidu.com 域名模拟数据配置目录
      * api/v1/hello.js // 为 http://baidu.com/api/v1/hello 请求配置模拟数据
      * api/v2/hello.js // 为 http://baidu.com/api/v2/hello 请求配置模拟数据
      * _.js // 为所有 baidu.com 域名下的请求配置模拟数据（以上规则均不匹配的情况）
    * qq.com // qq.com 域名模拟数据配置目录
      * api/v1/hello.js // 为 http://qq.com/api/v1/hello 请求配置模拟数据
      * api/v2/hello.js // 为 http://qq.com/api/v2/hello 请求配置模拟数据
      * _.js // 为所有 qq.com 域名下的请求配置模拟数据（以上规则均不匹配的情况）
    * _.js // 为所有第三方请求配置模拟数据（以上规则均不匹配的情况）
  * _.js // 为所有请求配置模拟数据（以上规则均不匹配的情况）
  * config.js // 模拟数通用配置

### 公共参数配置(config.js)

mock 目录下的 config.js 文件为通用参数及默认参数配置文件，典型的配置文件格式如下:

```js
module.exports = {
  global: { // 通用配置
    enabled: true, // 全局开关，默认为 true
    response: { // 全局数据返回默认配置
      time_cost: 500 // 数据返回延迟，单位毫秒
    }
  },
  third_party: {
    enabled: true, // 第三方模拟数据开关，默认为 true
    response: {
      time_cost: 2000 // 数据返回延迟，单位毫秒
    }
  },
  local_server: {
    enabled: true, // 本地模拟数据开关，默认为 true
    response: {
      time_cost: 1000 // 数据返回延迟，单位毫秒
    }
  }
}
```

### 模拟数据匹配规则

以下面请求为例： ``http://baidu.com/api/v1/hello``

该请求为第三方服务的请求，将会到 ``mock/third-party/baidu.com`` 目录下查找模拟数据配置，匹配顺序如下:

1. 查看是否存在 mock/third-party/baidu.com/api/v1/hello.js 文件，如果有使用该文件的配置，如果文件不存在或没有匹配的配置项则进入下一步
1. 查看是否存在 mock/third-party/baidu.com/api/v1/_.js 文件，如果有使用该文件的配置，如果文件不存在或没有匹配的配置项则进入下一步
1. 查看是否存在 mock/third-party/baidu.com/api/_.js 文件，如果有使用该文件的配置，如果文件不存在或没有匹配的配置项则进入下一步
1. 查看是否存在 mock/third-party/baidu.com/_.js 文件，如果有使用该文件的配置，如果文件不存在或没有匹配的配置项则进入下一步
1. 查看是否存在 mock/third-party/_.js 文件，如果有使用该文件的配置，如果文件不存在或没有匹配的配置项则进入下一步
1. 查看是否存在 mock/_.js 文件，如果有使用该文件的配置，如果文件不存在或没有匹配的配置项则进入下一步
1. 发送真实请求

上面的步骤中，如果找到了匹配的文件，继续按下面的规则进行匹配:

1. 配置文件最外层是一个数组，数组里的每个元素都是一个配置项，根据请求参数进行依次匹配
1. 匹配成功后，将配置项中的 response 属性作为请求返回值
1. 如果 response 值为 false，将会发送请求到真实服务器

### 模拟数据配置

#### 模拟数据配置文件格式

```js
module.exports = [
  // 模拟数据配置
  {
    // 配置请求匹配
    request: {
      query: {
        myKey: '100' // 匹配请求参数
      }
    },
    // 配置返回数据
    response: {
      time_cost: 200, // 返回延迟
      status: 200, // 返回状态码
      header: {}, // 返回 http 头
      data: { // 返回数据
        msg: 'hello'
      }
    }
  },
  // 模拟数据配置
  {
    {
      // 配置请求匹配
      request: {
        query: {
          myKey: '200' // 匹配请求参数
        }
      },
      // 配置返回数据
      response: {
        time_cost: 100, // 返回延迟
        status: 404, // 返回状态码
        header: {}, // 返回 http 头
        data: { // 返回数据
          msg: 'not found'
        }
      }
    }
  }
]
```

#### 快速开关

在模拟数据配置文件 ``module.exports =`` 后添加 ``!`` ,如下示例，可实现快速禁用该文件对应的模拟数据配置，其效果和删除该文件一样。

```js
module.exports = ![ // <-- 此处添加 ! 后，和该文件被删除效果一样
  ...
]
```

在模拟数据配置的数组元素项前添加 ``!`` ,如下示例，可实现快速禁用该配置项，其效果和删除该配置项一样。

```js
module.exports = [
  !{ // <-- 此处添加 ! 后，相当于删除了该项配置
    ...
  },
  {
    ...
  }
]
```

在模拟数据配置的数组元素内的 response 后添加 ``!`` ,如下示例，可实现将匹配该模拟配置的请求发送到真实服务器

```js
module.exports = [
  {
    ...
    response： !{ // <-- 此处添加 ! 后，匹配该模拟配置的请求将会发送到真实服务器
      ...
    }
  },
  {
    ...
  }
]
```

#### 模拟数据配置

这里的模拟数据指每个配置项的 response.data 属性。

由于在生成模拟数据时使用了 [mockjs](http://mockjs.com) 库，更多配置示例可参见 [mockjs 示例](http://mockjs.com/examples.html)

```js
module.exports = [
  {
    response: {
      time_cost: 200, // 返回延迟
      status: 200, // 返回状态码
      header: {}, // 返回 http 头
      data: { // 模拟数据生成
        "string|1-10": "★", // 每次随机生成 1-10 个 * 字符
        "number1|1-100": 1, // 每次随机生成一个 1-100 之间的数
        "number2|1-100.1-10": 1 // 每次随机生成一个整数部分是 1-100 小数部分是 1-10 之间的数
      }
    }
  },
  {
    ...
  }
]
```

## 示例

### 更多模拟数据生成配置示例

[参见 mockjs 文档](http://mockjs.com/examples.html)

### 对指定域名的所有请求进行数据模拟

在如下的目录下添加 ``_.js`` 文件:

* mock
  * third-party // 第三方服务器模拟数据配置目录
    * youdomain.com // youdomain.com 域名模拟数据配置目录
      * _.js // 为所有 youdomain.com 域名下的请求配置模拟数据（以上规则均不匹配的情况）

``_.js`` 文件内容如下:

```js
module.exports = [
  {
    response: {
      time_cost: 200, // 返回延迟
      status: 200, // 返回状态码
      header: {}, // 返回 http 头
      data: { // 模拟数据生成
        msg: 'default data.'
      }
    }
  }
]
```

此时 youdomain.com 下的请求:

* 如果有精确匹配的模拟数据配置，将按照匹配的配置返回数据
* 都没有匹配的都将返回 ``{ msg: 'default data.' }``

### 仅对指定请求进行数据模拟

在如下的目录下添加 ``_.js`` 文件:

* mock
  * third-party // 第三方服务器模拟数据配置目录
    * youdomain.com // youdomain.com 域名模拟数据配置目录
      * _.js // 为所有 youdomain.com 域名下的请求配置模拟数据（以上规则均不匹配的情况）

``_.js`` 文件内容如下:

```js
module.exports = [
  {
    response: false
  }
]
```

此时 youdomain.com 下的请求:

* 如果有精确匹配的模拟数据配置，将按照匹配的配置返回数据
* 都没有匹配的都将请求真实服务器

### 仅允许指定请求访问真实服务器

在如下的目录下添加 ``_.js`` 文件:

* mock
  * third-party // 第三方服务器模拟数据配置目录
    * youdomain.com // youdomain.com 域名模拟数据配置目录
      * to/real/server.js // 需要访问真实服务器的请求
      * _.js // 为所有 youdomain.com 域名下的请求配置模拟数据（以上规则均不匹配的情况）

``_.js`` 文件内容如下:

```js
module.exports = [
  {
    response: {
      time_cost: 200, // 返回延迟
      status: 200, // 返回状态码
      header: {}, // 返回 http 头
      data: { // 模拟数据生成
        msg: 'default data.'
      }
    }
  }
]
```

``to/real/server.js`` 文件内容如下:

```js
module.exports = [
  {
    response: false
  }
]
```

此时 youdomain.com 下的请求

* 如果有精确匹配的模拟数据配置，将按照匹配的配置返回数据
* http://youdomain.com/to/real/server 的请求将访问真实服务器
* 都没有匹配的都将返回 ``{ msg: 'default data.' }``
