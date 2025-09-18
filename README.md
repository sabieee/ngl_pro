# NGL - Anonymous Chat Application

A modern, responsive anonymous messaging application built with Node.js, Express, and PostgreSQL. Features real-time messaging, admin dashboard, and clean white UI design.

## Features

### 🚀 User Features
- **Anonymous Messaging**: Send messages without registration
- **Real-time Updates**: Auto-refresh for new messages
- **Responsive Design**: Works on desktop and mobile
- **Clean White UI**: Modern, professional interface
- **Indian Standard Time**: All timestamps in IST

### 🛠️ Admin Features
- **Admin Dashboard**: View all conversations
- **Real-time Chat**: Reply to users instantly
- **Session Management**: Track user sessions
- **Secure Login**: Password-protected admin access
- **Message Analytics**: View message counts and timestamps

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **Template Engine**: Handlebars (HBS)
- **Styling**: Pure CSS with responsive design
- **Session Management**: Express Sessions
- **Environment**: dotenv

## Installation

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL database
- npm or yarn

### Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd NGL_varun
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/database_name
   SESSION_SECRET=your-secure-session-secret
   ADMIN_USERNAME=your-admin-username
   ADMIN_PASSWORD=your-admin-password
   PORT=5000
   ```

4. **Database Setup**
   The application will automatically create the required tables on first run:
   - `conversations`: Stores user sessions
   - `messages`: Stores all messages

5. **Start the application**
   ```bash
   npm start
   # or
   node app.js
   ```

6. **Access the application**
   - **User Interface**: http://localhost:5000
   - **Admin Login**: http://localhost:5000/admin/login

## Project Structure

```
NGL_varun/
├── views/
│   ├── layouts/
│   │   └── main.hbs          # Main layout template
│   ├── admin.hbs             # Admin dashboard
│   ├── admin-login.hbs       # Admin login page
│   ├── conversation.hbs      # Individual chat view
│   └── index.hbs             # User messaging interface
├── app.js                    # Main application file
├── package.json              # Dependencies and scripts
├── .env                      # Environment variables (not in repo)
└── README.md                 # This file
```

## API Endpoints

### Public Routes
- `GET /` - User messaging interface
- `POST /send-message` - Send anonymous message

### Admin Routes (Protected)
- `GET /admin/login` - Admin login page
- `POST /admin/login` - Admin authentication
- `POST /admin/logout` - Admin logout
- `GET /admin` - Admin dashboard
- `GET /admin/conversation/:id` - View specific conversation
- `POST /admin/reply/:id` - Reply to conversation

## Features Detail

### Real-time Updates
- Auto-refresh every 3 seconds for new messages
- Maintains scroll position during updates
- Shows loading states during message sending

### Timezone Handling
- All timestamps displayed in Indian Standard Time (IST)
- Consistent time across server and client
- Smart formatting: today's messages show time only

### Responsive Design
- Mobile-first approach
- Clean white theme throughout
- Optimized for touch interfaces
- Professional admin interface

### Security
- Session-based authentication for admin
- Environment variable configuration
- SQL injection protection with parameterized queries
- CSRF protection via sessions

## Development

### Adding New Features
1. Create new routes in `app.js`
2. Add corresponding view templates in `views/`
3. Update CSS in `views/layouts/main.hbs`
4. Test functionality

### Database Schema
```sql
-- Conversations table
CREATE TABLE conversations (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Messages table  
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_admin_reply BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Deployment

### Railway (Recommended)
1. Connect your GitHub repository to Railway
2. Set environment variables in Railway dashboard
3. Deploy automatically on push

### Environment Variables for Production
```env
NODE_ENV=production
DATABASE_URL=<your-production-database-url>
SESSION_SECRET=<strong-random-secret>
ADMIN_USERNAME=<secure-admin-username>
ADMIN_PASSWORD=<secure-admin-password>
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For support or questions, please open an issue on GitHub.

---

**Built with ❤️ using Node.js and modern web technologies**
