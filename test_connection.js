import http from 'http';

function test(path) {
    console.log(`Testing connection to http://localhost:5173${path}...`);
    const req = http.get(`http://localhost:5173${path}`, (res) => {
        console.log(`PATH: ${path} -> STATUS: ${res.statusCode}`);
        res.resume();
    });
    req.on('error', (e) => {
        console.error(`Problem with request: ${e.message} (${e.code})`);
    });
    req.setTimeout(2000, () => {
        console.error('Request timed out');
        req.destroy();
    });
}

test('/');
