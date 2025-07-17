
import { PrismaClient } from "@prisma/client";
import redisClient from "../config/redis.js";

const prisma = new PrismaClient();

// Utility key pattern
const likeKey = (logId) => `log:likes:${logId}`;

/**
 * POST /api/logs/:logId/like
 * Allows user to like a log
 */
export const likeLog = async (req, res) => {
  const { logId } = req.params;
  const userId = req.user.id;

  try {
    // 1. Create like record (throws error if already liked due to @@unique)
    await prisma.logLike.create({
      data: { userId, logId },
    });

    // 2. Optional: increment cached count in Redis
    // await redisClient.incr(likeKey(logId));

    res.status(200).json({ message: "Log liked." });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(400).json({ error: "Already liked." });
    }
    console.error("❌ Like Error:", err);
    res.status(500).json({ error: "Failed to like log." });
  }
};


/**
 * DELETE /api/logs/:logId/like
 * Allows user to unlike a log
 */
export const unlikeLog = async (req, res) => {
  const { logId } = req.params;
  const userId = req.user.id;

  try {
    // 1. Delete the like record
    await prisma.logLike.delete({
      where: {
        userId_logId: {
          userId,
          logId,
        },
      },
    });

    // 2. Optional: decrement cached count in Redis
    // await redisClient.decr(likeKey(logId));

    res.status(200).json({ message: "Log unliked." });
  } catch (err) {
    console.error("❌ Unlike Error:", err);
    res.status(500).json({ error: "Failed to unlike log." });
  }
};


/**
 * GET /api/logs/top/:teamId?range=week|month
 * Fetches top liked logs for the given time range
 */
export const getTopLogs = async (req, res) => {
  const { teamId } = req.query;
  const range = req.query.range || "week";

  const dateFilter = new Date();
  if (range === "week") dateFilter.setDate(dateFilter.getDate() - 7);
  else if (range === "month") dateFilter.setMonth(dateFilter.getMonth() - 1);

  try {
    const logs = await prisma.log.findMany({
      where: {
        ...(teamId && { teamId }),
        createdAt: { gte: dateFilter },
      },
      orderBy: {
        LogLike: {
          _count: "desc", // sort by likes count
        },
      },
      take: 10,
      include: {
        _count: {
          select: { LogLike: true }, // include count of likes
        },
      },
    });

    const formatted = logs.map((log) => ({
      id: log.id,
      title: log.title,
      likes: log._count.LogLike,
    }));

    res.status(200).json(formatted);
  } catch (err) {
    console.error("❌ Top logs error:", err);
    res.status(500).json({ error: "Failed to fetch top logs." });
  }
};


export const getReactionsForUser = async (req, res) => {
  const { authorId } = req.query;

  if (!authorId) {
    return res.status(400).json({ error: "authorId is required" });
  }

  try {
    // Fetch logs created by this user
    const logs = await prisma.log.findMany({
      where: { authorId },
      select: {
        id: true,
        title: true,
        LogLike: {
          select: { id: true } // we just need to count
        }
      }
    });

    // Map into log title + like count
    const result = logs.map(log => ({
      id: log.id,
      title: log.title,
      likes: log.LogLike.length
    }));

    res.json(result);
  } catch (err) {
    console.error("❌ Error fetching reactions:", err);
    res.status(500).json({ error: "Failed to fetch reactions" });
  }
};
