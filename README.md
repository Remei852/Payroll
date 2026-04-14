# Attendance Checker

A Laravel + React (Inertia.js) attendance management system.

## Requirements

- PHP 8.2+
- Composer
- Node.js 18+
- PostgreSQL 14+

## Fresh Setup (first time on a new machine)

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd attendance-checker

composer install
npm install
```

### 2. Create your environment file

```bash
cp .env.example .env
php artisan key:generate
```

Open `.env` and fill in your PostgreSQL password:

```env
DB_PASSWORD=your_postgres_password
```

Also set your admin login credentials:

```env
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your_chosen_password
```

### 3. Create the database

In pgAdmin or psql:

```sql
CREATE DATABASE attendance_checker;
```

### 4. Run migrations and seed

```bash
php artisan migrate
php artisan db:seed
```

This creates:
- All database tables
- 5 departments with work schedules
- 22 employees
- Philippine holidays
- SSS, PhilHealth, Pag-IBIG, Withholding Tax contribution types
- Admin user (from your `.env` credentials)

### 5. Build and run

```bash
# Build frontend
npm run build

# Start the server
php artisan serve
```

Visit `http://localhost:8000` and log in with your `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

---

## Daily development (after first setup)

```bash
# Terminal 1 — backend
php artisan serve

# Terminal 2 — frontend hot reload
npm run dev
```

---

## Usage

1. Go to **Attendance** → upload a CSV file
2. Click **Process** on the uploaded file
3. Review the records in Step 2
4. Generate payroll in Step 3

### CSV Format

```
Employee ID, Department, Employee Name, Time, Date, Activity, Image, Address
```

- Date: `MM/DD/YYYY`
- Activity: `IN` or `OUT`
- Employee ID must match the `employee_code` in the Employees table

---

## Troubleshooting

**"Error processing file" when clicking Process**
- Check `storage/logs/laravel.log` for the exact error
- Make sure employees exist (run `php artisan db:seed` if not)
- Make sure the CSV employee codes match exactly

**"duplicate key" error when adding a department**
- Run: `php artisan migrate:fresh --seed`
- This resets everything — only do this on a fresh install

**Page shows blank / 500 error**
- Run `php artisan config:clear && php artisan cache:clear`
- Check `APP_KEY` is set in `.env`
