/**
 * Country rule sets for all supported regions.
 * All rates and thresholds are for 2025/2026.
 * Sources: Official government publications.
 */

export interface SeedRule {
  name: string
  type: 'EARNING' | 'DEDUCTION' | 'EMPLOYER_COST'
  formula: string
  applicableTo: string
  description?: string
  order: number
}

export interface SeedRuleSet {
  country: string
  name: string
  year: number
  isDefault: boolean
  isActive: boolean
  rules: SeedRule[]
}

export const COUNTRY_RULE_SETS: SeedRuleSet[] = [
  // ─── SAUDI ARABIA ────────────────────────────────────────────────────────────
  {
    country: 'SA',
    name: 'Saudi Arabia — GOSI & WPS 2025',
    year: 2025,
    isDefault: true,
    isActive: true,
    rules: [
      { name: 'Housing Allowance', type: 'EARNING', formula: 'basicSalary * 0.25', applicableTo: 'ALL', description: '25% of basic salary', order: 10 },
      { name: 'Transportation Allowance', type: 'EARNING', formula: '750', applicableTo: 'ALL', description: 'Fixed SAR 750/month', order: 20 },
      { name: 'Gross Salary', type: 'EARNING', formula: 'basicSalary + housing_allowance + transportation_allowance', applicableTo: 'ALL', order: 30 },
      { name: 'GOSI Employee (Saudi)', type: 'DEDUCTION', formula: 'basicSalary * 0.10', applicableTo: 'LOCAL', description: '10% of basic (annuity + occupational hazards)', order: 40 },
      { name: 'GOSI Employee (Expat)', type: 'DEDUCTION', formula: 'basicSalary * 0.02', applicableTo: 'EXPATRIATE', description: '2% occupational hazards only', order: 50 },
      { name: 'GOSI Employer (Saudi)', type: 'EMPLOYER_COST', formula: 'basicSalary * 0.12', applicableTo: 'LOCAL', description: '12% employer share', order: 60 },
      { name: 'GOSI Employer (Expat)', type: 'EMPLOYER_COST', formula: 'basicSalary * 0.02', applicableTo: 'EXPATRIATE', description: '2% employer share', order: 70 },
    ],
  },

  // ─── UAE ─────────────────────────────────────────────────────────────────────
  {
    country: 'AE',
    name: 'UAE — GPSSA & ESB 2025',
    year: 2025,
    isDefault: true,
    isActive: true,
    rules: [
      { name: 'Housing Allowance', type: 'EARNING', formula: 'basicSalary * 0.25', applicableTo: 'ALL', order: 10 },
      { name: 'Transportation Allowance', type: 'EARNING', formula: '1000', applicableTo: 'ALL', description: 'Fixed AED 1,000/month', order: 20 },
      { name: 'Gross Salary', type: 'EARNING', formula: 'basicSalary + housing_allowance + transportation_allowance', applicableTo: 'ALL', order: 30 },
      { name: 'GPSSA Employee (UAE National)', type: 'DEDUCTION', formula: 'basicSalary * 0.05', applicableTo: 'LOCAL', description: '5% pension contribution', order: 40 },
      { name: 'GPSSA Employer (UAE National)', type: 'EMPLOYER_COST', formula: 'basicSalary * 0.125', applicableTo: 'LOCAL', description: '12.5% pension contribution', order: 50 },
      { name: 'End of Service Benefit (Expat)', type: 'EMPLOYER_COST', formula: 'yearsOfService < 5 ? (basicSalary * 21 / 365 * 12) : (basicSalary * 30 / 365 * 12)', applicableTo: 'EXPATRIATE', description: 'Monthly ESB accrual', order: 60 },
    ],
  },

  // ─── KUWAIT ──────────────────────────────────────────────────────────────────
  {
    country: 'KW',
    name: 'Kuwait — PIFSS 2025',
    year: 2025,
    isDefault: true,
    isActive: true,
    rules: [
      { name: 'Social Allowance', type: 'EARNING', formula: '225', applicableTo: 'LOCAL', description: 'Fixed KWD 225/month for Kuwaiti nationals', order: 10 },
      { name: 'PIFSS Employee (Kuwaiti)', type: 'DEDUCTION', formula: 'basicSalary * 0.11', applicableTo: 'LOCAL', description: '11% pension', order: 20 },
      { name: 'PIFSS Employer (Kuwaiti)', type: 'EMPLOYER_COST', formula: 'basicSalary * 0.135', applicableTo: 'LOCAL', description: '13.5% employer share', order: 30 },
      { name: 'NLST (National Labour Support Tax)', type: 'EMPLOYER_COST', formula: 'basicSalary * 0.025', applicableTo: 'ALL', description: '2.5% of wages', order: 40 },
    ],
  },

  // ─── BAHRAIN ─────────────────────────────────────────────────────────────────
  {
    country: 'BH',
    name: 'Bahrain — SIO 2025',
    year: 2025,
    isDefault: true,
    isActive: true,
    rules: [
      { name: 'SIO Employee', type: 'DEDUCTION', formula: 'basicSalary * 0.07', applicableTo: 'LOCAL', description: '7% pension', order: 10 },
      { name: 'SIO Employer', type: 'EMPLOYER_COST', formula: 'basicSalary * 0.12', applicableTo: 'LOCAL', description: '12% employer share', order: 20 },
      { name: 'SIO Expat Employer', type: 'EMPLOYER_COST', formula: 'basicSalary * 0.03', applicableTo: 'EXPATRIATE', description: '3% expat social insurance', order: 30 },
    ],
  },

  // ─── QATAR ───────────────────────────────────────────────────────────────────
  {
    country: 'QA',
    name: 'Qatar — GRA 2025',
    year: 2025,
    isDefault: true,
    isActive: true,
    rules: [
      { name: 'Social Housing Allowance', type: 'EARNING', formula: '1500', applicableTo: 'EXPATRIATE', description: 'Fixed QAR 1,500/month (expat)', order: 10 },
      { name: 'GRSIA Employee (Qatari)', type: 'DEDUCTION', formula: 'basicSalary * 0.07', applicableTo: 'LOCAL', description: '7% pension', order: 20 },
      { name: 'GRSIA Employer (Qatari)', type: 'EMPLOYER_COST', formula: 'basicSalary * 0.10', applicableTo: 'LOCAL', description: '10% employer', order: 30 },
      { name: 'End of Service (Expat)', type: 'EMPLOYER_COST', formula: 'basicSalary * 21 / 365 * 12', applicableTo: 'EXPATRIATE', description: 'Monthly ESB accrual', order: 40 },
    ],
  },

  // ─── OMAN ─────────────────────────────────────────────────────────────────────
  {
    country: 'OM',
    name: 'Oman — PASI 2025',
    year: 2025,
    isDefault: true,
    isActive: true,
    rules: [
      { name: 'PASI Employee (Omani)', type: 'DEDUCTION', formula: 'basicSalary * 0.065', applicableTo: 'LOCAL', description: '6.5% pension', order: 10 },
      { name: 'PASI Employer (Omani)', type: 'EMPLOYER_COST', formula: 'basicSalary * 0.115', applicableTo: 'LOCAL', description: '11.5% employer', order: 20 },
      { name: 'Expat End of Service', type: 'EMPLOYER_COST', formula: 'basicSalary * 15 / 365 * 12', applicableTo: 'EXPATRIATE', description: 'Monthly accrual (15 days/year)', order: 30 },
    ],
  },

  // ─── INDIA ────────────────────────────────────────────────────────────────────
  {
    country: 'IN',
    name: 'India — PF, ESIC & Income Tax 2025',
    year: 2025,
    isDefault: true,
    isActive: true,
    rules: [
      { name: 'HRA', type: 'EARNING', formula: 'basicSalary * 0.40', applicableTo: 'ALL', description: '40% of basic', order: 10 },
      { name: 'Special Allowance', type: 'EARNING', formula: 'basicSalary * 0.20', applicableTo: 'ALL', order: 20 },
      { name: 'Gross Salary', type: 'EARNING', formula: 'basicSalary + hra + special_allowance', applicableTo: 'ALL', order: 30 },
      { name: 'PF Employee', type: 'DEDUCTION', formula: 'min(basicSalary, 15000) * 0.12', applicableTo: 'ALL', description: '12% up to INR 15,000 ceiling', order: 40 },
      { name: 'ESIC Employee', type: 'DEDUCTION', formula: 'gross_salary <= 21000 ? gross_salary * 0.0075 : 0', applicableTo: 'ALL', description: '0.75% if gross ≤ 21,000', order: 50 },
      { name: 'Professional Tax', type: 'DEDUCTION', formula: 'gross_salary > 20000 ? 200 : (gross_salary > 15000 ? 150 : 0)', applicableTo: 'ALL', description: 'Karnataka slab (customize per state)', order: 60 },
      { name: 'Income Tax (New Regime)', type: 'DEDUCTION', formula: 'max(0, (gross_salary * 12 - 300000) * 0.05 / 12)', applicableTo: 'ALL', description: 'Simplified monthly TDS — use tax bracket table for exact', order: 70 },
      { name: 'PF Employer', type: 'EMPLOYER_COST', formula: 'min(basicSalary, 15000) * 0.12', applicableTo: 'ALL', order: 80 },
      { name: 'ESIC Employer', type: 'EMPLOYER_COST', formula: 'gross_salary <= 21000 ? gross_salary * 0.0325 : 0', applicableTo: 'ALL', description: '3.25% if gross ≤ 21,000', order: 90 },
    ],
  },

  // ─── PHILIPPINES ─────────────────────────────────────────────────────────────
  {
    country: 'PH',
    name: 'Philippines — SSS, PhilHealth & Pag-IBIG 2025',
    year: 2025,
    isDefault: true,
    isActive: true,
    rules: [
      { name: 'SSS Employee', type: 'DEDUCTION', formula: 'min(basicSalary * 0.045, 900)', applicableTo: 'ALL', description: '4.5% of MSC, max PHP 900', order: 10 },
      { name: 'PhilHealth Employee', type: 'DEDUCTION', formula: 'min(basicSalary * 0.02, 800)', applicableTo: 'ALL', description: '2%, max PHP 800', order: 20 },
      { name: 'Pag-IBIG Employee', type: 'DEDUCTION', formula: 'basicSalary > 1500 ? 100 : basicSalary * 0.02', applicableTo: 'ALL', description: 'PHP 100 max or 2%', order: 30 },
      { name: 'Withholding Tax', type: 'DEDUCTION', formula: 'max(0, basicSalary - 20833) * 0.15', applicableTo: 'ALL', description: '15% bracket above exemption (simplified)', order: 40 },
      { name: 'SSS Employer', type: 'EMPLOYER_COST', formula: 'min(basicSalary * 0.095, 1900)', applicableTo: 'ALL', order: 50 },
      { name: 'PhilHealth Employer', type: 'EMPLOYER_COST', formula: 'min(basicSalary * 0.02, 800)', applicableTo: 'ALL', order: 60 },
    ],
  },

  // ─── SINGAPORE ───────────────────────────────────────────────────────────────
  {
    country: 'SG',
    name: 'Singapore — CPF 2025',
    year: 2025,
    isDefault: true,
    isActive: true,
    rules: [
      { name: 'CPF Employee (age ≤ 55)', type: 'DEDUCTION', formula: 'min(basicSalary, 6800) * 0.20', applicableTo: 'LOCAL', description: '20% of OW up to SGD 6,800', order: 10 },
      { name: 'CPF Employer (age ≤ 55)', type: 'EMPLOYER_COST', formula: 'min(basicSalary, 6800) * 0.17', applicableTo: 'LOCAL', description: '17% employer', order: 20 },
    ],
  },

  // ─── MALAYSIA ─────────────────────────────────────────────────────────────────
  {
    country: 'MY',
    name: 'Malaysia — EPF, SOCSO & EIS 2025',
    year: 2025,
    isDefault: true,
    isActive: true,
    rules: [
      { name: 'EPF Employee', type: 'DEDUCTION', formula: 'basicSalary * 0.11', applicableTo: 'ALL', description: '11% for employees', order: 10 },
      { name: 'SOCSO Employee', type: 'DEDUCTION', formula: 'min(basicSalary * 0.005, 9.75)', applicableTo: 'ALL', description: '0.5%, max MYR 9.75', order: 20 },
      { name: 'EIS Employee', type: 'DEDUCTION', formula: 'min(basicSalary * 0.002, 3.90)', applicableTo: 'ALL', description: '0.2%, max MYR 3.90', order: 30 },
      { name: 'EPF Employer', type: 'EMPLOYER_COST', formula: 'basicSalary * 0.13', applicableTo: 'ALL', description: '13% employer', order: 40 },
      { name: 'SOCSO Employer', type: 'EMPLOYER_COST', formula: 'min(basicSalary * 0.0175, 34.10)', applicableTo: 'ALL', order: 50 },
    ],
  },

  // ─── INDONESIA ────────────────────────────────────────────────────────────────
  {
    country: 'ID',
    name: 'Indonesia — BPJS Ketenagakerjaan 2025',
    year: 2025,
    isDefault: true,
    isActive: true,
    rules: [
      { name: 'JHT Employee', type: 'DEDUCTION', formula: 'basicSalary * 0.02', applicableTo: 'ALL', description: '2% provident fund', order: 10 },
      { name: 'JP Employee', type: 'DEDUCTION', formula: 'basicSalary * 0.01', applicableTo: 'ALL', description: '1% pension', order: 20 },
      { name: 'JHT Employer', type: 'EMPLOYER_COST', formula: 'basicSalary * 0.037', applicableTo: 'ALL', order: 30 },
      { name: 'JP Employer', type: 'EMPLOYER_COST', formula: 'basicSalary * 0.02', applicableTo: 'ALL', order: 40 },
      { name: 'JKK Employer', type: 'EMPLOYER_COST', formula: 'basicSalary * 0.0024', applicableTo: 'ALL', description: '0.24% work accident', order: 50 },
      { name: 'JKM Employer', type: 'EMPLOYER_COST', formula: 'basicSalary * 0.003', applicableTo: 'ALL', description: '0.3% death benefit', order: 60 },
    ],
  },

  // ─── EGYPT ────────────────────────────────────────────────────────────────────
  {
    country: 'EG',
    name: 'Egypt — Social Insurance 2025',
    year: 2025,
    isDefault: true,
    isActive: true,
    rules: [
      { name: 'Social Insurance Employee', type: 'DEDUCTION', formula: 'min(basicSalary, 11200) * 0.11', applicableTo: 'ALL', description: '11% on variable variable wages, ceiling EGP 11,200', order: 10 },
      { name: 'Social Insurance Employer', type: 'EMPLOYER_COST', formula: 'min(basicSalary, 11200) * 0.18', applicableTo: 'ALL', description: '18% employer share', order: 20 },
      { name: 'Income Tax', type: 'DEDUCTION', formula: 'max(0, basicSalary * 12 - 15000) > 0 ? max(0, (basicSalary * 12 - 15000) * 0.10 / 12) : 0', applicableTo: 'ALL', description: 'Simplified monthly TDS', order: 30 },
    ],
  },

  // ─── MOROCCO ──────────────────────────────────────────────────────────────────
  {
    country: 'MA',
    name: 'Morocco — CNSS & IR 2025',
    year: 2025,
    isDefault: true,
    isActive: true,
    rules: [
      { name: 'CNSS Employee', type: 'DEDUCTION', formula: 'min(basicSalary, 6000) * 0.0448', applicableTo: 'ALL', description: '4.48% on salary up to MAD 6,000', order: 10 },
      { name: 'AMO Employee', type: 'DEDUCTION', formula: 'basicSalary * 0.0226', applicableTo: 'ALL', description: '2.26% health insurance', order: 20 },
      { name: 'Income Tax (IR)', type: 'DEDUCTION', formula: 'max(0, (basicSalary * 12 - 30000) * 0.10 / 12)', applicableTo: 'ALL', description: 'Simplified monthly IR', order: 30 },
      { name: 'CNSS Employer', type: 'EMPLOYER_COST', formula: 'min(basicSalary, 6000) * 0.0790', applicableTo: 'ALL', order: 40 },
      { name: 'AMO Employer', type: 'EMPLOYER_COST', formula: 'basicSalary * 0.0190', applicableTo: 'ALL', order: 50 },
    ],
  },

  // ─── TUNISIA ──────────────────────────────────────────────────────────────────
  {
    country: 'TN',
    name: 'Tunisia — CNSS 2025',
    year: 2025,
    isDefault: true,
    isActive: true,
    rules: [
      { name: 'CNSS Employee', type: 'DEDUCTION', formula: 'basicSalary * 0.0918', applicableTo: 'ALL', description: '9.18%', order: 10 },
      { name: 'CNSS Employer', type: 'EMPLOYER_COST', formula: 'basicSalary * 0.165', applicableTo: 'ALL', description: '16.5%', order: 20 },
    ],
  },

  // ─── LIBYA ────────────────────────────────────────────────────────────────────
  {
    country: 'LY',
    name: 'Libya — Social Security 2025',
    year: 2025,
    isDefault: true,
    isActive: true,
    rules: [
      { name: 'Social Security Employee', type: 'DEDUCTION', formula: 'basicSalary * 0.035', applicableTo: 'ALL', description: '3.5%', order: 10 },
      { name: 'Social Security Employer', type: 'EMPLOYER_COST', formula: 'basicSalary * 0.115', applicableTo: 'ALL', description: '11.5%', order: 20 },
    ],
  },

  // ─── ITALY ────────────────────────────────────────────────────────────────────
  {
    country: 'IT',
    name: 'Italy — INPS & IRPEF 2025',
    year: 2025,
    isDefault: true,
    isActive: true,
    rules: [
      { name: 'INPS Employee', type: 'DEDUCTION', formula: 'basicSalary * 0.0919', applicableTo: 'ALL', description: '9.19% pension', order: 10 },
      { name: 'IRPEF (Income Tax)', type: 'DEDUCTION', formula: 'basicSalary > 2778 ? (basicSalary - 2778) * 0.43 : (basicSalary > 1389 ? (basicSalary - 1389) * 0.35 : basicSalary * 0.23)', applicableTo: 'ALL', description: 'Monthly IRPEF 23/35/43% brackets', order: 20 },
      { name: 'INPS Employer', type: 'EMPLOYER_COST', formula: 'basicSalary * 0.230', applicableTo: 'ALL', description: '23% employer social contributions', order: 30 },
      { name: 'TFR Accrual', type: 'EMPLOYER_COST', formula: '(basicSalary * 13) / 12 / 13.5', applicableTo: 'ALL', description: 'Monthly TFR (severance) accrual', order: 40 },
    ],
  },

  // ─── JAPAN ────────────────────────────────────────────────────────────────────
  {
    country: 'JP',
    name: 'Japan — Health, Pension & Employment 2025',
    year: 2025,
    isDefault: true,
    isActive: true,
    rules: [
      { name: 'Health Insurance Employee', type: 'DEDUCTION', formula: 'basicSalary * 0.05', applicableTo: 'ALL', description: '~5% (Tokyo rate)', order: 10 },
      { name: 'Pension Employee', type: 'DEDUCTION', formula: 'basicSalary * 0.09150', applicableTo: 'ALL', description: '9.15% of standard remuneration', order: 20 },
      { name: 'Employment Insurance Employee', type: 'DEDUCTION', formula: 'basicSalary * 0.006', applicableTo: 'ALL', description: '0.6%', order: 30 },
      { name: 'Health Insurance Employer', type: 'EMPLOYER_COST', formula: 'basicSalary * 0.05', applicableTo: 'ALL', order: 40 },
      { name: 'Pension Employer', type: 'EMPLOYER_COST', formula: 'basicSalary * 0.09150', applicableTo: 'ALL', order: 50 },
      { name: 'Employment Insurance Employer', type: 'EMPLOYER_COST', formula: 'basicSalary * 0.0095', applicableTo: 'ALL', order: 60 },
    ],
  },
]
