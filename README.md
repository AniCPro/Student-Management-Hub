# Student Management System (MERN Stack)

A full-stack web application designed to manage student records, attendance, courses, and grades efficiently. Built using the **MERN** stack (**M**ongoDB, **E**xpress.js, **R**eact, **N**ode.js).

---

## 🚀 Features

### **Admin / Teacher Features**
* **User Authentication & Authorization**: Secure login/signup with role-based access control (Admin, Teacher, Student) using JWT.
* **Student Management**: Add, view, update, and delete student profiles (CRUD operations).
* **Course & Class Management**: Assign courses to students and manage class schedules.
* **Attendance Tracking**: Mark and monitor daily student attendance.
* **Grade Management**: Input and compute grades/GPA for enrolled subjects.

### **Student Features**
* **Personal Profile**: View personal information, enrolled courses, and academic history.
* **Attendance Overview**: Monitor overall and subject-wise attendance percentages.
* **Grade Report**: Access recent marks and academic transcripts.

---

## 🛠️ Tech Stack

* **Frontend**: React.js, React Router, Redux / Context API, Tailwind CSS / Bootstrap, Axios
* **Backend**: Node.js, Express.js
* **Database**: MongoDB (via Mongoose ODM)
* **Authentication**: JSON Web Tokens (JWT) & bcrypt.js

---

## 📁 Project Structure

```text
mern-student-management/
├── client/                 # React Frontend
│   ├── public/
│   └── src/
│       ├── assets/
│       ├── components/
│       ├── pages/
│       ├── context/
│       ├── services/
│       ├── App.js
│       └── index.js
│
├── server/                 # Node/Express Backend
│   ├── config/             # DB connection & server configuration
│   ├── controllers/        # Request handlers
│   ├── middleware/         # Auth & error handling middlewares
│   ├── models/             # Mongoose schemas
│   ├── routes/             # API endpoints
│   ├── .env.example
│   └── server.js
│
└── README.md
```

---

## ⚙️ Installation & Setup

### **Prerequisites**
Make sure you have the following installed on your machine:
* [Node.js](https://nodejs.org/) (v14 or higher)
* [MongoDB](https://www.mongodb.com/) (Local server or MongoDB Atlas URI)
* [Git](https://git-scm.com/)

---

### **1. Clone the Repository**
```bash
git clone https://github.com/your-username/mern-student-management.git
cd mern-student-management
```

---

### **2. Backend Setup**

1. Navigate to the server folder:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the `server` directory and configure the environment variables:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   ```

4. Start the server:
   ```bash
   # Production mode
   npm start

   # Development mode (with nodemon)
   npm run dev
   ```

---

### **3. Frontend Setup**

1. Open a new terminal window and navigate to the client directory:
   ```bash
   cd client
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the React development server:
   ```bash
   npm start
   ```

4. Open your browser and navigate to `http://localhost:3000`.

---

## 🔌 API Endpoints Summary

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a new user | Public |
| `POST` | `/api/auth/login` | User login & token generation | Public |
| `GET` | `/api/students` | Get list of all students | Admin/Teacher |
| `POST` | `/api/students` | Add a new student record | Admin |
| `GET` | `/api/students/:id` | Get single student details | Authenticated |
| `PUT` | `/api/students/:id` | Update student information | Admin |
| `DELETE`| `/api/students/:id` | Delete a student record | Admin |

---

## 🤝 Contributing

Contributions are welcome! Follow these steps to contribute:
1. Fork the repository.
2. Create a new branch (`git checkout -b feature/YourFeature`).
3. Commit your changes (`git commit -m 'Add some feature'`).
4. Push to the branch (`git push origin feature/YourFeature`).
5. Open a Pull Request.

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.