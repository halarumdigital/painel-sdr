import { Request, Response, NextFunction, Express } from "express";
import session from "express-session";
import MySQLStore from "express-mysql-session";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { users, loginSchema, type User } from "../shared/schema";

declare module "express-session" {
  interface SessionData {
    user: {
      id: number;
      username: string;
      name: string;
      role: string;
      staffId: string | null;
    };
  }
}

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function setupAuth(app: Express) {
  // Trust proxy for production (nginx, etc)
  app.set("trust proxy", 1);

  // MySQL session store options
  const MySQLStoreSession = MySQLStore(session as any);
  const sessionStore = new MySQLStoreSession({
    host: process.env.MYSQL_HOST || "localhost",
    port: parseInt(process.env.MYSQL_PORT || "3306", 10),
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "sdr",
    clearExpired: true,
    checkExpirationInterval: 900000, // 15 minutes
    expiration: 86400000, // 24 hours
    createDatabaseTable: true,
  });

  app.use(
    session({
      secret: process.env.SESSION_SECRET || "super-secret-key-change-in-production",
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false, // Set to true only if behind HTTPS proxy that properly forwards headers
        httpOnly: true,
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    })
  );
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.user) {
    return res.status(401).json({ error: "Não autenticado" });
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.user) {
    return res.status(401).json({ error: "Não autenticado" });
  }
  if (req.session.user.role !== "admin") {
    return res.status(403).json({ error: "Acesso negado" });
  }
  next();
}

export function registerAuthRoutes(app: Express) {
  // Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const result = loginSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Dados inválidos", details: result.error.flatten() });
      }

      const { username, password } = result.data;

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (!user) {
        return res.status(401).json({ error: "Usuário ou senha inválidos" });
      }

      const validPassword = await comparePassword(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: "Usuário ou senha inválidos" });
      }

      req.session.user = {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        staffId: user.staffId,
      };

      // Save session explicitly
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ error: "Erro ao criar sessão" });
        }

        res.json({
          user: {
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role,
            staffId: user.staffId,
          },
        });
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Erro ao fazer logout" });
      }
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  });

  // Get current user
  app.get("/api/auth/me", (req, res) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Não autenticado" });
    }
    res.json({ user: req.session.user });
  });

  // Create user (admin only)
  app.post("/api/users", requireAdmin, async (req, res) => {
    try {
      const { username, password, name, email, role, staffId } = req.body;

      if (!username || !password || !name) {
        return res.status(400).json({ error: "Username, senha e nome são obrigatórios" });
      }

      const hashedPassword = await hashPassword(password);

      const result = await db.insert(users).values({
        username,
        password: hashedPassword,
        name,
        email: email || null,
        role: role || "sdr",
        staffId: staffId || null,
      });

      res.status(201).json({ success: true, id: result[0].insertId });
    } catch (error: any) {
      if (error.code === "ER_DUP_ENTRY") {
        return res.status(400).json({ error: "Usuário já existe" });
      }
      console.error("Create user error:", error);
      res.status(500).json({ error: "Erro ao criar usuário" });
    }
  });

  // List users (admin only)
  app.get("/api/users", requireAdmin, async (req, res) => {
    try {
      const allUsers = await db
        .select({
          id: users.id,
          username: users.username,
          name: users.name,
          email: users.email,
          role: users.role,
          staffId: users.staffId,
          createdAt: users.createdAt,
        })
        .from(users);

      res.json(allUsers);
    } catch (error) {
      console.error("List users error:", error);
      res.status(500).json({ error: "Erro ao listar usuários" });
    }
  });

  // Delete user (admin only)
  app.delete("/api/users/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);

      if (req.session.user?.id === id) {
        return res.status(400).json({ error: "Não é possível deletar seu próprio usuário" });
      }

      await db.delete(users).where(eq(users.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ error: "Erro ao deletar usuário" });
    }
  });
}
