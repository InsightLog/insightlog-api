import express from "express";
import { createTeam, assignUserToTeam, getMyTeam, getAllTeams, getTeamMembersWithInvites, inviteToTeam, getTeamDetails,  getLogsByTeam } from "../controllers/teamController.js";
import {verifyToken} from "../middlewares/authMiddleware.js";
import {requireRole} from "../middlewares/roleMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * /api/v1/teams:
 *   post:
 *     summary: Create a new team
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Frontend Team
 *     responses:
 *       201:
 *         description: Team created successfully
 *       403:
 *         description: Not authorized
 */
router.post("/", verifyToken, requireRole("ADMIN"), createTeam);

/**
 * @swagger
 * /api/v1/teams/{teamId}/assign:
 *   put:
 *     summary: Assign a user to a team
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the team
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: User assigned successfully
 *       404:
 *         description: User or team not found
 *       403:
 *         description: Forbidden
 */
router.put("/:teamId/assign", verifyToken, requireRole("ADMIN"), assignUserToTeam);

/**
 * @swagger
 * /api/v1/teams/me:
 *   get:
 *     summary: Get the current user's team and members
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Team info with members
 *       404:
 *         description: User not in a team
 */
router.get("/me", verifyToken, getMyTeam);

router.get("/", verifyToken, getAllTeams);

router.get("/:teamId/members", verifyToken, getTeamMembersWithInvites);

router.post("/:teamId/invite", verifyToken, requireRole('ADMIN'), inviteToTeam);

/**
 * @swagger
 * /api/v1/teams/{teamId}:
 *   get:
 *     summary: Get details of a specific team
 *     tags: [Teams]
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
 *         description: Team details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Team'
 *       404:
 *         description: Team not found
 *       500:
 *         description: Server error
 */
router.get("/:teamId", verifyToken, getTeamDetails);


/**
 * @swagger
 * /api/v1/logs/{teamId}/logs:
 *   get:
 *     summary: Get all logs for a specific team
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the team whose logs you want to fetch
 *     responses:
 *       200:
 *         description: List of logs for the given team
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Log'
 *       404:
 *         description: Team not found or no logs available
 *       500:
 *         description: Server error
 */
router.get("/:teamId/logs", verifyToken, getLogsByTeam);
export default router;
