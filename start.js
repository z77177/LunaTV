#!/usr/bin/env node

/* eslint-disable no-console,@typescript-eslint/no-var-requires */
const http = require('http');
const path = require('path');

// 调用 generate-manifest.js 生成 manifest.json
function generateManifest() {
  console.log('Generating manifest.json for Docker deployment...');

  try {
    const generateManifestScript = path.join(
      __dirname,
      'scripts',
      'generate-manifest.js'
    );
    require(generateManifestScript);
  } catch (error) {
    console.error('❌ Error calling generate-manifest.js:', error);
    throw error;
  }
}

generateManifest();

// 直接在当前进程中启动 standalone Server（`server.js`）
require('./server.js');

const PORT = process.env.PORT || 3000;
const LOCAL_HOST = '127.0.0.1';
const TARGET_URL = `http://${LOCAL_HOST}:${PORT}/login`;

let isServerUp = false;

// 每 1 秒轮询一次，直到请求成功
const intervalId = setInterval(() => {
  if (isServerUp) {
    clearInterval(intervalId);
    return;
  }

  console.log(`Fetching ${TARGET_URL} ...`);

  const req = http.get(TARGET_URL, (res) => {
    res.resume(); // 消费响应流，防止连接挂起

    // 当返回 2xx 状态码时认为成功，然后停止轮询（加锁防止慢响应下重复注册定时任务）
    if (!isServerUp && res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
      isServerUp = true;
      console.log('Server is up, stop polling.');
      clearInterval(intervalId);

      setTimeout(() => {
        // 服务器启动后，立即执行一次 cron 任务
        executeCronJob();
      }, 3000);

      // 然后设置每小时执行一次 cron 任务
      setInterval(() => {
        executeCronJob();
      }, 60 * 60 * 1000);
    }
  });

  req.on('error', () => {
    // 忽略启动初期的 ECONNREFUSED 或超时中断，防止未捕获异常崩溃容器
  });

  req.setTimeout(2000, () => {
    req.destroy();
  });
}, 1000);

// 执行 cron 任务的函数
function executeCronJob() {
  const cronUrl = `http://${LOCAL_HOST}:${PORT}/api/cron`;
  const cronSecret = process.env.CRON_SECRET || process.env.PASSWORD || '';

  console.log(`Executing cron job: ${cronUrl}`);

  const options = {
    headers: cronSecret
      ? { Authorization: `Bearer ${cronSecret}` }
      : {},
  };

  const req = http.get(cronUrl, options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
        console.log('Cron job executed successfully:', data);
      } else {
        console.error('Cron job failed:', res.statusCode, data);
      }
    });
  });

  req.on('error', (err) => {
    console.error('Error executing cron job:', err);
  });

  req.setTimeout(300000, () => {
    console.error('Cron job timeout (5 minutes)');
    req.destroy();
  });
}
