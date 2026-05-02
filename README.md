# TaskFlow — Team Task Manager

A full-stack web application for managing team projects and tasks with role-based access control (Admin/Member).

LIVE:
https://task-manager-production-b4c0.up.railway.app

## 🚀 Features

- **Authentication** — Signup and Login with JWT-based sessions
- **Project Management** — Create, edit, and delete projects
- **Team Management** — Invite members by email, assign Admin/Member roles
- **Task Board** — Kanban-style board with Todo → In Progress → Review → Done columns
- **Task Assignment** — Assign tasks to team members with priority and due dates
- **Dashboard** — Overview of all tasks, status breakdown, priority distribution, and overdue tasks
- **Role-Based Access Control** — Admins can manage members and delete; Members can create and update tasks

## ⚙️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite |
| Backend | Node.js + Express.js |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | JWT + bcrypt |
| Deployment | Railway |

## 📁 Project Structure

```
team-task-manager/
├── client/                # React frontend (Vite)
│   ├── src/
│   │   ├── context/       # Auth context
│   │   ├── lib/           # API client
│   │   ├── pages/         # Page components
│   │   ├── App.jsx        # Router + Layout
│   │   └── index.css      # Design system
│   └── index.html
├── server/                # Express backend
│   ├── prisma/
│   │   └── schema.prisma  # Database schema
│   └── src/
│       ├── lib/           # Prisma client
│       ├── middleware/     # Auth, roles, validation
│       ├── routes/        # API routes
│       └── index.js       # Entry point
├── railway.toml           # Railway config
└── package.json           # Root scripts
```

## 🛠️ Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL database

### Setup

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd team-task-manager
   ```

2. **Configure environment**
   ```bash
   cp server/.env.example server/.env
   # Edit server/.env with your DATABASE_URL and JWT_SECRET
   ```

3. **Install dependencies**
   ```bash
   cd server && npm install
   cd ../client && npm install
   ```

4. **Run database migrations**
   ```bash
   cd server && npx prisma migrate dev --name init
   ```

5. **Start development servers**
   ```bash
   # Terminal 1 — Backend (port 3000)
   cd server && npm run dev

   # Terminal 2 — Frontend (port 5173)
   cd client && npm run dev
   ```

6. Open `http://localhost:5173` in your browser

## 📡 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Profile |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List projects |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/:id` | Get project |
| PUT | `/api/projects/:id` | Update (Admin) |
| DELETE | `/api/projects/:id` | Delete (Admin) |

### Members
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/:id/members` | List members |
| POST | `/api/projects/:id/members` | Add member (Admin) |
| PUT | `/api/projects/:id/members/:mid` | Change role (Admin) |
| DELETE | `/api/projects/:id/members/:mid` | Remove (Admin) |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/:id/tasks` | List tasks |
| POST | `/api/projects/:id/tasks` | Create task |
| GET | `/api/tasks/:id` | Get task |
| PUT | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete (Admin) |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | Aggregated stats |

## 🌐 Deployment (Railway)

1. Push to GitHub
2. Create a new project on [Railway](https://railway.app)
3. Add a **PostgreSQL** database service
4. Connect your GitHub repo
5. Set environment variables:
   - `DATABASE_URL` — auto-set from Railway Postgres
   - `JWT_SECRET` — generate a secure random string
   - `NODE_ENV` — `production`
   - `PORT` — `3000`
6. Deploy — Railway will auto-detect the `railway.toml` config

## 👤 Author

Built as a full-stack assignment project.

## 📄 License

MIT
