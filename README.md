Full-stack application for warehouse management with inventory tracking, batch/expiry management, and comprehensive reporting.

## 🚀 Tech Stack

**Backend:**
- Node.js + Express
- PostgreSQL + Sequelize ORM
- JWT Authentication

**Frontend:**
- React 18 + Vite
- Tailwind CSS
- Axios

## 📦 Installation

### Prerequisites
- Node.js (v18+)
- PostgreSQL (v14+)
- npm or yarn

### Setup Steps

1. **Clone repository**
```bash
git clone <repository-url>
cd warehouse-management-system
```

2. **Install dependencies**
```bash
npm run install-all
```

3. **Setup Database**
```bash
# Create PostgreSQL database
psql -U postgres
CREATE DATABASE warehouse_db;
\q

# Run migrations
psql -U postgres -d warehouse_db -f database/init.sql
```

4. **Configure Environment**
```bash
# Copy .env.example to .env and update values
cp .env.example .env
# Edit .env with your database credentials
```

5. **Run Application**
```bash
# Development mode (runs both frontend & backend)
npm run dev

# Or run separately:
# Terminal 1 - Backend
npm run server

# Terminal 2 - Frontend
npm run client
```

## 🌐 Access

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000
- **API Docs:** http://localhost:5000/api/docs

## 📚 API Endpoints

### Products
- GET    /api/products
- POST   /api/products
- PUT    /api/products/:id
- DELETE /api/products/:id

### Stock
- GET /api/stock
- GET /api/stock/:productId

### Inbound
- GET  /api/inbound
- POST /api/inbound
- POST /api/inbound/:id/confirm

### Outbound
- GET  /api/outbound
- POST /api/outbound
- POST /api/outbound/:id/confirm

### Reports
- GET /api/reports/stock
- GET /api/reports/batches

## 🔧 Development

```bash
# Backend development
cd backend
npm run dev

# Frontend development
cd frontend
npm run dev

# Build for production
npm run build
```

## 📝 License

MIT License - see LICENSE file for details
