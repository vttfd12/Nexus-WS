const express = require("express");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const https = require("https");
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();
const addr = "localhost";
const port = 443;

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// Load SSL certificates
const sslOptions = {
    key: fs.readFileSync("../certs/key.pem"),
    cert: fs.readFileSync("../certs/cert.pem")
};
//Verify User session
const verifyInternalToken = async (req, res, next) => {
    const token = req.body.token || req.cookies.session_token;
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const session = await prisma.session.findUnique({
            where: { token },
            include: { user: true }
        });


        if (!session || session.expiresAt < new Date()) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        req.user = session.user;
        next();
    } catch (error) {
        console.error("Token verification error: ", error);
        res.status(500).json({ error: 'Verification failed' })
    }

}


// Gatekeeper Middleware
const gatekeeper = async (req, res, next) => {
    const token = req.cookies.session_token;
    if (!token) {
        return res.redirect("/auth?message=Session expired. Please sign in.");
    }

    try {
        const session = await prisma.session.findUnique({
            where: { token },
            include: { user: true }
        });

        if (!session || session.expiresAt < new Date()) {
            res.clearCookie("session_token");
            return res.redirect("/auth?message=Invalid session.");
        }

        req.user = session.user;
        next();
    } catch (error) {
        console.error("Gatekeeper error:", error);
        res.redirect("/auth?message=System error.");
    }
};

// Routes
app.get("/", (req, res) => {
    res.redirect("/home");
});

app.get("/home", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "home", "index.html"));
});

app.get("/auth", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "auth", "index.html"));
});

app.get("/chat", gatekeeper, (req, res) => {
    res.sendFile(path.join(__dirname, "secure_views", "chat", "index.html"));
});

app.get("/about", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "about", "index.html"));
});

app.get("/contact", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "contact", "index.html"));
});

// ========== AUTH API ==========

app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const passwordHash = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                username,
                email,
                passwordHash,
                displayName: username,
                avatarUrl: '/assets/default-user-icon.svg',
                status: 'online'
            }
        });

        res.json({ success: true, userId: user.id });
    } catch (error) {
        if (error.code === 'P2002') {
            const target = error.meta?.target || [];
            if (target.includes('username')) {
                return res.status(400).json({ error: 'Username is already taken' });
            }
            if (target.includes('email')) {
                return res.status(400).json({ error: 'Email is already in use' });
            }
            return res.status(400).json({ error: 'Username or email already exists' });
        }
        console.error("Registration error:", error);
        res.status(500).json({ error: "Registration failed. Please try again." });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await prisma.user.findUnique({ where: { username } });

        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        await prisma.session.create({
            data: { userId: user.id, token, expiresAt }
        });

        // Set secure cookie
        res.cookie("session_token", token, {
            httpOnly: false,
            secure: true,
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                displayName: user.displayName
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/internal/getUpdateStatus/:user', async (req, res) => {
    try {
        const { user: userId } = req.params;
        const user = await prisma.user.findUnique({
            where: { id: parseInt(userId) },
            select: { status: true }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ success: true, status: user.status })
    } catch (error) {
        console.error("Error Retrieving Status: ", error);
        res.status(500).json({ error: error.message })
    }
});

app.post('/internal/updateDisplayname/:db_id', async (req, res) => {
    try {
        const { db_id } = req.params;
        const { displayName } = req.body;

        const user = await prisma.user.update({
            where: { id: parseInt(db_id) },
            data: { displayName: displayName }
        });

        res.json({ success: true, displayName: user.displayName });
    } catch (error) {
        console.error("Changing displayname error: ", error);
        res.status(500).json({ error: error.message });
    }
});



app.post('/internal/updateStatus/:user', verifyInternalToken, async (req, res) => {

    try {
        const { user: userId } = req.params;
        const { status } = req.body;


        if (req.user.id !== parseInt(userId)) {
            return res.status(403).json({ error: ' Cannot update another user\'s status' });
        }

        const updatedUser = await prisma.user.update({
            where: { id: parseInt(userId) },
            data: { status }
        });

        res.json({ success: true, status: updatedUser.status })
    } catch (error) {
        console.error("Status update error: ", error);
        res.status(500).json({ error: error.message })
    }
})


app.post('/api/auth/logout', async (req, res) => {
    const token = req.cookies.session_token;
    if (token) {
        await prisma.session.delete({ where: { token } }).catch(() => { });
    }
    res.clearCookie("session_token");
    res.json({ success: true });
});


app.get('/api/auth/me', async (req, res) => {
    const token = req.cookies.session_token;
    if (!token) return res.json({ authenticated: false });

    try {
        const session = await prisma.session.findUnique({
            where: { token },
            include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } }
        });

        if (!session || session.expiresAt < new Date()) {
            return res.json({ authenticated: false });
        }

        res.json({ authenticated: true, user: session.user });
    } catch (error) {
        res.json({ authenticated: false });
    }
});

app.post('internal/sendFriendshipRequest/:targetId', async (req, res) => {
    try {
        let targetId = req.params;
        let senderId = req.body.senderId;
        let status = "pending";
        let status2 = "pending";
        //Check for opposite case (sender = target && target = sender)
        //(We also need to check for the same request so it can't be made again)
        //if it does we update the status to "accepted" and change updated@ field to Date.now()
        //(need to also check for "blocked" status though should exist still)
        //else we make status pending and make created@ = Date.now()
        const sessionExists = await prisma.friendship.findUnique({
            where: {
                senderId: targetId,
                receiverId: senderId,
            },
            select: {
                status: true,
            }
        });
        if (sessionExists.status) {
            status = sessionExists.status;
        }
        const session2Exists = await prisma.friendship.findUnique({
            where: {
                senderId: senderId,
                receiverId: targetId,
            },
            select: {
                status: true,
            }
        });
        if (session2Exists.status) {
            status2 = session2Exists.status;
        }

        if (status === "blocked" || status2 === "blocked") {
            return res.status(400).json({ error: "User is blocked" });
        }

        if (sessionExists || session2Exists) {
            if (status === "pending") {
                friendship = await prisma.friendship.update({
                    where: {
                        senderId: targetId,
                        receiverId: senderId,
                    },
                    data: {
                        status: "accepted",
                        updatedAt: Date.now(),
                    }
                })
            }
            if (status2 === "pending") {
                return res.status(400).json({ error: "Friendship request already exists" });
            }
        } else {

            const createFriendship = await prisma.friendship.create({
                senderId: senderId,
                receiverId: targetId,
                status: "pending",// "pending", "accepted", "blocked"
                createdAt: Date.now(),
            });
        }

        res.status(200).json({ status: status });
    } catch (error) {
        res.status(500).json({ error: error });
    }
});


// Internal endpoint for Rust server to verify tokens
app.post('/api/auth/verify-session', async (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ valid: false });

    try {
        const session = await prisma.session.findUnique({
            where: { token },
            include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true, status: true } } }
        });

        if (!session || session.expiresAt < new Date()) {
            return res.status(401).json({ valid: false });
        }

        res.json({
            valid: true,
            userId: session.user.id,
            username: session.user.username,
            displayName: session.user.displayName || session.user.username,
            avatarUrl: session.user.avatarUrl,
            status: session.user.status || 'online'
        });
    } catch (error) {
        res.status(500).json({ valid: false });
    }
});

// Serve Profile Page (Protected)
app.get('/profile/:username', gatekeeper, (req, res) => {
    res.sendFile(path.join(__dirname, 'secure_views/profile/index.html'));
});

// API: Get User Profile Data
app.get('/api/users/:username', gatekeeper, async (req, res) => {
    try {
        const { username } = req.params;
        const user = await prisma.user.findUnique({
            where: { username },
            select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                createdAt: true,
                status: true
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/rooms/:roomId/messages', gatekeeper, async (req, res) => {
    try {
        const { roomId } = req.params;
        const { limit = 50, before } = req.query;

        const messages = await prisma.message.findMany({
            where: {
                roomId: parseInt(roomId),
                deletedAt: null,
                ...(before && { createdAt: { lt: new Date(before) } })
            },
            include: {
                user: { select: { id: true, username: true, displayName: true, avatarUrl: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit)
        });

        res.json({ messages: messages.reverse() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
//Get list of users for rust
app.get('/internal/rooms/:roomId/members', async (req, res) => {
    try {
        const { roomId } = req.params;

        // Find the room by name (your rooms use name as identifier) and include members
        const room = await prisma.room.findUnique({
            where: { name: roomId },
            include: {
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                displayName: true,
                                avatarUrl: true,
                                status: true
                            }
                        }
                    }
                }
            }
        });

        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }

        // Map to flatten the user data with their role
        const members = room.members.map(m => ({
            ...m.user,
            role: m.role,
            joinedAt: m.joinedAt
        }));

        res.json({ members });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


app.post('/api/messages', gatekeeper, async (req, res) => {
    try {
        const { roomId, content, messageType = 'text', metadata } = req.body;
        const userId = req.user.id;

        let room = await prisma.room.findUnique({ where: { name: roomId.toString() } });
        if (!room) {
            room = await prisma.room.create({ data: { name: roomId.toString() } });
        }

        const message = await prisma.message.create({
            data: {
                roomId: room.id,
                userId: userId,
                content,
                messageType,
                metadata
            }
        });

        res.json({ success: true, message });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/internal/rooms/:roomId/messages', async (req, res) => {
    try {
        let { roomId } = req.params;

        let room = await prisma.room.findUnique({ where: { name: roomId.toString() } });

        if (!room) return res.json({ success: true, messages: [] });

        let messages = await prisma.message.findMany({
            where: {
                roomId: room.id,
                deletedAt: null
            },
            select: {
                id: true,
                content: true,
                createdAt: true,
                editedAt: true,
                messageType: true,
                user: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true
                    }
                }
            },
            orderBy: { createdAt: 'asc' },
            take: 100 //limit for pagination (change for longer message history)
        });

        res.json({ success: true, messages: messages })
    } catch (error) {
        console.log("Error Retrieving messages: ", error);
        res.status(500).json({ error: error.message })
    }
});


// Added for Rust server to call internally (may need token or separate internal path)
app.post('/api/internal/messages', async (req, res) => {
    try {
        const { roomId, userId, content, messageType = 'text' } = req.body;

        let room = await prisma.room.findUnique({ where: { name: roomId.toString() } });
        if (!room) room = await prisma.room.create({ data: { name: roomId.toString() } });

        const message = await prisma.message.create({
            data: {
                roomId: room.id,
                userId: parseInt(userId),
                content,
                messageType
            }
        });

        res.json({ success: true, messageId: message.id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start Server
https.createServer(sslOptions, app).listen(port, addr, () => {
    console.log(`Unified Server running on https://${addr}:${port}`);
});

process.on('beforeExit', async () => {
    await prisma.$disconnect();
});