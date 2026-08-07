# EasyInsure Claims

## 🚀 EasyInsure – Simple, Digital Claims Management

**EasyInsure Claims** is a web-based **insurance claims management platform** designed to simplify the process of submitting, reviewing, and tracking insurance claims.

It provides separate experiences for **Patients** and **Insurers**, creating a centralized workflow from claim submission to final approval or rejection.

---

## ✨ What You Can Do with EasyInsure

* 🧾 **Submit Claims** – Patients can submit insurance claims with supporting documents.
* 📊 **Track Claims** – View claim status, submission date, approved amount, and insurer comments.
* 🏢 **Insurer Dashboard** – Insurers can view and manage submitted claims from one place.
* 🔎 **Filter Claims** – Filter claims by status, date, and claim amount.
* 📄 **Document Review** – Insurers can access supporting documents submitted with claims.
* ✅ **Approve Claims** – Review claims, approve eligible amounts, and add comments.
* ❌ **Reject Claims** – Reject claims with review comments for the patient.
* 🔐 **Role-Based Access** – Separate Patient and Insurer access using JWT authentication.

---

## 🔄 Claim Workflow

```text
Patient
   │
   │ Submit Claim + Document
   ▼
Pending Claim
   │
   │ Insurer Review
   ├───────────────┐
   ▼               ▼
Approve          Reject
   │               │
   ▼               ▼
Approved        Rejected
Amount          + Comments
   │               │
   └───────┬───────┘
           ▼
     Patient Views
     Updated Status
```

---

## 🛠️ Tech Stack

### 🌐 Frontend

* React.js
* Vite
* React Router
* CSS
* Fetch API

### 🖥️ Backend

* Node.js
* NestJS
* REST API
* JWT
* Passport
* Multer

### 🗄️ Database

* MongoDB
* Mongoose

### 🔧 Tools

* Git
* GitHub
* Postman
* VS Code

---

## 👥 User Roles

### 👤 Patient

* Login
* Submit claims
* Upload supporting documents
* View submitted claims
* Track claim status
* View approved amount
* View insurer comments

### 🏢 Insurer

* Login
* View all claims
* Filter claims
* Review claim details
* View supporting documents
* Approve or reject claims
* Set approved amount
* Add review comments

---

## 🌐 Deployment

* **Frontend:** Coming Soon
* **Backend:** Coming Soon
* **Database:** MongoDB Atlas

---

🔥 *EasyInsure turns a manual claims process into a simple, centralized digital workflow.*
