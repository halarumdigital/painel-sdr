import { defineConfig } from "drizzle-kit";

const host = process.env.MYSQL_HOST || "localhost";
const port = process.env.MYSQL_PORT || "3306";
const user = process.env.MYSQL_USER || "root";
const password = process.env.MYSQL_PASSWORD || "";
const database = process.env.MYSQL_DATABASE || "sdr";

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "mysql",
  dbCredentials: {
    host,
    port: parseInt(port, 10),
    user,
    password,
    database,
  },
});
