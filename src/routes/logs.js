import express from "express";
import {
    createLog, getLogs, getHotTags, getDailyDigest, updateLog, deleteLog, searchLogs, getKnowledgeGaps
    , revertLog, getLogDiff,getLeaderboard, getLogGrowthChart
} from "../controllers/logController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * /api/v1/logs:
 *   post:
 *     summary: Create a new log entry
 *     tags:
 *       - Logs
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *               - tags
 *               - teamId
 *               - authorId
 *             properties:
 *               content:
 *                 type: string
 *                 example: "Fixed bug in login flow"
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["bugfix", "auth"]
 *               teamId:
 *                 type: string
 *                 example: "team123"
 *               authorId:
 *                 type: string
 *                 example: "user456"
 *     responses:
 *       201:
 *         description: Log created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 log:
 *                   $ref: '#/components/schemas/Log'
 */

router.post("/", verifyToken, createLog);

/**
 * @swagger
 * /api/v1/logs:
 *   get:
 *     summary: Get logs (supports filtering + pagination)
 *     parameters:
 *       - in: query
 *         name: teamId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: tag
 *         schema:
 *           type: string
 *       - in: query
 *         name: authorId
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: A list of logs
 */
router.get("/", verifyToken, getLogs);

/**
 * @swagger
 * /api/v1/logs/hot-tags:
 *   get:
 *     summary: Get top tags for a team
 *     tags:
 *       - Logs
 *     parameters:
 *       - in: query
 *         name: teamId
 *         schema:
 *           type: string
 *         required: true
 *         description: The team ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         required: false
 *         description: Number of top tags to return (default 10)
 *     responses:
 *       200:
 *         description: List of top tags
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tags:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       tag:
 *                         type: string
 *                       count:
 *                         type: number
 */
router.get("/hot-tags", getHotTags);

/**
 * /logs/leaderboard:
  get:
    summary: Get team log leaderboard
    tags:
      - Logs
    parameters:
      - in: query
        name: teamId
        required: true
        schema:
          type: string
        description: The ID of the team
      - in: query
        name: period
        required: false
        schema:
          type: string
          enum: [week, month]
        description: Period to calculate leaderboard (default: week)
    responses:
      200:
        description: List of top contributors
        content:
          application/json:
            schema:
              type: array
              items:
                type: object
                properties:
                  name:
                    type: string
                  count:
                    type: integer
      400:
        description: Missing teamId
      500:
        description: Internal server error
 */
router.get("/leaderboard", getLeaderboard);

/**
 * @swagger
 * /api/v1/logs/{logId}/diff:
 *   get:
 *     summary: Get diff between current and last log version
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: logId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the log to compare
 *     responses:
 *       200:
 *         description: Returns the diff object between current and last version
 *       404:
 *         description: Log or previous version not found
 *       500:
 *         description: Server error
 */
router.get("/:logId/diff", verifyToken, getLogDiff);

/**
 * @swagger
 * /api/v1/logs/digest?{teamId}:
 *   get:
 *     summary: Get today's logs for a team
 *     tags:
 *       - Logs
 *     parameters:
 *       - in: query
 *         name: teamId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the team
 *     responses:
 *       200:
 *         description: List of today’s logs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 logs:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Log'
 *                 cached:
 *                   type: boolean
 */
router.get("/digest", getDailyDigest);

/**
 * @swagger
 * /logs/growth:
 *   get:
 *     summary: Get daily log growth over the past 7 days
 *     description: Returns number of logs created per day, optionally filtered by teamId.
 *     tags: [Logs]
 *     parameters:
 *       - in: query
 *         name: teamId
 *         schema:
 *           type: string
 *         description: Filter logs by team ID
 *     responses:
 *       200:
 *         description: Log counts by date
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   date:
 *                     type: string
 *                     format: date
 *                     example: "2025-07-12"
 *                   count:
 *                     type: integer
 *                     example: 4
 *       500:
 *         description: Internal server error
 */
router.get("/growth", getLogGrowthChart);

/**
 * @swagger
 * /api/v1/logs/{logId}:
 *   put:
 *     summary: Update a log
 *     tags: [Logs]
 *     parameters:
 *       - in: path
 *         name: logId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               content: { type: string }
 *               tags: { type: array, items: { type: string } }
 *     responses:
 *       200:
 *         description: Log updated
 */
router.put("/:logId", verifyToken, updateLog);

/**
 * @swagger
 * /api/v1/logs/{logId}:
 *   delete:
 *     summary: Delete a log
 *     tags: [Logs]
 *     parameters:
 *       - in: path
 *         name: logId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Log deleted
 */
router.delete("/:logId", verifyToken, deleteLog);

/**
 * @swagger
 * /api/v1/logs/search:
 *   get:
 *     summary: Search logs by team, author, or keyword
 *     tags: [Logs]
 *     parameters:
 *       - in: query
 *         name: teamId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: authorId
 *         schema:
 *           type: string
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Search results
 */
router.get("/search", verifyToken, searchLogs);

/**
 * @swagger
 * /api/v1/logs/gaps?{teamId}:
 *   get:
 *     summary: Show underused tags for a team (Knowledge Gaps)
 *     tags: [Logs]
 *     parameters:
 *       - in: query
 *         name: teamId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Underused tags summary
 */
router.get("/gaps", verifyToken, getKnowledgeGaps);

/**
 * @swagger
 * /api/v1/logs/{logId}/revert:
 *   put:
 *     summary: Revert a log to its most recent previous version
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: logId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the log to revert
 *     responses:
 *       200:
 *         description: Log reverted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Log reverted successfully
 *                 log:
 *                   $ref: '#/components/schemas/Log'
 *       400:
 *         description: No version to revert to
 *       403:
 *         description: Not authorized to revert this log
 *       404:
 *         description: Log not found
 *       500:
 *         description: Server error
 */
router.put("/:logId/revert", verifyToken, revertLog);




export default router;
