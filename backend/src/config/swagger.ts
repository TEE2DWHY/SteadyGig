import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "SteadyGig API",
            version: "1.0.0",
            description:
                "API documentation for SteadyGig - A platform connecting musicians with clients for gigs and events",
            contact: {
                name: "SteadyGig Support",
                email: "support@steadygig.com",
            },
        },
        servers: [
            {
                url: "http://localhost:3000/api",
                description: "Development server",
            },
            {
                url: "https://api.steadygig.com/api",
                description: "Production server",
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                    description: "Enter your JWT token",
                },
            },
            schemas: {
                Error: {
                    type: "object",
                    properties: {
                        success: {
                            type: "boolean",
                            example: false,
                        },
                        message: {
                            type: "string",
                            example: "An error occurred",
                        },
                    },
                },
                User: {
                    type: "object",
                    properties: {
                        id: {
                            type: "string",
                            example: "clx1234567890abcdefgh",
                        },
                        email: {
                            type: "string",
                            format: "email",
                            example: "user@example.com",
                        },
                        firstName: {
                            type: "string",
                            example: "John",
                        },
                        lastName: {
                            type: "string",
                            example: "Doe",
                        },
                        role: {
                            type: "string",
                            enum: ["CLIENT", "MUSICIAN", "ADMIN"],
                            example: "MUSICIAN",
                        },
                    },
                },
                RegisterRequest: {
                    type: "object",
                    required: [
                        "email",
                        "password",
                        "firstName",
                        "lastName",
                        "phone",
                        "role",
                    ],
                    properties: {
                        email: {
                            type: "string",
                            format: "email",
                            example: "john@example.com",
                        },
                        password: {
                            type: "string",
                            format: "password",
                            minLength: 6,
                            example: "password123",
                        },
                        firstName: {
                            type: "string",
                            example: "John",
                        },
                        lastName: {
                            type: "string",
                            example: "Doe",
                        },
                        phone: {
                            type: "string",
                            example: "+1234567890",
                        },
                        role: {
                            type: "string",
                            enum: ["CLIENT", "MUSICIAN"],
                            example: "MUSICIAN",
                        },
                    },
                },
                LoginRequest: {
                    type: "object",
                    required: ["email", "password"],
                    properties: {
                        email: {
                            type: "string",
                            format: "email",
                            example: "john@example.com",
                        },
                        password: {
                            type: "string",
                            format: "password",
                            example: "password123",
                        },
                    },
                },
                AuthResponse: {
                    type: "object",
                    properties: {
                        success: {
                            type: "boolean",
                            example: true,
                        },
                        message: {
                            type: "string",
                            example: "Login successful",
                        },
                        data: {
                            type: "object",
                            properties: {
                                user: {
                                    $ref: "#/components/schemas/User",
                                },
                                accessToken: {
                                    type: "string",
                                    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                                },
                                refreshToken: {
                                    type: "string",
                                    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                                },
                            },
                        },
                    },
                },
                ForgotPasswordRequest: {
                    type: "object",
                    required: ["email"],
                    properties: {
                        email: {
                            type: "string",
                            format: "email",
                            example: "john@example.com",
                        },
                    },
                },
                ResetPasswordRequest: {
                    type: "object",
                    required: ["token", "newPassword"],
                    properties: {
                        token: {
                            type: "string",
                            example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                        },
                        newPassword: {
                            type: "string",
                            format: "password",
                            minLength: 6,
                            example: "newpassword123",
                        },
                    },
                },
                RefreshTokenRequest: {
                    type: "object",
                    required: ["refreshToken"],
                    properties: {
                        refreshToken: {
                            type: "string",
                            example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                        },
                    },
                },
                RefreshTokenResponse: {
                    type: "object",
                    properties: {
                        success: {
                            type: "boolean",
                            example: true,
                        },
                        message: {
                            type: "string",
                            example: "Token refreshed successfully",
                        },
                        data: {
                            type: "object",
                            properties: {
                                accessToken: {
                                    type: "string",
                                    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                                },
                            },
                        },
                    },
                },
                SuccessResponse: {
                    type: "object",
                    properties: {
                        success: {
                            type: "boolean",
                            example: true,
                        },
                        message: {
                            type: "string",
                            example: "Operation successful",
                        },
                        data: {
                            type: "object",
                        },
                    },
                },
            },
        },
        tags: [
            {
                name: "Authentication",
                description: "User authentication and authorization endpoints",
            },
            {
                name: "Users",
                description: "User management endpoints",
            },
            {
                name: "Musicians",
                description: "Musician profile and management endpoints",
            },
            {
                name: "Bookings",
                description: "Booking management endpoints",
            },
            {
                name: "Reviews",
                description: "Review and rating endpoints",
            },
            {
                name: "Payments",
                description: "Payment processing endpoints",
            },
            {
                name: "Notifications",
                description: "Notification management endpoints",
            },
            {
                name: "Admin",
                description: "Admin-only endpoints",
            },
        ],
    },
    apis: ["./src/routes/*.ts", "./src/controllers/*.ts"],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
