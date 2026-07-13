import swaggerJSDoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "DocDock API",
      version: "1.0.0",
      description: "Document Management System API",
    },
    servers: [
      {
        url: "http://localhost:5000/api/v1",
        description: "Local Server",
      },
      {
        url: "https://docdock-backend-production.up.railway.app/api/v1",
        description: "Production Server",
      },
    ],

  },

  apis: [
    "./docs/api/**/*.yaml",
  ],
};

export const swaggerSpec = swaggerJSDoc(options);