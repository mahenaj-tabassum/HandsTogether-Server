# HandsTogether Server

REST API for **HandsTogether**, a community platform where people discover, create, join and manage social development events such as tree plantations, food donations and community cleanups.

- **Live API:** `https://hands-together-server.vercel.app`
- **Live site (client):** `https://hands-together-client.vercel.app/`
- **Client repository:** `https://github.com/mahenaj-tabassum/HandsTogether-Client`

## Features

- Public event browsing with server-side filtering by type and search text
- Upcoming-only listing: past events never appear in the public list
- JWT-protected routes, verified against the Better Auth JWKS endpoint
- Owner-only update and delete: users can only change events they created
- Join system with a unique index, so one user cannot join the same event twice
- Capacity control: the last seat can never be taken by two people at once
- Input validation on every create and update request
- Clean cascade: deleting an event also removes its join records

## Tech Stack

| Purpose               | Technology              |
| --------------------- | ----------------------- |
| Runtime               | Node.js                 |
| Framework             | Express 5               |
| Database              | MongoDB (native driver) |
| JWT verification      | jose (remote JWKS)      |
| Config                | dotenv                  |
| Cross-origin requests | cors                    |
| Dev reload            | nodemon                 |

## Project Structure

```
HandsTogether-Server/
└── src/
	├── server.js
    ├── config/
    │   └── db.js
    ├── controllers/
    │   └── events.controller.js
    ├── middlewares/
    │   ├── auth.middleware.js
    │   └── error.middleware.js
    ├── routes/
    │   └── events.routes.js
    └── utils/
        ├── escapeRegex.js
        ├── eventTypes.js
        └── validateEvent.js
```

## Getting Started

### 1. Install

```bash
git clone https://github.com/mahenaj-tabassum/HandsTogether-Server.git

cd HandsTogether-Server

npm install
```

### 2. Environment variables

Create a `.env` file in the project root:

```env
PORT=5000
MONGODB_DATABASE_URL=your_mongodb_connection_string
DB_NAME=HandsTogether
CLIENT_URL=http://localhost:3000
AUTH_URL=http://localhost:3000
```

### 3. Run

```bash
npm run dev
```

The API is available at `http://localhost:5000`.

## API Endpoints

Base path: `/api/events`

| Method | Endpoint    | Auth       | Description                           |
| ------ | ----------- | ---------- | ------------------------------------- |
| GET    | `/`         | Public     | List upcoming events, soonest first   |
| GET    | `/:id`      | Public     | Get one event by id                   |
| POST   | `/`         | JWT        | Create an event                       |
| PATCH  | `/:id`      | JWT, owner | Update an event                       |
| DELETE | `/:id`      | JWT, owner | Delete an event and its joins         |
| POST   | `/:id/join` | JWT        | Join an event                         |
| GET    | `/:id/join` | JWT        | Check whether the current user joined |
| GET    | `/joined`   | JWT        | Events the current user joined        |
| GET    | `/mine`     | JWT        | Events the current user created       |

### Query parameters for `GET /api/events`

| Parameter | Example    | Description                                                                                   |
| --------- | ---------- | --------------------------------------------------------------------------------------------- |
| `limit`   | `6`        | Maximum number of events (1 to 50). Omit it to get all                                        |
| `type`    | `Donation` | One of `Plantation`, `Cleanup`, `Donation`, `Education`, `Health`. Unknown values are ignored |
| `q`       | `winter`   | Case-insensitive search in title and location                                                 |

```
GET /api/events?limit=6&type=Donation&q=winter
```

### Authentication

Protected routes need a Better Auth JWT in the request header:

```
Authorization: Bearer <token>
```

The server verifies the signature, expiry, issuer and audience, then reads the user's `id`, `email` and `name` from the token.

### Create / Update body

```json
{
  "title": "Winter Clothes Distribution",
  "eventType": "Donation",
  "eventDate": "2026-12-20",
  "eventTime": "10:00",
  "location": "Mirpur 10, Dhaka",
  "thumbnail": "https://example.com/photo.jpg",
  "description": "Help us distribute warm clothes to families in need.",
  "capacity": 50
}
```

| Field         | Rule                                             |
| ------------- | ------------------------------------------------ |
| `title`       | 3 to 100 characters                              |
| `eventType`   | One of the allowed event types                   |
| `eventDate`   | `YYYY-MM-DD`, a real calendar day, in the future |
| `eventTime`   | `HH:MM`, 24-hour                                 |
| `location`    | 2 to 120 characters                              |
| `thumbnail`   | Valid `http` or `https` URL                      |
| `description` | 20 to 1000 characters                            |
| `capacity`    | Whole number from 1 to 5000                      |

On update, the capacity cannot be lower than the number of people who already joined.

| Status | Meaning                              |
| ------ | ------------------------------------ |
| 400    | Invalid id or validation error       |
| 401    | Missing, invalid or expired token    |
| 403    | Not the owner of the event           |
| 404    | Event or route not found             |
| 409    | Already joined, or the event is full |
| 500    | Unexpected server error              |

## Database

- **events**

- **joins**

## How joining works

1. Insert a record in `joins`. The unique index rejects a second join by the same user.
2. Increase `joinedCount` only if it is still below `capacity`. MongoDB applies the update atomically, so two users cannot take the last seat together.
3. If no seat is left, or step 2 fails, the join record from step 1 is removed.

## License

This project was built for educational purposes as part of Assignment 8.
