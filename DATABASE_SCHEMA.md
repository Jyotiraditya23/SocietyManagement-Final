# Database Schema — Nehete Society Management System

MongoDB via Mongoose. Collections are kept independent (no strict foreign-key relations), with `ObjectId` references between them where needed.

---

## Complaint

The centerpiece for complaint tracking. Each complaint maintains a `status_history` array containing the timeline of all status updates. Note that `is_overdue` is **not** stored as a field in the database; it is calculated dynamically using aggregation pipelines based on `created_at` and status.

```javascript
const StatusHistorySchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['open', 'in-progress', 'resolved'],
    required: true
  },
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  note: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const ComplaintSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  flat_no: {
    type: String,
    required: [true, 'Flat number is required']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['Plumbing', 'Electrical', 'Lift/Elevator', 'Security/Parking', 'Cleaning/Garbage', 'Others']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  image_url: {
    type: String,
    default: null   // ImageKit URL
  },
  status: {
    type: String,
    enum: ['open', 'in-progress', 'resolved'],
    default: 'open'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  admin_notes: {
    type: String,
    default: null
  },
  resolved_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  status_history: [StatusHistorySchema]
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

ComplaintSchema.index({ user_id: 1 });
ComplaintSchema.index({ status: 1 });
ComplaintSchema.index({ category: 1 });
ComplaintSchema.index({ created_at: -1 });
```

**Why an array instead of a separate `ComplaintHistory` collection?** A complaint rarely changes status more than 3–4 times in its life, so an embedded array stays small and lets us fetch the full timeline with a single document read, instead of a join-like second query every time someone opens a complaint.

**Overdue detection:** Calculated dynamically during queries based on the `overdue_threshold_days` key stored in the `Setting` model (defaults to 3 days if missing). If `status != 'resolved'` and the current date minus `created_at` exceeds the threshold, the complaint is dynamically flagged as overdue in the API response.

---

## Notice

Digital notice board announcements. Important announcements trigger emails to all residents.

```javascript
const NoticeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  content: {
    type: String,
    required: [true, 'Content is required'],
    trim: true,
    maxlength: [5000, 'Content cannot exceed 5000 characters']
  },
  is_important: {
    type: Boolean,
    default: false
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

NoticeSchema.index({ is_important: -1, created_at: -1 }); // pinned-first index
```

---

## User

User accounts for residents, admins, and managers.

```javascript
const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit phone number']
  },
  flat_no: {
    type: String,
    required: function() {
      return this.role !== 'watchman';
    },
    match: [/^[1-9]\d{2}$/, 'Please enter a valid flat number']
  },
  role: {
    type: String,
    enum: ['manager', 'admin', 'resident', 'watchman'],
    default: 'resident'
  },
  password_hash: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  is_active: {
    type: Boolean,
    default: true
  },
  is_verified: {
    type: Boolean,
    default: true
  },
  otp: {
    type: String,
    default: null
  },
  otp_expires: {
    type: Date,
    default: null
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

UserSchema.index({ flat_no: 1 });
UserSchema.index({ role: 1 });
```

---

## Setting

Key-value store for system configurations (e.g., dynamic overdue thresholds).

```javascript
const SettingSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  }
});
```

---

## Entity Relationships (Informal)

```
User (1) ───< (many) Complaint
User (1) ───< (many) Notice         (created_by)
User (1) ───< (many) Maintenance
User (1) ───< (many) PaymentLog
Maintenance (1) ───< (many) PaymentLog
```

No hard foreign-key constraints are enforced by MongoDB; relationship consistency is validated at the application controller layer.
