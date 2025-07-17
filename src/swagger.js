// swagger.js

import swaggerJsdoc from "swagger-jsdoc";

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "InsightLog API",
      version: "1.0.0",
      description: "API documentation for InsightLog",
    },
    servers: [
      {
        url: "http://localhost:5000",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid", example: "uuid1234" },
            name: { type: "string", example: "Sushil" },
            email: { type: "string", format: "email", example: "sushil@example.com" },
            role: { type: "string", enum: ["ADMIN", "LEAD", "MEMBER"], example: "LEAD" },
            createdAt: { type: "string", format: "date-time", example: "2025-07-13T00:00:00.000Z" },
          },
        },
        Log: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid", example: "log-uuid1234" },
            title: { type: "string", example: "Optimized DB query logic" },
            content: { type: "string", example: "Refactored the log controller to reduce nested loops." },
            tags: {
              type: "array",
              items: { type: "string" },
              example: ["performance", "backend"],
            },
            authorId: { type: "string", format: "uuid", example: "user-uuid1234" },
            teamId: { type: "string", format: "uuid", example: "team-uuid5678" },
            createdAt: { type: "string", format: "date-time", example: "2025-07-13T10:00:00.000Z" },
            updatedAt: { type: "string", format: "date-time", example: "2025-07-14T14:30:00.000Z" },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      { name: "Auth", description: "Authentication routes" },
      { name: "Users", description: "User management routes" },
      { name: "Logs", description: "Log creation and search" },
    ],
  },
  apis: ["./src/routes/*.js"]
});
// console.log("✅ Swagger loaded with", swaggerSpec.paths);

export default swaggerSpec;
