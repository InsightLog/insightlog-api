// services/userService.js
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
export const fetchTeamLead = async (teamId) => {
  return await prisma.user.findFirst({
    where: {
      teamId,
      role: "LEAD",
    },
    select: { id: true, name: true, email: true },
  });
};