import { createClient } from "redis";
import dotenv from "dotenv";
dotenv.config();

// const redisClient = {}
const redisClient = createClient({
  url: process.env.REDIS_URL,
  socket: {
    tls: true,
  },
});

redisClient.on("error", (err) => console.error("❌ Redis error:", err));

redisClient.connect()
  .then(() => console.log("✅ Connected to Redis (Upstash)"))
  .catch(console.error);

export default redisClient;
