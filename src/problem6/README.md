# Scoreboard API Module Specification

## Overview

This specification defines a backend module for managing a real-time scoreboard that displays the top 10 users by score. The module handles score updates from user actions, validates submissions to prevent unauthorized score manipulation, and broadcasts updates to connected clients in real-time.

**Core Requirements:**

- Display top 10 users ranked by score
- Real-time updates when rankings change
- Score updates triggered by user actions on the frontend
- Authorization and validation to prevent malicious score increases
- Sub-second latency for scoreboard updates

## System Architecture

The module consists of three main components:

1. **REST API** - Handles score submissions and leaderboard queries
2. **Validation Engine** - Verifies score submissions are legitimate
3. **WebSocket Server** - Pushes real-time updates to connected clients

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │
       │ (1) User completes action
       │
       ├────────────────────────────────────┐
       │                                    │
       │ POST /api/scores                   │ WebSocket /ws/leaderboard                          │
       │ (2) Submit score update            │ (6) Receive real-time updates                              │
       │                                    │
       ▼                                    │
┌─────────────────────────────────────────┐ │
│         REST API Server                 │ │
│  ┌────────────────────────────────────┐ │ │
│  │  1. Authenticate Request           │ │ │
│  │  2. Rate Limit Check               │ │ │
│  │  3. Validate Score Submission      │ │ │
│  └────────────┬───────────────────────┘ │ │
│               │                         │ │
│               ▼                         │ │
│  ┌────────────────────────────────────┐ │ │
│  │  Database Write                    │ │ │
│  │  - Insert score record             │ │ │
│  │  - Update user stats               │ │ │
│  └────────────┬───────────────────────┘ │ │
│               │                         │ │
│               ▼                         │ │
│  ┌────────────────────────────────────┐ │ │
│  │  Check Top 10 Impact               │ │ │
│  │  - Query current rankings          │ │ │
│  │  - Determine if update needed      │ │ │
│  └────────────┬───────────────────────┘ │ │
└───────────────┼─────────────────────────┘ │
                │                           │
                │ (4) If top 10 changed     │
                ▼                           │
     ┌─────────────────────┐                │
     │   Redis Pub/Sub     │                │
     │  "leaderboard:      │                │
     │   updates"          │                │
     └─────────┬───────────┘                │
               │                            │
               │ (5) Broadcast update       │
               ▼                            │
     ┌─────────────────────┐                │
     │  WebSocket Server   │ ───────────────┘
     │  - Manage connections
     │  - Push updates to clients
     └─────────────────────┘

┌──────────────────┐       ┌──────────────────┐
│   PostgreSQL     │       │      Redis       │
│  - Scores table  │       │  - Rate limits   │
│  - User stats    │       │  - Cache         │
└──────────────────┘       └──────────────────┘
```

## API Specification

### 1. Submit Score

**Endpoint:** `POST /api/scores`

**Purpose:** Accept and validate score updates from user actions.

**Request Headers:**

```
Content-Type: application/json
Authorization: Bearer <jwt_token>
```

**Request Body:**

```json
{
  "scoreIncrease": 50,
  "actionId": "uuid-v4",
  "timestamp": 1704812400000,
  "metadata": {
    "actionType": "task_completed",
    "sessionId": "uuid-v4"
  }
}
```

**Field Descriptions:**

- `scoreIncrease` (integer, required): Points earned from the action (1-1000)
- `actionId` (string, required): Unique identifier for this action (prevents duplicate submissions)
- `timestamp` (integer, required): Client timestamp in Unix milliseconds
- `metadata.actionType` (string, required): Type of action completed
- `metadata.sessionId` (string, required): Current user session identifier

**Success Response (200 OK):**

```json
{
  "success": true,
  "newScore": 1250,
  "rank": 7,
  "isTopTen": true
}
```

**Validation Failure (400 Bad Request):**

```json
{
  "success": false,
  "error": "INVALID_SCORE_DELTA",
  "message": "Score increase exceeds maximum for action type",
  "rejectedValue": 500
}
```

**Rate Limit Response (429 Too Many Requests):**

```json
{
  "success": false,
  "error": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 30
}
```

**Error Codes:**

- `INVALID_SCORE_DELTA` - Score increase is outside valid range
- `DUPLICATE_ACTION` - ActionId has already been processed
- `INVALID_SESSION` - Session has expired or is invalid
- `RATE_LIMIT_EXCEEDED` - Too many requests in time window
- `UNAUTHORIZED` - Missing or invalid JWT token
- `VALIDATION_FAILED` - Failed anti-cheat checks

### 2. Get Leaderboard

**Endpoint:** `GET /api/leaderboard`

**Purpose:** Retrieve current top 10 users.

**Request Headers:**

```
Authorization: Bearer <jwt_token> (optional)
```

**Response (200 OK):**

```json
{
  "leaders": [
    {
      "rank": 1,
      "userId": "user123",
      "username": "player_one",
      "score": 2450,
      "lastUpdated": 1704812350000
    }
    // ... 9 more entries
  ],
  "timestamp": 1704812500000,
  "userRank": 15
}
```

**Field Descriptions:**

- `leaders` (array): Top 10 users ordered by score (descending)
- `timestamp` (integer): Server timestamp of response
- `userRank` (integer, optional): Authenticated user's current rank

### 3. WebSocket Connection

**Endpoint:** `ws://api.example.com/ws/leaderboard`

**Purpose:** Maintain persistent connection for real-time updates.

**Connection:**

```
ws://api.example.com/ws/leaderboard?token=<jwt_token>
```

**Initial Message (Server → Client):**

```json
{
  "type": "snapshot",
  "leaders": [
    /* same structure as GET /api/leaderboard */
  ],
  "timestamp": 1704812500000
}
```

**Update Message (Server → Client):**

```json
{
  "type": "update",
  "changes": [
    {
      "action": "entered",
      "rank": 3,
      "user": {
        "userId": "user456",
        "username": "rising_star",
        "score": 2100
      },
      "displaced": {
        "userId": "user789",
        "username": "former_top10"
      }
    }
  ],
  "timestamp": 1704812510000
}
```

**Change Actions:**

- `entered` - New user entered top 10
- `moved` - User changed position within top 10
- `updated` - User's score increased but rank unchanged

**Heartbeat (Client → Server):**

```json
{
  "type": "ping",
  "timestamp": 1704812520000
}
```

Clients must send heartbeat every 30 seconds. Connections without heartbeat for 45 seconds will be closed.

## Validation & Security

### Authentication

All API endpoints require JWT authentication. Token must contain:

- `userId` - Unique user identifier
- `exp` - Token expiration timestamp
- `iat` - Token issued at timestamp

Tokens are validated on every request. Expired or malformed tokens receive 401 Unauthorized.

### Rate Limiting

To prevent abuse, enforce the following limits per user:

- **Score submissions:** 10 requests per minute
- **Leaderboard queries:** 60 requests per minute
- **WebSocket connections:** 3 concurrent connections per user

Rate limits use a sliding window algorithm stored in Redis with automatic expiration.

### Score Validation Rules

The validation engine must verify each score submission against multiple criteria:

**1. Range Validation**

```typescript
// Each action type has a defined score range
const ACTION_SCORE_RANGES = {
  task_completed: { min: 10, max: 100 },
  level_cleared: { min: 50, max: 500 },
  achievement_unlocked: { min: 100, max: 1000 },
};

// Reject if outside range for action type
if (score < min || score > max) {
  reject("INVALID_SCORE_DELTA");
}
```

**2. Duplicate Prevention**

```typescript
// Each actionId can only be submitted once
// Store actionId in database with unique constraint
// Check if actionId already exists before processing
```

**3. Time-based Validation**

```typescript
// Score submission timestamp must be recent
const MAX_CLOCK_SKEW = 5 * 60 * 1000; // 5 minutes
const timeDiff = Math.abs(serverTime - clientTimestamp);

if (timeDiff > MAX_CLOCK_SKEW) {
  reject("INVALID_TIMESTAMP");
}
```

**4. Session Validation**

```typescript
// Session must be active and belong to the user
// Sessions expire after 24 hours of inactivity
// Validate sessionId against active sessions in Redis
```

**5. Statistical Anomaly Detection**

```typescript
// Track user's score submission patterns
// Flag submissions that deviate significantly from historical behavior

const userStats = getUserStatistics(userId);
const expectedRate = userStats.averageScorePerHour;
const currentRate = calculateRecentScoreRate(userId);

if (currentRate > expectedRate * 3) {
  // Flag for review but allow submission
  logSuspiciousActivity(userId, "HIGH_SCORE_RATE");
}
```

## Data Storage

### PostgreSQL Schema

```sql
-- Main scores table
CREATE TABLE scores (
  id BIGSERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  action_id UUID NOT NULL UNIQUE,
  score_increase INTEGER NOT NULL,
  total_score INTEGER NOT NULL,
  action_type VARCHAR(100) NOT NULL,
  session_id UUID NOT NULL,
  submitted_at TIMESTAMP NOT NULL DEFAULT NOW(),

  INDEX idx_user_scores (user_id, submitted_at DESC),
  INDEX idx_leaderboard (total_score DESC, submitted_at ASC)
);

-- User statistics for validation
CREATE TABLE user_stats (
  user_id VARCHAR(255) PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  total_score INTEGER NOT NULL DEFAULT 0,
  total_actions INTEGER NOT NULL DEFAULT 0,
  last_action_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Session tracking
CREATE TABLE sessions (
  session_id UUID PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  last_activity TIMESTAMP NOT NULL DEFAULT NOW(),

  INDEX idx_user_sessions (user_id, expires_at DESC)
);
```

### Redis Data Structures

```
# Rate limiting
rate_limit:score:{userId} → counter (EX 60)
rate_limit:leaderboard:{userId} → counter (EX 60)

# Leaderboard cache
leaderboard:top10 → JSON string (EX 5)

# Active sessions
session:{sessionId} → userId (EX 86400)

# Action ID deduplication (temporary)
action:{actionId} → timestamp (EX 3600)
```

## Implementation Requirements

### 1. Database Operations

**On Score Submission:**

1. Begin transaction
2. Insert new score record
3. Update user_stats (increment total_score, update last_action_at)
4. Commit transaction
5. Check if user is now in top 10
6. If yes, publish update to Redis pub/sub

**For Leaderboard Queries:**

1. Check Redis cache for `leaderboard:top10`
2. If cache miss:
   - Query database: `SELECT * FROM user_stats ORDER BY total_score DESC LIMIT 10`
   - Store result in Redis with 5-second TTL
3. Return cached data

### 2. Real-time Updates

**WebSocket Server Responsibilities:**

- Subscribe to Redis pub/sub channel `leaderboard:updates`
- Maintain map of userId → WebSocket connections
- On receiving pub/sub message:
  - Parse update payload
  - Broadcast to all connected clients
  - Handle disconnected clients gracefully

**Update Trigger Logic:**

```typescript
async function checkAndBroadcastUpdate(userId: string, newScore: number) {
  const currentTop10 = await getTop10FromDB();
  const previousTop10 = await getTop10FromCache();

  if (!arraysEqual(currentTop10, previousTop10)) {
    const changes = calculateChanges(previousTop10, currentTop10);
    await publishUpdate({ type: "update", changes, timestamp: Date.now() });
    await cacheTop10(currentTop10);
  }
}
```

### 3. Error Handling

All validation failures should:

- Log the rejection reason with userId and actionId
- Return appropriate HTTP status code
- Include actionable error message for client
- NOT reveal security implementation details

All database errors should:

- Log full error details server-side
- Return generic error message to client
- Implement retry logic for transient failures
- Alert on repeated failures

## Performance Considerations

### Caching Strategy

- Top 10 leaderboard cached in Redis with 5-second TTL
- Acceptable staleness: 5 seconds
- Cache invalidation on every top 10 change (write-through)

### Database Indexes

Required indexes:

- `idx_leaderboard` on `(total_score DESC, submitted_at ASC)` for fast top 10 queries
- `idx_user_scores` on `(user_id, submitted_at DESC)` for user history
- Unique index on `action_id` for duplicate prevention

### Scalability Targets

- Support 1000 concurrent WebSocket connections per server instance
- Handle 100 score submissions per second
- Leaderboard query response time < 100ms (p95)
- WebSocket update latency < 500ms

## Testing Requirements

### Unit Tests

- Validation logic for all error conditions
- Score range validation for each action type
- Rate limiting behavior
- Statistical anomaly detection

### Integration Tests

- End-to-end score submission flow
- WebSocket connection lifecycle
- Cache invalidation behavior
- Concurrent score submissions

### Load Tests

- 500 concurrent score submissions
- 5000 concurrent WebSocket connections
- Mixed read/write workload
- Cache failure scenarios

## Known Limitations & Future Improvements

### Current Limitations

1. **No historical leaderboards** - Only current rankings supported. Future: Add daily/weekly/monthly leaderboards.
2. **Single region** - No geo-distribution. Future: Add regional leaderboards.
3. **Basic anti-cheat** - Statistical validation only. Future: Implement behavior analysis and replay verification.
4. **No offline support** - Requires active connection. Future: Queue score submissions offline.

### Improvement Opportunities

- **Batch updates**: If multiple users enter top 10 simultaneously, send one combined update instead of multiple messages
- **Compression**: Enable WebSocket compression for lower bandwidth
- **Monitoring**: Add metrics for validation rejection rates, cache hit rates, WebSocket connection churn
- **Admin tools**: Dashboard for reviewing flagged submissions and adjusting validation thresholds

### Edge Cases to Consider

- User submits score exactly as they reach rate limit
- Two users tie for 10th place
- WebSocket server restart during high traffic
- Database deadlock on concurrent updates to same user
- Redis cache failure while database is healthy
- Client and server clock significantly out of sync

## Local Development Setup

```bash
# Start dependencies
docker-compose up -d postgres redis

# Install dependencies
npm install

# Run database migrations
npm run migrate

# Start API server (port 3000)
npm run dev:api

# Start WebSocket server (port 3001)
npm run dev:ws

# Run tests
npm test
```

**Environment Variables:**

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/scoreboard
REDIS_URL=redis://localhost:6379
JWT_SECRET=<generate-with-openssl-rand>
PORT=3000
WS_PORT=3001
NODE_ENV=development
LOG_LEVEL=debug
```
