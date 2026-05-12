# Agentic Inventory System (Polystore Architecture)

An autonomous, schema-agnostic inventory management system built to modernize legacy infrastructure. 

Agentic Inventory System uses an AI-powered mapping engine to bridge fragmented, legacy databases to a unified standard semantic model. Once mapped, a LangGraph orchestration agent allows users to execute complex inventory operations using natural language—translating intent into dialect-specific SQL execution on the fly.

## 🚀 Key Features

*   **Polystore Abstraction Layer**: Seamlessly connect to PostgreSQL, MySQL, SQL Server, or SQLite. No matter how messy your legacy tables are (`TBL_STOCK_MST`, `C_ITEM_CD`), the AI bridges it.
*   **Visual Semantic Mapping**: A premium React Flow workspace where users can review and approve AI-generated schema connections.
*   **Agentic Terminal**: A sleek, dark-mode chat interface powered by a LangGraph Agent. Ask the system to check stock, generate orders, or transfer inventory, and it handles the reasoning and database execution autonomously.
*   **High-Concurrency Backend**: Fully asynchronous service architecture using FastAPI and SQLAlchemy `AsyncEngine` with per-tenant connection pooling.

## 🛠️ Tech Stack

**Backend**
*   **Framework**: FastAPI
*   **Database**: SQLAlchemy 2.0 (Async Core)
*   **AI Orchestration**: LangChain, LangGraph (OpenAI `gpt-4o`)
*   **Architecture**: Multi-tenant, Service-Layer Pattern

**Frontend**
*   **Framework**: React 19 + Vite + TypeScript
*   **Styling**: Tailwind CSS (Glassmorphism, Coolors.co custom palettes)
*   **Canvas**: `@xyflow/react` (React Flow)
*   **Routing & State**: React Router DOM, Axios

## 💻 Getting Started

You will need two terminals to run the system (Backend and Frontend).

### 1. Start the Backend
```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv
# On Windows use: .venv\Scripts\activate
# On Mac/Linux use: source .venv/bin/activate
.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up your environment variables
# Create a .env file with OPENAI_API_KEY=your_key

# Run the FastAPI server
uvicorn app.main:app --reload
```
*The backend will run on `http://localhost:8000`*

### 2. Start the Frontend
```bash
cd frontend

# Install dependencies
npm install

# Run the development server
npm run dev
```
*The frontend will run on `http://localhost:5173`*

## 🗺️ Project Phases

- **Phase 1-3:** Backend architecture, asynchronous service layers, and the LangGraph orchestrator *(Completed)*
- **Phase 4:** Frontend Visual Mapping Canvas with React Flow *(Completed)*
- **Phase 5:** Agentic Chat Terminal & E2E Integration *(Completed)*
- **Phase 6:** NoSQL Integration (MongoDB, DynamoDB) *(Upcoming)*
- **Phase 7-8:** Real-time polling and multi-location inventory reconciliation *(Upcoming)*

## 📄 License
MIT License. See [LICENSE](LICENSE) for details.