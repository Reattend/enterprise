module.exports = {
  apps: [
    {
      name: 'reattend',
      script: 'node_modules/.bin/next',
      args: 'start -p 3000',
      cwd: '/var/www/reattend',
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
}
