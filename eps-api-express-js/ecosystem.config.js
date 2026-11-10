// Run the API under pm2 in production:   pm2 start ecosystem.config.js --env production   then   pm2 save
// One process: the live updates (socket.io) and the "who is online" list keep their state in memory, so they cannot be split
// over several processes without a shared store.
module.exports = {
  apps: [
    {
      name: 'eps-api',
      script: 'server.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '800M',
      kill_timeout: 5000,
      env: { NODE_ENV: 'development' },
      env_production: { NODE_ENV: 'production' },
      // pm2 install pm2-logrotate keeps these files from growing without end
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      merge_logs: true,
      time: true,
    },
  ],
};
