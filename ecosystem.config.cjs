module.exports = {
  apps: [
    {
      name: "work-rodion-api",
      cwd: "/var/www/work.rodion.pro",
      script: "apps/api/dist/server.js",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
        PORT: 3010,
        APP_URL: "http://work.rodion.pro",
        API_URL: "http://work.rodion.pro/api",
      },
    },
  ],
};
