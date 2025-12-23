import "dotenv/config";
import mysql from "mysql2/promise";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

async function seed() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || "localhost",
    port: parseInt(process.env.MYSQL_PORT || "3306", 10),
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "sdr",
  });

  console.log("Conectado ao MySQL!");

  // Create users table
  console.log("Criando tabela de usuários...");
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      password TEXT NOT NULL,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      role VARCHAR(20) NOT NULL DEFAULT 'sdr',
      staff_id VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log("Tabela criada com sucesso!");

  // Check if admin user exists
  const [rows] = await connection.execute(
    "SELECT * FROM users WHERE username = ?",
    ["admin"]
  );

  if ((rows as any[]).length === 0) {
    // Create admin user
    console.log("Criando usuário admin...");
    const hashedPassword = await bcrypt.hash("admin123", SALT_ROUNDS);

    await connection.execute(
      `INSERT INTO users (username, password, name, email, role) VALUES (?, ?, ?, ?, ?)`,
      ["admin", hashedPassword, "Administrador", "admin@salesflow.com", "admin"]
    );

    console.log("Usuário admin criado com sucesso!");
    console.log("  Username: admin");
    console.log("  Senha: admin123");
  } else {
    console.log("Usuário admin já existe.");
  }

  await connection.end();
  console.log("\nSeed concluído!");
}

seed().catch((error) => {
  console.error("Erro ao executar seed:", error);
  process.exit(1);
});
