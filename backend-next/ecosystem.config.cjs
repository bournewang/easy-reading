module.exports = {
  apps: [{
    name: 'easy-reading-backend',
    cwd: '/var/www/html/english-reader/backend-next',
    script: 'npm',
    args: 'start',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};