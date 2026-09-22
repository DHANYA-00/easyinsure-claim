# EasyInsure Claims

A secure insurance claims management platform for handling patient submissions and insurer review workflows.

## About
EasyInsure Claims is a full-stack insurance claims platform that helps patients submit claims and allows insurers to review, validate, and approve them in a structured workflow. It simplifies the manual insurance process by centralizing claim submission, document upload, status tracking, and insurer decision-making in one application.

## Features
- Patient login and secure claim submission
- Supporting document upload for claims
- Claim tracking with status updates
- Insurer dashboard for claim review and filtering
- Approval and rejection workflow with comments and approved amounts
- Role-based access for patients and insurers

## Tech Stack
Frontend: React.js, Vite
Backend: Node.js, NestJS
Database: MongoDB
Other: JWT Authentication, Multer

## How It Works
Patients log in to the patient portal, submit claims with supporting documents, and monitor claim progress. Insurers log in to a separate dashboard, filter claims, review uploaded evidence, and approve or reject each case. The backend stores claim data in MongoDB and enforces role-based access through JWT-based authentication.

## Installation
```bash
git clone https://github.com/username/repo.git
cd repo
cd backend && npm install
cd ../frontend && npm install
```

## Environment Variables
```env
PORT=5000
MONGO_URI=your_mongo_uri
JWT_SECRET=your_jwt_secret
VITE_API_URL=http://localhost:5000
```

## Challenges & Learnings
1. Implementing role-based access and claim review logic required careful handling of patient vs insurer permissions and validation rules.
2. Managing file uploads and document retrieval in the backend helped improve the understanding of secure storage and retrieval workflows for insurance documents.

## Author
Dhanya Lakshmi S S
