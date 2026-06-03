# FJ Analytics SaaS - User Guide

## Overview

FJ Analytics is a Business Intelligence platform designed for veterinary clinics and medical practices. It provides comprehensive analytics on commissions, production, costs, and operational insights.

## Getting Started

### First Login

1. Navigate to your FJ Analytics URL
2. Enter your username and password
3. Click "Access System"

**Default admin credentials:** `admin` / `Admin123!ChangeMe`

> ⚠️ **Important:** Change the default admin password immediately after first login!

## User Roles

### Admin
- Full access to all features
- Can upload data files
- Can manage users
- Can view access logs
- Can configure the system

### Viewer
- Can view all analytics dashboards
- Cannot upload files
- Cannot manage users
- Cannot view logs

## Dashboard Modules

### 1. LaborBI 🏥

Access commission management, veterinary production, and clinical analysis.

**Tabs:**
- **FJ Analytics 2026**: Overview with KPIs and charts
- **Ranking**: Production rankings by veterinarian
- **Medical Clinic**: Clinic consultations and procedures
- **Hospitalization**: Hospitalization procedures
- **Surgical Unit**: Surgical procedures
- **Laboratory**: Lab tests and exams

**Filters:**
- By Veterinarian
- By Month
- By Week

**KPIs displayed:**
- Total Production
- Total Value (Fixed + Variable)
- Commission percentage
- Hours worked

### 2. CogsBI 📊

Cost management and financial intelligence analysis.

**Features:**
- Gross profit calculation
- Contribution margin
- Operational costs breakdown
- Cost composition charts
- Supplier analysis

### 3. InsightsAI 🧠

AI-powered executive analysis with strategic recommendations.

**Provides:**
- Financial health diagnosis
- Team behavior analysis
- Top cost drivers identification
- Strategic action plans
- Risk assessments

### 4. AdminCenter ⚙️

System administration panel (admin users only).

**Sections:**

#### Upload Data
Upload Excel files with your clinic data:

1. **Base Data**: Main production data file (Planilha_sem_titulo.xlsx)
   - Contains: Veterinarians, production values, hours

2. **Analysis File**: Clinical analysis data (Analises_Balneario.xlsx)
   - Tabs: INTER, C. CIRURGICO, CLINICA, LAB

3. **Operational Costs**: Cost data (Custos_Balneario.xlsx)
   - Contains: Expenses, suppliers, categories

#### Users
- View all system users
- Add new users
- Edit user passwords
- Remove users (non-admin only)

#### Access Logs
- View recent login attempts
- Audit user activity
- Track failed login attempts

## Data File Templates

### Base Data (Planilha_sem_titulo.xlsx)

Required columns:
- **Veterinarios**: Veterinarian name (e.g., "joao.silva")
- **Producao**: Production value
- **Valores Fixos**: Fixed payment value
- **Semana**: Week identifier
- **Data**: Date
- **Horas Normais**: Normal hours worked
- **Horas Noturnas**: Night hours worked

### Analysis File (Analises_Balneario.xlsx)

Each tab (INTER, CLINICA, C.CIRURGICO, LAB):
- **Data**: Date
- **Procedimento**: Procedure name
- **Veterinario**: Veterinarian
- **Paciente**: Patient
- **Valor Lancado**: Posted value
- **Valor Tabela**: Table value

### Operational Costs (Custos_Balneario.xlsx)

Required columns:
- **Data**: Date
- **Categoria**: Category (e.g., "Veterinarios", "Fornecedores")
- **Fornecedor/Item**: Supplier or item name
- **Valor**: Cost value

## Filtering Data

### Basic Filters

Use the dropdown filters to narrow down data:
1. Select filter criteria
2. Data updates automatically
3. Charts and tables reflect filtered data

### Best Practices

- Start with "All" filters to see complete picture
- Filter by month to compare periods
- Filter by veterinarian to identify top performers

## Tips and Tricks

### Commission Calculation

The system automatically calculates commissions based on:

| Production Range | Commission Rate |
|-----------------|----------------|
| Below R$35,000 | 0% |
| R$35,000 - R$40,999 | 3% |
| R$41,000 - R$50,999 | 5% |
| R$51,000 - R$60,999 | 7% |
| Above R$61,000 | 10% |

### Hour Calculation

**Normal Hours:**
- R$26.22/hour (up to 180h/month)
- R$23.60/hour (181-200h/month)

**Night Hours:**
- R$37.79/hour (shifts starting at 8PM or ending before 9AM)

### Exporting Data

To export data:
1. Use browser's print function (Ctrl+P)
2. Select "Save as PDF"
3. Or take screenshots of specific charts

## Security Best Practices

1. **Change default password** immediately
2. **Use strong passwords** (min 8 chars, mixed case, numbers)
3. **Don't share accounts** - each user should have their own
4. **Report suspicious activity** to admin
5. **Log out** when leaving computer
6. **Review access logs** regularly (for admins)

## Troubleshooting

### Data Not Showing

1. Check if files were uploaded successfully
2. Verify file formats match templates
3. Clear browser cache and reload
4. Contact admin if issue persists

### Can't Upload Files

1. Ensure you have admin role
2. Check file size (max 50MB)
3. Verify Excel format (.xlsx or .xls)
4. Ensure correct tabs exist in analysis file

### Login Issues

1. Check username/password
2. Clear browser cache
3. Try incognito/private window
4. Contact admin to reset password

### Charts Not Loading

1. Wait for data to load
2. Check filter selections
3. Ensure filters include valid data
4. Try refreshing page

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Login (on password field) | Enter |
| Logout | Click "Exit" button |
| Back to Hub | Click "Hub" button |

## Need Help?

### Contact Support
- Email: support@yourcompany.com
- Internal: Contact your system administrator

### Common Issues
- Slow performance: Close unused tabs
- Missing data: Check upload status
- Access denied: Contact admin for permissions

---

**Version:** 1.0.0  
**Last Updated:** June 2026  
**© 2026 FJ Analytics** - All rights reserved
