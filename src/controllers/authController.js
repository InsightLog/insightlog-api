import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: "User not found" });

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

    // Sign JWT
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    // Return safe user
    const { password: _, ...safeUser } = user;
    res.status(200).json({ user: safeUser, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const register = async (req, res) => {
  const { name, email, password, role, teamId } = req.body;

  try {
    // 1. Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    // 2. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: teamId ? "MEMBER" : "ADMIN",
        teamId: teamId || null,
      },
    });

    if (teamId) {
      await prisma.invite.deleteMany({
        where: {
          teamId,
          email,
        },
      });
    }


    // 4. Generate JWT
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        teamId: user.teamId,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 5. Remove password from user object before sending
    const { password: _, ...safeUser } = user;

    // 6. Send response
    res.status(201).json({
      token,
      user: safeUser,
    });
  } catch (err) {
    console.error("❌ Registration error:", err);
    res.status(500).json({ error: "Server error" });
  }
};
