# Frontend Architecture Guide
## Attendance & Payroll System UI

---

## 1. Component Structure

### 1.1 Page Hierarchy

```
App.jsx
├── Layout.jsx
│   ├── Header.jsx
│   ├── Sidebar.jsx
│   └── MainContent.jsx
├── Pages/
│   ├── Attendance/
│   │   ├── Index.jsx (Summary)
│   │   ├── RawLogs.jsx
│   │   ├── Violations.jsx
│   │   └── ReviewQueue.jsx
│   ├── Payroll/
│   │   ├── Index.jsx (Periods List)
│   │   ├── Generate.jsx
│   │   ├── Period.jsx (Details)
│   │   └── Payslip.jsx
│   ├── CashAdvances/
│   │   ├── Index.jsx
│   │   ├── Create.jsx
│   │   └── History.jsx
│   └── Settings/
│       ├── GracePeriod.jsx
│       ├── WorkSchedules.jsx
│       └── Configuration.jsx
└── Components/
    ├── DataTable.jsx
    ├── Modal.jsx
    ├── Form.jsx
    ├── StatusBadge.jsx
    ├── ConfirmDialog.jsx
    ├── LoadingSpinner.jsx
    └── ErrorAlert.jsx
```

### 1.2 Component Responsibilities

#### DataTable Component
```jsx
/**
 * Reusable data table with sorting, filtering, pagination
 * 
 * Props:
 * - columns: Array of column definitions
 * - data: Array of row data
 * - onSort: Callback for sort changes
 * - onFilter: Callback for filter changes
 * - onPageChange: Callback for pagination
 * - loading: Boolean loading state
 * - actions: Array of action buttons
 */
export function DataTable({
  columns,
  data,
  onSort,
  onFilter,
  onPageChange,
  loading,
  actions,
}) {
  return (
    <div className="data-table">
      <TableHeader columns={columns} onSort={onSort} />
      <TableBody 
        columns={columns} 
        data={data} 
        actions={actions}
        loading={loading}
      />
      <TablePagination onPageChange={onPageChange} />
    </div>
  );
}
```

#### Modal Component
```jsx
/**
 * Reusable modal dialog
 * 
 * Props:
 * - isOpen: Boolean to control visibility
 * - title: Modal title
 * - onClose: Callback when modal closes
 * - children: Modal content
 * - actions: Array of action buttons
 */
export function Modal({
  isOpen,
  title,
  onClose,
  children,
  actions,
}) {
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {children}
        </div>
        <div className="modal-footer">
          {actions.map(action => (
            <button key={action.id} onClick={action.onClick}>
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

#### StatusBadge Component
```jsx
/**
 * Status indicator badge
 * 
 * Props:
 * - status: Status value
 * - type: Type of status (success, warning, error, info)
 */
export function StatusBadge({ status, type }) {
  const statusClasses = {
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
  };
  
  return (
    <span className={`badge ${statusClasses[type]}`}>
      {status}
    </span>
  );
}
```

---

## 2. Page Implementation Examples

### 2.1 Payroll Index Page

```jsx
import { useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import DataTable from '@/Components/DataTable';
import Button from '@/Components/Button';

export default function PayrollIndex({ periods }) {
  const [data, setData] = useState(periods);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    department: '',
    status: '',
    dateRange: '',
  });

  const columns = [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'department.name', label: 'Department', sortable: true },
    { key: 'start_date', label: 'Start Date', sortable: true },
    { key: 'end_date', label: 'End Date', sortable: true },
    { key: 'payroll_date', label: 'Payroll Date', sortable: true },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <StatusBadge
          status={value}
          type={value === 'OPEN' ? 'info' : 'success'}
        />
      ),
    },
  ];

  const actions = [
    {
      label: 'View',
      onClick: (row) => window.location.href = `/payroll/period/${row.id}`,
    },
    {
      label: 'Generate',
      onClick: (row) => window.location.href = `/payroll/generate?period=${row.id}`,
      visible: (row) => row.status === 'OPEN',
    },
  ];

  const handleSort = (column, direction) => {
    // Handle sorting
  };

  const handleFilter = (newFilters) => {
    setFilters(newFilters);
    // Fetch filtered data
  };

  return (
    <>
      <Head title="Payroll Periods" />
      
      <div className="container">
        <div className="header">
          <h1>Payroll Periods</h1>
          <Link href="/payroll/generate">
            <Button>Create New Period</Button>
          </Link>
        </div>

        <div className="filters">
          <select
            value={filters.department}
            onChange={(e) => handleFilter({ ...filters, department: e.target.value })}
          >
            <option value="">All Departments</option>
            {/* Department options */}
          </select>

          <select
            value={filters.status}
            onChange={(e) => handleFilter({ ...filters, status: e.target.value })}
          >
            <option value="">All Status</option>
            <option value="OPEN">Open</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>

        <DataTable
          columns={columns}
          data={data}
          onSort={handleSort}
          onFilter={handleFilter}
          actions={actions}
          loading={loading}
        />
      </div>
    </>
  );
}
```

### 2.2 Generate Payroll Page

```jsx
import { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import Form from '@/Components/Form';
import Button from '@/Components/Button';
import ErrorAlert from '@/Components/ErrorAlert';

export default function GeneratePayroll({ departments }) {
  const { data, setData, post, processing, errors } = useForm({
    department_id: '',
    start_date: '',
    end_date: '',
    payroll_date: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    post('/payroll/generate');
  };

  return (
    <>
      <Head title="Generate Payroll" />
      
      <div className="container">
        <h1>Generate Payroll</h1>

        {Object.keys(errors).length > 0 && (
          <ErrorAlert errors={errors} />
        )}

        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label htmlFor="department_id">Department</label>
            <select
              id="department_id"
              value={data.department_id}
              onChange={(e) => setData('department_id', e.target.value)}
              required
            >
              <option value="">Select Department</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
            {errors.department_id && (
              <span className="error">{errors.department_id}</span>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="start_date">Start Date</label>
              <input
                id="start_date"
                type="date"
                value={data.start_date}
                onChange={(e) => setData('start_date', e.target.value)}
                required
              />
              {errors.start_date && (
                <span className="error">{errors.start_date}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="end_date">End Date</label>
              <input
                id="end_date"
                type="date"
                value={data.end_date}
                onChange={(e) => setData('end_date', e.target.value)}
                required
              />
              {errors.end_date && (
                <span className="error">{errors.end_date}</span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="payroll_date">Payroll Date</label>
            <input
              id="payroll_date"
              type="date"
              value={data.payroll_date}
              onChange={(e) => setData('payroll_date', e.target.value)}
              required
            />
            {errors.payroll_date && (
              <span className="error">{errors.payroll_date}</span>
            )}
          </div>

          <div className="form-actions">
            <Button type="submit" disabled={processing}>
              {processing ? 'Generating...' : 'Generate Payroll'}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
```

### 2.3 Period Details Page

```jsx
import { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import DataTable from '@/Components/DataTable';
import SummaryCard from '@/Components/SummaryCard';
import Button from '@/Components/Button';
import ConfirmDialog from '@/Components/ConfirmDialog';

export default function PeriodDetails({ period, payrolls }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const columns = [
    { key: 'employee.name', label: 'Employee Name' },
    { key: 'employee.employee_code', label: 'Employee Code' },
    { key: 'basic_pay', label: 'Basic Pay', format: 'currency' },
    { key: 'overtime_pay', label: 'Overtime', format: 'currency' },
    { key: 'gross_pay', label: 'Gross Pay', format: 'currency' },
    { key: 'total_deductions', label: 'Deductions', format: 'currency' },
    { key: 'net_pay', label: 'Net Pay', format: 'currency' },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <StatusBadge status={value} type="info" />
      ),
    },
  ];

  const actions = [
    {
      label: 'View Payslip',
      onClick: (row) => window.location.href = `/payroll/payslip/${row.id}`,
    },
    {
      label: 'Regenerate',
      onClick: (row) => window.location.href = `/payroll/period/${period.id}/employee/${row.employee_id}/regenerate`,
      visible: (row) => period.status === 'OPEN',
    },
  ];

  const handleFinalize = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/payroll/period/${period.id}/finalize`, {
        method: 'POST',
        headers: {
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
        },
      });
      
      if (response.ok) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error finalizing period:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalGross = payrolls.reduce((sum, p) => sum + p.gross_pay, 0);
  const totalDeductions = payrolls.reduce((sum, p) => sum + p.total_deductions, 0);
  const totalNet = payrolls.reduce((sum, p) => sum + p.net_pay, 0);

  return (
    <>
      <Head title={`Payroll Period ${period.id}`} />
      
      <div className="container">
        <div className="header">
          <h1>Payroll Period Details</h1>
          {period.status === 'OPEN' && (
            <Button onClick={() => setShowConfirm(true)} variant="danger">
              Finalize Period
            </Button>
          )}
        </div>

        <div className="period-info">
          <p><strong>Department:</strong> {period.department.name}</p>
          <p><strong>Period:</strong> {period.start_date} to {period.end_date}</p>
          <p><strong>Payroll Date:</strong> {period.payroll_date}</p>
          <p><strong>Status:</strong> <StatusBadge status={period.status} type="info" /></p>
        </div>

        <div className="summary-cards">
          <SummaryCard
            title="Total Gross Pay"
            value={totalGross}
            format="currency"
          />
          <SummaryCard
            title="Total Deductions"
            value={totalDeductions}
            format="currency"
          />
          <SummaryCard
            title="Total Net Pay"
            value={totalNet}
            format="currency"
          />
          <SummaryCard
            title="Employee Count"
            value={payrolls.length}
          />
        </div>

        <DataTable
          columns={columns}
          data={payrolls}
          actions={actions}
        />

        <ConfirmDialog
          isOpen={showConfirm}
          title="Finalize Payroll Period"
          message="Are you sure you want to finalize this payroll period? This action cannot be undone."
          onConfirm={handleFinalize}
          onCancel={() => setShowConfirm(false)}
          loading={loading}
        />
      </div>
    </>
  );
}
```

### 2.4 Payslip Page

```jsx
import { Head } from '@inertiajs/react';
import Button from '@/Components/Button';

export default function Payslip({ payroll }) {
  const handlePrint = () => {
    window.print();
  };

  const earnings = payroll.items.filter(item => item.type === 'EARNING');
  const deductions = payroll.items.filter(item => item.type === 'DEDUCTION');

  return (
    <>
      <Head title="Payslip" />
      
      <div className="payslip-container">
        <div className="payslip-header">
          <h1>PAYSLIP</h1>
          <Button onClick={handlePrint} variant="secondary">
            Print
          </Button>
        </div>

        <div className="payslip-content">
          {/* Employee Information */}
          <section className="employee-info">
            <h2>Employee Information</h2>
            <div className="info-grid">
              <div>
                <label>Name:</label>
                <p>{payroll.employee.name}</p>
              </div>
              <div>
                <label>Employee Code:</label>
                <p>{payroll.employee.employee_code}</p>
              </div>
              <div>
                <label>Department:</label>
                <p>{payroll.employee.department.name}</p>
              </div>
              <div>
                <label>Position:</label>
                <p>{payroll.employee.position}</p>
              </div>
            </div>
          </section>

          {/* Payroll Period */}
          <section className="period-info">
            <h2>Payroll Period</h2>
            <div className="info-grid">
              <div>
                <label>Period:</label>
                <p>{payroll.payrollPeriod.start_date} to {payroll.payrollPeriod.end_date}</p>
              </div>
              <div>
                <label>Payroll Date:</label>
                <p>{payroll.payrollPeriod.payroll_date}</p>
              </div>
            </div>
          </section>

          {/* Earnings */}
          <section className="earnings">
            <h2>Earnings</h2>
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {earnings.map(item => (
                  <tr key={item.id}>
                    <td>{item.category}</td>
                    <td className="amount">₱{item.amount.toFixed(2)}</td>
                  </tr>
                ))}
                <tr className="total">
                  <td>Gross Pay</td>
                  <td className="amount">₱{payroll.gross_pay.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* Deductions */}
          <section className="deductions">
            <h2>Deductions</h2>
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {deductions.map(item => (
                  <tr key={item.id}>
                    <td>{item.category}</td>
                    <td className="amount">₱{item.amount.toFixed(2)}</td>
                  </tr>
                ))}
                <tr className="total">
                  <td>Total Deductions</td>
                  <td className="amount">₱{payroll.total_deductions.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* Net Pay */}
          <section className="net-pay">
            <div className="net-pay-box">
              <label>Net Pay</label>
              <p className="amount">₱{payroll.net_pay.toFixed(2)}</p>
            </div>
          </section>
        </div>
      </div>

      <style jsx>{`
        @media print {
          .payslip-header button {
            display: none;
          }
        }
      `}</style>
    </>
  );
}
```

---

## 3. State Management

### 3.1 Using Inertia.js with React

```jsx
// Store data in component state
const [payrolls, setPayrolls] = useState(initialPayrolls);
const [filters, setFilters] = useState({});
const [loading, setLoading] = useState(false);

// Use Inertia for form submissions
const { data, setData, post, processing, errors } = useForm({
  department_id: '',
  start_date: '',
  end_date: '',
  payroll_date: '',
});

// Handle form submission
const handleSubmit = (e) => {
  e.preventDefault();
  post('/payroll/generate', {
    onSuccess: () => {
      // Handle success
    },
    onError: () => {
      // Handle error
    },
  });
};
```

### 3.2 Context API for Global State

```jsx
// Create context
const PayrollContext = createContext();

// Provider component
export function PayrollProvider({ children }) {
  const [payrolls, setPayrolls] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(false);

  const value = {
    payrolls,
    setPayrolls,
    periods,
    setPeriods,
    loading,
    setLoading,
  };

  return (
    <PayrollContext.Provider value={value}>
      {children}
    </PayrollContext.Provider>
  );
}

// Hook to use context
export function usePayroll() {
  return useContext(PayrollContext);
}
```

---

## 4. Styling & Layout

### 4.1 CSS Structure

```css
/* Global styles */
:root {
  --primary-color: #3b82f6;
  --success-color: #10b981;
  --warning-color: #f59e0b;
  --danger-color: #ef4444;
  --spacing-unit: 8px;
}

/* Layout */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--spacing-unit) * 3;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-unit) * 4;
}

/* Data table */
.data-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.data-table th {
  background: #f3f4f6;
  padding: var(--spacing-unit) * 2;
  text-align: left;
  font-weight: 600;
  border-bottom: 1px solid #e5e7eb;
}

.data-table td {
  padding: var(--spacing-unit) * 2;
  border-bottom: 1px solid #e5e7eb;
}

/* Forms */
.form-group {
  margin-bottom: var(--spacing-unit) * 3;
}

.form-group label {
  display: block;
  margin-bottom: var(--spacing-unit);
  font-weight: 500;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: var(--spacing-unit) * 1.5;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
}

/* Badges */
.badge {
  display: inline-block;
  padding: var(--spacing-unit) var(--spacing-unit) * 2;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.badge.success {
  background: #d1fae5;
  color: #065f46;
}

.badge.warning {
  background: #fef3c7;
  color: #92400e;
}

.badge.error {
  background: #fee2e2;
  color: #991b1b;
}
```

---

## 5. Accessibility

### 5.1 ARIA Labels

```jsx
<button
  aria-label="Delete payroll record"
  onClick={handleDelete}
>
  Delete
</button>

<div
  role="alert"
  aria-live="polite"
  aria-atomic="true"
>
  {errorMessage}
</div>

<table
  role="table"
  aria-label="Payroll records"
>
  {/* Table content */}
</table>
```

### 5.2 Keyboard Navigation

```jsx
// Handle keyboard events
const handleKeyDown = (e) => {
  if (e.key === 'Escape') {
    closeModal();
  }
  if (e.key === 'Enter' && e.ctrlKey) {
    submitForm();
  }
};

// Focus management
useEffect(() => {
  if (isModalOpen) {
    firstInputRef.current?.focus();
  }
}, [isModalOpen]);
```

---

## Summary

This frontend architecture provides:

1. **Reusable Components** - DataTable, Modal, Form, StatusBadge
2. **Page Templates** - Payroll Index, Generate, Period Details, Payslip
3. **State Management** - Inertia.js and Context API
4. **Styling** - CSS structure with responsive design
5. **Accessibility** - ARIA labels and keyboard navigation

The frontend is designed to be maintainable, scalable, and user-friendly.
