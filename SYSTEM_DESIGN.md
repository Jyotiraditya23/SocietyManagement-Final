# System Design Write-Up — Complaint Tracking & Notice Board

*(Nehete Society Management System — ~700 words)*

## Complaint History Model

Each complaint is represented as a single MongoDB document. Rather than keeping only the current status, the document maintains an append-only `status_history` array. Every transition adds a new sub-document specifying the resulting `status`, the acting user (`actor`), a descriptive `note`, and a `timestamp`. When a status change occurs (e.g., from `open` to `in-progress`), the backend appends the entry to `status_history` and updates the top-level `status` field. The top-level field is denormalized to allow index-accelerated query filtering (`GET /api/complaints/all?status=open`) without having to inspect the array.

An embedded array design was chosen over a separate history collection for two primary reasons:
1. **Access Patterns:** When a resident or admin views a complaint, they almost always want to see its full history immediately. Storing the history in an embedded array allows the complete document and timeline to be returned in a single MongoDB read operation, eliminating the need for application-level joins or secondary queries.
2. **Growth Limits:** In a typical housing society, a complaint undergoes a small number of status updates (rarely more than 5 transitions). Therefore, the array size remains extremely small, avoiding any document size bloat or performance degradation. Embedding is simple, performant, and keeps related data together.

Once a complaint is `resolved`, the system treats it as closed. Any subsequent state changes require explicitly moving the complaint to another state, which records a new status history entry and maintains audit trails.

## Overdue Detection

Rather than running a daily cron job that modifies database records (which introduces the risk of desynchronized states, late execution, and schema clutter), overdue status is calculated **dynamically in real-time** via MongoDB aggregation queries.

When complaints are queried, the server reads the threshold limit from the `Setting` collection under the key `overdue_threshold_days` (defaulting to 3 days if not found). It computes the target date (`limitDate = Date.now() - thresholdDays`) and executes an aggregation pipeline with an `$addFields` stage:

```javascript
is_overdue: {
  $and: [
    { $ne: ['$status', 'resolved'] },
    { $lt: ['$created_at', limitDate] }
  ]
}
```

This dynamic field evaluates to `true` if the complaint is not resolved and its creation time is older than the configured threshold. The aggregation then sorts the results by `is_overdue: -1, created_at: -1`. This ensures that all overdue complaints are pinned to the top of the list for admins. Computing this dynamically ensures the overdue flag is 100% accurate in real-time, avoids writing redundant data to the database, and is efficient due to single-operation query pipelines.

## Photo Handling

To minimize storage costs and ensure a lightweight, stateless server, complaint photo uploads utilize ImageKit with a client-side direct upload flow. 

1. **Authentication Token Request:** Before uploading, the frontend calls the backend endpoint `POST /api/complaints/upload-url`.
2. **Credential Generation:** The backend uses the ImageKit private API key to generate signed, time-limited authentication parameters (`token`, `expire`, `signature`, `publicKey`, `urlEndpoint`) and returns them to the client.
3. **Direct Upload:** The client uploads the image directly to ImageKit's servers using these credentials.
4. **Complaint Creation:** Once the upload succeeds, the client submits the resulting image URL inside the `POST /api/complaints` request payload.

Because the server never processes raw image streams, it avoids heavy memory buffering, CPU-bound image compression, and network bottleneck issues. The backend simply stores the validated `image_url` in the database.

## Notification Flow

The notification engine is built around event-driven transaction emails powered by Brevo. 

* **Complaint Status Changes:** When an admin updates a complaint status, the backend triggers `sendComplaintStatusUpdate`. The email notifies the resident about the new state and includes the admin's notes, if any.
* **Important Notice Board Announcements:** When posting a notice, admins can toggle `is_important: true`. A normal notice is simply posted to the board. However, an important notice triggers `sendNewNoticeAlert` which broadcasts the notice content and details to all registered residents.

Both notification paths are executed asynchronously in a fire-and-forget style (using unawaited Promise chains). This ensures that third-party email service latencies or failures do not block API execution or delay response times for the user.
