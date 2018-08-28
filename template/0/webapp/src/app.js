b.ready(function(deviceInfo){
  var bridge = b.bridge;
  var isHybrid = bridge.isHybrid;
  var isInApp = bridge.isInApp;
  deviceInfo = (deviceInfo || {}).result || {};

  // 如果在APP中，并且非直连，使用curPagePath替换resourceURL
  deviceInfo.curPagePath = isHybrid && deviceInfo.curPagePath || '';
  staticConfig.resourceURL = deviceInfo.curPagePath ? deviceInfo.curPagePath + '/' : staticConfig.resourceURL;
  staticConfig.moduleTemplateURL = deviceInfo.curPagePath ? deviceInfo.curPagePath + '/' : staticConfig.moduleTemplateURL;
  var webappPath = deviceInfo.curPagePath.match(/(\S+\/)([^\/]+)$/);
  webappPath = webappPath && webappPath[1] || '';

  // 自定义头
  var sourceId = 'M0000009';
  var customHeader = {};

  var env = {
    $baseURL      : '/mycjia',
    $isHybrid     : isHybrid,
    $isInApp      : isInApp,
    $sourceId     : sourceId,
    $templatePath : staticConfig.resourceURL + 'template/', // 框架需要
    $resourceURL  : staticConfig.resourceURL,
    $moduleURL    : {
      base        : staticConfig.resourceURL,        // 模块加载基础路径
      commonModule: '{{commonModule}}',              // 自定义替换字符串，开发环境使用的替换字符串，与node server一致
      hybridRoot  : deviceInfo.curPagePath + '/../', // 自定义替换字符串，供Hybrid使用
    },
    $deviceInfo   : deviceInfo,
    $webappPath   : webappPath,
    $aMapKey      : staticConfig.aMapKey,
    $TDK          : {
      title: '酒店预订,酒店价格查询,手机订酒店-城家生活手机版',
      description: '城家生活手机版为您提供国内各大城市的长租酒店预订,酒店价格查服务、详细的酒店地址、酒店图片等酒店信息尽在城家生活手机版。',
      keywords: '酒店,酒店预订,酒店查询,酒店地址,手机订酒店'
    },
    $svcErrorTip : '请求数据异常，请检查网络或刷新看看',
    $moduleTemplateURL : staticConfig.moduleTemplateURL,
    $imageURL     : staticConfig.imageURL,
    $restfulURL  : staticConfig.restfullURL,
    $fileRestfullURL  : staticConfig.fileRestfullURL,
    $restfulURLWeb  : staticConfig.restfullURLWeb,
    $protocol    : staticConfig.restfullProtocol
  }

  b.setModuleURL(env.$moduleURL);

  var stats;

  function AuthManager() {
    var userStore, cookie;
    var bridge = b.bridge;
    var EventName_LoginSuccess = 'LoginSuccess';
    var EventName_LoginFailed = 'LoginFailed';
    var routerAuthMap = {};
    var targetInfo; // 目标地址信息

    var self = this;
    Air.run(function (require) {
      userStore = require('c.Biz.storage.user');
      cookie = require('c.Util.storage.cookie');

      // needAuth信息缓存
      for (var i = 0, len = routerConfig.rules.length, rule; i < len; i++) {
        rule = routerConfig.rules[i];
        routerAuthMap[rule.viewName] = rule.needAuth;
      }
    });

    this.setTargetInfo = function(info){
      targetInfo = info;
    };
    this.getTargetInfo = function(){
      return targetInfo;
    };

    this.viewName = '';
    this.getEvents = function () {
      return {
        logged: EventName_LoginSuccess,
        unLogin: EventName_LoginFailed
      }
    };

    this.needAuth = function (viewName) {
      self.viewName = viewName || '';
      return self.viewName && !!routerAuthMap[self.viewName];
    };

    this.isLogin = function () {
      var userToken = userStore.getToken() || cookie.get('userToken') || '';
      triggerLoginEvent(userToken ? EventName_LoginSuccess : EventName_LoginFailed); // if (bridge.isHybrid) {
    };

    this.goToLogin = function (targetUrl) {
      if (bridge.isHybrid) {
        goToLogin_Native(targetUrl);
      } else {
        goToLogin_H5(targetUrl);
      }
    };

    function goToLogin_Native() {
      b.views.jump({
        project: 'mycjia',
        urlPath: '/login'
      })
    }

    function goToLogin_H5(targetUrl) { 
      // location.href = targetUrl ? "/mycjia/login" + "?targetUrl=" + encodeURIComponent(targetUrl) : "/mycjia/login"
      if(targetUrl) {
        b.views.goTo('login', {
          query: "?targetUrl=" + encodeURIComponent(targetUrl)
        });
      } else {
        b.views.goTo('login');
      }
    }

    function triggerLoginEvent(eventName) {
      eventName && beacon.on(eventName);
    }
  }

  function Render() {
    var hashCleared = false;
    var renderFn = function () {};

    this.setRenderFn = function (renderFn_params) {
      hashCleared = false;
      renderFn = renderFn_params || renderFn;
    };
    this.render = function (callback) {
      if (hashCleared) {
        callback && callback();
      } else {
        renderFn();
      }
    };
    this.clearRenderFn = function () {
      hashCleared = true;
      renderFn = function () {};
    }
  }

  var authManager = new AuthManager();
  var render = new Render();
  // var lastIsLogin = false;


  b.views.addMiddleware('beforeGoTo', function(paramObj, next) {
    Air.run(function (require) {
      stats = require('c.Biz.stats');
      var viewName = paramObj.viewName || '';
      var options = paramObj.options || {};
      var targetUrl = b.router.getURLPathByViewName(viewName, options);

      authManager.setTargetInfo(paramObj);
      // render.setRenderAction(next);

      // 是Hybrid，拼接URL
      if (!options.isinit) {
        render.setRenderFn((function () {
          var url = paramObj.url || '';
          var origin = location.origin;
          var activeView = paramObj.viewName || '';

          return function () {
            paramObj.viewName = activeView;
            paramObj.url = isHybrid ? deviceInfo.curPagePath + '/index.html#' + url : origin + url;
            paramObj.vc = 'CjiaHybrid'; // Native Hybrid 公共VC
            render.clearRenderFn();
            next(paramObj);
          }
        })());

        if (authManager.needAuth(viewName)) {
          var obj = {
            onLogged: function () {
              beacon.off(events.unLogin, this.onUnlogin);
              stats && stats.setProperties({
                isLogin: true
              });
              render.render();
            },
            onUnlogin: function () {
              beacon.off(events.logged, this.onLogged);
              stats && stats.setProperties({
                isLogin: false
              });

              authManager.goToLogin(targetUrl);
            }
          };

          var events = authManager.getEvents();
          beacon.once(events.logged, obj.onLogged);
          beacon.once(events.unLogin, obj.onUnlogin);

          authManager.isLogin();
        } else {
          render.render();
        }
      }
    });
  });

  b.views.addMiddleware('onAppear', function (paramObj, next) {
    Air.run(function (require) {
      if (!b.views.getActive()) {
        var events = authManager.getEvents();
        beacon.once(events.logged, onLogged);
        beacon.once(events.unLogin, onUnlogin);

        function onLogged() {
          beacon.off(events.unLogin, onUnlogin);
          stats && stats.setProperties({
            isLogin: true
          });
          render.render();
        }

        function onUnlogin() {
          beacon.off(events.logged, onLogged);
          stats && stats.setProperties({
            isLogin: false
          });
          b.views.back();
        }

        authManager.isLogin();
      } else {
        var userStore = require('c.Biz.storage.user');
        var cookie = require('c.Util.storage.cookie');

        var userToken = userStore.getToken() || cookie.get('userToken') || '';
        userToken ? (render.render(function () {
          next(paramObj);
        })) : (next(paramObj));
      }
    });
  });

  // 服务请求中间件
  b.service.addMiddleware('beforeQuery', function(requestParam, next) {
    Air.iRun(function(require){
      var customHeaderModule = require('c.Biz.data.customerHeader');
      var userStore = require('c.Biz.storage.user');
      var cookie = require('c.Util.storage.cookie');
      var userToken = userStore.getToken() || cookie.get('userToken') || '';
      if (isHybrid) {
        bridge.run('gethttpheader', {
          success: function(res){
            var appHeader = res.result || {};
            // 发送请求前在header添加token
            var header = requestParam && requestParam.header;

            appHeader.userToken = userToken;
            header.header = JSON.stringify(appHeader);
            customHeaderModule.set(appHeader);
            header.userToken = appHeader.userToken;

            if (header) {
              next();
            }
          },
          failed: function(res) {
            next();
          }
        });
      } else {
        var clientId = cookie.get('cid');
        customHeader.clientId = clientId;
        customHeader.userToken = userToken;

        // 发送请求前在header添加token
        var header = requestParam && requestParam.header;
        if (header) {
          customHeaderModule.set(customHeader);
          header.header = JSON.stringify(customHeader);
          header.userToken = userStore.getToken() || '';
        }
        next();
      }
    });
  });

  // 服务响应中间件
  b.service.addMiddleware('afterQuery', function(response, next) {
    var serviceName = response.requestParam.serviceName;
    var DEFAULT_SERVICE_ERROR_HANDLE = function() {
      next(true);
    };

    if (response.errorCode) {
      // 1=JSON解析出错, 2=超时, 3=HTTP请求错误, 4 // 业务错误（此处不会有业务错误，业务错误是在else中指定的）
      DEFAULT_SERVICE_ERROR_HANDLE();
    } else {
      var isError = false;
      var xhr = response.xhr;
      var header = xhr.getResponseHeader('header');
      var resultCode;

      response.data = response.data || {};

      if (header) { // Services API Standard V2
        try {
          header = JSON.parse(header);
        } catch(e) {
          DEFAULT_SERVICE_ERROR_HANDLE();
          return;
        }
        var headerResultCode = header.resultCode;

        if (headerResultCode != 0) {
          DEFAULT_SERVICE_ERROR_HANDLE();
          return;
        }

        resultCode = response.data.resultCode;
      } else { // Services API Standard V1
        resultCode = xhr.getResponseHeader('resultCode');

        // 旧H5服务没有resultCode
        if (resultCode === '' || resultCode === null) {
          resultCode = 0;
        }

        response.data.resultCode = resultCode;

        // 旧服务字段直接平铺，兼容V2格式
        beacon.utility.merge(response.data, response.data.result);
      }

      resultCode = parseInt(resultCode, 10) || 0;

      switch(resultCode) {
        case 0: // 成功
          next(isError);
          break;
        case 15030003: // 登录超时
        case -401: // 登录超时
          Air.run(function(require){
            var user = require('c.Biz.storage.user');
            user.removeUser();
            goToLogin();
              isError = true;
              next(isError);
          });
          break;
        default:
          isError = true;
          next(isError);
          break;
      }
    }
  });

  function goToDefault() {
    if (isInApp) {
      bridge.run('goback');
    } else {
      location.href = env.$baseURL + '/';
    }
  }


  function goToLogin() {
    // if (isInApp) {
    //   bridge.run('gotopage', {
    //     vc: 'login'
    //   });
    // } else {
      // TODO 后续有登录页后需要跳到登录页
      // location.href = '/mycjia/login';
      b.views.goTo('login');
    // }
  }

  // 404
  b.views.addMiddleware('viewNotFound', function() {
    goToDefault();
  });

  // 页面切换发送统计
  Air.run(function(require){
    stats = require('c.Biz.stats');
    if (!staticConfig.stats) {
      return;
    }

    stats.init();

    var isInit = true;
    b.views.addMiddleware('afterURLChange', function(){
      window.scrollTo(0, 0);

      // 百度统计（初始化时会自动发一次，所以初始化后再发）
      if (!isInit){
        stats.sentPage();
      }
      isInit = false;

      // 主动推送
      stats.sentLink();
    });
  });

  Air.run(function(require){
    // 设置clientId
    var cookie = require('c.Util.storage.cookie');
    var GUID = require('c.Biz.guid');
    var clientId = cookie.get('cid');
    var customHeaderModule = require('c.Biz.data.customerHeader');
    stats = require('c.Biz.stats');
    if (!clientId) {
      clientId = GUID();
      cookie.set('cid', clientId, { expires: 365 });
    }

    var mkt = require('c.Biz.mkt');
    var channel = mkt.getChannel() || '';
    var campaign = mkt.getCampaign() || '';

    customHeader = {
      applicationCode: 'H5-MYCJIA', // 应用id
      clientId: clientId || '', // GUID，存1年
      sourceId: sourceId, // 渠道信息
      exSourceId: channel || 'CJIA',
      channel: 'CJIA',
      //subChannel: campaign ? 'Default' : 'H5',
      subChannel: 'H5',
      version: '2.0.0' // 版本
    };

    customHeaderModule.set(customHeader);
    stats.setProperties({
      softInfo: {
        appCode: customHeader.applicationCode,
        appVersion: customHeader.version,
        channel: customHeader.exSourceId
      },
      hardInfo: {
        clientId: customHeader.clientId
      }
    });

    if (bridge.isHybrid) {
      bridge.run("gethttpheader", {
        success: function (res) {
          var appHeader = res.result || {};
          var properties = {
            softInfo: {
              appCode: appHeader.applicationCode || customHeader.applicationCode,
              appVersion: appHeader.version || customHeader.version,
              channel: appHeader.channel || customHeader.channel
            },
            hardInfo: {
              clientId: appHeader.clientId || customHeader.clientId
            }
          };
          stats.setProperties(properties);
          bridge.run('getdeviceinfo', {
            success: function (res) {
              var deviceinfo = res.result || {};
              deviceinfo.network && (properties.hardInfo.networkStatus = deviceinfo.network);
              deviceinfo.operatorSystem && (properties.hardInfo.osType = deviceinfo.operatorSystem);
              deviceinfo.systemVersion && (properties.hardInfo.osVersion = deviceinfo.systemVersion);
              stats.setProperties(properties);
            },
            failed: function (res) {
            }
          });
        },
        failed: function (res) {
        }
      });
    }
  });

  b.init(env);

});
