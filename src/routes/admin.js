import express from "express";
import { verifyToken } from "../middlewares/authMiddleware.js";
import { requireRole } from "../middlewares/roleMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * /api/v1/admin/secure:
 *   get:
 *     summary: Admin-only route
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin content
 */
router.get("/secure", verifyToken, requireRole("ADMIN"), (req, res) => {
  res.json({ message: "Welcome Admin 👑" });
});

export default router;
