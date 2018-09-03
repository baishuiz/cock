var http = require('http');
var url = require('url');
var fs = require('fs');
var path = require('path');
var zlib = require('zlib');
var server = null;
var domain = require('domain');
var serverDm = domain.create();
var mimeType = require('./mimeType');
var mime = mimeType.types;
var expires = mimeType.expires;
var replaceStream = require('./replaceStream');

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

function startServer(config) {
  function onRequest(req, res) {
    var reqDm = domain.create();
    reqDm.add(req);
    reqDm.add(res);
    reqDm.on('error', function(err) {
      console.error('Error on request', err.stack);
      // TODO: sent log
      try {
        res.writeHead(500);
        res.end('Error occurred, sorry.');
      } catch (err) {
        console.error('Error sending 500', err, req.url);
      }
    });

    reqDm.run(function () {
      var pathname = url.parse(req.url).pathname;

      var keys = (function () {
        var result = [];
        for (var k in mime) {
          result.push(k);
        }
        return result;
      }());

      var staticFileReg = new RegExp('.(' + keys.join('|') + ')$');

      var matchedExt = pathname.match(staticFileReg);
      // TODO debug模式切换路径
      var fileDirectory = __dirname + '/../webapp/dest';
      var fileName = fileDirectory;
      var alias = config.alias || '/';
      var isStaticFile = matchedExt && matchedExt.length;
      var ext = matchedExt && matchedExt[1] || '';
      var contentType = mime[ext] || 'text/html';
      var contentTypeUTF8 = '; charset=utf-8';
      var headerObj = {
        'Content-Type': contentType + contentTypeUTF8
      };
      var isDev = config.env === 'dev';

      // TODO: 开发mock数据
      var pathReg = new RegExp('^(' + alias + ')?mock\/');
      if (pathname.match(pathReg) && isDev) {
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
      } else {
        if (isStaticFile) {
          var isNormalFile = true;
          var commonModuleStr = alias + '{{commonModule}}/';

          if (isDev) {
            // 开发模式下，替换公共模块为本地路径
            try {
              var path = decodeURIComponent(pathname);

              if (path.indexOf(commonModuleStr) !== -1) {
                isNormalFile = false;
                fileName = __dirname + '/../' + config.localCommonModulePath + path.replace(commonModuleStr, '/');
              }
            } catch (e) {}
          }

          if (isNormalFile) {
            var reg = new RegExp('^' + alias);
            if (pathname.match(reg)) {
              pathname = pathname.replace(reg, '/');
            }
            fileName +=  pathname;
          }
        } else {
          fileName += getLayoutPath(config, req.headers['user-agent']);
        }

      }

      fs.stat(fileName, function (err, stat) {
        if (err) {
          if (err.code === 'ENOENT') {
            // TODO 404 页面？
            res.writeHead(404, 'Not Found', {
              'Content-Type': 'text/html'
            });
            res.write('404');
          } else {
            // TODO 500 页面？
            res.writeHead(500, 'Internal Server Error', {
              'Content-Type': 'text/html'
            });
            res.write('500');
          }
          res.end();
        } else {

          if (ext.match(expires.fileMatch)) {
            var lastModified = stat.mtime.toUTCString();
            var ifModifiedSince = 'If-Modified-Since'.toLowerCase();
            headerObj['Last-Modified'] = lastModified;

            var expTime = new Date();
            expTime.setTime(expTime.getTime() + expires.maxAge * 1000);
            headerObj['Expires'] = expTime.toUTCString();
            headerObj['Cache-Control'] = 'max-age=' + expires.maxAge;
          }

          if (req.headers[ifModifiedSince] && lastModified === req.headers[ifModifiedSince]) {
            res.writeHead(304, 'Not Modified', headerObj);
            res.end();
          } else {
            var acceptEncoding = req.headers['accept-encoding'];
            var raw = fs.createReadStream(fileName);

            // 动态插入config参数
            // 替换$resourceURL
            var staticConfig = getStaticConfig(config);
            var gzipAble = acceptEncoding && acceptEncoding.match(/\bgzip\b/);
            if (gzipAble) {
              headerObj['Content-Encoding'] = 'gzip';
            }
            res.writeHead(200, 'OK', headerObj);

            if (isDev && contentType.match(/^text\//)) {
              // 开发模式下，将公用模块路径替换为特定字符，供后续访问时使用
              raw = raw.pipe(replaceStream(new RegExp(config.commonModulePrefix, 'g'), alias + '{{commonModule}}/CJfed/'));
            }

            if (contentType === 'text/html') {
              raw = raw.pipe(replaceStream(/{{staticConfig}}/g, staticConfig))
                       .pipe(replaceStream(/{{\$resourceURL}}/g, config.resourceURL || ''))
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
    });
  }

  serverDm.on('error', function (error) {
      console.error('Error on server', error.stack);
      // TODO: sent log
      process.exit(1);
  });

  serverDm.run(function() {
    var port = config.port || 8888;
    server = http.createServer(onRequest);
    server.listen(port);
    console.log('Server start at port ' + port);
  });
}


exports.start = startServer;
