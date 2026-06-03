const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8000;
const DATA_FILE = path.join(__dirname, 'registrations.json');

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

function sendJson(res, statusCode, payload) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8'
    });
    res.end(JSON.stringify(payload));
}

function ensureDataFile() {
    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, '[]', 'utf8');
    }
}

function saveRegistration(data, callback) {
    ensureDataFile();

    fs.readFile(DATA_FILE, 'utf8', (readError, fileContent) => {
        if (readError) {
            callback(readError);
            return;
        }

        let registrations = [];

        try {
            registrations = JSON.parse(fileContent || '[]');
        } catch (parseError) {
            callback(parseError);
            return;
        }

        registrations.push({
            id: Date.now(),
            name: data.name,
            email: data.email,
            message: data.message,
            createdAt: new Date().toISOString()
        });

        fs.writeFile(DATA_FILE, JSON.stringify(registrations, null, 2), 'utf8', callback);
    });
}

const server = http.createServer((req, res) => {
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === 'POST' && requestUrl.pathname === '/api/register') {
        let body = '';

        req.on('data', (chunk) => {
            body += chunk;
        });

        req.on('end', () => {
            try {
                const payload = JSON.parse(body || '{}');
                const name = String(payload.name || '').trim();
                const email = String(payload.email || '').trim();
                const message = String(payload.message || '').trim();

                if (!name || !email || !message) {
                    sendJson(res, 400, { success: false, message: '请完整填写报名信息。' });
                    return;
                }

                saveRegistration({ name, email, message }, (error) => {
                    if (error) {
                        sendJson(res, 500, { success: false, message: '报名信息保存失败，请稍后重试。' });
                        return;
                    }

                    sendJson(res, 200, { success: true, message: '报名信息提交成功，我们会尽快联系你。' });
                });
            } catch (error) {
                sendJson(res, 400, { success: false, message: '提交数据格式不正确。' });
            }
        });

        return;
    }

    let filePath = '.' + requestUrl.pathname;
    if (filePath === './') {
        filePath = './index.html';
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 Not Found</h1>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end('Server Error: ' + error.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});
