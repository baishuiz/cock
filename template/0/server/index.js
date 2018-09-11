var http = require('http');
var url = require('url');
var fs = require('fs');
var path = require('path');
var zlib = require('zlib');
var replaceStream = require('./replaceStream');
var mimeType = require('./mimeType');

var mime = mimeType.types;
var expires = mimeType.expires;
var server = null;
let config;



function getStaticConfig(config) {
  var frontConfig = config.frontConfig || []; // 前端需要的配置参数
  var tplConfig = {};
  for (var i = 0; i < frontConfig.length; i++) {
    var key = frontConfig[i];
    tplConfig[key] = config[key];
  }
  var staticConfig = '<script>var staticConfig=' + JSON.stringify(tplConfig) + ';</script>';
  return staticConfig;
}

function getLayoutPath(config, userAgent) {
  userAgent = (userAgent || '').toLowerCase();
  var hybridKey = (config.hybridKey || '').toLowerCase();
  var isInApp = hybridKey ? userAgent.indexOf(hybridKey) !== -1 : false;
  var layoutPath = '/layouts/index-';

  layoutPath += isInApp ? 'hybrid' : 'web';
  layoutPath += '.html';
  return layoutPath;
};

function getMIMEs(){
  let result = [];
  for (let item in mime) {
    result.push(item);
  }
  return result;
}

function getFileExtName(urlPath){
  let keys  = getMIMEs();
  let staticFileReg = new RegExp('.(' + keys.join('|') + ')$');
  let matchedExt = urlPath.match(staticFileReg);
  return matchedExt && matchedExt[1] || '';
}

function  getMockData(resourceExtName){
  let contentType = mime[resourceExtName] || 'text/html';
  let contentTypeUTF8 = '; charset=utf-8';
  var headerObj = {
    'Content-Type': contentType + contentTypeUTF8
  };
  var pathAry = pathname.split('/');

  if (pathAry.length > 2) {
    var tmpPathAry = pathAry.slice(2, pathAry.length);
    var tmpName = '';

    var jumpIdx = 0;
    for (var i = 0, len = tmpPathAry.length; i < len; i++) {
      var str = tmpPathAry[i];
      if (str === alias.replace(/\//g) || str === 'mock') {
        jumpIdx++;
        continue;
      }
      if (i > jumpIdx) {
        str = str[0].toUpperCase() + str.slice(1, str.length);
      }
      tmpName += str;
    }
    pathname = tmpName;
  }
  fileName = __dirname + '/../mock/' + pathname + '.json';
  headerObj['Content-Type'] = 'application/json' + contentTypeUTF8;
  headerObj['resultCode'] = 0;
  response(filename, res, headerObj);
}

function response(resourceURL, req, res){
  let extName = getFileExtName(resourceURL);
  let contentType = mime[extName] || 'text/html';
  let headerObj = {};
  fs.stat(resourceURL, function (err, stat) {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, 'Not Found', {
          'Content-Type': 'text/html'
        });
        res.write('404');
      } else {
        res.writeHead(500, 'Internal Server Error', {
          'Content-Type': 'text/html'
        });
        res.write('500');
      }
      res.end();
    } else {
      let ext = getFileExtName(resourceURL);
      if (ext.match(expires.fileMatch)) {
        var lastModified = stat.mtime.toUTCString();
        var ifModifiedSince = 'If-Modified-Since'.toLowerCase();
        headerObj['Last-Modified'] = lastModified;

        var expTime = new Date();
        expTime.setTime(expTime.getTime() + expires.maxAge * 1000);
        headerObj['Expires'] = expTime.toUTCString();
        headerObj['Cache-Control'] = 'max-age=' + expires.maxAge;
      }

      if (req.headers[ifModifiedSince] && lastModified === req.headers[ifModifiedSince]) { // 304
        res.writeHead(304, 'Not Modified', headerObj);
        res.end();
      } else {
        var acceptEncoding = req.headers['accept-encoding'];
        var raw = fs.createReadStream(resourceURL);

        // 动态插入config参数
        // 替换$resourceURL
        var staticConfig = getStaticConfig(config);
        var gzipAble = acceptEncoding && acceptEncoding.match(/\bgzip\b/);
        if (gzipAble) {
          headerObj['Content-Encoding'] = 'gzip';
        }

        res.writeHead(200, 'OK', headerObj);

        // if (isDev && contentType.match(/^text\//)) {
        //   // 开发模式下，将公用模块路径替换为特定字符，供后续访问时使用
        //   raw = raw.pipe(replaceStream(new RegExp(config.commonModulePrefix, 'g'), alias + '{{commonModule}}/CJfed/'));
        // }

        if (contentType === 'text/html') {
          raw = raw.pipe(replaceStream(/{{staticConfig}}/g, staticConfig)) // 注入前端配置信息

                   // 注入资源路径
                   .pipe(replaceStream(/{{\$resourceURL}}/g, config.resourceURL || '')) 
                   
                   // 注入框架加载地址
                   .pipe(replaceStream(/{{staticTemplatePrefix}}(b\/(web|hybrid)\/b\..+\.js)/g, function (str, match1) { 
                     return config.staticTemplatePrefix + match1;
                   }));
        }

        if (gzipAble) {
          raw = raw.pipe(zlib.createGzip());
        }
        raw.pipe(res);
      }
    }
  });
}

function onRequest(req, res) {

    let pathname = url.parse(req.url).pathname;
    let extName = getFileExtName(pathname);

    // TODO debug模式切换路径
    let responseRootPath = __dirname + '/../webapp/dest';
    let isStaticFile = (extName.length > 0);
    var isDev = (config.env.toLowerCase() === 'dev');

    // TODO: 开发mock数据
    // var pathReg = new RegExp('^(' + alias + ')?mock\/');
    var isMockReg = /^mock/;
    if (isDev) {
      let isRequestMock = pathname.match(isMockReg);
      if(isRequestMock) {
        getMockData(extName);
      } 
    } 


    if (isStaticFile) { // response static resource file
      responseRootPath +=  pathname;
      response(responseRootPath, req, res);
    } else { // response main layout
      responseRootPath += getLayoutPath(config, req.headers['user-agent']);
      response(responseRootPath, req, res);
    }

    
    
}

function startServer(_config) {
  config = _config;
  let port = config.port || 8888;
  server = http.createServer(onRequest);
  server.listen(port);
  console.info('Server start at port ' + port);
}


exports.start = startServer;
