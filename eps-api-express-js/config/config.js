require('dotenv').config();

// The same connection for every environment (NODE_ENV=production needs its own entry here, or the models cannot load).
//   logging   every SQL statement was printed to the console, which slows the server and fills the logs with citizens' data.
//             Off by default; DB_LOGGING=true turns it back on to debug.
//   pool      the connections kept open and reused, instead of a new one for every request
const base = {
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  dialect: "mysql",
  port: parseInt(process.env.DB_PORT || '3306', 10),
  logging: process.env.DB_LOGGING === 'true' ? console.log : false,
  pool: { max: parseInt(process.env.DB_POOL_MAX || '20', 10), min: 2, acquire: 30000, idle: 10000 },
  dialectOptions: {
    connectTimeout: 60000
  }
};

module.exports = {
  development: { ...base },
  test: { ...base },
  production: { ...base }
};
