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
      },
    ],

  },

  apis: [
    "./docs/api/**/*.yaml",
  ],
};

export const swaggerSpec = swaggerJSDoc(options);