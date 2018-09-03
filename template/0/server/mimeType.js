exports.types = {
    'css': 'text/css',
    'gif': 'image/gif',
    'html': 'text/html',
    'ico': 'image/x-icon',
    'jpeg': 'image/jpeg',
    'jpg': 'image/jpeg',
    'js': 'text/javascript',
    'json': 'application/json',
    'pdf': 'application/pdf',
    'png': 'image/png',
    'svg': 'image/svg+xml',
    'swf': 'application/x-shockwave-flash',
    'tiff': 'image/tiff',
    'txt': 'text/plain',
    'wav': 'audio/x-wav',
    'wma': 'audio/x-ms-wma',
    'wmv': 'video/x-ms-wmv',
    'xml': 'text/xml',
    'ttf': 'font/ttf',
    'eot': 'font/eot',
    'otf': 'font/otf',
    'woff': 'font/woff',
    'woff2': 'font/woff2'
};

// 暂时设定30天 TODO: 全局配置
exports.expires = {
    fileMatch: /^(css|gif|ico|jpeg|jpg|js|png|txt|ttf|eot|otf|woff|woff2)$/ig,
    maxAge: 2592000
};
