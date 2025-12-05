import { Server as HTTPServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";

interface AuthenticatedSocket extends Socket {
    userId?: string;
    userEmail?: string;
    userRole?: string;
}

let io: Server;

export const initializeSocket = (server: HTTPServer): Server => {
    io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL || "*",
            methods: ["GET", "POST"],
            credentials: true,
        },
    });

    io.use((socket: AuthenticatedSocket, next) => {
        const token = socket.handshake.auth.token;

        if (!token) {
            return next(new Error("Authentication error: No token provided"));
        }

        try {
            const decoded = jwt.verify(
                token,
                process.env.JWT_ACCESS_SECRET!,
            ) as {
                userId: string;
                email: string;
                role: string;
            };

            socket.userId = decoded.userId;
            socket.userEmail = decoded.email;
            socket.userRole = decoded.role;

            next();
        } catch (error) {
            next(new Error("Authentication error: Invalid token"));
        }
    });

    io.on("connection", (socket: AuthenticatedSocket) => {
        console.log(`User connected: ${socket.userId}`);

        socket.join(`user:${socket.userId}`);

        socket.on("disconnect", () => {
            console.log(`User disconnected: ${socket.userId}`);
        });

        socket.on("error", (error) => {
            console.error("Socket error:", error);
        });
    });

    return io;
};

export const getIO = (): Server => {
    if (!io) {
        throw new Error("Socket.io not initialized");
    }
    return io;
};

export const emitToUser = (userId: string, event: string, data: any) => {
    if (!io) {
        console.warn("Socket.io not initialized, skipping emission");
        return;
    }
    io.to(`user:${userId}`).emit(event, data);
};

export const emitToAll = (event: string, data: any) => {
    if (!io) {
        console.warn("Socket.io not initialized, skipping emission");
        return;
    }
    io.emit(event, data);
};

export default { initializeSocket, getIO, emitToUser, emitToAll };
