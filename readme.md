# 🌿 Marathon Hub - Server

This is the **backend server** for the **Marathon Hub** application, built using **Express.js**, **MongoDB**, and **Firebase Admin SDK**. It manages users, marathons, and participant registrations.

---

## 🧩 Tech Stack

- **Node.js**
- **Express.js**
- **MongoDB**
- **Firebase Admin SDK**
- **dotenv**
- **cors**

---

## ⚙️ Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/rakibhasansohag/marathon-hub-server.git
cd marathon-hub-server
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create `.env` File

Create a `.env` file in the root directory and add your MongoDB URL and port:

```
PORT=5000
MONGODBURL=your_mongodb_connection_string
```

### 4. Add Firebase Admin Credentials

Create a file named `firebase-config.json` in the root directory and paste your Firebase Admin SDK service account credentials.

---

## 🚀 Run the Server

### For Development:

```bash
npm run dev
```

### For Production:

```bash
npm start
```

---

## 📦 API Endpoints Overview

### ✅ Health Check
- `GET /` – Check if server is running.

### 👤 Marathon Users
- `POST /marathonUser` – Create or upsert a user.
- `GET /marathonUser` – Get all users.
- `GET /marathonUser/:uid` – Get user by UID (requires Firebase token).
- `PUT /marathonUser/:uid` – Update user info.
- `DELETE /marathonUser/:id` – Delete a user (admin access assumed).

### 🏃 Marathons
- `POST /marathons` – Add a new marathon.
- `GET /marathons` – Get all marathons (with optional filtering, sorting, and search).
- `GET /marathons/:id` – Get single marathon by ID.
- `PUT /marathons/:id` – Update marathon info.
- `DELETE /marathons/:id` – Delete marathon.
- `GET /my-marathons` – Get marathons created by the logged-in user.

### 📝 Registrations
- `POST /registration` – Register for a marathon.
- `GET /registration/check` – Check if user is already registered.
- `GET /my-apply-marathons` – Get user's registered marathons (supports search/sort).
- `PUT /my-apply-marathons/:id` – Update registration.
- `DELETE /my-apply-marathons/:id` – Delete a registration.

---

## 🔐 Firebase Auth Middleware

Protected routes require a valid Firebase ID token via `Authorization: Bearer <token>` header.

---

## 🧠 Notes

- All marathon and user-related data is stored in **MongoDB**.
- This project assumes the client is running at `http://localhost:3000` or `http://localhost:5173` (CORS configured).

---

## 🤝 Contribution

Feel free to fork, improve, or contribute via pull requests.

---

## 👨‍💻 Author

**Rakib Hasan Sohag**
- GitHub: [@rakibhasansohag](https://github.com/rakibhasansohag)

---

## 📜 License

*This project is for learning purposes and aims to create a thriving community for marathons enthusiasts worldwide.*
