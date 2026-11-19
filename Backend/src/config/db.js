function getDatabaseConfig() {
  const config = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  };

  for (const key of ["host", "user", "database"]) {
    if (!config[key]) {
      throw new Error(`Missing required database setting: DB_${key.toUpperCase()}`);
    }
  }

  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
    throw new Error(`Invalid DB_PORT value: ${process.env.DB_PORT}`);
  }

  return config;
}

module.exports = { getDatabaseConfig };
