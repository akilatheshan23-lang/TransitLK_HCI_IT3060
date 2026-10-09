const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
const mode = process.argv[2];
const addresses = Object.entries(os.networkInterfaces()).flatMap(([name, entries]) =>
  (entries || []).filter(i => i.family === 'IPv4' && !i.internal && /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(i.address))
    .map(i => ({ name, address: i.address })));
const wifi = addresses.find(i => /wi-?fi|wireless/i.test(i.name));
const host = process.env.TRANSITLK_HOST_IP || wifi?.address || addresses[0]?.address;

async function main() {
  if (!['frontend', 'mobile', 'android', 'backend', 'check'].includes(mode)) throw Error('Choose frontend, mobile, android, backend or check.');
  if (mode === 'check') {
    console.log(JSON.stringify({ node: process.version, project: root, host, api: host && `http://${host}:4000`, expo: host && `exp://${host}:8081` }, null, 2));
    return;
  }
  if (mode === 'backend') {
    process.chdir(path.join(root, 'backend'));
    if (!fs.existsSync('.env')) throw Error('Configure backend/.env using backend/.env.example first.');
    process.loadEnvFile('.env');
    process.env.CORS_ORIGINS = [...new Set([
      ...(process.env.CORS_ORIGINS || '').split(',').filter(Boolean),
      'http://localhost:8082', 'http://127.0.0.1:8082',
      ...(host ? [`http://${host}:8081`, `http://${host}:8082`] : [])
    ])].join(',');
    await import(pathToFileURL(path.join(root, 'backend/src/server.js')).href);
  } else {
    const android = mode === 'android';
    const mobile = mode === 'mobile' || android;
    if (mobile && !android && !host) throw Error('Connect the PC to Wi-Fi, or set TRANSITLK_HOST_IP to its LAN address.');
    process.chdir(path.join(root, 'mobile'));
    process.env.EXPO_PUBLIC_API_URL = process.env.EXPO_PUBLIC_API_URL || (mode === 'frontend' ? 'http://localhost:4000/api' : `http://${android ? '10.0.2.2' : host || 'localhost'}:4000/api`);
    if (android) process.env.REACT_NATIVE_PACKAGER_HOSTNAME = '127.0.0.1';
    else if (host) process.env.REACT_NATIVE_PACKAGER_HOSTNAME = host;
    process.env.EXPO_NO_TELEMETRY = '1';
    process.env.__UNSAFE_EXPO_HOME_DIRECTORY = path.join(root, '.local/expo');
    const androidSdk = path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk');
    if (fs.existsSync(androidSdk)) {
      process.env.ANDROID_HOME = process.env.ANDROID_HOME || androidSdk;
      process.env.ANDROID_SDK_ROOT = process.env.ANDROID_SDK_ROOT || androidSdk;
      process.env.PATH = path.join(androidSdk, 'platform-tools') + path.delimiter + process.env.PATH;
    }
    process.env.PATH = path.dirname(process.execPath) + path.delimiter + process.env.PATH;
    if (android) {
      console.log('Android emulator: Expo Go connects through localhost:8081.');
    } else if (mobile) {
      console.log(`iPhone: connect to the same Wi-Fi, then scan Expo's QR code with Camera.`);
      console.log(`Expo Go address: exp://${host}:8081`);
    } else console.log('Frontend browser preview: http://localhost:8082');
    console.log(`Backend address: ${process.env.EXPO_PUBLIC_API_URL}`);
    const cli = path.join(root, 'node_modules/expo/bin/cli');
    process.argv = [process.execPath, cli, 'start', ...(android ? ['--lan', ...(process.env.TRANSITLK_MANUAL_ANDROID ? [] : ['--android'])] : mobile ? ['--lan'] : ['--web']), '--port', mobile ? '8081' : '8082', '--max-workers', '0'];
    require(cli);
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
