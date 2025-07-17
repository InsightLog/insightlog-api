import express from "express";
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUsersByTeam,
  getTeamLead,
  getCurrentUser,
  getAllUsersWithoutTeam
} from "../controllers/userController.js";
import {verifyToken} from "../middlewares/authMiddleware.js";
import {requireRole} from "../middlewares/roleMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: Get all users with team info (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.get("/", verifyToken, requireRole("ADMIN"), getAllUsers);

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: Get all users without a team (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users without a team
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.get("/without-team", verifyToken, requireRole("ADMIN"), getAllUsersWithoutTeam);

/**
 * @swagger
 * /api/v1/users/{userId}:
 *   get:
 *     summary: Get a user by ID (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the user to retrieve
 *     responses:
 *       200:
 *         description: User details
 *       404:
 *         description: User not found
 */
router.get("/:userId", verifyToken, requireRole("ADMIN"), getUserById);

/**
 * @swagger
 * /api/v1/users/{userId}:
 *   put:
 *     summary: Update user role/info (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the user to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: New Name
 *               email:
 *                 type: string
 *                 example: new@example.com
 *               role:
 *                 type: string
 *                 enum: [ADMIN, LEAD, MEMBER]
 *               teamId:
 *                 type: string
 *                 example: 123e4567-e89b-12d3-a456-426614174000
 *     responses:
 *       200:
 *         description: User updated successfully
 *       500:
 *         description: Update failed
 */
router.put("/:userId", verifyToken, requireRole("ADMIN"), updateUser);

/**
 * @swagger
 * /api/v1/users/{userId}:
 *   delete:
 *     summary: Delete a user (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the user to delete
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       500:
 *         description: Deletion failed
 */
router.delete("/:userId", verifyToken, requireRole("ADMIN"), deleteUser);

/**
 * @swagger
 * /api/v1/users/team/{teamId}:
 *   get:
 *     summary: Get all users in a team
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the team
 *     responses:
 *       200:
 *         description: List of team members
 *       404:
 *         description: Team not found
 */
router.get("/team/:teamId", verifyToken, getUsersByTeam);

/**
 * @swagger
 * /api/v1/users/lead/{teamId}:
 *   get:
 *     summary: Get team lead for a specific team
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the team
 *     responses:
 *       200:
 *         description: Team lead details
 *       404:
 *         description: No team lead found
 */
router.get("/lead/:teamId", verifyToken, getTeamLead);

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Get current authenticated user's info
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User info fetched successfully
 *       401:
 *         description: Unauthorized or token missing
 */
router.get("/me", verifyToken, getCurrentUser);

export default router;
