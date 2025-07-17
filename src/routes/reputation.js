import express from "express";
import { likeLog, unlikeLog, getTopLogs, getReactionsForUser } from "../controllers/reputationController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * /api/like/logs/{logId}/like:
 *   post:
 *     summary: Like a log
 *     tags: [Reputation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: logId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the log to like
 *     responses:
 *       200:
 *         description: Log liked successfully
 *       400:
 *         description: Already liked
 *       500:
 *         description: Server error
 */
router.post("/logs/:logId/like", verifyToken, likeLog);

/**
 * @swagger
 * /api/like/logs/{logId}/dislike:
 *   delete:
 *     summary: Unlike a log
 *     tags: [Reputation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: logId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the log to unlike
 *     responses:
 *       200:
 *         description: Log unliked successfully
 *       500:
 *         description: Server error
 */
router.delete("/logs/:logId/dislike", verifyToken, unlikeLog);

/**
 * @swagger
 * /api/like/logs/top:
 *   get:
 *     summary: Get top liked logs
 *     tags: [Reputation]
 *     parameters:
 *       - in: query
 *         name: teamId
 *         required: true
 *         schema:
 *           type: string
 *         description: Team ID
 *       - in: query
 *         name: range
 *         required: false
 *         schema:
 *           type: string
 *           enum:
 *             - week
 *             - month
 *         description: "Time range to fetch logs for (default: week)"
 *     responses:
 *       200:
 *         description: List of top liked logs
 *       500:
 *         description: Server error
 */
router.get("/logs/top", getTopLogs);

/**
 * @swagger
 * /v1/like/logs/reactions:
 *   get:
 *     summary: Get reactions (likes) on logs created by a user
 *     tags:
 *       - Logs
 *     parameters:
 *       - in: query
 *         name: authorId
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID of the log author
 *     responses:
 *       200:
 *         description: A list of logs with their like counts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   title:
 *                     type: string
 *                   likes:
 *                     type: integer
 *       400:
 *         description: Missing authorId
 *       500:
 *         description: Internal server error
 */
router.get("/logs/reactions", getReactionsForUser);

export default router;
