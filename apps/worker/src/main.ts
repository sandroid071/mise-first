import { Worker } from "bullmq";
const connection = { url: process.env.REDIS_URL || "redis://localhost:6379" };
new Worker("mise", async (job) => { console.info("Processing", job.name, job.id); }, { connection });
