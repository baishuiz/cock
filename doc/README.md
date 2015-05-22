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
webapp/src/themplate/ |  前端页面目标
webapp/src/themplate/layout/ |  页面模板全局layout


##约定
1. webapp/src/pages/{pageName}目录命名与webapp/src/template/pageview/{pageName}目录命名默认一一对应。
2. webapp/src/pages/{pageName}/{xxxx.js} 须符合 Air.js模块规则
3. 

##配置
### 页面配置
- 配置文件  webapp/src/pages/{pageName}/config.json
 
    ``{    
    "layout" : "layout name | layout file path",     
    "template" : "xxxxx"   
    }``




##特殊文件
1. webapp/src/pages/{pageName}/config.json
2. webapp/src/pages/{pageName}/event.json

##发布

