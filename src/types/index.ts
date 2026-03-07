// ─── Enums ───────────────────────────────────────────────────────────────────

export type UserRole =
  | 'superadmin'
  | 'admin'
  | 'hr_manager'
  | 'branch_manager'
  | 'accountant'
  | 'employee'

export type EmploymentType = 'full' | 'part' | 'contract'

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'half_day'
export type AttendanceSource = 'manual' | 'telegram' | 'system'

export type SalaryStatus = 'draft' | 'approved' | 'paid'

export type BonusType = 'performance' | 'holiday' | 'project' | 'other'
export type DeductionType = 'late' | 'absent' | 'damage' | 'advance' | 'other'

export type LeaveType = 'annual' | 'sick' | 'unpaid' | 'maternity' | 'other'
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface LoginSchema {
  phone: string
  password: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface UserOut {
  id: number
  phone: string
  full_name: string
  role: UserRole
  is_active: boolean
  created_at: string
  employee_id: number | null
}

export interface ChangePasswordSchema {
  old_password: string
  new_password: string
}

// ─── Branch ──────────────────────────────────────────────────────────────────

export interface BranchOut {
  id: number
  name: string
  address: string | null
  phone: string | null
  manager_id: number | null
  work_start_time: string | null
  is_active: boolean
  employee_count?: number
}

export interface BranchShort {
  id: number
  name: string
  is_active: boolean
}

export interface BranchCreate {
  name: string
  address?: string | null
  phone?: string | null
  manager_id?: number | null
  work_start_time?: string | null
  is_active: boolean
}

export interface BranchUpdate {
  name?: string
  address?: string | null
  phone?: string | null
  manager_id?: number | null
  work_start_time?: string | null
  is_active?: boolean
}

// ─── Department ──────────────────────────────────────────────────────────────

export interface DepartmentOut {
  id: number
  name: string
  branch_id: number
  head_id: number | null
  is_active: boolean
  branch?: BranchShort
  employee_count?: number
}

export interface DepartmentShort {
  id: number
  name: string
  branch_id: number
  is_active: boolean
}

export interface DepartmentCreate {
  name: string
  branch_id: number
  head_id?: number | null
  is_active?: boolean
}

export interface DepartmentUpdate {
  name?: string | null
  branch_id?: number | null
  head_id?: number | null
  is_active?: boolean | null
}

// ─── Employee ────────────────────────────────────────────────────────────────

export interface EmployeeOut {
  id: number
  user_id: number
  full_name: string
  phone: string
  role: UserRole
  branch_id: number | null
  branch?: BranchShort
  department_id: number | null
  department?: DepartmentShort
  position: string | null
  employment_type: EmploymentType
  hire_date: string | null
  base_salary: string        // Decimal → string
  telegram_user_id: string | null
  photo: string | null
  is_active: boolean
}

export interface EmployeeDetail extends EmployeeOut {
  // extended fields if backend returns more
}

export interface EmployeeCreate {
  phone: string
  full_name: string
  password: string
  role: UserRole
  branch_id?: number | null
  department_id?: number | null
  position?: string | null
  employment_type?: EmploymentType
  hire_date?: string | null
  base_salary?: number
  telegram_user_id?: string | null
}

export interface EmployeeUpdate {
  full_name?: string | null
  role?: UserRole | null
  branch_id?: number | null
  department_id?: number | null
  position?: string | null
  employment_type?: EmploymentType | null
  hire_date?: string | null
  base_salary?: number | null
  telegram_user_id?: string | null
  photo?: string | null
  is_active?: boolean | null
}

// ─── Attendance ──────────────────────────────────────────────────────────────

export interface AttendanceOut {
  id: number
  employee_id: number
  employee?: EmployeeOut
  date: string
  check_in_time: string | null
  check_out_time: string | null
  status: AttendanceStatus
  source: AttendanceSource
  late_minutes: number
  notes: string | null
  created_at: string
}

export interface AttendanceCreate {
  employee_id: number
  date: string
  check_in_time?: string | null
  check_out_time?: string | null
  status: AttendanceStatus
  notes?: string | null
}

export interface AttendanceUpdate {
  check_in_time?: string | null
  check_out_time?: string | null
  status?: AttendanceStatus
  notes?: string | null
}

export interface AttendanceSummary {
  employee_id: number
  year: number
  month: number
  present: number
  absent: number
  late: number
  half_day: number
  total_late_minutes: number
}

// ─── Salary ──────────────────────────────────────────────────────────────────

export interface SalaryRecordOut {
  id: number
  employee_id: number
  employee?: EmployeeOut
  period_year: number
  period_month: number
  base_salary: number
  bonus_total: number
  deduction_total: number
  late_deduction: number
  net_salary: number
  status: SalaryStatus
  paid_at: string | null
  created_at: string
}

export interface SalaryRecordCreate {
  employee_id: number
  period_year: number
  period_month: number
}

export interface SalaryStatusUpdate {
  status: SalaryStatus
}

// ─── Bonus ───────────────────────────────────────────────────────────────────

export interface BonusOut {
  id: number
  employee_id: number
  employee?: EmployeeOut
  amount: number
  reason: string | null
  bonus_type: BonusType
  period_year: number
  period_month: number
  auto_generated: boolean
  created_at: string
}

export interface BonusCreate {
  employee_id: number
  amount: number
  reason?: string | null
  bonus_type?: BonusType
  period_year: number
  period_month: number
}

// ─── Deduction ───────────────────────────────────────────────────────────────

export interface DeductionOut {
  id: number
  employee_id: number
  employee?: EmployeeOut
  amount: number
  reason: string | null
  deduction_type: DeductionType
  period_year: number
  period_month: number
  auto_generated: boolean
  created_at: string
}

export interface DeductionCreate {
  employee_id: number
  amount: number
  reason?: string | null
  deduction_type?: DeductionType
  period_year: number
  period_month: number
}

// ─── KPI ─────────────────────────────────────────────────────────────────────

export interface KPIOut {
  id: number
  employee_id: number
  employee?: EmployeeOut
  metric_name: string
  target_value: number
  actual_value: number
  weight: number
  score: number
  period_year: number
  period_month: number
  created_at: string
}

export interface KPICreate {
  employee_id: number
  metric_name: string
  target_value: number
  actual_value?: number
  weight?: number
  period_year: number
  period_month: number
}

export interface KPIUpdate {
  actual_value?: number
  target_value?: number
  weight?: number
}

export interface KPISummary {
  employee_id: number
  year: number
  month: number
  total_score: number
  max_score: number
  percentage: number
}

export interface KPITemplateOut {
  id: number
  metric_name: string
  default_target: number
  default_weight: number
  description: string | null
}

export interface KPITemplateCreate {
  metric_name: string
  default_target: number
  default_weight?: number
  description?: string | null
}

export interface KPITemplateUpdate {
  metric_name?: string
  default_target?: number
  default_weight?: number
  description?: string | null
}

// ─── Leave ───────────────────────────────────────────────────────────────────

export interface LeaveOut {
  id: number
  employee_id: number
  employee?: EmployeeOut
  leave_type: LeaveType
  start_date: string
  end_date: string
  reason: string | null
  status: LeaveStatus
  approved_by: number | null
  created_at: string
}

export interface LeaveCreate {
  employee_id: number
  leave_type: LeaveType
  start_date: string
  end_date: string
  reason?: string | null
}

export interface LeaveStatusUpdate {
  status: 'approved' | 'rejected'
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export interface DashboardStats {
  today_present: number
  today_late: number
  today_absent: number
  monthly_salary_total: number
  total_employees: number
  active_employees: number
}

// ─── Paginated Responses ─────────────────────────────────────────────────────

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  size: number
  pages: number
}

export type PaginatedEmployees    = Paginated<EmployeeOut>
export type PaginatedBranches     = Paginated<BranchOut>
export type PaginatedDepartments  = Paginated<DepartmentOut>
export type PaginatedAttendance   = Paginated<AttendanceOut>
export type PaginatedSalaryRecords = Paginated<SalaryRecordOut>
export type PaginatedBonuses      = Paginated<BonusOut>
export type PaginatedDeductions   = Paginated<DeductionOut>
export type PaginatedKPI          = Paginated<KPIOut>
export type PaginatedLeaves       = Paginated<LeaveOut>

// ─── API Query Params ─────────────────────────────────────────────────────────

export interface PaginationParams {
  page?: number
  size?: number  // max 100
}

export interface EmployeeParams extends PaginationParams {
  search?: string
  branch_id?: number
  department_id?: number
  is_active?: boolean
}

export interface AttendanceParams extends PaginationParams {
  employee_id?: number
  date_from?: string
  date_to?: string
  status?: AttendanceStatus
  branch_id?: number
}

export interface SalaryParams extends PaginationParams {
  year?: number
  month?: number
  status?: SalaryStatus
  employee_id?: number
}

export interface BonusParams extends PaginationParams {
  employee_id?: number
  year?: number
  month?: number
  bonus_type?: BonusType
}

export interface DeductionParams extends PaginationParams {
  employee_id?: number
  year?: number
  month?: number
  deduction_type?: DeductionType
}

export interface KPIParams extends PaginationParams {
  employee_id?: number
  year?: number
  month?: number
}

export interface LeaveParams extends PaginationParams {
  employee_id?: number
  status?: LeaveStatus
  leave_type?: LeaveType
}