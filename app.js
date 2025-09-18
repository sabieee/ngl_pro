const express = require('express');
const { engine } = require('express-handlebars');
const session = require('express-session');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize database tables
async function initDatabase() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS conversations (
                id SERIAL PRIMARY KEY,
                session_id VARCHAR(255) UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
                message TEXT NOT NULL,
                is_admin_reply BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        console.log('Database tables initialized successfully');
    } catch (err) {
        console.error('Error initializing database:', err);
    }
}

// Configure Handlebars
app.engine('hbs', engine({
    extname: '.hbs',
    defaultLayout: 'main',
    helpers: {
        formatDate: function(date) {
            // Return ISO string for client-side IST conversion
            const messageDate = new Date(date);
            
            // Check if the date is valid
            if (isNaN(messageDate.getTime())) {
                return 'Invalid Date';
            }
            
            // Return ISO string so client can convert to IST
            return messageDate.toISOString();
        }
    }
}));
app.set('view engine', 'hbs');
app.set('views', './views');

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Authentication middleware
function requireAuth(req, res, next) {
    if (req.session.isAdmin) {
        return next();
    }
    res.redirect('/admin/login');
}

// Routes

// Admin login page
app.get('/admin/login', (req, res) => {
    if (req.session.isAdmin) {
        return res.redirect('/admin');
    }
    res.render('admin-login');
});

// Admin login handler
app.post('/admin/login', (req, res) => {
    const { username, password } = req.body;
    
    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
        req.session.isAdmin = true;
        res.redirect('/admin');
    } else {
        res.redirect('/admin/login?error=invalid');
    }
});

// Admin logout
app.post('/admin/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/admin/login');
});

// Home page - Anonymous messaging
app.get('/', async (req, res) => {
    try {
        let conversationId = null;
        let messages = [];
        
        if (req.session.sessionId) {
            // Get existing conversation
            const convResult = await pool.query(
                'SELECT id FROM conversations WHERE session_id = $1',
                [req.session.sessionId]
            );
            
            if (convResult.rows.length > 0) {
                conversationId = convResult.rows[0].id;
                
                // Get messages for this conversation
                const msgResult = await pool.query(
                    'SELECT message, is_admin_reply, created_at FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
                    [conversationId]
                );
                messages = msgResult.rows;
            }
        }
        
        res.render('index', { messages });
    } catch (err) {
        console.error('Error loading home page:', err);
        res.render('index', { messages: [] });
    }
});

// Send message
app.post('/send-message', async (req, res) => {
    try {
        const { message } = req.body;
        
        if (!message || message.trim() === '') {
            return res.redirect('/?error=empty');
        }
        
        // Create or get session
        if (!req.session.sessionId) {
            req.session.sessionId = uuidv4();
        }
        
        // Create or get conversation
        let conversationId;
        const convResult = await pool.query(
            'SELECT id FROM conversations WHERE session_id = $1',
            [req.session.sessionId]
        );
        
        if (convResult.rows.length > 0) {
            conversationId = convResult.rows[0].id;
            // Update last activity
            await pool.query(
                'UPDATE conversations SET last_activity = CURRENT_TIMESTAMP WHERE id = $1',
                [conversationId]
            );
        } else {
            // Create new conversation
            const newConvResult = await pool.query(
                'INSERT INTO conversations (session_id) VALUES ($1) RETURNING id',
                [req.session.sessionId]
            );
            conversationId = newConvResult.rows[0].id;
        }
        
        // Insert message with current timestamp
        const currentTime = new Date();
        await pool.query(
            'INSERT INTO messages (conversation_id, message, is_admin_reply, created_at) VALUES ($1, $2, $3, $4)',
            [conversationId, message.trim(), false, currentTime]
        );
        
        res.redirect('/?success=sent');
    } catch (err) {
        console.error('Error sending message:', err);
        res.redirect('/?error=failed');
    }
});

// Admin page
app.get('/admin', requireAuth, async (req, res) => {
    try {
        const conversationsResult = await pool.query(`
            SELECT 
                c.id,
                c.session_id,
                c.created_at,
                c.last_activity,
                COUNT(m.id) as message_count,
                MAX(m.created_at) as last_message_time
            FROM conversations c
            LEFT JOIN messages m ON c.id = m.conversation_id
            GROUP BY c.id, c.session_id, c.created_at, c.last_activity
            ORDER BY c.last_activity DESC
        `);
        
        res.render('admin', { conversations: conversationsResult.rows });
    } catch (err) {
        console.error('Error loading admin page:', err);
        res.render('admin', { conversations: [] });
    }
});

// View specific conversation
app.get('/admin/conversation/:id', requireAuth, async (req, res) => {
    try {
        const conversationId = req.params.id;
        
        // Get conversation details
        const convResult = await pool.query(
            'SELECT * FROM conversations WHERE id = $1',
            [conversationId]
        );
        
        if (convResult.rows.length === 0) {
            return res.redirect('/admin');
        }
        
        // Get messages
        const messagesResult = await pool.query(
            'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
            [conversationId]
        );
        
        res.render('conversation', {
            conversation: convResult.rows[0],
            messages: messagesResult.rows
        });
    } catch (err) {
        console.error('Error loading conversation:', err);
        res.redirect('/admin');
    }
});

// Reply to conversation
app.post('/admin/reply/:id', requireAuth, async (req, res) => {
    try {
        const conversationId = req.params.id;
        const { reply } = req.body;
        
        if (!reply || reply.trim() === '') {
            return res.redirect(`/admin/conversation/${conversationId}?error=empty`);
        }
        
        // Insert admin reply with current timestamp
        const currentTime = new Date();
        await pool.query(
            'INSERT INTO messages (conversation_id, message, is_admin_reply, created_at) VALUES ($1, $2, $3, $4)',
            [conversationId, reply.trim(), true, currentTime]
        );
        
        // Update conversation last activity
        await pool.query(
            'UPDATE conversations SET last_activity = CURRENT_TIMESTAMP WHERE id = $1',
            [conversationId]
        );
        
        res.redirect(`/admin/conversation/${conversationId}?success=replied`);
    } catch (err) {
        console.error('Error sending reply:', err);
        res.redirect(`/admin/conversation/${conversationId}?error=failed`);
    }
});

// Start server
app.listen(port, '0.0.0.0', async () => {
    console.log(`Server running on port ${port}`);
    await initDatabase();
});

module.exports = app;