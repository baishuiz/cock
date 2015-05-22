#说明
##目录结构
路径            | 说明  
----------      |------
webapp | 项目根目录
webapp/dest/ | 发布目录
webapp/src/ | 开发源代码
webapp/src/webresource/ |静态资源
webapp/src/libs/ | 第三方类库
webapp/src/pages/ | 前端页面逻辑
webapp/src/pages/{pageName}/ | 具体页面逻辑，建议{pageName}与view一致
webapp/src/themplate/pageview |  前端页面模板
webapp/src/template/pageview/{pageName} | 具体页面模板
webapp/src/themplate/layout/ |  页面模板全局layout
webapp/src/module |  公用模板
webapp/src/module/bizcommon/ |  公用业务模块
webapp/src/module/ui/ |  公用UI 模块
webapp/src/module/libs/ |  常用工具模块


##约定
1. webapp/src/pages/{pageName}目录命名与webapp/src/template/pageview/{pageName}目录命名默认一一对应。
2. webapp/src/pages/{pageName}/{xxxx.js} 须符合 Air.js模块规则
3. 页面私有事件，定义在webapp/src/pages/{pageName}/event.json, 事件名必须以{pageName}开头

##配置
### 页面配置
- 配置文件  webapp/src/pages/{pageName}/config.json
- 格式 
    ``{    
    "layout" : "layout name | layout file path"     
    }``
- 配置项
  layout : layout文件名或相对路径

##特殊文件
1. webapp/src/pages/{pageName}/config.json   // 页面私有配置
2. webapp/src/pages/{pageName}/event.json    // 页面私有事件
3. webapp/src/template/pageview/{pageName}/pattern.html   //页面模板基础结构

##打包
打包后 webapp/dest/pages/{pageName}/ 目录将会被替换为文件，该文件由webapp/src/pages/{pageName}/目录下所有文件合并压缩而成。
打包后 webapp/dest/pages/{pageName}/ 目录将会被替换为文件，该文件由webapp/src/pages/{pageName}/目录下所有文件合并而成（不压缩，保留源格式及注释）。
