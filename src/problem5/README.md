# ExpressJS CRUD API

RESTful API built with Express.js and TypeScript. Uses SQLite for data persistence.

## Stack

- Express.js 5
- TypeScript
- SQLite (better-sqlite3)
- ts-node, nodemon

## Setup

Requirements: Node.js 18+

```bash
cd src/problem5
npm install
```

## Running

Development:

```bash
npm run dev
```

Production:

```bash
npm run build
npm start
```

Server runs on `http://localhost:8000`. Database file (`database.sqlite`) is created automatically.

## API

All endpoints under `/items`

### Create

```
POST /items
Content-Type: application/json

{
  "name": "Item name",
  "description": "Optional description"
}

Response: 201
{
  "id": 1,
  "message": "Item created successfully"
}
```

### List

```
GET /items
GET /items?name=search
GET /items?description=search

Response: 200
{
  "count": 2,
  "items": [...]
}
```

### Get by ID

```
GET /items/:id

Response: 200
{
  "id": 1,
  "name": "Item name",
  "description": "Description",
  "created_at": "2026-01-09 12:00:00"
}
```

### Update

```
PUT /items/:id
Content-Type: application/json

{
  "name": "Updated name",
  "description": "Updated description"
}

Response: 200
{
  "message": "Item updated successfully"
}
```

### Delete

```
DELETE /items/:id

Response: 200
{
  "message": "Item deleted successfully"
}
```

## Testing

```bash
# Create
curl -X POST http://localhost:8000/items \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","description":"Test item"}'

# List all
curl http://localhost:8000/items

# Get one
curl http://localhost:8000/items/1

# Update
curl -X PUT http://localhost:8000/items/1 \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated","description":"Updated item"}'

# Delete
curl -X DELETE http://localhost:8000/items/1

# Filter
curl "http://localhost:8000/items?name=Test"
```

## Structure

```
src/
  app.ts              # Entry point
  db.ts               # Database setup
  routes/items.ts     # CRUD routes
  types/item.ts       # Types
```

## Database

```sql
CREATE TABLE items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

## Error Responses

- `400` - Invalid input
- `404` - Not found
- `500` - Server error

## Notes

- Port: 8000 (change in `src/app.ts`)
- Database: `database.sqlite` (change in `src/db.ts`)
- Name field is required for create/update
