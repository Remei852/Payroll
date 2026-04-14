# Attendance Checker

A Laravel + React (Inertia.js) attendance management system.

## Requirements

- PHP 8.2+
- Node.js 18+
- One of: MySQL 8+, PostgreSQL 14+, or SQLite 3

## Setup

```bash
# 1. Clone the repo
git clone <repo-url>
cd attendance-checker

# 2. Install PHP dependencies
composer install

# 3. Install JS dependencies
npm install

# 4. Copy and configure environment
cp .env.example .env
php artisan key:generate
```

### 5. Configure your database in `.env`

**MySQL** (most common):
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=attendance_checker
DB_USERNAME=root
DB_PASSWORD=your_password
```

**PostgreSQL**:
```env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=attendance_checker
DB_USERNAME=postgres
DB_PASSWORD=your_password
```

**SQLite** (no server needed):
```env
DB_CONNECTION=sqlite
DB_DATABASE=/absolute/path/to/database.sqlite
```
Then create the file: `touch database/database.sqlite`

### 6. Run migrations and seed

```bash
php artisan migrate
php artisan db:seed
```

This creates the default admin account:
- Email: `admin@example.com`
- Password: `password`

### 7. Build and run

```bash
# Build frontend assets
npm run build

# Start the dev server
php artisan serve
```

Or for frontend hot-reload during development:
```bash
# Terminal 1
php artisan serve

# Terminal 2
npm run dev
```

Visit `http://localhost:8000`

## Usage

1. Log in with the admin account
2. Go to **Employees** and add your employees
3. Go to **Settings → Work Schedules** to configure schedules per department
4. Go to **Attendance** and upload a CSV file
5. Click **Process** on the uploaded file to generate attendance records
6. Review the records in Step 2, then proceed to generate payroll

## CSV Format

The attendance CSV must have these columns in order:
```
Employee ID, Department, Employee Name, Time, Date, Activity, Image, Address
```
- Date format: `MM/DD/YYYY`
- Activity: `IN` or `OUT`

## Troubleshooting

**"Error processing file"** — This usually means:
- No employees exist in the database (run `php artisan db:seed` and add employees)
- Database migration failed (check `php artisan migrate:status`)
- PHP `max_execution_time` is too low for large files (set to 300s in `php.ini`)

**Table shows 0 employees after processing** — The CSV employee codes must match the `employee_code` field in the employees table exactly.
