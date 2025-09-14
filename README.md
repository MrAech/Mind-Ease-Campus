# MindEase-Campus  
 
## Overview  
MindEase-Campus is a modern mental healthcare web platform built with **React, Vite, and Convex**.  
It provides an AI-driven, stigma-free environment for students to access mental health resources,  
book confidential sessions, and interact with an integrated chatbot for early detection and support.

[Dashboard](https://github.com/user-attachments/assets/b71e177e-76ee-4944-9d40-4d9e819322b9)

 
## Features  
- 🔹 AI Chatbot for natural, stigma-free conversations  
- 🔹 Validated screening tools (PHQ-9, GAD-7)  
- 🔹 Secure & anonymous session booking system  
- 🔹 Resource hub with multilingual content & offline caching  
- 🔹 Admin dashboard for anonymized analytics & insights  
- 🔹 Responsive UI with Tailwind + Shadcn UI + Framer Motion animations  
- 🔹 3D support using Three.js  
 
## Tech Stack  
- **Frontend**: React (Vite), TypeScript, Tailwind CSS, Shadcn UI, Lucide Icons  
- **Backend**: Convex (database + functions), Node.js + Express  
- **Auth**: Convex Auth with Email OTP & Anonymous login  
- **Animations**: Framer Motion  
- **3D Models**: Three.js  
- **Security**: AES-GCM + RSA-OAEP encryption  
 
## Getting Started  
 
### Prerequisites  
- Node.js installed  
- Convex CLI (`npx convex`) installed  
 
### Setup  
1. Clone the repository:  
   `git clone https://github.com/MrAech/Mind-Ease-Campus.git`  
2. Navigate into the project directory:  
   `cd Mind-Ease-Campus`  
3. Install dependencies:  
   `npm install`  
4. Start Convex backend:  
   `npx convex dev`  
5. Run the frontend:  
   `npm run dev`  
 
By default, OTP codes are logged to the Convex console.  
To enable real email OTPs, configure:  
- `EMAIL_API_URL`  
- `EMAIL_API_KEY`  
 
## Environment Variables  
- `CONVEX_DEPLOYMENT`  
- `VITE_CONVEX_URL`  
- `JWT_PRIVATE_KEY`  
- `JWKS`  
- `SITE_URL`  
- `EMAIL_API_URL`  
- `EMAIL_API_KEY`  
 
## Development Guidelines  
- Keep UI **mobile responsive** and clean (minimal shadows, thin borders).  
- Use Shadcn components where possible.  
- Protect routes using `useAuth` (redirect unauthenticated users to `/auth`).  
- Use `Id<"TableName">` instead of raw `_id` strings in Convex.  
- Validate all inputs in queries/mutations.  
- Place components in `src/components`, pages in `src/pages`.  
- Use `@/...` import alias for cleaner imports.  
 
## Future Scope  
- Voice-to-voice chatbot in regional languages  
- Trend detection & severity prediction  
- Integration with University Management Systems (UMS)  
 
## Team WHR’s 🐴  
- Shivank Yadav  
- Happy Sharma  
- Jai Kumar 
- Nishant Singh  
- Tamanna Arora 
 
## Repository  
🔗 [GitHub Link](https://github.com/MrAech/Mind-Ease-Campus)  
