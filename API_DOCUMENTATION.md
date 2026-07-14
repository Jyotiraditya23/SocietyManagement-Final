# API Documentation — Nehete Society Management System

Auth is cookie-based. A JWT is set in an `httpOnly` cookie on successful login. Routes marked with **Auth: Yes** require a valid session cookie.

---

## Complaints

Endpoints for filing, viewing, and updating resident complaints.

### Get My Complaints (Resident)
* **Route:** `GET /complaints`
* **Auth:** Yes (Resident)
* **Query Params:**
  * `status` (optional) — filter by: `open`, `in-progress`, `resolved`
  * `page` (optional) — page number (default: 1)
  * `limit` (optional) — items per page (default: 10)
* **Response (200):**
  ```json
  {
    "success": true,
    "data": [
      {
        "_id": "665f1a...",
        "user_id": {
          "_id": "6601...",
          "name": "Jane Doe",
          "email": "jane@example.com",
          "flat_no": "101"
        },
        "flat_no": "101",
        "category": "Plumbing",
        "description": "Bathroom pipe leakage",
        "image_url": "https://ik.imagekit.io/...",
        "status": "open",
        "priority": "medium",
        "admin_notes": null,
        "resolved_by": null,
        "status_history": [
          {
            "status": "open",
            "actor": {
              "_id": "6601...",
              "name": "Jane Doe",
              "role": "resident"
            },
            "note": "Complaint filed",
            "timestamp": "2026-07-13T05:12:00.000Z"
          }
        ],
        "created_at": "2026-07-13T05:12:00.000Z",
        "updated_at": "2026-07-13T05:12:00.000Z"
      }
    ],
    "pagination": {
      "current": 1,
      "pages": 1,
      "total": 1,
      "limit": 10
    }
  }
  ```

### Get All Complaints (Admin/Manager only)
* **Route:** `GET /complaints/all`
* **Auth:** Yes (Manager, Admin)
* **Query Params:**
  * `status` (optional) — filter by status (`open`, `in-progress`, `resolved`)
  * `category` (optional) — filter by category (`Plumbing`, `Electrical`, `Lift/Elevator`, `Security/Parking`, `Cleaning/Garbage`, `Others`)
  * `date` (optional) — filter by exact creation date (`YYYY-MM-DD`)
  * `flat_no` (optional) — filter by flat number (e.g., `101`)
  * `page` (optional) — pagination page
  * `limit` (optional) — pagination limit
* **Notes:** Overdue complaints are dynamically flagged with `is_overdue: true` (derived from settings) and pinned/sorted to the top of the output.
* **Response (200):**
  ```json
  {
    "success": true,
    "data": [
      {
        "_id": "665f1a...",
        "user_id": {
          "_id": "6601...",
          "name": "Jane Doe",
          "email": "jane@example.com",
          "flat_no": "101",
          "phone": "9876543210"
        },
        "flat_no": "101",
        "category": "Plumbing",
        "description": "Bathroom pipe leakage",
        "image_url": "https://ik.imagekit.io/...",
        "status": "open",
        "priority": "medium",
        "admin_notes": null,
        "resolved_by": null,
        "status_history": [
          {
            "status": "open",
            "actor": {
              "_id": "6601...",
              "name": "Jane Doe",
              "role": "resident"
            },
            "note": "Complaint filed",
            "timestamp": "2026-07-13T05:12:00.000Z"
          }
        ],
        "created_at": "2026-07-13T05:12:00.000Z",
        "updated_at": "2026-07-13T05:12:00.000Z",
        "is_overdue": true
      }
    ],
    "stats": {
      "open": 1,
      "in-progress": 0,
      "resolved": 0,
      "categories": {
        "Plumbing": 1
      },
      "overdue": 1
    },
    "pagination": {
      "current": 1,
      "pages": 1,
      "total": 1,
      "limit": 10
    }
  }
  ```

### Create a Complaint
* **Route:** `POST /complaints`
* **Auth:** Yes (All roles)
* **Request Body:**
  ```json
  {
    "category": "Plumbing",
    "description": "Leaking pipe near the kitchen wall.",
    "image_url": "https://ik.imagekit.io/your_imagekit_id/leak.jpg" // optional
  }
  ```
* **Response (201):**
  ```json
  {
    "success": true,
    "message": "Complaint submitted successfully",
    "data": {
      "_id": "665f1a...",
      "user_id": {
        "_id": "6601...",
        "name": "Jane Doe",
        "email": "jane@example.com",
        "flat_no": "101",
        "phone": "9876543210"
      },
      "flat_no": "101",
      "category": "Plumbing",
      "description": "Leaking pipe near the kitchen wall.",
      "image_url": "https://ik.imagekit.io/your_imagekit_id/leak.jpg",
      "status": "open",
      "priority": "medium",
      "status_history": [
        {
          "status": "open",
          "actor": {
            "name": "Jane Doe",
            "role": "resident"
          },
          "note": "Complaint filed",
          "timestamp": "2026-07-13T05:12:00.000Z"
        }
      ]
    }
  }
  ```

### Get Single Complaint Details
* **Route:** `GET /complaints/:id`
* **Auth:** Yes (Owner resident or Admin/Manager)
* **Response (200):** Returns complete complaint document including `status_history`.

### Update Complaint Status (Admin/Manager only)
* **Route:** `PUT /complaints/:id/status`
* **Auth:** Yes (Manager, Admin)
* **Request Body:**
  ```json
  {
    "status": "in-progress", // or "resolved", "open"
    "admin_notes": "Plumber scheduled for tomorrow morning." // optional
  }
  ```
* **Notes:** Triggers email notification to the resident. If status is `resolved`, the `resolved_by` field is updated with the user ID.
* **Response (200):** Returns the updated complaint document.

### Update Complaint Priority (Admin/Manager only)
* **Route:** `PUT /complaints/:id/priority`
* **Auth:** Yes (Manager, Admin)
* **Request Body:**
  ```json
  {
    "priority": "high" // 'low', 'medium', or 'high'
  }
  ```
* **Response (200):** Returns the updated complaint document.

### Get ImageKit Upload Credentials
* **Route:** `POST /complaints/upload-url`
* **Auth:** Yes
* **Response (200):**
  ```json
  {
    "success": true,
    "data": {
      "token": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      "expire": 1690000000,
      "signature": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      "publicKey": "public_xxxxxxxxxxxx",
      "urlEndpoint": "https://ik.imagekit.io/your_imagekit_id"
    }
  }
  ```

---

## Notice Board

### Get All Notices
* **Route:** `GET /notices`
* **Auth:** Yes (All authenticated users)
* **Notes:** Sorted by `is_important` first (pinned), then by creation date (`created_at`) descending.
* **Response (200):** Returns a list of notice objects.

### Post a Notice (Admin/Manager only)
* **Route:** `POST /notices`
* **Auth:** Yes (Manager, Admin)
* **Request Body:**
  ```json
  {
    "title": "Water Tank Cleaning Schedule",
    "content": "Water supply will be suspended on Saturday, July 18th from 10:00 AM to 2:00 PM for scheduled tank maintenance.",
    "is_important": true
  }
  ```
* **Notes:** If `is_important` is true, an email notification is immediately broadcast to all residents.
* **Response (201):** Returns the created notice object.

### Delete a Notice (Admin/Manager only)
* **Route:** `DELETE /notices/:id`
* **Auth:** Yes (Manager, Admin)
* **Response (200):**
  ```json
  {
    "success": true,
    "message": "Notice deleted successfully"
  }
  ```

---

## Settings

### View All Settings (Admin/Manager only)
* **Route:** `GET /settings`
* **Auth:** Yes (Manager, Admin)
* **Response (200):** Returns all setting keys mapped to their values (e.g., `overdue_threshold_days`).

### Update Setting (Admin/Manager only)
* **Route:** `PUT /settings`
* **Auth:** Yes (Manager, Admin)
* **Request Body:**
  ```json
  {
    "key": "overdue_threshold_days",
    "value": 5
  }
  ```
* **Response (200):** Returns updated setting object.

---

## Authentication

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| GET | `/auth/manager-exists` | Checks if the system already has a manager registered | No |
| POST | `/auth/manager-setup` | Registers the initial system manager (allowed only once) | No |
| POST | `/auth/register` | Registers a new resident user | No |
| POST | `/auth/login` | Authenticates a user and sets the httpOnly cookie | No |
| POST | `/auth/logout` | Clears the authentication cookie | Yes |
| GET | `/auth/me` | Retrieves details of the logged-in user session | Yes |
| POST | `/auth/forgot-password` | Requests an OTP email for password recovery | No |
| POST | `/auth/verify-otp` | Validates the OTP code received by email | No |
| POST | `/auth/reset-password` | Performs password reset using validated credentials | No |

---

## Users

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| GET | `/users` | Lists all users in the system | Yes (Manager, Admin) |
| GET | `/users/flats/available` | Lists flats that are not yet occupied or registered | Yes |
| GET | `/users/:id` | Gets detailed profile of a single user | Yes (Manager, Admin) |
| PUT | `/users/:id/role` | Updates the role of a user (e.g., resident to admin) | Yes (Manager only) |
| POST | `/users/watchman` | Creates a new Watchman account | Yes (Manager only) |
| DELETE | `/users/:id` | Deactivates/deletes a user from the system | Yes (Manager only) |

---

## Error Format

Every API error response follows the standard format:

```json
{
  "success": false,
  "message": "Error details go here"
}
```
