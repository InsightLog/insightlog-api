import { PrismaClient } from "@prisma/client";
import dayjs from "dayjs";
import redisClient from "../config/redis.js";
const prisma = new PrismaClient();

export const createLog = async (req, res) => {
  try {
    const { title, content, tags, teamId, authorId } = req.body;

    // ✅ 1. Create log in DB
    const log = await prisma.log.create({
      data: {
        title,
        content,
        tags,
        teamId,
        authorId,
      },
    });

    // ✅ 2. Update Redis recentLogs cache
    const cacheKey = `team:${teamId}:recentLogs`;
    await redisClient.lPush(cacheKey, JSON.stringify(log));
    await redisClient.lTrim(cacheKey, 0, 49); // Keep only latest 50 logs
    await redisClient.expire(cacheKey, 3600); // 1 hour TTL

    // ✅ 3. Update hot tags (sorted set)
    for (const tag of tags) {
      await redisClient.zIncrBy(`team:${teamId}:hotTags`, 1, tag);
    }

    res.status(201).json({ log });
  } catch (err) {
    console.error("❌ Error creating log:", err);
    res.status(500).json({ error: "Failed to create log" });
  }
};


export const getLogs = async (req, res) => {
  const { teamId } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const tag = req.query.tag;
  const authorId = req.query.authorId;

  const offset = (page - 1) * limit;
  const cacheKey = `team:${teamId}:recentLogs`;

  try {
    // 🔍 Try Redis cache
    if (!tag && !authorId) {
      const cached = await redisClient.lRange(cacheKey, 0, limit - 1);
      if (cached.length) {
        const logs = cached.map(JSON.parse);
        return res.json({ logs, cached: true });
      }
    }

    // 🐢 Build query
    let where = {
      ...(tag && { tags: { has: tag } }),
      ...(authorId && { authorId }),
    };
    if (teamId) where.teamId = teamId;

    // 🔍 Fetch from DB
    const logs = await prisma.log.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
      include: {
        author: {
          select: { name: true }
        },
        _count: { select: { LogLike: true } },
      }
    });

    const formatted = logs.map((log) => ({
      id: log.id,
      title: log.title,
      content: log.content,
      createdAt: log.createdAt,
      tags: log.tags,
      author: {
        name: log.author?.name || "Unknown"
      },
      likeCount: log._count.LogLike,
    }));

    // 💾 Cache if no filters
    if (!tag && !authorId && formatted.length > 0) {
      const logsStr = formatted.map((log) => JSON.stringify(log));
      await redisClient.del(cacheKey);
      await redisClient.lPush(cacheKey, ...logsStr);
      await redisClient.expire(cacheKey, 3600);
    }

    res.json({ logs: formatted, cached: false });
  } catch (err) {
    console.error("❌ Error fetching logs:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};


export const getHotTags = async (req, res) => {
  const { teamId, limit = 10 } = req.query;

  try {
    let tags = [];

    // Check Redis only if teamId is present
    if (teamId) {
      const hotTags = await redisClient.zRangeWithScores(
        `team:${teamId}:hotTags`,
        0,
        limit - 1,
        { REV: true }
      );

      if (hotTags.length > 0) {
        tags = hotTags.map((entry) => ({
          tag: entry.value,
          count: entry.score,
        }));

        return res.json(tags);
      }
    }

    // Fallback to DB if no Redis or teamId not given
    const logs = await prisma.log.findMany({
      where: teamId ? { teamId } : {},
      select: { tags: true },
    });

    // Count tag frequencies
    const tagCount = {};
    logs.forEach((log) => {
      log.tags.forEach((tag) => {
        tagCount[tag] = (tagCount[tag] || 0) + 1;
      });
    });

    // Convert to array and sort
    tags = Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([tag, count]) => ({ tag, count }));

    res.json(tags);
  } catch (err) {
    console.error("❌ Error fetching hot tags:", err);
    res.status(500).json({ error: "Failed to fetch hot tags" });
  }
};



export const getDailyDigest = async (req, res) => {
  const { teamId } = req.query
  // if (!teamId) return res.status(400).json({ error: "teamId is required" });

  const today = dayjs().format("YYYY-MM-DD");
  const cacheKey = `digest:${teamId}:${today}`;

  try {
    // ✅ Check Redis cache
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    // ✅ Time window for today
    const start = dayjs().startOf("day").toDate();
    const end = dayjs().endOf("day").toDate();
    let fetch = {
      createdAt: {
        gte: start,
        lte: end,
      },
    }
    if (teamId) {
      fetch.teamId = teamId;
    }
    // ✅ Fetch today's logs for the team
    const logs = await prisma.log.findMany({
      where: fetch,
      include: {
        author: true,
      },
    });

    const totalLogs = logs.length;

    // ✅ Aggregate top contributor
    const contributorCount = {};
    for (const log of logs) {
      const name = log.author?.name || "Unknown";
      contributorCount[name] = (contributorCount[name] || 0) + 1;
    }

    const topContributorEntry = Object.entries(contributorCount).sort(
      (a, b) => b[1] - a[1]
    )[0];

    const topContributor = topContributorEntry
      ? { name: topContributorEntry[0], count: topContributorEntry[1] }
      : null;

    // ✅ Aggregate top tags
    const tagFrequency = {};
    for (const log of logs) {
      for (const tag of log.tags) {
        tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;
      }
    }

    const topTags = Object.entries(tagFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);

    const digest = {
      date: today,
      totalLogs,
      topContributor,
      topTags,
    };

    // ✅ Cache in Redis for 24 hours
    await redisClient.set(cacheKey, JSON.stringify(digest), { EX: 86400 });

    res.json(digest);
  } catch (err) {
    console.error("❌ Error in Daily Digest:", err);
    res.status(500).json({ error: "Failed to get daily digest" });
  }
};


export const updateLog = async (req, res) => {
  const { logId } = req.params;
  const { title, content, tags } = req.body;
  const userId = req.user.id;

  try {
    const existingLog = await prisma.log.findUnique({ where: { id: logId } });

    if (!existingLog) return res.status(404).json({ error: "Log not found" });

    // ✅ Authorization check
    if (existingLog.authorId !== userId && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Not authorized to edit this log" });
    }

    // ✅ Save current version to LogHistory before updating
    await prisma.logHistory.create({
      data: {
        logId,
        content: existingLog.content,
        editedBy: userId,
      },
    });

    // ✅ Perform the actual update
    const updated = await prisma.log.update({
      where: { id: logId },
      data: { title, content, tags },
    });

    res.json({ log: updated });
  } catch (err) {
    console.error("❌ Update failed:", err);
    res.status(500).json({ error: "Update failed" });
  }
};



export const deleteLog = async (req, res) => {
  const { logId } = req.params;
  const userId = req.user.id;

  try {
    const log = await prisma.log.findUnique({ where: { id: logId } });

    if (!log) return res.status(404).json({ error: "Log not found" });

    // ✅ Only author or admin can delete
    if (log.authorId !== userId && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Not authorized to delete" });
    }

    await prisma.log.delete({ where: { id: logId } });

    res.json({ message: "Log deleted successfully" });
  } catch (err) {
    console.error("❌ Delete error:", err);
    res.status(500).json({ error: "Delete failed" });
  }
};

export const searchLogs = async (req, res) => {
  const { teamId, authorId, keyword, userId } = req.query;

  if (!teamId) {
    return res.status(400).json({ error: "teamId is required" });
  }

  try {
    const logs = await prisma.log.findMany({
      where: {
        ...(teamId && {
          teamId: Array.isArray(teamId) ? { in: teamId } : teamId,
        }),
        ...(authorId && { authorId }),
        ...(keyword && {
          OR: [
            { content: { contains: keyword, mode: "insensitive" } },
            { title: { contains: keyword, mode: "insensitive" } },
            { tags: { has: keyword } },
            {
              author: {
                OR: [
                  { name: { contains: keyword, mode: "insensitive" } },
                  { email: { contains: keyword, mode: "insensitive" } },
                ],
              },
            },
            {
              team: {
                name: { contains: keyword, mode: "insensitive" },
              },
            },
          ],
        }),
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: { LogLike: true },
        },
        ...(userId && {
          LogLike: {
            where: { userId },
            select: { id: true }, // any field works, you just want to check if exists
          },
        }),
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedLogs = logs.map((log) => ({
      ...log,
      likeCount: log._count.LogLike,
      liked: log.LogLike?.length > 0 || false,
    }));

    res.json({ logs: formattedLogs });
  } catch (err) {
    console.error("❌ Search failed:", err);
    res.status(500).json({ error: "Search failed" });
  }
};



export const getKnowledgeGaps = async (req, res) => {
  const { teamId } = req.query;

  // if (!teamId) {
  //   return res.status(400).json({ error: "teamId is required" });
  // }
  let fetch = {}
  if (teamId) {
    fetch.teamId = teamId;
  }
  try {
    const logs = await prisma.log.findMany({
      where: fetch,
      select: { tags: true },
    });

    const tagCount = {};
    logs.forEach((log) => {
      log.tags.forEach((tag) => {
        tagCount[tag] = (tagCount[tag] || 0) + 1;
      });
    });

    // Sort tags by usage
    const sorted = Object.entries(tagCount).sort((a, b) => a[1] - b[1]);
    const underused = sorted.slice(0, 5);

    res.json({
      message: "Knowledge gaps identified",
      totalUniqueTags: Object.keys(tagCount).length,
      underusedTags: underused.map(([tag, count]) => ({ tag, count })),
    });
  } catch (err) {
    console.error("❌ Knowledge gap error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

export const revertLog = async (req, res) => {
  const { logId } = req.params;
  const userId = req.user.id;

  try {
    const log = await prisma.log.findUnique({ where: { id: logId } });
    if (!log) return res.status(404).json({ error: "Log not found" });

    // ✅ Check permission
    if (log.authorId !== userId && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Not authorized to revert this log" });
    }

    // ✅ Get most recent history
    const lastVersion = await prisma.logHistory.findFirst({
      where: { logId },
      orderBy: { editedAt: "desc" },
    });

    if (!lastVersion) return res.status(400).json({ error: "No version to revert to" });

    // ✅ Save current content before reverting (optional safety)
    await prisma.logHistory.create({
      data: {
        logId,
        content: log.content,
        editedBy: userId,
      },
    });

    // ✅ Revert to last version
    const reverted = await prisma.log.update({
      where: { id: logId },
      data: { content: lastVersion.content },
    });

    res.json({ message: "Log reverted successfully", log: reverted });
  } catch (err) {
    console.error("❌ Revert error:", err);
    res.status(500).json({ error: "Revert failed" });
  }
};

export const getLogDiff = async (req, res) => {
  const { logId } = req.params;

  try {
    const log = await prisma.log.findUnique({ where: { id: logId } });
    if (!log) return res.status(200).json({ message: "Log not found" });

    const lastVersion = await prisma.logHistory.findFirst({
      where: { logId },
      orderBy: { editedAt: "desc" },
    });

    if (!lastVersion) {
      return res.status(200).json({ message: "No previous version found for this log" });
    }

    const { create } = await import("jsondiffpatch");
    const jsondiffpatch = create();


    const delta = jsondiffpatch.diff(
      {
        title: lastVersion.title,
        content: lastVersion.content,
        tags: lastVersion.tags,
      },
      {
        title: log.title,
        content: log.content,
        tags: log.tags,
      }
    );

    res.json({ diff: delta });
  } catch (err) {
    console.error("❌ Diff error:", err);
    res.status(500).json({ error: "Failed to get log diff" });
  }
};

export const getLeaderboard = async (req, res) => {
  const { teamId, period = "week" } = req.query;

  // if (!teamId) return res.status(400).json({ error: "teamId is required" });

  // Determine time range
  let from;
  if (period === "month") {
    from = dayjs().startOf("month").toDate();
  } else {
    from = dayjs().startOf("week").toDate(); // default to week
  }

  let fetch = {
    createdAt: { gte: from }
  }

  if (teamId) {
    fetch.teamId = teamId;
  }

  try {
    // Fetch logs created by users in the team after 'from'
    const logs = await prisma.log.findMany({
      where: fetch,
      include: {
        author: true,
      },
    });

    // Count per author
    const countMap = {};
    logs.forEach((log) => {
      const name = log.author?.name || "Unknown";
      countMap[name] = (countMap[name] || 0) + 1;
    });

    // Return sorted list
    const leaderboard = Object.entries(countMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    res.json(leaderboard);
  } catch (err) {
    console.error("❌ Error fetching leaderboard:", err);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
};

export const getLogGrowthChart = async (req, res) => {
  const { teamId } = req.query;

  try {
    // Past 7 days
    const startDate = dayjs().subtract(6, "day").startOf("day").toDate();
    const endDate = dayjs().endOf("day").toDate();

    // Fetch logs grouped by date
    const rawData = await prisma.log.groupBy({
      by: ["createdAt"],
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        ...(teamId && { teamId }),
      },
      _count: true,
    });

    // Format into daily buckets
    const result = [];
    for (let i = 0; i < 7; i++) {
      const date = dayjs().subtract(6 - i, "day").format("YYYY-MM-DD");
      const match = rawData.find((r) =>
        dayjs(r.createdAt).format("YYYY-MM-DD") === date
      );
      result.push({ date, count: match ? match._count : 0 });
    }

    res.json(result);
  } catch (err) {
    console.error("❌ Error fetching log growth chart:", err);
    res.status(500).json({ error: "Failed to fetch growth chart" });
  }
};