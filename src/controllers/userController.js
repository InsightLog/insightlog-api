import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const getAllUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            // where: {
            //     teamId: null, 
            // },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                team: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                createdAt: true,
            },
        });

        res.json(users);
    } catch (err) {
        console.error("❌ Error fetching users:", err);
        res.status(500).json({ error: "Failed to fetch users" });
    }
};

export const getAllUsersWithoutTeam = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            where: {
                teamId: null, 
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                team: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                createdAt: true,
            },
        });

        res.json(users);
    } catch (err) {
        console.error("❌ Error fetching users without team:", err);
        res.status(500).json({ error: "Failed to fetch users without team" });
    }
};

export const getUserById = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
                team: {
                    select: { id: true, name: true },
                },
            },
        });

        if (!user) return res.status(404).json({ error: "User not found" });
        res.json(user);
    } catch (err) {
        console.error("❌ Error:", err);
        res.status(500).json({ error: "Failed to fetch user" });
    }
};

export const updateUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { name, email, role, teamId } = req.body;

        // If teamId is provided, validate it (null is allowed for removal)
        if (teamId !== undefined && teamId !== null) {
            const teamExists = await prisma.team.findUnique({
                where: { id: teamId },
            });
            if (!teamExists) {
                return res.status(400).json({ error: "Invalid teamId" });
            }
        }

        // Build update data only with provided fields
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (email !== undefined) updateData.email = email;
        if (role !== undefined) updateData.role = role;
        if (teamId !== undefined) updateData.teamId = teamId;

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
        });

        res.json({ user: updatedUser });
    } catch (err) {
        console.error("❌ Update error:", err);
        res.status(500).json({ error: "Failed to update user" });
    }
};


export const deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;

        await prisma.user.delete({
            where: { id: userId },
        });

        res.json({ message: "User deleted successfully" });
    } catch (err) {
        console.error("❌ Delete error:", err);
        res.status(500).json({ error: "Failed to delete user" });
    }
};

// Get all users in a team
export const getUsersByTeam = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            where: { teamId: req.params.teamId },
            select: { id: true, name: true, email: true, role: true },
        });

        if (!users.length) return res.status(404).json({ error: "No users found for this team" });
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch users" });
    }
};

// Get team lead
export const getTeamLead = async (req, res,) => {
    try {
        const lead = await prisma.user.findFirst({
            where: {
                teamId: req.params.teamId,
                role: "LEAD",
            },
            select: { id: true, name: true, email: true },
        });

        if (!lead) return res.status(404).json({ error: "No team lead found" });
        res.json(lead);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch team lead" });
    }
};

export const getCurrentUser = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                teamId: true,
                createdAt: true,
            },
        });

        if (!user) return res.status(404).json({ error: "User not found" });
        res.json(user);
    } catch (err) {
        console.error("❌ Error fetching current user:", err);
        res.status(500).json({ error: "Server error" });
    }
};
