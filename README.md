# EasyInsure Claims

A web-based insurance claims management platform that provides a simple digital workflow for patients to submit and track claims, and for insurers to review and manage submitted claims.

## Overview

Insurance claim processing can involve submitting documents, waiting for reviews, and repeatedly checking the status of a claim.

**EasyInsure Claims** provides a centralized platform for this process.

The application has two user interfaces:

* **Patient Portal** — Submit claims, upload supporting documents, and track claim status.
* **Insurer Portal** — View submitted claims, filter claims, review documents, and approve or reject claims.

### Basic Workflow

```text
Patient
   │
   │ Submit claim
   │ + Upload document
   ▼
Claim created
   │
   │ Status: Pending
   ▼
Insurer reviews claim
   │
   ├───────────────┐
   │               │
   ▼               ▼
Approve          Reject
   │               │
   ▼               ▼
Approved        Rejected
Amount          + Comment
   │
   ▼
Patient views updated status
```

---

## Features

### Patient Portal

#### 1. Patient Login

Patients can log in using their credentials and access the patient portal.

#### 2. Submit a Claim

Patients can submit a claim with:

* Name
* Email
* Claim amount
* Description
* Supporting document

#### 3. View Submitted Claims

Patients can view the claims they have submitted, including:

* Claim ID
* Claim amount
* Submission date
* Current status
* Approved amount, when applicable

#### 4. Track Claim Status

Patients can track whether their claim is:

* Pending
* Approved
* Rejected

#### 5. View Insurer Comments

When an insurer reviews a claim, the patient can see the comments provided with the decision.

---

### Insurer Portal

#### 1. Insurer Login

Insurers can log in and access the insurer portal.

#### 2. View All Claims

Insurers can view claims submitted through the platform.

#### 3. Filter Claims

Insurers can filter claims based on:

* Status
* Date
* Claim amount

#### 4. Review Claim Details

Insurers can view:

* Patient information
* Claim amount
* Claim description
* Submission date
* Uploaded supporting document

#### 5. Approve or Reject Claims

Insurers can:

* Approve a claim
* Enter an approved amount
* Reject a claim
* Add review comments

---

## Authentication

The application provides basic authentication with two roles:

```text
PATIENT
INSURER
```

For this assignment, predefined/mock users are used instead of implementing a complete user registration system.

Authentication is handled using JWT-based authentication.

---

## Claim Status

Each claim can have one of three statuses:

| Status     | Meaning                                                    |
| ---------- | ---------------------------------------------------------- |
| `PENDING`  | Claim has been submitted and is waiting for insurer review |
| `APPROVED` | Insurer has approved the claim                             |
| `REJECTED` | Insurer has rejected the claim                             |

The normal claim flow is:

```text
PENDING
   │
   ├──► APPROVED
   │
   └──► REJECTED
```

---

## Technology Stack

### Frontend

* React.js
* Vite
* React Router
* CSS
* Fetch API

### Backend

* Node.js
* NestJS
* REST API
* JWT Authentication
* Passport
* Multer

### Database

* MongoDB
* Mongoose

### Development Tools

* Git
* GitHub
* Postman
* VS Code

---

## Application Architecture

```text
┌─────────────────────────┐
│     React Frontend      │
│                         │
│  Patient Portal         │
│  Insurer Portal         │
└────────────┬────────────┘
             │
             │ HTTP / REST API
             ▼
┌─────────────────────────┐
│      NestJS Backend     │
│                         │
│  Authentication         │
│  Claims Management      │
│  Document Upload        │
└────────────┬────────────┘
             │
             │ Mongoose
             ▼
┌─────────────────────────┐
│        MongoDB          │
│                         │
│  Users                  │
│  Claims                 │
└─────────────────────────┘
```

---

## Project Structure

```text
easyinsure-claims/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── context/
│   │   └── ...
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── claims/
│   │   ├── app.module.ts
│   │   └── main.ts
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## Core API Endpoints

The backend will provide REST APIs for authentication and claim management.

| Method  | Endpoint      | Purpose                                            |
| ------- | ------------- | -------------------------------------------------- |
| `POST`  | `/auth/login` | Log in a patient or insurer                        |
| `POST`  | `/claims`     | Submit a new claim                                 |
| `GET`   | `/claims/my`  | Get claims belonging to the logged-in patient      |
| `GET`   | `/claims`     | Get claims for the insurer                         |
| `GET`   | `/claims/:id` | Get details of a specific claim                    |
| `PATCH` | `/claims/:id` | Update claim status, approved amount, and comments |

The API implementation may use query parameters for the insurer's claim filters.

---

## Claim Data

Each claim will store information such as:

```text
Claim
├── ID
├── Patient ID
├── Name
├── Email
├── Claim Amount
├── Description
├── Document
├── Status
├── Submission Date
├── Approved Amount
└── Insurer Comments
```

---

## File Upload

Patients can upload a supporting document when submitting a claim.

The uploaded document will be associated with the corresponding claim so that an insurer can access it during the review process.

The MVP will support document upload through the backend using Multer.

---

## Getting Started

### Prerequisites

Make sure the following are installed:

* Node.js
* npm
* MongoDB or MongoDB Atlas
* Git

### 1. Clone the Repository

```bash
git clone <repository-url>
cd easyinsure-claims
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file inside the `backend` directory:

```env
PORT=3000
MONGO_URI=<your-mongodb-connection-string>
JWT_SECRET=<your-jwt-secret>
```

Start the backend:

```bash
npm run start:dev
```

The backend will run on:

```text
http://localhost:3000
```

### 3. Frontend Setup

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend will run on the local URL provided by Vite.

---

## Testing the Application

The main workflow can be tested using the application or Postman.

### Patient Workflow

```text
Patient Login
     ↓
Patient Dashboard
     ↓
Submit Claim
     ↓
Upload Document
     ↓
Claim Created
     ↓
Status: PENDING
     ↓
View Claim
```

### Insurer Workflow

```text
Insurer Login
     ↓
Claims Dashboard
     ↓
Filter Claims
     ↓
Open Claim
     ↓
Review Details
     ↓
View Document
     ↓
Approve / Reject
     ↓
Add Approved Amount / Comments
```

### Updated Patient View

```text
Patient Login
     ↓
View Submitted Claim
     ↓
See Updated Status
     ↓
See Approved Amount / Comments
```

---

## Mock Users

For demonstration purposes, the application will use predefined users.

The final test credentials will be documented here after authentication is implemented.

```text
Patient
Email: patient@test.com

Insurer
Email: insurer@test.com
```

---

## Scope

The current version focuses on the core claims management workflow required for the assignment:

* Patient authentication
* Insurer authentication
* Claim submission
* Supporting document upload
* Patient claim tracking
* Insurer claim dashboard
* Claim filtering
* Claim review
* Claim approval
* Claim rejection
* Approved amount
* Insurer comments
* MongoDB persistence
* REST API

The project intentionally keeps the scope focused on these core requirements.

---

## Demo

A short demonstration will cover:

1. Patient login
2. Claim submission
3. Document upload
4. Patient claim tracking
5. Insurer login
6. Viewing submitted claims
7. Filtering claims
8. Reviewing a claim
9. Approving or rejecting a claim
10. Viewing the updated claim from the patient portal

---

## Project Status

**Status:** In Development