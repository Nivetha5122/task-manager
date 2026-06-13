const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Task Manager API',
      version: '1.0.0',
      description:
        'Scalable REST API with JWT authentication, role-based access control (user/admin), ' +
        'and CRUD operations for Tasks. Built for the Backend Developer Intern assignment.',
      contact: { name: 'Backend Developer Intern Submission' },
    },
    servers: [
      { url: 'http://localhost:5000', description: 'Local development server' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Registration, login, and profile' },
      { name: 'Tasks', description: 'CRUD operations for tasks' },
      { name: 'Health', description: 'Service health check' },
    ],
  },
  // Files containing JSDoc @openapi annotations
  apis: ['./src/routes/**/*.js'],
};

module.exports = swaggerJSDoc(options);
