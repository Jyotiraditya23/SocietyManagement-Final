<p align="center">
  <img src="https://ik.imagekit.io/xh3awoalr/Portfolio/Manager_Thumbnail.png" alt="Nehete Society Management System" width="600" />
</p>

<h1 align="center">🏢 Nehete Society Management System</h1>
<p align="center"><strong>Complaint tracking, notice board & society operations — built for Nehete Society</strong></p>

<p align="center">
  <a href="https://society-management-system-vert.vercel.app/showcase">
    <img src="https://img.shields.io/badge/Live%20Demo-Vercel-black?style=for-the-badge&logo=vercel" alt="Live Demo" />
  </a>
  <a href="https://society-management-system-zjlf.onrender.com">
    <img src="https://img.shields.io/badge/API-Render-46E3B7?style=for-the-badge&logo=render" alt="API Server" />
  </a>
</p>

## What this is

This is a comprehensive society management platform designed for Nehete Society (~40 flats). This system handles **complaint tracking, notices, maintenance payments, and general administration** to streamline communication and resolve issues. 

- Residents log complaints with optional description categories and photos, and track the status.
- Admins/Managers assign priorities, update statuses, and log detailed notes for each action.
- Every status transition is logged in an append-only timeline.
- Open complaints that exceed a configurable day threshold are flagged dynamically as overdue and surfaced to the top of the admin view.
- Pinned important notices generate transactional email broadcasts to all residents.

### Documentation Files

To understand the system mechanics, view the detailed documentation files:

- **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** — All endpoints, request/response shapes, and auth details.
- **[DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)** — Mongoose collections, types, validations, and indexes.
- **[SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md)** — Architectural write-up covering complaint status tracking, real-time overdue detection, client-side ImageKit integration, and Brevo notification flow.

---

## 🛠️ Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Express.js 4, Node.js 20, Mongoose 8 |
| Database | MongoDB Atlas |
| Auth | JWT in httpOnly cookies, bcrypt |
| Photo uploads | ImageKit (direct client upload via signed parameters) |
| Emails | Brevo (transactional email service) |
| Hosting | Vercel (frontend), Render (backend, Docker) |

---

## 📝 Complaint & Notice Board Features

- **Residents Portal:** Register, log in, view/create complaints, upload photos, and read notice board posts.
- **Complaint Lifecycle:** Track transitions through `open` ➔ `in-progress` ➔ `resolved`. A detailed history logs timestamps and acting users for every change.
- **Admin Triage:** Filter complaints by category, status, flat number, or date. Update complaint status and priority level (`low`, `medium`, `high`).
- **Dynamic Overdue Pinning:** Complaints remaining open past a configurable number of days (defined under settings, e.g., 3 days) are flagged as overdue and automatically sorted to the top of the admin dashboard.
- **Notice Board:** Post notices, optionally marking them as `is_important` to pin them and send email alerts to all residents.
- **Email Notifications:** Transactional emails automatically notify residents when their complaint status changes or when important notices are posted.
- **Metrics Dashboard:** View metrics on complaint statuses, complaint categories, and total overdue counts.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20.x LTS or newer
- npm 10.x or newer
- MongoDB database (local or Atlas cluster)
- Brevo account (for mail transactions)
- ImageKit account (for photo uploads)

### 1. Clone and Install

```bash
git clone https://github.com/AAYUSH412/Society-Management-System.git
cd Society-Management-System

# Install client dependencies
cd client && npm install

# Install server dependencies
cd ../server && npm install
```

### 2. Set Up Environment Variables

Configure your local environments. Copy the example configurations and edit the variables with your keys:

```bash
# In the server directory
cp .env.example .env.local

# In the client directory
cp .env.example .env.local
```

Refer to [server/.env.example](./server/.env.example) and [client/.env.example](./client/.env.example) for variable descriptions and placeholders.

### 3. Run Locally

Ensure MongoDB is running, then start the dev servers:

```bash
# Start backend (defaults to http://localhost:4000)
cd server && npm run dev

# Start frontend (defaults to http://localhost:3000)
cd client && npm run dev
```

*Note: On your first run, navigate to `/manager-setup` on the client to register the primary Manager account. You can then invite or register other roles.*

---

## 👥 Roles & Access Levels

| Role | Permissions |
|---|---|
| **Manager** | Full administrative rights: update user roles, invite admins, create watchman accounts. |
| **Admin** | Manage complaint priorities/statuses, add notes, post and delete notices, view dashboard metrics. |
| **Resident** | File complaints, view own complaint history, read notice board, view maintenance history, pay bills. |
| **Watchman** | Mobile-first access to log gate entries and trigger security alerts (system layout). |

---

## 🐳 Docker Deployment

To launch the entire platform in containers:

```bash
docker-compose up -d          # start containers in detached mode
docker-compose logs -f        # tail the output logs
docker-compose down           # stop the containers
```

---

## 📁 Project Structure

```
Society-Management-System-main/
├── client/                     # Next.js 14 frontend
│   ├── src/
│   │   ├── app/                # Page components and routing
│   │   ├── components/         # UI component primitives
│   │   └── lib/                # Client helper functions
│   └── vercel.json
├── server/                     # Express.js backend
│   ├── config/                 # DB, Brevo, and third-party setups
│   ├── controllers/            # Auth, complaints, notices, maintenance
│   ├── middleware/             # Route guards and CORS policies
│   ├── models/                 # Mongoose schema models
│   ├── routes/                 # Express route definitions
│   ├── services/               # Email and ImageKit upload helpers
│   ├── templates/              # Landing page templates
│   ├── utils/                  # Utility scripts and constants
│   ├── server.js               # Express entrypoint
│   └── Dockerfile
├── Creating README from PDF/   # Submission documentation
│   ├── README.md               # Current overview guide
│   ├── API_DOCUMENTATION.md    # Endpoint guidelines
│   ├── DATABASE_SCHEMA.md      # Mongoose schemas
│   └── SYSTEM_DESIGN.md        # Technical architecture write-up
└── docker-compose.yml
```

---

## 📄 License

MIT — see [LICENSE](./LICENSE) details.

---

## 👨‍💻 Author

**Aayush Vaghela** — [portfolio](https://aayush-vaghela.vercel.app) · [GitHub](https://github.com/AAYUSH412) · [LinkedIn](https://linkedin.com/in/aayush-vaghela)
