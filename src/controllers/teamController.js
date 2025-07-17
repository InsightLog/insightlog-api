import { PrismaClient } from "@prisma/client";
import { fetchTeamLead } from "../services/userService.js";
import { sendInviteEmail } from "../utils/email.js";
const prisma = new PrismaClient();

export const createTeam = async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ message: "Team name is required." });
  }

  try {
    const team = await prisma.team.create({
      data: {
        name,
      },
    });
    res.status(201).json({ team });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ message: "Team name already exists." });
    }
    console.error("❌ Error creating team:", err);
    res.status(500).json({ message: "Server error while creating team." });
  }
};

export const assignUserToTeam = async (req, res) => {
  const { teamId } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required." });
  }

  try {
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!team || !user) {
      return res.status(404).json({ message: "User or team not found." });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { teamId: team.id },
    });

    res.status(200).json({ message: "User assigned to team", user: updatedUser });
  } catch (err) {
    console.error("❌ Error assigning user to team:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getMyTeam = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        team: {
          include: {
            users: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!user || !user.team) {
      return res.status(404).json({ message: "User is not in any team" });
    }

    res.status(200).json({ team: user.team });
  } catch (err) {
    console.error("❌ Error fetching team info:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getAllTeams = async (req, res) => {
  try {
    const teams = await prisma.team.findMany({
      include: {
        users: true,
      },
    });

    const formatted = await Promise.all(
      teams.map(async (team) => {
        const lead = await fetchTeamLead(team.id); // dynamic lookup
        return {
          id: team.id,
          name: team.name,
          lead,
          memberCount: team.users.length,
        };
      })
    );

    res.json(formatted);
  } catch (err) {
    console.error("Failed to fetch teams:", err);
    res.status(500).json({ error: "Server error" });
  }
};


export const getTeamMembersWithInvites = async (req, res) => {
  const { teamId } = req.params;

  try {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        invites: {
          where: { status: "pending" },
          select: {
            id: true,
            email: true,
            sentAt: true,
            status: true,
          },
        },
      },
    });

    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    res.json({
      teamName: team.name,
      members: team.users,
      invites: team.invites,
    });
  } catch (err) {
    console.error("Error fetching members + invites:", err);
    res.status(500).json({ error: "Server error" });
  }
};


export const inviteToTeam = async (req, res) => {
  const { teamId } = req.params;
  const { email, userId } = req.body;

  if (!email) return res.status(400).json({ error: "Email is required" });

  try {
    // 1. Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    // 2. Check if invite already sent
    const existingInvite = await prisma.invite.findFirst({
      where: { email, teamId, status: "pending" },
    });
    if (existingInvite) {
      return res.status(400).json({ error: "Invite already sent" });
    }

    // 3. Fetch team and inviter user details
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!team || !user) {
      return res.status(404).json({ error: "Invalid team or user" });
    }

    // 4. Create invite
    const invite = await prisma.invite.create({
      data: {
        email,
        teamId,
        status: "pending",
        sentAt: new Date(),
      },
    });

    // 5. Send invitation email
    const emailResult = await sendInviteEmail({ email, team, user });
    console.log("Email sent:", emailResult);

    return res.status(201).json({ message: "Invite sent", invite });
  } catch (err) {
    console.error("Invite error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};


export const getTeamDetails = async (req, res) => {
  const { teamId } = req.params;

  try {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    res.json(team);
  } catch (err) {
    console.error("❌ Failed to fetch team details:", err);
    res.status(500).json({ error: "Failed to fetch team details" });
  }
};

export const getLogsByTeam = async (req, res) => {
  const { teamId } = req.params;

  try {
    const logs = await prisma.log.findMany({
      where: { teamId },
      orderBy: { createdAt: "desc" },
      include: {
        author: {
          select: { name: true, email: true },
        },
      },
    });

    res.json(logs);
  } catch (err) {
    console.error("❌ Failed to fetch logs:", err);
    res.status(500).json({ error: "Failed to fetch logs" });
  }
};
