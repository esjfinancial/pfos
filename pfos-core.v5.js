"use strict";
var PFOSEngine = (() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/engine/index.ts
  var index_exports = {};
  __export(index_exports, {
    ENGINE_VERSION: () => ENGINE_VERSION,
    calculators: () => calculators_exports,
    computeCalcs: () => computeCalcs,
    constants: () => constants_exports,
    engineReady: () => engineReady,
    expense: () => expense_exports,
    ibc: () => ibc_exports,
    ibcCascade: () => ibc_cascade_exports,
    income: () => income_exports,
    tax: () => tax_exports,
    util: () => util_exports
  });

  // src/engine/constants.ts
  var constants_exports = {};
  __export(constants_exports, {
    DEBT_TYPES: () => DEBT_TYPES,
    INFLATION_DEFAULTS: () => INFLATION_DEFAULTS,
    INV_TYPES: () => INV_TYPES,
    L1_CATS: () => L1_CATS,
    L2_CATS: () => L2_CATS,
    PAYROLL_DEDUCTED_SET: () => PAYROLL_DEDUCTED_SET,
    PAYROLL_DEDUCTED_TYPES: () => PAYROLL_DEDUCTED_TYPES,
    POLICY_TYPES: () => POLICY_TYPES,
    RET_TYPES: () => RET_TYPES,
    STATE_TAX_BRACKETS_2026: () => STATE_TAX_BRACKETS_2026
  });

  // src/engine/constants.generated.ts
  var INFLATION_DEFAULTS = {
    rent: 0.04,
    // 4%  — BLS rent of primary residence
    homeowner_insurance: 0.07,
    // 7%  — NAIC homeowner premium trends
    property_tax: 0.035,
    // 3.5% — Census/ATTOM avg assessment growth
    car_insurance: 0.06,
    // 6%  — III auto premium trend
    health_insurance: 0.055,
    // 5.5% — KFF employer premium survey
    utilities: 0.03,
    // 3%  — EIA residential electricity
    food: 0.035,
    // 3.5% — BLS food-at-home CPI
    education: 0.05,
    // 5%  — College Board tuition trend
    childcare: 0.04,
    // 4%  — Care.com annual survey
    hoa: 0.03,
    // 3%  — general CPI baseline
    maintenance: 0.03,
    // 3%  — general CPI baseline
    general: 0.03
    // 3%  — CPI-U all items baseline
  };
  var L1_CATS = [
    { key: "housing", label: "Housing", sub: "Rent / Mortgage / HOA / Homeowners Insurance", icon: "\u{1F3E0}" },
    { key: "utilities", label: "Utilities", sub: "Electric, Gas, Water, Internet, Phone", icon: "\u26A1" },
    { key: "food", label: "Food", sub: "Groceries + Dining Out", icon: "\u{1F37D}\uFE0F" },
    { key: "transportation", label: "Transportation", sub: "Car payment, gas, insurance, transit", icon: "\u{1F697}" },
    { key: "insurance", label: "Health Insurance", sub: "Health, Dental, Vision", icon: "\u{1F6E1}\uFE0F" },
    { key: "subscriptions", label: "Subscriptions", sub: "Streaming, memberships, recurring", icon: "\u{1F4F1}" },
    { key: "discretionary", label: "Discretionary", sub: "Entertainment, clothing, personal", icon: "\u{1F6CD}\uFE0F" },
    { key: "misc", label: "Miscellaneous", sub: "Everything else", icon: "\u{1F4E6}" }
  ];
  var L2_CATS = {
    housing: ["Rent / Mortgage", "HOA Fees", "Property Tax", "Homeowners Insurance", "Maintenance / Repairs"],
    utilities: ["Electric", "Gas / Heating", "Water / Sewer", "Internet", "Cell Phone", "Cable / Satellite"],
    food: ["Groceries", "Dining Out", "Coffee / Snacks", "Delivery Apps"],
    transportation: ["Car Payment", "Auto Insurance", "Gas / Fuel", "Parking / Tolls", "Rideshare / Uber"],
    insurance: ["Health Insurance", "Dental", "Vision"],
    subscriptions: ["Streaming Services", "Software / Apps", "Gym / Fitness", "Magazines / News", "Other Memberships"]
  };
  var DEBT_TYPES = ["Credit Card", "Student Loan", "Auto Loan", "Personal Loan", "Mortgage", "Medical Debt", "HELOC", "Other"];
  var STATE_TAX_BRACKETS_2026 = {
    AL: {
      // Alabama
      single: [{ min: 0, max: 500, rate: 0.02 }, { min: 500, max: 3e3, rate: 0.04 }, { min: 3e3, max: Infinity, rate: 0.05 }],
      married_joint: [{ min: 0, max: 1e3, rate: 0.02 }, { min: 1e3, max: 6e3, rate: 0.04 }, { min: 6e3, max: Infinity, rate: 0.05 }],
      married_separate: [{ min: 0, max: 500, rate: 0.02 }, { min: 500, max: 3e3, rate: 0.04 }, { min: 3e3, max: Infinity, rate: 0.05 }],
      hoh: [{ min: 0, max: 500, rate: 0.02 }, { min: 500, max: 3e3, rate: 0.04 }, { min: 3e3, max: Infinity, rate: 0.05 }]
    },
    AZ: {
      // Arizona — flat
      single: [{ min: 0, max: Infinity, rate: 0.025 }],
      married_joint: [{ min: 0, max: Infinity, rate: 0.025 }],
      married_separate: [{ min: 0, max: Infinity, rate: 0.025 }],
      hoh: [{ min: 0, max: Infinity, rate: 0.025 }]
    },
    AR: {
      // Arkansas (income > $92,300; below uses different schedule, simplified to top-tier here)
      single: [{ min: 0, max: 4600, rate: 0.02 }, { min: 4600, max: Infinity, rate: 0.039 }],
      married_joint: [{ min: 0, max: 4600, rate: 0.02 }, { min: 4600, max: Infinity, rate: 0.039 }],
      married_separate: [{ min: 0, max: 4600, rate: 0.02 }, { min: 4600, max: Infinity, rate: 0.039 }],
      hoh: [{ min: 0, max: 4600, rate: 0.02 }, { min: 4600, max: Infinity, rate: 0.039 }]
    },
    CA: {
      // California (excludes 1% mental health surtax >$1M and excludes 1.3% SDI payroll tax)
      single: [{ min: 0, max: 11079, rate: 0.01 }, { min: 11079, max: 26264, rate: 0.02 }, { min: 26264, max: 41452, rate: 0.04 }, { min: 41452, max: 57542, rate: 0.06 }, { min: 57542, max: 72724, rate: 0.08 }, { min: 72724, max: 371479, rate: 0.093 }, { min: 371479, max: 445771, rate: 0.103 }, { min: 445771, max: 742953, rate: 0.113 }, { min: 742953, max: 1e6, rate: 0.123 }, { min: 1e6, max: Infinity, rate: 0.133 }],
      married_joint: [{ min: 0, max: 22158, rate: 0.01 }, { min: 22158, max: 52528, rate: 0.02 }, { min: 52528, max: 82904, rate: 0.04 }, { min: 82904, max: 115084, rate: 0.06 }, { min: 115084, max: 145448, rate: 0.08 }, { min: 145448, max: 742958, rate: 0.093 }, { min: 742958, max: 891542, rate: 0.103 }, { min: 891542, max: 1e6, rate: 0.113 }, { min: 1e6, max: 1485906, rate: 0.123 }, { min: 1485906, max: Infinity, rate: 0.133 }],
      married_separate: [{ min: 0, max: 11079, rate: 0.01 }, { min: 11079, max: 26264, rate: 0.02 }, { min: 26264, max: 41452, rate: 0.04 }, { min: 41452, max: 57542, rate: 0.06 }, { min: 57542, max: 72724, rate: 0.08 }, { min: 72724, max: 371479, rate: 0.093 }, { min: 371479, max: 445771, rate: 0.103 }, { min: 445771, max: 742953, rate: 0.113 }, { min: 742953, max: 1e6, rate: 0.123 }, { min: 1e6, max: Infinity, rate: 0.133 }],
      hoh: [{ min: 0, max: 22192, rate: 0.01 }, { min: 22192, max: 52606, rate: 0.02 }, { min: 52606, max: 67804, rate: 0.04 }, { min: 67804, max: 83878, rate: 0.06 }, { min: 83878, max: 99063, rate: 0.08 }, { min: 99063, max: 505999, rate: 0.093 }, { min: 505999, max: 607052, rate: 0.103 }, { min: 607052, max: 1011581, rate: 0.113 }, { min: 1011581, max: Infinity, rate: 0.123 }]
    },
    CO: {
      // Colorado — flat
      single: [{ min: 0, max: Infinity, rate: 0.044 }],
      married_joint: [{ min: 0, max: Infinity, rate: 0.044 }],
      married_separate: [{ min: 0, max: Infinity, rate: 0.044 }],
      hoh: [{ min: 0, max: Infinity, rate: 0.044 }]
    },
    CT: {
      // Connecticut — has tax-benefit recapture for high income; not modeled here (small <1% effect)
      single: [{ min: 0, max: 1e4, rate: 0.02 }, { min: 1e4, max: 5e4, rate: 0.045 }, { min: 5e4, max: 1e5, rate: 0.055 }, { min: 1e5, max: 2e5, rate: 0.06 }, { min: 2e5, max: 25e4, rate: 0.065 }, { min: 25e4, max: 5e5, rate: 0.069 }, { min: 5e5, max: Infinity, rate: 0.0699 }],
      married_joint: [{ min: 0, max: 2e4, rate: 0.02 }, { min: 2e4, max: 1e5, rate: 0.045 }, { min: 1e5, max: 2e5, rate: 0.055 }, { min: 2e5, max: 4e5, rate: 0.06 }, { min: 4e5, max: 5e5, rate: 0.065 }, { min: 5e5, max: 1e6, rate: 0.069 }, { min: 1e6, max: Infinity, rate: 0.0699 }],
      married_separate: [{ min: 0, max: 1e4, rate: 0.02 }, { min: 1e4, max: 5e4, rate: 0.045 }, { min: 5e4, max: 1e5, rate: 0.055 }, { min: 1e5, max: 2e5, rate: 0.06 }, { min: 2e5, max: 25e4, rate: 0.065 }, { min: 25e4, max: 5e5, rate: 0.069 }, { min: 5e5, max: Infinity, rate: 0.0699 }],
      hoh: [{ min: 0, max: 16e3, rate: 0.02 }, { min: 16e3, max: 8e4, rate: 0.045 }, { min: 8e4, max: 16e4, rate: 0.055 }, { min: 16e4, max: 32e4, rate: 0.06 }, { min: 32e4, max: 4e5, rate: 0.065 }, { min: 4e5, max: 8e5, rate: 0.069 }, { min: 8e5, max: Infinity, rate: 0.0699 }]
    },
    DE: {
      // Delaware (first $2K exempt)
      single: [{ min: 0, max: 2e3, rate: 0 }, { min: 2e3, max: 5e3, rate: 0.022 }, { min: 5e3, max: 1e4, rate: 0.039 }, { min: 1e4, max: 2e4, rate: 0.048 }, { min: 2e4, max: 25e3, rate: 0.052 }, { min: 25e3, max: 6e4, rate: 0.0555 }, { min: 6e4, max: Infinity, rate: 0.066 }],
      married_joint: [{ min: 0, max: 2e3, rate: 0 }, { min: 2e3, max: 5e3, rate: 0.022 }, { min: 5e3, max: 1e4, rate: 0.039 }, { min: 1e4, max: 2e4, rate: 0.048 }, { min: 2e4, max: 25e3, rate: 0.052 }, { min: 25e3, max: 6e4, rate: 0.0555 }, { min: 6e4, max: Infinity, rate: 0.066 }],
      married_separate: [{ min: 0, max: 2e3, rate: 0 }, { min: 2e3, max: 5e3, rate: 0.022 }, { min: 5e3, max: 1e4, rate: 0.039 }, { min: 1e4, max: 2e4, rate: 0.048 }, { min: 2e4, max: 25e3, rate: 0.052 }, { min: 25e3, max: 6e4, rate: 0.0555 }, { min: 6e4, max: Infinity, rate: 0.066 }],
      hoh: [{ min: 0, max: 2e3, rate: 0 }, { min: 2e3, max: 5e3, rate: 0.022 }, { min: 5e3, max: 1e4, rate: 0.039 }, { min: 1e4, max: 2e4, rate: 0.048 }, { min: 2e4, max: 25e3, rate: 0.052 }, { min: 25e3, max: 6e4, rate: 0.0555 }, { min: 6e4, max: Infinity, rate: 0.066 }]
    },
    GA: {
      // Georgia — flat 5.19% (effective 7/1/2025)
      single: [{ min: 0, max: Infinity, rate: 0.0519 }],
      married_joint: [{ min: 0, max: Infinity, rate: 0.0519 }],
      married_separate: [{ min: 0, max: Infinity, rate: 0.0519 }],
      hoh: [{ min: 0, max: Infinity, rate: 0.0519 }]
    },
    HI: {
      // Hawaii (12 brackets)
      single: [{ min: 0, max: 9600, rate: 0.014 }, { min: 9600, max: 14400, rate: 0.032 }, { min: 14400, max: 19200, rate: 0.055 }, { min: 19200, max: 24e3, rate: 0.064 }, { min: 24e3, max: 36e3, rate: 0.068 }, { min: 36e3, max: 48e3, rate: 0.072 }, { min: 48e3, max: 125e3, rate: 0.076 }, { min: 125e3, max: 175e3, rate: 0.079 }, { min: 175e3, max: 225e3, rate: 0.0825 }, { min: 225e3, max: 275e3, rate: 0.09 }, { min: 275e3, max: 325e3, rate: 0.1 }, { min: 325e3, max: Infinity, rate: 0.11 }],
      married_joint: [{ min: 0, max: 19200, rate: 0.014 }, { min: 19200, max: 28800, rate: 0.032 }, { min: 28800, max: 38400, rate: 0.055 }, { min: 38400, max: 48e3, rate: 0.064 }, { min: 48e3, max: 72e3, rate: 0.068 }, { min: 72e3, max: 96e3, rate: 0.072 }, { min: 96e3, max: 25e4, rate: 0.076 }, { min: 25e4, max: 35e4, rate: 0.079 }, { min: 35e4, max: 45e4, rate: 0.0825 }, { min: 45e4, max: 55e4, rate: 0.09 }, { min: 55e4, max: 65e4, rate: 0.1 }, { min: 65e4, max: Infinity, rate: 0.11 }],
      married_separate: [{ min: 0, max: 9600, rate: 0.014 }, { min: 9600, max: 14400, rate: 0.032 }, { min: 14400, max: 19200, rate: 0.055 }, { min: 19200, max: 24e3, rate: 0.064 }, { min: 24e3, max: 36e3, rate: 0.068 }, { min: 36e3, max: 48e3, rate: 0.072 }, { min: 48e3, max: 125e3, rate: 0.076 }, { min: 125e3, max: 175e3, rate: 0.079 }, { min: 175e3, max: 225e3, rate: 0.0825 }, { min: 225e3, max: 275e3, rate: 0.09 }, { min: 275e3, max: 325e3, rate: 0.1 }, { min: 325e3, max: Infinity, rate: 0.11 }],
      hoh: [{ min: 0, max: 14400, rate: 0.014 }, { min: 14400, max: 21600, rate: 0.032 }, { min: 21600, max: 28800, rate: 0.055 }, { min: 28800, max: 36e3, rate: 0.064 }, { min: 36e3, max: 54e3, rate: 0.068 }, { min: 54e3, max: 72e3, rate: 0.072 }, { min: 72e3, max: 187500, rate: 0.076 }, { min: 187500, max: 262500, rate: 0.079 }, { min: 262500, max: 337500, rate: 0.0825 }, { min: 337500, max: 412500, rate: 0.09 }, { min: 412500, max: 487500, rate: 0.1 }, { min: 487500, max: Infinity, rate: 0.11 }]
    },
    ID: {
      // Idaho — flat (after exemption)
      single: [{ min: 0, max: 4811, rate: 0 }, { min: 4811, max: Infinity, rate: 0.053 }],
      married_joint: [{ min: 0, max: 9622, rate: 0 }, { min: 9622, max: Infinity, rate: 0.053 }],
      married_separate: [{ min: 0, max: 4811, rate: 0 }, { min: 4811, max: Infinity, rate: 0.053 }],
      hoh: [{ min: 0, max: 4811, rate: 0 }, { min: 4811, max: Infinity, rate: 0.053 }]
    },
    IL: {
      // Illinois — flat
      single: [{ min: 0, max: Infinity, rate: 0.0495 }],
      married_joint: [{ min: 0, max: Infinity, rate: 0.0495 }],
      married_separate: [{ min: 0, max: Infinity, rate: 0.0495 }],
      hoh: [{ min: 0, max: Infinity, rate: 0.0495 }]
    },
    IN: {
      // Indiana — flat 2.95% (decreased from 3% on 1/1/2026)
      single: [{ min: 0, max: Infinity, rate: 0.0295 }],
      married_joint: [{ min: 0, max: Infinity, rate: 0.0295 }],
      married_separate: [{ min: 0, max: Infinity, rate: 0.0295 }],
      hoh: [{ min: 0, max: Infinity, rate: 0.0295 }]
    },
    IA: {
      // Iowa — flat
      single: [{ min: 0, max: Infinity, rate: 0.038 }],
      married_joint: [{ min: 0, max: Infinity, rate: 0.038 }],
      married_separate: [{ min: 0, max: Infinity, rate: 0.038 }],
      hoh: [{ min: 0, max: Infinity, rate: 0.038 }]
    },
    KS: {
      // Kansas
      single: [{ min: 0, max: 23e3, rate: 0.052 }, { min: 23e3, max: Infinity, rate: 0.0558 }],
      married_joint: [{ min: 0, max: 46e3, rate: 0.052 }, { min: 46e3, max: Infinity, rate: 0.0558 }],
      married_separate: [{ min: 0, max: 23e3, rate: 0.052 }, { min: 23e3, max: Infinity, rate: 0.0558 }],
      hoh: [{ min: 0, max: 23e3, rate: 0.052 }, { min: 23e3, max: Infinity, rate: 0.0558 }]
    },
    KY: {
      // Kentucky — flat 3.5% (decreased from 4% on 1/1/2026)
      single: [{ min: 0, max: Infinity, rate: 0.035 }],
      married_joint: [{ min: 0, max: Infinity, rate: 0.035 }],
      married_separate: [{ min: 0, max: Infinity, rate: 0.035 }],
      hoh: [{ min: 0, max: Infinity, rate: 0.035 }]
    },
    LA: {
      // Louisiana — flat
      single: [{ min: 0, max: Infinity, rate: 0.03 }],
      married_joint: [{ min: 0, max: Infinity, rate: 0.03 }],
      married_separate: [{ min: 0, max: Infinity, rate: 0.03 }],
      hoh: [{ min: 0, max: Infinity, rate: 0.03 }]
    },
    ME: {
      // Maine
      single: [{ min: 0, max: 27399, rate: 0.058 }, { min: 27399, max: 64849, rate: 0.0675 }, { min: 64849, max: Infinity, rate: 0.0715 }],
      married_joint: [{ min: 0, max: 54849, rate: 0.058 }, { min: 54849, max: 129749, rate: 0.0675 }, { min: 129749, max: Infinity, rate: 0.0715 }],
      married_separate: [{ min: 0, max: 27399, rate: 0.058 }, { min: 27399, max: 64849, rate: 0.0675 }, { min: 64849, max: Infinity, rate: 0.0715 }],
      hoh: [{ min: 0, max: 41100, rate: 0.058 }, { min: 41100, max: 97300, rate: 0.0675 }, { min: 97300, max: Infinity, rate: 0.0715 }]
    },
    MD: {
      // Maryland (excludes county/local income tax which averages ~2.4% additional)
      single: [{ min: 0, max: 1e3, rate: 0.02 }, { min: 1e3, max: 2e3, rate: 0.03 }, { min: 2e3, max: 3e3, rate: 0.04 }, { min: 3e3, max: 1e5, rate: 0.0475 }, { min: 1e5, max: 125e3, rate: 0.05 }, { min: 125e3, max: 15e4, rate: 0.0525 }, { min: 15e4, max: 25e4, rate: 0.055 }, { min: 25e4, max: 5e5, rate: 0.0575 }, { min: 5e5, max: 1e6, rate: 0.0625 }, { min: 1e6, max: Infinity, rate: 0.065 }],
      married_joint: [{ min: 0, max: 1e3, rate: 0.02 }, { min: 1e3, max: 2e3, rate: 0.03 }, { min: 2e3, max: 3e3, rate: 0.04 }, { min: 3e3, max: 15e4, rate: 0.0475 }, { min: 15e4, max: 175e3, rate: 0.05 }, { min: 175e3, max: 225e3, rate: 0.0525 }, { min: 225e3, max: 3e5, rate: 0.055 }, { min: 3e5, max: 6e5, rate: 0.0575 }, { min: 6e5, max: 12e5, rate: 0.0625 }, { min: 12e5, max: Infinity, rate: 0.065 }],
      married_separate: [{ min: 0, max: 1e3, rate: 0.02 }, { min: 1e3, max: 2e3, rate: 0.03 }, { min: 2e3, max: 3e3, rate: 0.04 }, { min: 3e3, max: 1e5, rate: 0.0475 }, { min: 1e5, max: 125e3, rate: 0.05 }, { min: 125e3, max: 15e4, rate: 0.0525 }, { min: 15e4, max: 25e4, rate: 0.055 }, { min: 25e4, max: 5e5, rate: 0.0575 }, { min: 5e5, max: 1e6, rate: 0.0625 }, { min: 1e6, max: Infinity, rate: 0.065 }],
      hoh: [{ min: 0, max: 1e3, rate: 0.02 }, { min: 1e3, max: 2e3, rate: 0.03 }, { min: 2e3, max: 3e3, rate: 0.04 }, { min: 3e3, max: 15e4, rate: 0.0475 }, { min: 15e4, max: 175e3, rate: 0.05 }, { min: 175e3, max: 225e3, rate: 0.0525 }, { min: 225e3, max: 3e5, rate: 0.055 }, { min: 3e5, max: 6e5, rate: 0.0575 }, { min: 6e5, max: 12e5, rate: 0.0625 }, { min: 12e5, max: Infinity, rate: 0.065 }]
    },
    MA: {
      // Massachusetts — flat 5% + 9% surtax above $1.083M
      single: [{ min: 0, max: 1083150, rate: 0.05 }, { min: 1083150, max: Infinity, rate: 0.09 }],
      married_joint: [{ min: 0, max: 1083150, rate: 0.05 }, { min: 1083150, max: Infinity, rate: 0.09 }],
      married_separate: [{ min: 0, max: 1083150, rate: 0.05 }, { min: 1083150, max: Infinity, rate: 0.09 }],
      hoh: [{ min: 0, max: 1083150, rate: 0.05 }, { min: 1083150, max: Infinity, rate: 0.09 }]
    },
    MI: {
      // Michigan — flat
      single: [{ min: 0, max: Infinity, rate: 0.0425 }],
      married_joint: [{ min: 0, max: Infinity, rate: 0.0425 }],
      married_separate: [{ min: 0, max: Infinity, rate: 0.0425 }],
      hoh: [{ min: 0, max: Infinity, rate: 0.0425 }]
    },
    MN: {
      // Minnesota
      single: [{ min: 0, max: 33310, rate: 0.0535 }, { min: 33310, max: 109430, rate: 0.068 }, { min: 109430, max: 203150, rate: 0.0785 }, { min: 203150, max: Infinity, rate: 0.0985 }],
      married_joint: [{ min: 0, max: 48700, rate: 0.0535 }, { min: 48700, max: 193480, rate: 0.068 }, { min: 193480, max: 337930, rate: 0.0785 }, { min: 337930, max: Infinity, rate: 0.0985 }],
      married_separate: [{ min: 0, max: 24350, rate: 0.0535 }, { min: 24350, max: 96740, rate: 0.068 }, { min: 96740, max: 168965, rate: 0.0785 }, { min: 168965, max: Infinity, rate: 0.0985 }],
      hoh: [{ min: 0, max: 41060, rate: 0.0535 }, { min: 41060, max: 164850, rate: 0.068 }, { min: 164850, max: 271660, rate: 0.0785 }, { min: 271660, max: Infinity, rate: 0.0985 }]
    },
    MS: {
      // Mississippi — flat 4% (first $10K exempt; further reductions scheduled)
      single: [{ min: 0, max: 1e4, rate: 0 }, { min: 1e4, max: Infinity, rate: 0.04 }],
      married_joint: [{ min: 0, max: 1e4, rate: 0 }, { min: 1e4, max: Infinity, rate: 0.04 }],
      married_separate: [{ min: 0, max: 1e4, rate: 0 }, { min: 1e4, max: Infinity, rate: 0.04 }],
      hoh: [{ min: 0, max: 1e4, rate: 0 }, { min: 1e4, max: Infinity, rate: 0.04 }]
    },
    MO: {
      // Missouri (first $1,348 exempt)
      single: [{ min: 0, max: 1348, rate: 0 }, { min: 1348, max: 2696, rate: 0.02 }, { min: 2696, max: 4044, rate: 0.025 }, { min: 4044, max: 5392, rate: 0.03 }, { min: 5392, max: 6740, rate: 0.035 }, { min: 6740, max: 8088, rate: 0.04 }, { min: 8088, max: 9436, rate: 0.045 }, { min: 9436, max: Infinity, rate: 0.047 }],
      married_joint: [{ min: 0, max: 1348, rate: 0 }, { min: 1348, max: 2696, rate: 0.02 }, { min: 2696, max: 4044, rate: 0.025 }, { min: 4044, max: 5392, rate: 0.03 }, { min: 5392, max: 6740, rate: 0.035 }, { min: 6740, max: 8088, rate: 0.04 }, { min: 8088, max: 9436, rate: 0.045 }, { min: 9436, max: Infinity, rate: 0.047 }],
      married_separate: [{ min: 0, max: 1348, rate: 0 }, { min: 1348, max: 2696, rate: 0.02 }, { min: 2696, max: 4044, rate: 0.025 }, { min: 4044, max: 5392, rate: 0.03 }, { min: 5392, max: 6740, rate: 0.035 }, { min: 6740, max: 8088, rate: 0.04 }, { min: 8088, max: 9436, rate: 0.045 }, { min: 9436, max: Infinity, rate: 0.047 }],
      hoh: [{ min: 0, max: 1348, rate: 0 }, { min: 1348, max: 2696, rate: 0.02 }, { min: 2696, max: 4044, rate: 0.025 }, { min: 4044, max: 5392, rate: 0.03 }, { min: 5392, max: 6740, rate: 0.035 }, { min: 6740, max: 8088, rate: 0.04 }, { min: 8088, max: 9436, rate: 0.045 }, { min: 9436, max: Infinity, rate: 0.047 }]
    },
    MT: {
      // Montana
      single: [{ min: 0, max: 47500, rate: 0.047 }, { min: 47500, max: Infinity, rate: 0.0565 }],
      married_joint: [{ min: 0, max: 95e3, rate: 0.047 }, { min: 95e3, max: Infinity, rate: 0.0565 }],
      married_separate: [{ min: 0, max: 47500, rate: 0.047 }, { min: 47500, max: Infinity, rate: 0.0565 }],
      hoh: [{ min: 0, max: 47500, rate: 0.047 }, { min: 47500, max: Infinity, rate: 0.0565 }]
    },
    NE: {
      // Nebraska — top rate reduced 5.2% → 4.55% on 1/1/2026
      single: [{ min: 0, max: 4130, rate: 0.0246 }, { min: 4130, max: 24760, rate: 0.0351 }, { min: 24760, max: Infinity, rate: 0.0455 }],
      married_joint: [{ min: 0, max: 8250, rate: 0.0246 }, { min: 8250, max: 49530, rate: 0.0351 }, { min: 49530, max: Infinity, rate: 0.0455 }],
      married_separate: [{ min: 0, max: 4130, rate: 0.0246 }, { min: 4130, max: 24760, rate: 0.0351 }, { min: 24760, max: Infinity, rate: 0.0455 }],
      hoh: [{ min: 0, max: 7710, rate: 0.0246 }, { min: 7710, max: 39510, rate: 0.0351 }, { min: 39510, max: Infinity, rate: 0.0455 }]
    },
    NJ: {
      // New Jersey
      single: [{ min: 0, max: 2e4, rate: 0.014 }, { min: 2e4, max: 35e3, rate: 0.0175 }, { min: 35e3, max: 4e4, rate: 0.035 }, { min: 4e4, max: 75e3, rate: 0.0553 }, { min: 75e3, max: 5e5, rate: 0.0637 }, { min: 5e5, max: 1e6, rate: 0.0897 }, { min: 1e6, max: Infinity, rate: 0.1075 }],
      married_joint: [{ min: 0, max: 2e4, rate: 0.014 }, { min: 2e4, max: 5e4, rate: 0.0175 }, { min: 5e4, max: 7e4, rate: 0.0245 }, { min: 7e4, max: 8e4, rate: 0.035 }, { min: 8e4, max: 15e4, rate: 0.0553 }, { min: 15e4, max: 5e5, rate: 0.0637 }, { min: 5e5, max: 1e6, rate: 0.0897 }, { min: 1e6, max: Infinity, rate: 0.1075 }],
      married_separate: [{ min: 0, max: 2e4, rate: 0.014 }, { min: 2e4, max: 35e3, rate: 0.0175 }, { min: 35e3, max: 4e4, rate: 0.035 }, { min: 4e4, max: 75e3, rate: 0.0553 }, { min: 75e3, max: 5e5, rate: 0.0637 }, { min: 5e5, max: 1e6, rate: 0.0897 }, { min: 1e6, max: Infinity, rate: 0.1075 }],
      hoh: [{ min: 0, max: 2e4, rate: 0.014 }, { min: 2e4, max: 5e4, rate: 0.0175 }, { min: 5e4, max: 7e4, rate: 0.0245 }, { min: 7e4, max: 8e4, rate: 0.035 }, { min: 8e4, max: 15e4, rate: 0.0553 }, { min: 15e4, max: 5e5, rate: 0.0637 }, { min: 5e5, max: 1e6, rate: 0.0897 }, { min: 1e6, max: Infinity, rate: 0.1075 }]
    },
    NM: {
      // New Mexico
      single: [{ min: 0, max: 5500, rate: 0.015 }, { min: 5500, max: 16500, rate: 0.032 }, { min: 16500, max: 33500, rate: 0.043 }, { min: 33500, max: 66500, rate: 0.047 }, { min: 66500, max: 21e4, rate: 0.049 }, { min: 21e4, max: Infinity, rate: 0.059 }],
      married_joint: [{ min: 0, max: 8e3, rate: 0.015 }, { min: 8e3, max: 25e3, rate: 0.032 }, { min: 25e3, max: 5e4, rate: 0.043 }, { min: 5e4, max: 1e5, rate: 0.047 }, { min: 1e5, max: 315e3, rate: 0.049 }, { min: 315e3, max: Infinity, rate: 0.059 }],
      married_separate: [{ min: 0, max: 4e3, rate: 0.015 }, { min: 4e3, max: 12500, rate: 0.032 }, { min: 12500, max: 25e3, rate: 0.043 }, { min: 25e3, max: 5e4, rate: 0.047 }, { min: 5e4, max: 157500, rate: 0.049 }, { min: 157500, max: Infinity, rate: 0.059 }],
      hoh: [{ min: 0, max: 8e3, rate: 0.015 }, { min: 8e3, max: 25e3, rate: 0.032 }, { min: 25e3, max: 5e4, rate: 0.043 }, { min: 5e4, max: 1e5, rate: 0.047 }, { min: 1e5, max: 315e3, rate: 0.049 }, { min: 315e3, max: Infinity, rate: 0.059 }]
    },
    NY: {
      // New York (excludes NYC local tax ~3.078%-3.876% additional)
      single: [{ min: 0, max: 8500, rate: 0.039 }, { min: 8500, max: 11700, rate: 0.044 }, { min: 11700, max: 13900, rate: 0.0515 }, { min: 13900, max: 80650, rate: 0.054 }, { min: 80650, max: 215400, rate: 0.059 }, { min: 215400, max: 1077550, rate: 0.0685 }, { min: 1077550, max: 5e6, rate: 0.0965 }, { min: 5e6, max: 25e6, rate: 0.103 }, { min: 25e6, max: Infinity, rate: 0.109 }],
      married_joint: [{ min: 0, max: 17150, rate: 0.039 }, { min: 17150, max: 23600, rate: 0.044 }, { min: 23600, max: 27900, rate: 0.0515 }, { min: 27900, max: 161550, rate: 0.054 }, { min: 161550, max: 323200, rate: 0.059 }, { min: 323200, max: 2155350, rate: 0.0685 }, { min: 2155350, max: 5e6, rate: 0.0965 }, { min: 5e6, max: 25e6, rate: 0.103 }, { min: 25e6, max: Infinity, rate: 0.109 }],
      married_separate: [{ min: 0, max: 8500, rate: 0.039 }, { min: 8500, max: 11700, rate: 0.044 }, { min: 11700, max: 13900, rate: 0.0515 }, { min: 13900, max: 80650, rate: 0.054 }, { min: 80650, max: 215400, rate: 0.059 }, { min: 215400, max: 1077550, rate: 0.0685 }, { min: 1077550, max: 5e6, rate: 0.0965 }, { min: 5e6, max: 25e6, rate: 0.103 }, { min: 25e6, max: Infinity, rate: 0.109 }],
      hoh: [{ min: 0, max: 12800, rate: 0.039 }, { min: 12800, max: 17650, rate: 0.044 }, { min: 17650, max: 20900, rate: 0.0515 }, { min: 20900, max: 107650, rate: 0.054 }, { min: 107650, max: 269300, rate: 0.059 }, { min: 269300, max: 1616450, rate: 0.0685 }, { min: 1616450, max: 5e6, rate: 0.0965 }, { min: 5e6, max: 25e6, rate: 0.103 }, { min: 25e6, max: Infinity, rate: 0.109 }]
    },
    NC: {
      // North Carolina — flat 3.99% (decreased from 4.25% on 1/1/2026)
      single: [{ min: 0, max: Infinity, rate: 0.0399 }],
      married_joint: [{ min: 0, max: Infinity, rate: 0.0399 }],
      married_separate: [{ min: 0, max: Infinity, rate: 0.0399 }],
      hoh: [{ min: 0, max: Infinity, rate: 0.0399 }]
    },
    ND: {
      // North Dakota (first ~$48K exempt for single)
      single: [{ min: 0, max: 48475, rate: 0 }, { min: 48475, max: 244825, rate: 0.0195 }, { min: 244825, max: Infinity, rate: 0.025 }],
      married_joint: [{ min: 0, max: 80975, rate: 0 }, { min: 80975, max: 298075, rate: 0.0195 }, { min: 298075, max: Infinity, rate: 0.025 }],
      married_separate: [{ min: 0, max: 40488, rate: 0 }, { min: 40488, max: 149038, rate: 0.0195 }, { min: 149038, max: Infinity, rate: 0.025 }],
      hoh: [{ min: 0, max: 48475, rate: 0 }, { min: 48475, max: 244825, rate: 0.0195 }, { min: 244825, max: Infinity, rate: 0.025 }]
    },
    OH: {
      // Ohio — flat 2.75% on income above $26,050 (effective 1/1/2026)
      single: [{ min: 0, max: 26050, rate: 0 }, { min: 26050, max: Infinity, rate: 0.0275 }],
      married_joint: [{ min: 0, max: 26050, rate: 0 }, { min: 26050, max: Infinity, rate: 0.0275 }],
      married_separate: [{ min: 0, max: 26050, rate: 0 }, { min: 26050, max: Infinity, rate: 0.0275 }],
      hoh: [{ min: 0, max: 26050, rate: 0 }, { min: 26050, max: Infinity, rate: 0.0275 }]
    },
    OK: {
      // Oklahoma — collapsed to 3 brackets, top rate 4.5% (effective 1/1/2026)
      single: [{ min: 0, max: 3750, rate: 0 }, { min: 3750, max: 4900, rate: 0.025 }, { min: 4900, max: 7200, rate: 0.035 }, { min: 7200, max: Infinity, rate: 0.045 }],
      married_joint: [{ min: 0, max: 7500, rate: 0 }, { min: 7500, max: 9800, rate: 0.025 }, { min: 9800, max: 14400, rate: 0.035 }, { min: 14400, max: Infinity, rate: 0.045 }],
      married_separate: [{ min: 0, max: 3750, rate: 0 }, { min: 3750, max: 4900, rate: 0.025 }, { min: 4900, max: 7200, rate: 0.035 }, { min: 7200, max: Infinity, rate: 0.045 }],
      hoh: [{ min: 0, max: 7500, rate: 0 }, { min: 7500, max: 9800, rate: 0.025 }, { min: 9800, max: 14400, rate: 0.035 }, { min: 14400, max: Infinity, rate: 0.045 }]
    },
    OR: {
      // Oregon
      single: [{ min: 0, max: 4550, rate: 0.0475 }, { min: 4550, max: 11400, rate: 0.0675 }, { min: 11400, max: 125e3, rate: 0.0875 }, { min: 125e3, max: Infinity, rate: 0.099 }],
      married_joint: [{ min: 0, max: 9100, rate: 0.0475 }, { min: 9100, max: 22800, rate: 0.0675 }, { min: 22800, max: 25e4, rate: 0.0875 }, { min: 25e4, max: Infinity, rate: 0.099 }],
      married_separate: [{ min: 0, max: 4550, rate: 0.0475 }, { min: 4550, max: 11400, rate: 0.0675 }, { min: 11400, max: 125e3, rate: 0.0875 }, { min: 125e3, max: Infinity, rate: 0.099 }],
      hoh: [{ min: 0, max: 9100, rate: 0.0475 }, { min: 9100, max: 22800, rate: 0.0675 }, { min: 22800, max: 25e4, rate: 0.0875 }, { min: 25e4, max: Infinity, rate: 0.099 }]
    },
    PA: {
      // Pennsylvania — flat
      single: [{ min: 0, max: Infinity, rate: 0.0307 }],
      married_joint: [{ min: 0, max: Infinity, rate: 0.0307 }],
      married_separate: [{ min: 0, max: Infinity, rate: 0.0307 }],
      hoh: [{ min: 0, max: Infinity, rate: 0.0307 }]
    },
    RI: {
      // Rhode Island
      single: [{ min: 0, max: 82050, rate: 0.0375 }, { min: 82050, max: 186450, rate: 0.0475 }, { min: 186450, max: Infinity, rate: 0.0599 }],
      married_joint: [{ min: 0, max: 82050, rate: 0.0375 }, { min: 82050, max: 186450, rate: 0.0475 }, { min: 186450, max: Infinity, rate: 0.0599 }],
      married_separate: [{ min: 0, max: 82050, rate: 0.0375 }, { min: 82050, max: 186450, rate: 0.0475 }, { min: 186450, max: Infinity, rate: 0.0599 }],
      hoh: [{ min: 0, max: 82050, rate: 0.0375 }, { min: 82050, max: 186450, rate: 0.0475 }, { min: 186450, max: Infinity, rate: 0.0599 }]
    },
    SC: {
      // South Carolina (top rate 6% from 7/1/2025 through 6/30/2026)
      single: [{ min: 0, max: 3640, rate: 0 }, { min: 3640, max: 18230, rate: 0.03 }, { min: 18230, max: Infinity, rate: 0.06 }],
      married_joint: [{ min: 0, max: 3640, rate: 0 }, { min: 3640, max: 18230, rate: 0.03 }, { min: 18230, max: Infinity, rate: 0.06 }],
      married_separate: [{ min: 0, max: 3640, rate: 0 }, { min: 3640, max: 18230, rate: 0.03 }, { min: 18230, max: Infinity, rate: 0.06 }],
      hoh: [{ min: 0, max: 3640, rate: 0 }, { min: 3640, max: 18230, rate: 0.03 }, { min: 18230, max: Infinity, rate: 0.06 }]
    },
    UT: {
      // Utah — flat 4.5% (decreased from 4.55% retroactive to 1/1/2025)
      single: [{ min: 0, max: Infinity, rate: 0.045 }],
      married_joint: [{ min: 0, max: Infinity, rate: 0.045 }],
      married_separate: [{ min: 0, max: Infinity, rate: 0.045 }],
      hoh: [{ min: 0, max: Infinity, rate: 0.045 }]
    },
    VT: {
      // Vermont
      single: [{ min: 0, max: 49400, rate: 0.0335 }, { min: 49400, max: 119700, rate: 0.066 }, { min: 119700, max: 249700, rate: 0.076 }, { min: 249700, max: Infinity, rate: 0.0875 }],
      married_joint: [{ min: 0, max: 82500, rate: 0.0335 }, { min: 82500, max: 199450, rate: 0.066 }, { min: 199450, max: 304e3, rate: 0.076 }, { min: 304e3, max: Infinity, rate: 0.0875 }],
      married_separate: [{ min: 0, max: 41250, rate: 0.0335 }, { min: 41250, max: 99725, rate: 0.066 }, { min: 99725, max: 152e3, rate: 0.076 }, { min: 152e3, max: Infinity, rate: 0.0875 }],
      hoh: [{ min: 0, max: 66150, rate: 0.0335 }, { min: 66150, max: 170800, rate: 0.066 }, { min: 170800, max: 276750, rate: 0.076 }, { min: 276750, max: Infinity, rate: 0.0875 }]
    },
    VA: {
      // Virginia
      single: [{ min: 0, max: 3e3, rate: 0.02 }, { min: 3e3, max: 5e3, rate: 0.03 }, { min: 5e3, max: 17e3, rate: 0.05 }, { min: 17e3, max: Infinity, rate: 0.0575 }],
      married_joint: [{ min: 0, max: 3e3, rate: 0.02 }, { min: 3e3, max: 5e3, rate: 0.03 }, { min: 5e3, max: 17e3, rate: 0.05 }, { min: 17e3, max: Infinity, rate: 0.0575 }],
      married_separate: [{ min: 0, max: 3e3, rate: 0.02 }, { min: 3e3, max: 5e3, rate: 0.03 }, { min: 5e3, max: 17e3, rate: 0.05 }, { min: 17e3, max: Infinity, rate: 0.0575 }],
      hoh: [{ min: 0, max: 3e3, rate: 0.02 }, { min: 3e3, max: 5e3, rate: 0.03 }, { min: 5e3, max: 17e3, rate: 0.05 }, { min: 17e3, max: Infinity, rate: 0.0575 }]
    },
    WV: {
      // West Virginia
      single: [{ min: 0, max: 1e4, rate: 0.0222 }, { min: 1e4, max: 25e3, rate: 0.0296 }, { min: 25e3, max: 4e4, rate: 0.0333 }, { min: 4e4, max: 6e4, rate: 0.0444 }, { min: 6e4, max: Infinity, rate: 0.0482 }],
      married_joint: [{ min: 0, max: 1e4, rate: 0.0222 }, { min: 1e4, max: 25e3, rate: 0.0296 }, { min: 25e3, max: 4e4, rate: 0.0333 }, { min: 4e4, max: 6e4, rate: 0.0444 }, { min: 6e4, max: Infinity, rate: 0.0482 }],
      married_separate: [{ min: 0, max: 5e3, rate: 0.0222 }, { min: 5e3, max: 12500, rate: 0.0296 }, { min: 12500, max: 2e4, rate: 0.0333 }, { min: 2e4, max: 3e4, rate: 0.0444 }, { min: 3e4, max: Infinity, rate: 0.0482 }],
      hoh: [{ min: 0, max: 1e4, rate: 0.0222 }, { min: 1e4, max: 25e3, rate: 0.0296 }, { min: 25e3, max: 4e4, rate: 0.0333 }, { min: 4e4, max: 6e4, rate: 0.0444 }, { min: 6e4, max: Infinity, rate: 0.0482 }]
    },
    WI: {
      // Wisconsin
      single: [{ min: 0, max: 15110, rate: 0.035 }, { min: 15110, max: 51950, rate: 0.044 }, { min: 51950, max: 332720, rate: 0.053 }, { min: 332720, max: Infinity, rate: 0.0765 }],
      married_joint: [{ min: 0, max: 20150, rate: 0.035 }, { min: 20150, max: 69260, rate: 0.044 }, { min: 69260, max: 443630, rate: 0.053 }, { min: 443630, max: Infinity, rate: 0.0765 }],
      married_separate: [{ min: 0, max: 10075, rate: 0.035 }, { min: 10075, max: 34630, rate: 0.044 }, { min: 34630, max: 221815, rate: 0.053 }, { min: 221815, max: Infinity, rate: 0.0765 }],
      hoh: [{ min: 0, max: 15110, rate: 0.035 }, { min: 15110, max: 51950, rate: 0.044 }, { min: 51950, max: 332720, rate: 0.053 }, { min: 332720, max: Infinity, rate: 0.0765 }]
    },
    DC: {
      // District of Columbia
      single: [{ min: 0, max: 1e4, rate: 0.04 }, { min: 1e4, max: 4e4, rate: 0.06 }, { min: 4e4, max: 6e4, rate: 0.065 }, { min: 6e4, max: 25e4, rate: 0.085 }, { min: 25e4, max: 5e5, rate: 0.0925 }, { min: 5e5, max: 1e6, rate: 0.0975 }, { min: 1e6, max: Infinity, rate: 0.1075 }],
      married_joint: [{ min: 0, max: 1e4, rate: 0.04 }, { min: 1e4, max: 4e4, rate: 0.06 }, { min: 4e4, max: 6e4, rate: 0.065 }, { min: 6e4, max: 25e4, rate: 0.085 }, { min: 25e4, max: 5e5, rate: 0.0925 }, { min: 5e5, max: 1e6, rate: 0.0975 }, { min: 1e6, max: Infinity, rate: 0.1075 }],
      married_separate: [{ min: 0, max: 1e4, rate: 0.04 }, { min: 1e4, max: 4e4, rate: 0.06 }, { min: 4e4, max: 6e4, rate: 0.065 }, { min: 6e4, max: 25e4, rate: 0.085 }, { min: 25e4, max: 5e5, rate: 0.0925 }, { min: 5e5, max: 1e6, rate: 0.0975 }, { min: 1e6, max: Infinity, rate: 0.1075 }],
      hoh: [{ min: 0, max: 1e4, rate: 0.04 }, { min: 1e4, max: 4e4, rate: 0.06 }, { min: 4e4, max: 6e4, rate: 0.065 }, { min: 6e4, max: 25e4, rate: 0.085 }, { min: 25e4, max: 5e5, rate: 0.0925 }, { min: 5e5, max: 1e6, rate: 0.0975 }, { min: 1e6, max: Infinity, rate: 0.1075 }]
    }
  };
  var RET_TYPES = [
    { val: "401k_current", label: "401(k) \u2014 Current Employer", taxType: "pretax", allowMatch: true, allowContrib: true },
    { val: "401k_old", label: "401(k) \u2014 Old/Previous", taxType: "pretax", allowMatch: false, allowContrib: false },
    { val: "roth401k_current", label: "Roth 401(k) \u2014 Current", taxType: "roth", allowMatch: true, allowContrib: true },
    { val: "roth401k_old", label: "Roth 401(k) \u2014 Old/Previous", taxType: "roth", allowMatch: false, allowContrib: false },
    { val: "trad_ira", label: "Traditional IRA", taxType: "pretax", allowMatch: false, allowContrib: true },
    { val: "roth_ira", label: "Roth IRA", taxType: "roth", allowMatch: false, allowContrib: true },
    { val: "solo_401k", label: "Solo 401(k) \u2014 Self-Employed", taxType: "pretax", allowMatch: false, allowContrib: true },
    { val: "roth_solo_401k", label: "Roth Solo 401(k)", taxType: "roth", allowMatch: false, allowContrib: true },
    { val: "sep_ira", label: "SEP IRA \u2014 Self-Employed", taxType: "pretax", allowMatch: false, allowContrib: true },
    { val: "403b_current", label: "403(b) \u2014 Current Employer", taxType: "pretax", allowMatch: true, allowContrib: true },
    { val: "403b_old", label: "403(b) \u2014 Old/Previous", taxType: "pretax", allowMatch: false, allowContrib: false },
    { val: "pension", label: "Pension", taxType: "pretax", allowMatch: false, allowContrib: false },
    { val: "annuity_fixed", label: "Annuity \u2014 Fixed", taxType: "deferred", allowMatch: false, allowContrib: true, isAnnuity: true },
    { val: "annuity_variable", label: "Annuity \u2014 Variable", taxType: "deferred", allowMatch: false, allowContrib: true, isAnnuity: true },
    { val: "annuity_indexed", label: "Annuity \u2014 Fixed Indexed (FIA)", taxType: "deferred", allowMatch: false, allowContrib: true, isAnnuity: true },
    { val: "annuity_income", label: "Annuity \u2014 Income/SPIA", taxType: "deferred", allowMatch: false, allowContrib: false, isAnnuity: true },
    { val: "tsp_current", label: "TSP \u2014 Current", taxType: "pretax", allowMatch: true, allowContrib: true },
    { val: "tsp_old", label: "TSP \u2014 Previous", taxType: "pretax", allowMatch: false, allowContrib: false },
    { val: "mutual_fund", label: "Mutual Funds", taxType: "taxable", allowMatch: false, allowContrib: true },
    { val: "brokerage", label: "Brokerage / Taxable", taxType: "taxable", allowMatch: false, allowContrib: true },
    { val: "other_ret", label: "Other Retirement Account", taxType: "pretax", allowMatch: false, allowContrib: true }
  ];
  var INV_TYPES = [
    { val: "brokerage", label: "Taxable Brokerage", hasMatch: false, hsa: false },
    { val: "mutual_fund", label: "Mutual Fund (Outside Retirement)", hasMatch: false, hsa: false },
    { val: "hsa", label: "HSA (Health Savings Account)", hasMatch: false, hsa: true },
    { val: "crypto", label: "Crypto / Digital Assets", hasMatch: false, hsa: false },
    { val: "robo_advisor", label: "Robo-Advisor (Acorns, Betterment, etc.)", hasMatch: false, hsa: false },
    { val: "other", label: "Other Investment Account", hasMatch: false, hsa: false }
  ];
  var PAYROLL_DEDUCTED_TYPES = ["401k_current", "roth401k_current", "403b_current", "tsp_current", "pension"];
  var POLICY_TYPES = ["Term Life", "Whole Life", "IUL (Indexed Universal Life)", "Group Life (Employer)", "Variable Life", "Universal Life", "Accidental Death"];

  // src/engine/constants.ts
  var PAYROLL_DEDUCTED_SET = new Set(PAYROLL_DEDUCTED_TYPES);

  // src/engine/tax.ts
  var tax_exports = {};
  __export(tax_exports, {
    _401kAnnualLimit: () => _401kAnnualLimit,
    _currentMarginalRate: () => _currentMarginalRate,
    _estimateFederalAndFICA: () => _estimateFederalAndFICA,
    _estimateFederalIncomeOnly: () => _estimateFederalIncomeOnly,
    _estimateGrossFromNet: () => _estimateGrossFromNet,
    _estimateStateTax: () => _estimateStateTax,
    _ficaOnly: () => _ficaOnly
  });
  function _estimateStateTax(annualGross, filingStatus, state) {
    if (!state) return 0;
    const stateBrackets = STATE_TAX_BRACKETS_2026[state];
    if (!stateBrackets) return 0;
    const brackets = stateBrackets[filingStatus] || stateBrackets.single;
    const taxable = Math.max(0, annualGross);
    let tax = 0, remaining = taxable;
    for (let i = 0; i < brackets.length; i++) {
      const b = brackets[i];
      const width = b.max === Infinity ? remaining : Math.min(remaining, b.max - b.min);
      if (width <= 0) break;
      tax += width * b.rate;
      remaining -= width;
    }
    return tax;
  }
  function _estimateFederalAndFICA(annualGross, filingStatus) {
    const isMFJ = filingStatus === "married_joint";
    const isMFS = filingStatus === "married_separate";
    const isHOH = filingStatus === "hoh";
    const stdDeduction = isMFJ ? 32200 : isHOH ? 24150 : 16100;
    const taxableIncome = Math.max(0, annualGross - stdDeduction);
    let brackets;
    if (isMFJ) {
      brackets = [
        { min: 0, max: 24800, rate: 0.1 },
        { min: 24800, max: 100800, rate: 0.12 },
        { min: 100800, max: 211400, rate: 0.22 },
        { min: 211400, max: 403550, rate: 0.24 },
        { min: 403550, max: 512450, rate: 0.32 },
        { min: 512450, max: 768700, rate: 0.35 },
        { min: 768700, max: Infinity, rate: 0.37 }
      ];
    } else if (isHOH) {
      brackets = [
        { min: 0, max: 17600, rate: 0.1 },
        { min: 17600, max: 67450, rate: 0.12 },
        { min: 67450, max: 105700, rate: 0.22 },
        { min: 105700, max: 201775, rate: 0.24 },
        { min: 201775, max: 256225, rate: 0.32 },
        { min: 256225, max: 640600, rate: 0.35 },
        { min: 640600, max: Infinity, rate: 0.37 }
      ];
    } else {
      brackets = [
        { min: 0, max: 12400, rate: 0.1 },
        { min: 12400, max: 50400, rate: 0.12 },
        { min: 50400, max: 105700, rate: 0.22 },
        { min: 105700, max: 201775, rate: 0.24 },
        { min: 201775, max: 256225, rate: 0.32 },
        { min: 256225, max: 640600, rate: 0.35 },
        { min: 640600, max: Infinity, rate: 0.37 }
      ];
    }
    let fedTax = 0, remaining = taxableIncome;
    for (let i = 0; i < brackets.length; i++) {
      const b = brackets[i];
      const width = b.max === Infinity ? remaining : Math.min(remaining, b.max - b.min);
      if (width <= 0) break;
      fedTax += width * b.rate;
      remaining -= width;
    }
    const ssTax = Math.min(annualGross, 184500) * 0.062;
    const addMedThreshold = isMFJ ? 25e4 : isMFS ? 125e3 : 2e5;
    let medTax = annualGross * 0.0145;
    if (annualGross > addMedThreshold) medTax += (annualGross - addMedThreshold) * 9e-3;
    return fedTax + ssTax + medTax;
  }
  function _ficaOnly(annualGross, filingStatus) {
    const isMFJ = filingStatus === "married_joint";
    const isMFS = filingStatus === "married_separate";
    const ssTax = Math.min(annualGross, 184500) * 0.062;
    const addMedThreshold = isMFJ ? 25e4 : isMFS ? 125e3 : 2e5;
    let medTax = annualGross * 0.0145;
    if (annualGross > addMedThreshold) medTax += (annualGross - addMedThreshold) * 9e-3;
    return ssTax + medTax;
  }
  function _estimateFederalIncomeOnly(annualGross, filingStatus) {
    return _estimateFederalAndFICA(annualGross, filingStatus) - _ficaOnly(annualGross, filingStatus);
  }
  function _estimateGrossFromNet(annualNet, annualPreTaxDeductions, filingStatus, state) {
    if (annualNet <= 0) return 0;
    let lo = annualNet, hi = annualNet * 3;
    for (let iter = 0; iter < 60; iter++) {
      const mid = (lo + hi) / 2;
      const wageBox1 = Math.max(0, mid - annualPreTaxDeductions);
      const taxes = _estimateFederalAndFICA(wageBox1, filingStatus) + _estimateStateTax(wageBox1, filingStatus, state);
      const computedNet = mid - annualPreTaxDeductions - taxes;
      if (Math.abs(computedNet - annualNet) < 1) break;
      if (computedNet < annualNet) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  }
  function _401kAnnualLimit(currentAge) {
    const age = parseInt(String(currentAge)) || 0;
    if (age >= 60 && age <= 63) return 34750;
    if (age >= 50) return 31e3;
    return 23500;
  }
  function _currentMarginalRate(annualGross, annualPreTaxAlready, filingStatus, state) {
    if (!annualGross || annualGross <= 0) return 0;
    const probe = 100;
    const baseWage = Math.max(0, annualGross - annualPreTaxAlready);
    const probeWage = Math.max(0, annualGross - annualPreTaxAlready - probe);
    const baseTax = _estimateFederalIncomeOnly(baseWage, filingStatus) + _estimateStateTax(baseWage, filingStatus, state);
    const probeTax = _estimateFederalIncomeOnly(probeWage, filingStatus) + _estimateStateTax(probeWage, filingStatus, state);
    return Math.max(0, (baseTax - probeTax) / probe);
  }

  // src/engine/income.ts
  var income_exports = {};
  __export(income_exports, {
    _checksPerMonth: () => _checksPerMonth,
    _incSrcMode: () => _incSrcMode,
    _incSrcMonthlyGross: () => _incSrcMonthlyGross,
    _incSrcMonthlyTakeHome: () => _incSrcMonthlyTakeHome
  });

  // src/engine/util.ts
  var util_exports = {};
  __export(util_exports, {
    _hybridIsClientA: () => _hybridIsClientA,
    _hybridShareField: () => _hybridShareField,
    pf: () => pf,
    pi: () => pi,
    pnum: () => pnum
  });
  var pf = (v) => parseFloat(String(v).replace(/,/g, "")) || 0;
  var pnum = (v) => parseFloat(v) || 0;
  var pi = (v) => parseInt(String(v).replace(/,/g, "")) || 0;
  function _hybridIsClientA(S) {
    const cd = S.coupleData || null;
    if (!cd) return true;
    if (typeof cd.isPrimary === "boolean") return cd.isPrimary;
    return true;
  }
  function _hybridShareField(S) {
    return _hybridIsClientA(S) ? "share_pct_a" : "share_pct_b";
  }

  // src/engine/income.ts
  function _checksPerMonth(freq) {
    return { weekly: 52 / 12, biweekly: 26 / 12, semimonthly: 2, monthly: 1, irregular: 1 }[freq || "monthly"] || 1;
  }
  function _incSrcMode(src) {
    return src && src.mode === "detailed" ? "detailed" : "simple";
  }
  function _incSrcMonthlyTakeHome(src) {
    if (!src) return 0;
    if (_incSrcMode(src) === "detailed") {
      return pnum(src.take_home_per_check) * _checksPerMonth(src.pay_frequency);
    }
    return pnum(src.amount);
  }
  function _incSrcMonthlyGross(src, S) {
    if (!src) return 0;
    if (_incSrcMode(src) === "detailed") {
      const takeHomePerCheck = pnum(src.take_home_per_check);
      const preTaxPerCheck = pnum(src.deduction_401k) + pnum(src.deduction_health) + pnum(src.deduction_hsa) + pnum(src.deduction_other);
      const checks = _checksPerMonth(src.pay_frequency);
      const annualNet = takeHomePerCheck * checks * 12;
      const annualPreTax = preTaxPerCheck * checks * 12;
      if (annualNet <= 0) return 0;
      const filingStatus = S.profile && (S.profile.taxFilingStatus || S.profile.filingStatus) || "single";
      const state = S.profile && S.profile.state || "";
      const annualGross = _estimateGrossFromNet(annualNet, annualPreTax, filingStatus, state);
      return annualGross / 12;
    }
    return pnum(src.amount);
  }

  // src/engine/expense.ts
  var expense_exports = {};
  __export(expense_exports, {
    _isPayrollDeducted: () => _isPayrollDeducted,
    _isRoth401kFamily: () => _isRoth401kFamily,
    getDebtPaymentsAuto: () => getDebtPaymentsAuto,
    getEduContribAuto: () => getEduContribAuto,
    getHybridJointExpShareMonthly: () => getHybridJointExpShareMonthly,
    getInsurancePremiumsAuto: () => getInsurancePremiumsAuto,
    getInvestContribAuto: () => getInvestContribAuto,
    getMonthlyExp: () => getMonthlyExp,
    getTotalMonthlyExp: () => getTotalMonthlyExp,
    initExpData: () => initExpData
  });
  function _isPayrollDeducted(type) {
    const t = String(type || "").toLowerCase();
    if (!t) return false;
    if (t === "pension") return true;
    if (t.indexOf("401k") === 0) return true;
    if (t.indexOf("roth401k") === 0) return true;
    if (t === "roth_401k") return true;
    if (t.indexOf("403b") === 0) return true;
    if (t.indexOf("tsp") === 0) return true;
    return false;
  }
  function _isRoth401kFamily(type) {
    const t = String(type || "").toLowerCase();
    if (!t) return false;
    if (t.indexOf("roth401k") === 0) return true;
    if (t === "roth_401k") return true;
    if (t === "roth_solo_401k") return true;
    return false;
  }
  function initExpData(S) {
    if (!S.expData) S.expData = {};
    const ed = S.expData;
    if (ed.savings && !ed.activeSavings) {
      ed.activeSavings = ed.savings;
      delete ed.savings;
    }
    L1_CATS.forEach(function(c) {
      if (!ed[c.key]) ed[c.key] = { amount: "", period: "monthly", expanded: false, subs: {}, leakTagged: false, essential: true, recurring: true };
    });
  }
  function getMonthlyExp(S, key) {
    const d = S.expData ? S.expData[key] : void 0;
    if (!d) return 0;
    if (d.total != null && !isNaN(parseFloat(String(d.total)))) return parseFloat(String(d.total));
    let v = pf(d.amount);
    if (d.period === "annual") v = v / 12;
    let subTotal = 0;
    if (d.subs) Object.values(d.subs).forEach(function(s) {
      const sv = pf(s.amount);
      subTotal += s.period === "annual" ? sv / 12 : sv;
    });
    return subTotal > 0 ? subTotal : v;
  }
  function getInvestContribAuto(S) {
    let ret = (S.retAccounts || []).reduce(function(t, a) {
      if (_isPayrollDeducted(a.type)) return t;
      return t + pnum(a.contrib);
    }, 0);
    let brok = (S.investments || []).reduce(function(t, a) {
      return t + pnum(a.monthlyContrib);
    }, 0);
    if (S.householdType === "hybrid" && S._jointItems) {
      const myField = _hybridShareField(S);
      if (Array.isArray(S._jointItems.investments)) {
        brok += S._jointItems.investments.reduce(function(t, a) {
          const pct = a && a[myField] !== void 0 ? pnum(a[myField]) || 0 : 50;
          return t + pnum(a.monthlyContrib) * pct / 100;
        }, 0);
      }
      if (Array.isArray(S._jointItems.retAccounts)) {
        ret += S._jointItems.retAccounts.reduce(function(t, a) {
          if (!a || _isPayrollDeducted(a.type)) return t;
          const pct = a[myField] !== void 0 ? pnum(a[myField]) || 0 : 50;
          return t + pnum(a.contrib) * pct / 100;
        }, 0);
      }
    }
    return ret + brok;
  }
  function getDebtPaymentsAuto(S) {
    let personal = (S.debts || []).reduce(function(t, d) {
      return t + (d.type !== "Mortgage" && d.type !== "Auto Loan" ? pnum(d.min) : 0);
    }, 0);
    if (S.householdType === "hybrid" && S._jointItems && Array.isArray(S._jointItems.debts)) {
      const myField = _hybridShareField(S);
      personal += S._jointItems.debts.reduce(function(t, d) {
        if (!d || d.type === "Mortgage" || d.type === "Auto Loan") return t;
        const pct = d[myField] !== void 0 ? pnum(d[myField]) || 0 : 50;
        return t + pnum(d.min) * pct / 100;
      }, 0);
    }
    return personal;
  }
  function getEduContribAuto(S) {
    return (S.children || []).reduce(function(t, ch) {
      return t + pnum(ch.contrib);
    }, 0);
  }
  function getInsurancePremiumsAuto(S) {
    let t = 0;
    t += (S.policies || []).reduce(function(s, p) {
      const _pt = (p && p.type || "").toLowerCase();
      if (_pt.indexOf("disab") >= 0) return s;
      return s + pnum(p.premium);
    }, 0);
    const pr = S.profile || {};
    t += pnum(pr.diPremium);
    t += pnum(pr.ltcPremium);
    t += pnum(pr.umbPremium);
    return t;
  }
  function getHybridJointExpShareMonthly(S) {
    if (S.householdType !== "hybrid") return 0;
    if (!S._jointItems || !Array.isArray(S._jointItems.expenses)) return 0;
    const myField = _hybridShareField(S);
    return S._jointItems.expenses.reduce(function(t, je) {
      if (!je) return t;
      const amt = pnum(je.amount);
      if (amt === 0) return t;
      const monthly = je.period === "annual" ? amt / 12 : amt;
      const pct = je[myField] !== void 0 ? pnum(je[myField]) || 0 : 50;
      return t + monthly * pct / 100;
    }, 0);
  }
  function getTotalMonthlyExp(S) {
    return L1_CATS.reduce(function(t, c) {
      return t + getMonthlyExp(S, c.key);
    }, 0) + getDebtPaymentsAuto(S) + getInvestContribAuto(S) + getEduContribAuto(S) + getInsurancePremiumsAuto(S) + getHybridJointExpShareMonthly(S);
  }

  // src/engine/ibc.ts
  var ibc_exports = {};
  __export(ibc_exports, {
    _ibcCOIRatePerMonth: () => _ibcCOIRatePerMonth,
    _ibcComputeRealizedRate: () => _ibcComputeRealizedRate,
    _ibcDriftCategory: () => _ibcDriftCategory,
    _ibcEffectiveCreditRate: () => _ibcEffectiveCreditRate,
    _ibcFindAnchor: () => _ibcFindAnchor,
    _ibcHealthMultiplier: () => _ibcHealthMultiplier,
    _ibcIULAnnualCredit: () => _ibcIULAnnualCredit,
    _ibcIULCreditRate: () => _ibcIULCreditRate,
    _ibcPolicyDefaults: () => _ibcPolicyDefaults,
    _ibcProjectPolicy: () => _ibcProjectPolicy,
    _ibcWLAnnualCredit: () => _ibcWLAnnualCredit,
    _ibcYearFactor: () => _ibcYearFactor
  });
  function _ibcPolicyDefaults(type) {
    if (type === "wl") {
      return {
        type: "wl",
        design: "high_cv",
        guaranteedRate: 0.04,
        dividendRate: 0.02,
        dividendOption: "pua",
        netEffectiveRate: 0.04,
        loanRate: 0.05,
        // Fraction of each premium that converts to cash value (the WL "cost" — WL is
        // bundled, no separate COI). Calibrated to credible high-cash-value IBC designs
        // (33% base / 66% PUA / 1% term): ~67% first-year CV (sources cite 60–70%),
        // ramping to ~95% steady-state (PUA load ~5%), break-even ≈ yr6 (sources: 4–6).
        // Was [0.55…1.00] (first-year low, steady 100% optimistic).
        cvEfficiencyYr: [null, 0.67, 0.87, 0.92, 0.94, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95]
      };
    }
    return {
      type: "iul",
      premiumLoadYr: [null, 0.06, 0.06, 0.06, 0.06, 0.06, 0.04, 0.04, 0.04, 0.04, 0.04, 0.02],
      policyFeeMonthly: 10,
      per1000ChargeMonthly: 0.5,
      per1000DropoffYear: 11,
      capRate: 0.1,
      parRate: 1,
      floorRate: 0,
      spreadRate: 0,
      assumedIndexReturn: 0.07,
      netEffectiveRate: 0.055,
      loanRate: 0.05,
      healthClass: "preferred",
      // Cost-of-insurance per $1000 of net-amount-at-risk: monthly = coiBaseRate ×
      // healthMult × coiSlope^(age−30). Calibrated to a credible current-COI curve
      // (The Insurance Pro Blog illustrative scale: ~$0.08/mo@40 … $11.60/mo@90 per
      // $1000), log-linear fit → realistic preferred-life COI (≈$1.5/$1k/yr @45,
      // ≈$10 @65, ≈$90 @85), below guaranteed 2017-CSO. Was 0.0005/1.085 (~100× too low).
      coiBaseRate: 0.0242,
      coiSlope: 1.108
    };
  }
  function _ibcYearFactor(arr, yearNum, fallback) {
    if (!arr || !arr.length) return fallback;
    const i = Math.min(yearNum, arr.length - 1);
    if (i < 1) return fallback;
    return arr[i] != null ? arr[i] : fallback;
  }
  function _ibcFindAnchor(history, monthOffset) {
    if (!history || !history.length) return null;
    for (let i = 0; i < history.length; i++) {
      const h = history[i];
      if (h.monthOffset === monthOffset) return h;
    }
    return null;
  }
  function _ibcHealthMultiplier(healthClass) {
    if (healthClass === "preferred_plus") return 0.7;
    if (healthClass === "standard") return 1.5;
    if (healthClass === "substandard") return 2.5;
    return 1;
  }
  function _ibcDriftCategory(realizedRate, illustratedRate) {
    if (realizedRate == null || illustratedRate == null) return null;
    const diff = Math.abs(realizedRate - illustratedRate);
    if (diff <= 5e-3) return "on_track";
    if (diff <= 0.015) return "slight_drift";
    return "significant_drift";
  }
  function _ibcCOIRatePerMonth(age, params) {
    const base = params && params.coiBaseRate || 5e-4;
    const slope = params && params.coiSlope || 1.085;
    const hm = _ibcHealthMultiplier(params && params.healthClass);
    return base * hm * Math.pow(slope, Math.max(0, age - 30));
  }
  function _ibcIULCreditRate(policy) {
    const p = policy || {};
    const indexReturn = p.assumedIndexReturn || 0.07;
    const par = p.parRate || 1;
    const cap = p.capRate || 0.1;
    const floor = p.floorRate || 0;
    const spread = p.spreadRate || 0;
    const grossCredit = indexReturn * par;
    const afterSpread = Math.max(0, grossCredit - spread);
    const capped = Math.min(cap, afterSpread);
    return Math.max(floor, capped);
  }
  function _ibcEffectiveCreditRate(policy) {
    const mode = policy.recalibMode || "realized";
    const illustrated = policy.type === "wl" ? policy.netEffectiveRate || 0.04 : _ibcIULCreditRate(policy);
    if (mode === "illustrated" || !policy._realizedRate) return illustrated;
    if (mode === "realized") return policy._realizedRate;
    return 0.6 * policy._realizedRate + 0.4 * illustrated;
  }
  function _ibcWLAnnualCredit(policy, yearNum, currentCV, currentPUA) {
    const p = Object.assign({}, _ibcPolicyDefaults("wl"), policy || {});
    const yearlyPremium = (p.monthlyPremium || 0) * 12;
    const efficiency = _ibcYearFactor(p.cvEfficiencyYr, yearNum, 1);
    const premiumToCV = yearlyPremium * efficiency;
    const guaranteedGrowth = currentCV * (p.guaranteedRate || 0.04);
    const dividendBase = currentCV + (currentPUA || 0);
    const dividend = dividendBase * (p.dividendRate || 0.02);
    const puaCVAdded = p.dividendOption === "pua" ? dividend * 0.95 : 0;
    const nonPUADividend = p.dividendOption !== "pua" ? dividend : 0;
    return {
      cvDelta: premiumToCV + guaranteedGrowth + puaCVAdded,
      puaDelta: puaCVAdded,
      dividend,
      nonPUADividend,
      breakdown: { premiumToCV, guaranteedGrowth, dividend, puaCVAdded, efficiency }
    };
  }
  function _ibcIULAnnualCredit(policy, yearNum, currentAV, overrideCreditRate) {
    const p = Object.assign({}, _ibcPolicyDefaults("iul"), policy || {});
    const yearlyPremium = (p.monthlyPremium || 0) * 12;
    const ageThisYear = (p.issueAge || 35) + yearNum - 1;
    const deathBenefit = p.deathBenefit || yearlyPremium * 15;
    const loadRate = _ibcYearFactor(p.premiumLoadYr, yearNum, 0.02);
    const netPremium = yearlyPremium * (1 - loadRate);
    const policyFee = (p.policyFeeMonthly || 10) * 12;
    let per1000 = 0;
    if (yearNum < (p.per1000DropoffYear || 11)) {
      per1000 = deathBenefit / 1e3 * (p.per1000ChargeMonthly || 0.5) * 12;
    }
    const nar = Math.max(0, deathBenefit - currentAV);
    const monthlyCOIRate = _ibcCOIRatePerMonth(ageThisYear, p);
    const coi = nar / 1e3 * monthlyCOIRate * 12;
    const netToAV = netPremium - policyFee - per1000 - coi;
    const creditRate = overrideCreditRate != null ? overrideCreditRate : _ibcIULCreditRate(p);
    const segmentStartValue = currentAV + netPremium / 2;
    const indexCredit = segmentStartValue * creditRate;
    return {
      avDelta: netToAV + indexCredit,
      indexCredit,
      creditRate,
      breakdown: { yearlyPremium, loadRate, netPremium, policyFee, per1000, coi, coiRate: monthlyCOIRate, indexCredit, creditRate }
    };
  }
  function _ibcComputeRealizedRate(policy, prevAnchor, currentAnchor) {
    if (!prevAnchor || !currentAnchor) return null;
    const prevCV = prevAnchor.cashValue || 0;
    const currCV = currentAnchor.cashValue || 0;
    const yearlyPremium = (policy.monthlyPremium || 0) * 12;
    if (prevCV <= 0 && yearlyPremium <= 0) return null;
    if (prevCV > 0) {
      const r = (currCV - prevCV - yearlyPremium) / prevCV;
      return Math.max(-0.5, Math.min(0.5, r));
    }
    return null;
  }
  function _ibcProjectPolicy(policy, fromMonth, toMonth) {
    const p = Object.assign({}, _ibcPolicyDefaults(policy.type || "wl"), policy || {});
    let cv = p.startingCV || 0;
    let pua = p.startingPUA || 0;
    let loanBalance = p.startingLoanBalance || 0;
    let totalPremiumsPaid = p.startingPremiumsPaid || 0;
    const data = [];
    const hist = (p.history || []).slice().sort(function(a, b) {
      return (a.monthOffset || 0) - (b.monthOffset || 0);
    });
    if (hist.length >= 2) {
      p._realizedRate = _ibcComputeRealizedRate(p, hist[hist.length - 2], hist[hist.length - 1]);
    }
    for (let m = fromMonth; m <= toMonth; m++) {
      const anchor = _ibcFindAnchor(hist, m);
      if (anchor) {
        cv = anchor.cashValue != null ? anchor.cashValue : cv;
        loanBalance = anchor.loanBalance != null ? anchor.loanBalance : loanBalance;
        if (anchor.premiumPaidYTD != null) totalPremiumsPaid = anchor.premiumPaidYTD;
      }
      if (m > fromMonth) {
        totalPremiumsPaid += p.monthlyPremium || 0;
      }
      if (loanBalance > 0 && (p.monthlyLoanRepay || 0) > 0) {
        const monthlyLoanInterest = loanBalance * ((p.loanRate || 0.05) / 12);
        const principalPaydown = Math.max(0, p.monthlyLoanRepay - monthlyLoanInterest);
        loanBalance = Math.max(0, loanBalance - principalPaydown);
      }
      if (m > fromMonth && m % 12 === 0) {
        const policyYear = Math.floor(m / 12);
        const rate = _ibcEffectiveCreditRate(p);
        if (p.type === "wl") {
          const wlc = _ibcWLAnnualCredit(p, policyYear, cv, pua);
          cv += wlc.cvDelta;
          pua += wlc.puaDelta;
        } else {
          const ic = _ibcIULAnnualCredit(p, policyYear, cv, rate);
          cv += ic.avDelta;
        }
      }
      data.push({
        month: m,
        cv: Math.round(cv),
        pua: Math.round(pua),
        loanBalance: Math.round(loanBalance),
        availableCV: Math.max(0, Math.round(cv - loanBalance)),
        totalPremiumsPaid: Math.round(totalPremiumsPaid),
        isAnchor: !!anchor,
        isAnniversary: m > 0 && m % 12 === 0
      });
    }
    return {
      data,
      realizedRate: p._realizedRate || null,
      illustratedRate: p.type === "wl" ? p.netEffectiveRate || 0.04 : _ibcIULCreditRate(p),
      drift: _ibcDriftCategory(p._realizedRate, p.type === "wl" ? p.netEffectiveRate || 0.04 : _ibcIULCreditRate(p))
    };
  }

  // src/engine/ibc-cascade.ts
  var ibc_cascade_exports = {};
  __export(ibc_cascade_exports, {
    describeIBCPayoff: () => describeIBCPayoff,
    ibcSurrenderEconomics: () => ibcSurrenderEconomics,
    simulateIBCDebtCascade: () => simulateIBCDebtCascade,
    simulateIBCDebtCascadeBest: () => simulateIBCDebtCascadeBest
  });
  function simulateIBCDebtCascade(debts, budget, opts = {}) {
    if (!debts || !debts.length || budget <= 0) return null;
    const chassis = opts.chassis === "iul" ? "iul" : "wl";
    const ltvCap = opts.ltvCap != null ? opts.ltvCap : 0.9;
    const loanAnnRate = opts.loanAnnRate != null ? opts.loanAnnRate : 0.05;
    const trailMonths = opts.trailMonths != null ? opts.trailMonths : 24;
    const runFull = !!opts.runFullHorizon;
    const maxMonths = opts.maxMonths != null ? opts.maxMonths : runFull ? (opts.years || 30) * 12 : 720;
    const _userRepay = typeof opts.userRepayOverride === "number" && opts.userRepayOverride >= 0 ? opts.userRepayOverride : null;
    const ordering = opts.ordering === "affordable" ? "affordable" : "strict";
    const issueAge = opts.issueAge != null ? opts.issueAge : 35;
    const ibcParams = Object.assign({}, _ibcPolicyDefaults(chassis), { monthlyPremium: budget, issueAge }, opts.policyParams || {});
    const iulLtv = (year) => {
      if (opts.iulLtvByYear && opts.iulLtvByYear[year - 1] != null) return opts.iulLtvByYear[year - 1];
      return Math.min(1, 0.7 + (year - 1) * (0.3 / 14));
    };
    const ltvForYear = (year) => chassis === "iul" ? iulLtv(year) : ltvCap;
    const creditAnniv = (policyYear, annivCV, premSinceAnniv) => {
      if (chassis === "iul") {
        const c2 = _ibcIULAnnualCredit(ibcParams, policyYear, annivCV, null);
        const b = c2.breakdown;
        const load = (b.yearlyPremium || 0) - (b.netPremium || 0);
        const fees = load + (b.policyFee || 0) + (b.per1000 || 0) + (b.coi || 0);
        return { cv: annivCV + c2.avDelta, fees };
      }
      const c = _ibcWLAnnualCredit(ibcParams, policyYear, annivCV, 0);
      const efficiency = _ibcYearFactor(ibcParams.cvEfficiencyYr, policyYear, 1);
      const stuck = premSinceAnniv * efficiency;
      return { cv: annivCV + stuck + c.breakdown.guaranteedGrowth + c.breakdown.dividend, fees: premSinceAnniv - stuck };
    };
    const ds = debts.map((d, i) => ({
      name: d.name || "Debt " + (i + 1),
      bal: pnum(d.balance),
      rate: pnum(d.rate) / 100 / 12,
      annualRate: pnum(d.rate),
      min: pnum(d.min),
      paid: false
    }));
    ds.sort((a, b) => b.rate - a.rate);
    let vehicle = 0, totalDebtInt = 0, totalLoanInt = 0, totalFees = 0, totalLoaned = 0, month = 0;
    let totalLoanBalance = 0, totalLoanFreedMins = 0, lastAnnivCV = 0, premiumSinceAnniv = 0;
    let origFreeMonth = null;
    let loanEventThisYear = false;
    const payoffLog = [];
    const series = [];
    const yearSnaps = [];
    while (month < maxMonths) {
      month++;
      premiumSinceAnniv += budget;
      vehicle = lastAnnivCV + premiumSinceAnniv;
      const ltvNow = ltvForYear(Math.floor((month - 1) / 12) + 1);
      ds.forEach((d) => {
        if (d.bal < 0.01 || d.paid) return;
        const interest = d.bal * d.rate;
        totalDebtInt += interest;
        d.bal += interest;
        const pmt = Math.min(d.min, d.bal);
        d.bal -= pmt;
        if (d.bal < 0.01) d.bal = 0;
      });
      for (let _i = 0; _i < ds.length; _i++) {
        const d = ds[_i];
        if (d.bal < 0.01) {
          d.paid = true;
          continue;
        }
        if (d.paid) continue;
        const borrowable = ltvNow * vehicle - totalLoanBalance;
        if (borrowable >= d.bal) {
          totalLoanBalance += d.bal;
          totalLoanFreedMins += d.min;
          totalLoaned += d.bal;
          payoffLog.push({ name: d.name, month, balAtLoan: Math.round(d.bal), annualRate: d.annualRate, freedMin: d.min });
          d.bal = 0;
          d.paid = true;
          loanEventThisYear = true;
        } else if (ordering === "strict") {
          break;
        }
      }
      if (totalLoanBalance > 0) {
        const loanInterest = totalLoanBalance * loanAnnRate / 12;
        totalLoanInt += loanInterest;
        totalLoanBalance += loanInterest;
        let baseLoanPmt = totalLoanFreedMins;
        const allDebtsPaid = ds.every((d) => d.paid || d.bal < 0.01);
        if (_userRepay != null && allDebtsPaid) baseLoanPmt = _userRepay;
        const loanPayment = Math.min(baseLoanPmt, totalLoanBalance);
        totalLoanBalance -= loanPayment;
        if (totalLoanBalance < 0.01) totalLoanBalance = 0;
      }
      if (month % 12 === 0) {
        const policyYear = month / 12;
        const cr = creditAnniv(policyYear, lastAnnivCV, premiumSinceAnniv);
        lastAnnivCV = cr.cv;
        totalFees += cr.fees;
        premiumSinceAnniv = 0;
        vehicle = lastAnnivCV;
        yearSnaps.push({
          yr: policyYear,
          age: issueAge + policyYear,
          cv: Math.round(vehicle),
          net: Math.round(Math.max(0, vehicle - totalLoanBalance)),
          lb: Math.round(totalLoanBalance),
          ltv: vehicle > 0 ? Math.round(totalLoanBalance / vehicle * 100) : 0,
          le: loanEventThisYear
        });
        loanEventThisYear = false;
      }
      const origLeft = ds.some((d) => d.bal > 0.01);
      if (!origLeft && origFreeMonth === null) origFreeMonth = month;
      series.push({ month, av: Math.round(vehicle), cv: Math.round(Math.max(0, vehicle - totalLoanBalance)), loanBal: Math.round(totalLoanBalance), freedMins: Math.round(totalLoanFreedMins), premiumSinceAnniv: Math.round(premiumSinceAnniv) });
      if (!runFull && !origLeft && totalLoanBalance <= 0) break;
    }
    const fullFreeMonth = month;
    if (!runFull) {
      for (let _t = 0; _t < trailMonths; _t++) {
        month++;
        premiumSinceAnniv += budget;
        vehicle = lastAnnivCV + premiumSinceAnniv;
        if (month % 12 === 0) {
          const pyT = month / 12;
          const cr = creditAnniv(pyT, lastAnnivCV, premiumSinceAnniv);
          lastAnnivCV = cr.cv;
          totalFees += cr.fees;
          premiumSinceAnniv = 0;
          vehicle = lastAnnivCV;
        }
        series.push({ month, av: Math.round(vehicle), cv: Math.round(vehicle), loanBal: 0, freedMins: 0, premiumSinceAnniv: Math.round(premiumSinceAnniv) });
      }
    }
    return {
      months: origFreeMonth || fullFreeMonth,
      fullFreeMonth,
      interest: Math.round(totalDebtInt + totalLoanInt),
      vehicle: Math.round(vehicle),
      budget,
      payoffLog,
      series,
      totalLoanInterest: Math.round(totalLoanInt),
      totalDebtInterest: Math.round(totalDebtInt),
      totalPremiumsPaid: Math.round(budget * month),
      totalFees: Math.round(totalFees),
      totalLoaned: Math.round(totalLoaned),
      yearSnaps
    };
  }
  function ibcSurrenderEconomics(cvGross, totalPremiumsPaid, marginalRate) {
    const gross = Math.max(0, cvGross);
    const basis = Math.max(0, totalPremiumsPaid);
    const taxableGain = Math.max(0, gross - basis);
    const tax = Math.round(taxableGain * marginalRate);
    return { gross: Math.round(gross), basis: Math.round(basis), taxableGain: Math.round(taxableGain), tax, afterTax: Math.max(0, Math.round(gross - tax)) };
  }
  function describeIBCPayoff(r) {
    const yr = (m) => (m / 12).toFixed(1);
    const lines = r.payoffLog.map((p, i) => `${i + 1}. ${p.name} (${p.annualRate}%) \u2014 paid in full via policy loan in month ${p.month} (year ${yr(p.month)})`);
    const order = lines.length ? lines.join("\n") : "(no debts qualified for a policy-loan payoff)";
    return `Debts are eliminated in this order using policy loans:
${order}
All debts are cleared by month ${r.months} (${yr(r.months)} yr). The policy loans are then repaid with the freed minimums and fully cleared by month ${r.fullFreeMonth} (${yr(r.fullFreeMonth)} yr), after which those minimums cascade toward your other goals.`;
  }
  function simulateIBCDebtCascadeBest(debts, budget, opts = {}) {
    const strict = simulateIBCDebtCascade(debts, budget, __spreadProps(__spreadValues({}, opts), { ordering: "strict" }));
    const afford = simulateIBCDebtCascade(debts, budget, __spreadProps(__spreadValues({}, opts), { ordering: "affordable" }));
    if (!strict && !afford) return null;
    let win, winStrat;
    let lose = null, loseStrat;
    if (!afford) {
      win = strict;
      winStrat = "avalanche";
      loseStrat = "affordable";
    } else if (!strict) {
      win = afford;
      winStrat = "affordable";
      loseStrat = "avalanche";
    } else {
      const affordWins = afford.fullFreeMonth < strict.fullFreeMonth || afford.fullFreeMonth === strict.fullFreeMonth && afford.interest < strict.interest;
      if (affordWins) {
        win = afford;
        winStrat = "affordable";
        lose = strict;
        loseStrat = "avalanche";
      } else {
        win = strict;
        winStrat = "avalanche";
        lose = afford;
        loseStrat = "affordable";
      }
    }
    return __spreadProps(__spreadValues({}, win), {
      strategy: winStrat,
      description: describeIBCPayoff(win),
      alternative: lose ? { strategy: loseStrat, months: lose.months, fullFreeMonth: lose.fullFreeMonth, interest: lose.interest } : null
    });
  }

  // src/engine/calculators/monte-carlo.ts
  var MC_DRAW_RATES = {
    conservative: { mean: 0.045, std: 0.06 },
    // ~30/70 — low vol
    moderate: { mean: 0.055, std: 0.095 },
    // ~50/50
    aggressive: { mean: 0.065, std: 0.13 }
    // ~60/40+ — high vol
  };
  function drawRatesForRisk(level) {
    return MC_DRAW_RATES[level || "moderate"] || MC_DRAW_RATES.moderate;
  }
  var MC_DRAW_MEAN = MC_DRAW_RATES.moderate.mean;
  var MC_DRAW_STD = MC_DRAW_RATES.moderate.std;
  var MC_INFL = 0.03;
  var MC_TARGET_SUCCESS = 0.95;
  var MC_SIMS = 1e3;
  var MC_SEED = 2654435769;
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function() {
      a |= 0;
      a = a + 1831565813 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function randNorm(rng) {
    const u = 1 - rng();
    const v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function genPaths(rng, sims, n, mean, std) {
    const paths = [];
    for (let s = 0; s < sims; s++) {
      const row = [];
      for (let y = 0; y < n; y++) row.push(mean + std * randNorm(rng));
      paths.push(row);
    }
    return paths;
  }
  function survivalProb(startBal, netAnnualNeed, paths, infl) {
    const n = paths[0] ? paths[0].length : 0;
    let survived = 0;
    for (let s = 0; s < paths.length; s++) {
      let b = startBal, ok = true;
      for (let y = 0; y < n; y++) {
        b = b * (1 + paths[s][y]) - netAnnualNeed * Math.pow(1 + infl, y);
        if (b <= 0) {
          ok = false;
          break;
        }
      }
      if (ok) survived++;
    }
    return paths.length ? survived / paths.length : 0;
  }
  function fiTargetMC(netAnnualNeed, retYears, opts = {}) {
    const need = Math.max(0, netAnnualNeed);
    if (need === 0) return 0;
    const n = Math.max(1, retYears);
    const _rl = opts.riskLevel ? drawRatesForRisk(opts.riskLevel) : null;
    const drawMean = opts.drawMean != null ? opts.drawMean : _rl ? _rl.mean : MC_DRAW_MEAN;
    const drawStd = opts.drawStd != null ? opts.drawStd : _rl ? _rl.std : MC_DRAW_STD;
    const infl = opts.infl != null ? opts.infl : MC_INFL;
    const target = opts.targetSuccess != null ? opts.targetSuccess : MC_TARGET_SUCCESS;
    const sims = opts.sims != null ? opts.sims : MC_SIMS;
    const seed = opts.seed != null ? opts.seed : MC_SEED;
    const paths = genPaths(mulberry32(seed), sims, n, drawMean, drawStd);
    let lo = 0, hi = 0;
    for (let y = 0; y < n; y++) hi += need * Math.pow(1 + infl, y);
    hi *= 1.1;
    for (let it = 0; it < 40; it++) {
      const mid = (lo + hi) / 2;
      if (survivalProb(mid, need, paths, infl) >= target) hi = mid;
      else lo = mid;
    }
    return Math.round(hi);
  }
  function monteCarloRetirement(input) {
    const bal = pf(input.bal) || 0;
    const contrib = pf(input.contrib) || 0;
    const ret = (pf(input.accumReturn) || 7) / 100;
    const std = (pf(input.std) || 12) / 100;
    const age = pi(input.age) || 0;
    const retAge = pi(input.retAge) || 65;
    const lifeExp = pi(input.lifeExp) || 90;
    const spend = pf(input.spend) || 0;
    const infl = input.infl != null ? pf(input.infl) / 100 : MC_INFL;
    const sims = pi(input.sims) || MC_SIMS;
    const seed = input.seed != null ? pi(input.seed) : MC_SEED;
    const accYrs = Math.max(1, retAge - age);
    const drawYrs = Math.max(1, lifeExp - retAge);
    const rng = mulberry32(seed);
    let successes = 0;
    const finalVals = [];
    const failYears = [];
    for (let s = 0; s < sims; s++) {
      let b = bal;
      for (let y = 0; y < accYrs; y++) {
        const r = ret + std * randNorm(rng);
        b = b * (1 + r) + contrib * 12;
      }
      let survived = true;
      for (let y2 = 0; y2 < drawYrs; y2++) {
        const r2 = ret * 0.8 + std * 0.8 * randNorm(rng);
        b = b * (1 + r2) - spend * 12 * Math.pow(1 + infl, y2);
        if (b <= 0) {
          survived = false;
          failYears.push(y2);
          break;
        }
      }
      if (survived) successes++;
      finalVals.push(Math.max(0, Math.round(b)));
    }
    finalVals.sort(function(a, b) {
      return a - b;
    });
    const at = (q) => finalVals[Math.round(sims * q)] || 0;
    return {
      sims,
      prob: Math.round(successes / sims * 100),
      successes,
      retAge,
      lifeExp,
      worst5: at(0.05),
      p10: at(0.1),
      p25: at(0.25),
      median: at(0.5),
      p75: at(0.75),
      best5: at(0.95),
      avgFailYr: failYears.length ? Math.round(failYears.reduce((a, b) => a + b, 0) / failYears.length) : 0
    };
  }

  // src/engine/calculators/retirement-fi.ts
  var SS_RELIABILITY = 0;
  function fiAnnuityFactor(n, rReal) {
    const yrs = Math.max(1, n);
    if (!rReal) return yrs;
    const x = 1 / (1 + rReal);
    return (1 - Math.pow(x, yrs)) / (1 - x);
  }
  function fiTarget(netAnnualNeed, retYears, rReal) {
    const need = Math.max(0, netAnnualNeed);
    return Math.round(need * fiAnnuityFactor(retYears, rReal));
  }
  function calibrateRealReturn(netAnnualNeed, retYears, targetCapital) {
    if (netAnnualNeed <= 0) return 0;
    let lo = -0.05, hi = 0.12;
    for (let i = 0; i < 48; i++) {
      const mid = (lo + hi) / 2;
      if (fiTarget(netAnnualNeed, retYears, mid) < targetCapital) hi = mid;
      else lo = mid;
    }
    return (lo + hi) / 2;
  }
  function retirementFI(input) {
    const age = pi(input.age) || 0;
    const retAge = pi(input.retAge) || 55;
    const lifeExp = pi(input.lifeExp) || 90;
    const income = pf(input.income) || 0;
    const expenses = pf(input.expenses) || 0;
    const assets = pf(input.assets) || 0;
    const monthlyNeed = pf(input.monthlyNeed) || 0;
    const ss = pf(input.ss) || 0;
    const ret = (pf(input.accumReturn) || 7) / 100;
    const ssReliability = input.ssReliability != null ? Math.max(0, Math.min(1, pf(input.ssReliability))) : SS_RELIABILITY;
    const targetSuccess = input.targetSuccess != null ? pf(input.targetSuccess) : MC_TARGET_SUCCESS;
    const infl = (pf(input.infl) || 3) / 100;
    const draw = drawRatesForRisk(input.riskLevel);
    const annualSav = income - expenses;
    const savRate = income > 0 ? Math.round(annualSav / income * 100) : 0;
    const retYears = Math.max(1, lifeExp - retAge);
    const ssCredited = ss * ssReliability;
    const netMonthlyNeed = Math.max(0, monthlyNeed - ssCredited);
    const netAnnualNeed = netMonthlyNeed * 12;
    const fiNumber = fiTargetMC(netAnnualNeed, retYears, { drawMean: draw.mean, drawStd: draw.std, infl, targetSuccess });
    const rReal = calibrateRealReturn(netAnnualNeed, retYears, fiNumber);
    let bal = assets, actualRetAge = 0;
    for (let y2 = 0; y2 < 80; y2++) {
      const curAge = age + y2;
      const remainYrs = Math.max(1, lifeExp - curAge);
      const targetAtAge = fiTarget(netAnnualNeed, remainYrs, rReal);
      if (bal >= targetAtAge && curAge >= age) {
        actualRetAge = curAge;
        break;
      }
      bal = (bal + Math.max(0, annualSav)) * (1 + ret);
    }
    if (!actualRetAge) actualRetAge = lifeExp;
    const progress = fiNumber > 0 ? Math.min(100, Math.round(assets / fiNumber * 100)) : 0;
    const gap = Math.max(0, fiNumber - assets);
    const gapToGoal = actualRetAge - retAge;
    let reqIncrease = 0;
    if (gapToGoal > 0) {
      const yrsToGoal = Math.max(1, retAge - age), mr = ret / 12, months = yrsToGoal * 12;
      const fvBal = assets * Math.pow(1 + mr, months);
      const needed = fiNumber - fvBal;
      reqIncrease = needed > 0 && mr > 0 ? Math.round(needed * mr / (Math.pow(1 + mr, months) - 1)) : 0;
      reqIncrease = Math.max(0, reqIncrease - Math.round(annualSav / 12));
    }
    const scenarios = [];
    [0, 5, 10, 15].forEach(function(extra) {
      let b2 = assets, fa2 = 0;
      for (let y3 = 0; y3 < 80; y3++) {
        const ca = age + y3;
        const targetAtCa = fiTarget(netAnnualNeed, Math.max(1, lifeExp - ca), rReal);
        if (b2 >= targetAtCa) {
          fa2 = ca;
          break;
        }
        b2 = (b2 + annualSav + income * extra / 100) * (1 + ret);
      }
      if (!fa2) fa2 = lifeExp;
      scenarios.push({ extra, age: fa2, diff: fa2 - actualRetAge });
    });
    let coastBal = assets;
    for (let y4 = 0; y4 < Math.max(0, retAge - age); y4++) coastBal = coastBal * (1 + ret);
    const coastFIRE = coastBal >= fiNumber;
    let healthcareCost = 0;
    if (actualRetAge < 65) {
      for (let hc = 0; hc < 65 - actualRetAge; hc++) healthcareCost += 12e3 * Math.pow(1.055, hc);
      healthcareCost = Math.round(healthcareCost);
    }
    return {
      age,
      retAge,
      lifeExp,
      income,
      expenses,
      assets,
      monthlyNeed,
      ss,
      ssReliability,
      ssCredited,
      netMonthlyNeed,
      netAnnualNeed,
      ret,
      rReal,
      infl,
      annualSav,
      savRate,
      targetSuccess,
      retYears,
      fiNumber,
      actualRetAge,
      progress,
      gap,
      gapToGoal,
      reqIncrease,
      coastBal: Math.round(coastBal),
      coastFIRE,
      healthcareCost,
      scenarios
    };
  }

  // src/engine/calc.ts
  function computeCalcs(S) {
    const prof = S.profile || {};
    let incPersonal = 0, incSpouse = 0, incJoint = 0;
    let incPersonalGross = 0, incSpouseGross = 0, incJointGross = 0;
    (S.incomeSources || []).forEach(function(src) {
      const amt = _incSrcMonthlyTakeHome(src);
      const grossAmt = _incSrcMonthlyGross(src, S);
      if (src.owner === "spouse") {
        incSpouse += amt;
        incSpouseGross += grossAmt;
      } else if (src.owner === "joint") {
        incJoint += amt;
        incJointGross += grossAmt;
      } else {
        incPersonal += amt;
        incPersonalGross += grossAmt;
      }
    });
    if (S.householdType === "hybrid" && S._jointItems && Array.isArray(S._jointItems.incomeSources)) {
      const myField = _hybridShareField(S);
      S._jointItems.incomeSources.forEach(function(src) {
        const amt = _incSrcMonthlyTakeHome(src);
        const grossAmt = _incSrcMonthlyGross(src, S);
        const pct = src[myField] !== void 0 ? pnum(src[myField]) : 50;
        incJoint += amt * pct / 100;
        incJointGross += grossAmt * pct / 100;
      });
    }
    const inc = incPersonal + incSpouse + incJoint;
    const incGross = incPersonalGross + incSpouseGross + incJointGross;
    const sahValue = S.spouseStayHome ? pnum(S.sahMonthlyValue) : 0;
    initExpData(S);
    const baseExp = getTotalMonthlyExp(S), netCF = inc - baseExp;
    const savingsExp = getMonthlyExp(S, "activeSavings"), savingsRate = inc > 0 ? savingsExp / inc * 100 : 0;
    const _a = S.assets || {};
    const aChecking = pf(_a.checking), aSavings = pf(_a.savings);
    const aCash = aChecking + aSavings;
    let _invSum = (S.investments || []).reduce(function(t, iv) {
      if (!iv) return t;
      const typ = (iv.type || "").toLowerCase();
      if (typ === "crypto") return t;
      return t + pnum(iv.balance);
    }, 0);
    if (S.householdType === "hybrid" && S._jointItems && Array.isArray(S._jointItems.investments)) {
      const _myFieldI = _hybridShareField(S);
      S._jointItems.investments.forEach(function(iv) {
        if (!iv) return;
        const typ = (iv.type || "").toLowerCase();
        if (typ === "crypto") return;
        const bal = pnum(iv.balance);
        const pct = iv[_myFieldI] !== void 0 ? pnum(iv[_myFieldI]) : 50;
        _invSum += bal * pct / 100;
      });
    }
    const aInvest = _invSum > 0 ? _invSum : pnum(_a.invest);
    const aRE = pf(_a.re), aOther = pf(_a.other);
    let totalAssets = aCash + aInvest + aRE + aOther;
    let totalDebt = (S.debts || []).reduce(function(s, d) {
      return s + pnum(d.balance);
    }, 0);
    let totalMin = (S.debts || []).reduce(function(s, d) {
      return s + pnum(d.min);
    }, 0);
    if (S.householdType === "hybrid" && S._jointItems && Array.isArray(S._jointItems.debts)) {
      const _myFieldD = _hybridShareField(S);
      S._jointItems.debts.forEach(function(d) {
        if (!d) return;
        const pct = d[_myFieldD] !== void 0 ? pnum(d[_myFieldD]) : 50;
        totalDebt += pnum(d.balance) * pct / 100;
        totalMin += pnum(d.min) * pct / 100;
      });
    }
    const retBalSum = (S.retAccounts || []).reduce(function(s, a) {
      return s + pnum(a.balance);
    }, 0);
    totalAssets += retBalSum;
    const netWorth = totalAssets - totalDebt, dti = inc > 0 ? totalMin / inc * 100 : 0;
    const efMonths = baseExp > 0 ? aSavings / baseExp : 0;
    const efT3 = baseExp * 3, efT6 = baseExp * 6, efS3 = Math.max(0, efT3 - aSavings), efS6 = Math.max(0, efT6 - aSavings);
    const creditScore = pi(prof.creditScore) || pnum(S.creditScore) || 0;
    const currentAge = pi(prof.currentAge) || pnum(S.currentAge) || 0;
    const retAge = pi(prof.retAge) || 65, retInc = pf(prof.retIncome) || 5e3;
    const retLifeExp = pi(prof.retLifeExp) || 90;
    const retYearsInRetirement = Math.max(1, retLifeExp - retAge);
    const retInflation = (pf(prof.retInflation) || 3) / 100;
    const yearsToRetire = currentAge > 0 ? Math.max(0, retAge - currentAge) : 30;
    const _ssCredited = (pf(prof.ssBenefit) || 0) * SS_RELIABILITY;
    const _fiNetAnnual = Math.max(0, retInc - _ssCredited) * 12;
    const _fiDraw = drawRatesForRisk(prof.retRiskLevel || "moderate");
    const fiNumber = fiTargetMC(_fiNetAnnual, retYearsInRetirement, { drawMean: _fiDraw.mean, drawStd: _fiDraw.std, infl: retInflation, targetSuccess: MC_TARGET_SUCCESS });
    const fiNumberInflAdj = fiNumber;
    const retRiskLevel = prof.retRiskLevel || "moderate";
    const _retRates = { conservative: { low: 2, mid: 5, high: 7 }, moderate: { low: 4, mid: 7, high: 10 }, aggressive: { low: 5, mid: 9, high: 12 } };
    const _rr = _retRates[retRiskLevel] || _retRates.moderate;
    let blendedRetReturn = pf(prof.retReturn) || _rr.mid;
    let projRetBal = 0, totalMonthlyRetContrib = 0;
    const retReturnLow = Math.max(0, blendedRetReturn - 3), retReturnHigh = blendedRetReturn + 3;
    if (S.retAccounts && S.retAccounts.length) {
      let totalWeightedReturn = 0;
      S.retAccounts.forEach(function(a) {
        const rt = RET_TYPES.find(function(t) {
          return t.val === a.type;
        }) || {};
        const bal = pnum(a.balance);
        const contrib = a.type === "pension" || rt.allowContrib !== false ? pnum(a.contrib) : 0;
        const matchMonthly = rt.allowMatch && pnum(a.matchPct) > 0 ? incGross * (Math.min(pnum(a.contribPct), pnum(a.matchPct)) / 100) : 0;
        const retRate = (a.returnPct != null ? pnum(a.returnPct) : 7) / 100;
        const mrr = retRate / 12;
        const totC = contrib + matchMonthly;
        let acctProjected;
        if (a.type === "pension") {
          acctProjected = bal + contrib * 12 * 25;
        } else {
          acctProjected = mrr > 0 ? bal * Math.pow(1 + mrr, yearsToRetire * 12) + totC * ((Math.pow(1 + mrr, yearsToRetire * 12) - 1) / mrr) : bal + totC * yearsToRetire * 12;
        }
        projRetBal += acctProjected;
        if (a.type !== "pension") totalMonthlyRetContrib += totC;
        totalWeightedReturn += (a.returnPct != null ? pnum(a.returnPct) : 7) * (bal || 1);
      });
      const totalBalForWeight = S.retAccounts.reduce(function(s, a) {
        return s + (pnum(a.balance) || 1);
      }, 0);
      blendedRetReturn = totalWeightedReturn / totalBalForWeight;
    } else {
      const ret = S.ret || {};
      const retBal = pnum(ret.balance), retContrib = pnum(ret.contrib);
      const retReturn = pf(prof.retReturn) || 7, empMatch = pnum(prof.empMatch);
      blendedRetReturn = retReturn;
      totalMonthlyRetContrib = retContrib + incGross * (empMatch / 100);
      const mrr = retReturn / 100 / 12;
      projRetBal = mrr > 0 ? retBal * Math.pow(1 + mrr, yearsToRetire * 12) + totalMonthlyRetContrib * ((Math.pow(1 + mrr, yearsToRetire * 12) - 1) / mrr) : retBal + totalMonthlyRetContrib * yearsToRetire * 12;
    }
    let projRetBalLow = 0, projRetBalHigh = 0;
    if (S.retAccounts && S.retAccounts.length) {
      S.retAccounts.forEach(function(a) {
        const bal = pnum(a.balance);
        const totC = pnum(a.contrib) + (pnum(a.matchPct) > 0 ? incGross * (Math.min(pnum(a.contribPct), pnum(a.matchPct)) / 100) : 0);
        const mrrL = retReturnLow / 100 / 12;
        const mrrH = retReturnHigh / 100 / 12;
        projRetBalLow += mrrL > 0 ? bal * Math.pow(1 + mrrL, yearsToRetire * 12) + totC * ((Math.pow(1 + mrrL, yearsToRetire * 12) - 1) / mrrL) : bal + totC * yearsToRetire * 12;
        projRetBalHigh += mrrH > 0 ? bal * Math.pow(1 + mrrH, yearsToRetire * 12) + totC * ((Math.pow(1 + mrrH, yearsToRetire * 12) - 1) / mrrH) : bal + totC * yearsToRetire * 12;
      });
    } else {
      const _mrrL = retReturnLow / 100 / 12;
      const _mrrH = retReturnHigh / 100 / 12;
      const ret = S.ret || {};
      const _tb = pnum(ret.balance), _tc = pnum(ret.contrib);
      projRetBalLow = _mrrL > 0 ? _tb * Math.pow(1 + _mrrL, yearsToRetire * 12) + _tc * ((Math.pow(1 + _mrrL, yearsToRetire * 12) - 1) / _mrrL) : _tb + _tc * yearsToRetire * 12;
      projRetBalHigh = _mrrH > 0 ? _tb * Math.pow(1 + _mrrH, yearsToRetire * 12) + _tc * ((Math.pow(1 + _mrrH, yearsToRetire * 12) - 1) / _mrrH) : _tb + _tc * yearsToRetire * 12;
    }
    const retGap = fiNumber - projRetBal, retStatus = retGap <= 0 ? "on-track" : retGap < fiNumber * 0.3 ? "close" : "behind";
    const projRetBalReal = projRetBal / Math.pow(1 + retInflation, yearsToRetire);
    let requiredMonthlyIncrease = 0;
    if (retGap > 0 && yearsToRetire > 0) {
      const retR = blendedRetReturn / 100 / 12;
      if (retR > 0) {
        const fvFactor = (Math.pow(1 + retR, yearsToRetire * 12) - 1) / retR;
        requiredMonthlyIncrease = fvFactor > 0 ? Math.ceil(retGap / fvFactor) : 0;
      } else {
        requiredMonthlyIncrease = Math.ceil(retGap / (yearsToRetire * 12));
      }
    }
    let efBuildMonths3 = 0, efBuildMonths6 = 0;
    if (netCF > 0 && efS3 > 0) efBuildMonths3 = Math.ceil(efS3 / netCF);
    if (netCF > 0 && efS6 > 0) efBuildMonths6 = Math.ceil(efS6 / netCF);
    let cfScore = 0;
    if (netCF > 0) cfScore = Math.min(10, Math.round(netCF / Math.max(inc, 1) * 20));
    if (netCF < 0) cfScore = Math.max(0, 3 + Math.round(netCF / 500));
    let protScore = 5;
    if (getMonthlyExp(S, "insurance") > 100) protScore += 2;
    if (efMonths >= 3) protScore += 2;
    if (efMonths >= 6) protScore += 1;
    if (creditScore >= 700) protScore += 1;
    if (S.protCalcs) {
      const pc = S.protCalcs;
      const pg = pnum(pc.gap), pi2 = pnum(pc.annIncome) || 1;
      if (pg > pi2 * 5) protScore -= 3;
      else if (pg > pi2 * 2) protScore -= 2;
      else if (pg > 0) protScore -= 1;
      else if (pg < 0) protScore = Math.min(10, protScore + 1);
    }
    protScore = Math.max(0, Math.min(10, protScore));
    let growScore = 0;
    if (savingsRate >= 20) growScore = 10;
    else if (savingsRate >= 15) growScore = 8;
    else if (savingsRate >= 10) growScore = 6;
    else if (savingsRate >= 5) growScore = 4;
    else if (savingsRate > 0) growScore = 2;
    if (totalMonthlyRetContrib > 0) growScore = Math.min(10, growScore + 1);
    if (aInvest > inc * 3) growScore = Math.min(10, growScore + 1);
    const leakCount = Object.keys(S.expData || {}).filter(function(k) {
      return S.expData[k] && S.expData[k].leakTagged;
    }).length;
    let effScore = 10;
    effScore -= leakCount;
    if (dti > 43) effScore -= 3;
    else if (dti > 36) effScore -= 2;
    else if (dti > 28) effScore -= 1;
    const subRatio = baseExp > 0 ? getMonthlyExp(S, "subscriptions") / baseExp : 0;
    if (subRatio > 0.08) effScore -= 1;
    effScore = Math.max(0, Math.min(10, effScore));
    let fpi = 0;
    if (netCF < 0) fpi += 3;
    else if (netCF < 200) fpi += 2;
    if (dti > 43) fpi += 3;
    else if (dti > 36) fpi += 2;
    if (efMonths < 1) fpi += 3;
    else if (efMonths < 3) fpi += 1;
    if (leakCount > 3) fpi += 1;
    fpi = Math.min(10, fpi);
    const _inc = S.incomeSources || [];
    const nonCons = _inc.filter(function(s) {
      return s.consistency !== "consistent";
    }).length;
    let incRisk = 0;
    if (_inc.length === 1) incRisk += 3;
    if (nonCons >= _inc.length) incRisk += 3;
    else if (nonCons > 0) incRisk += 1;
    if (savingsRate < 5) incRisk += 2;
    if (efMonths < 3) incRisk += 2;
    incRisk = Math.min(10, incRisk);
    const spendStab = Math.max(0, Math.min(10, 10 - leakCount - (dti > 36 ? 2 : 0) - (subRatio > 0.1 ? 1 : 0)));
    const idleCash = baseExp > 0 ? Math.max(0, aCash - efT3) : 0;
    let cashEff = Math.min(10, inc > 0 ? Math.round((savingsExp + aInvest * 0.01) / inc * 40) : 0);
    if (idleCash > 5e3) cashEff = Math.max(0, cashEff - 2);
    if (leakCount > 2) cashEff = Math.max(0, cashEff - 1);
    const totalGoalsBal = (S.goals || []).reduce(function(s, g) {
      return s + (pnum(g.current) || 0);
    }, 0);
    const totalBucketsBal = (S.buckets || []).reduce(function(s, b) {
      return s + (pnum(b.balance) || 0);
    }, 0);
    return {
      inc,
      incPersonal,
      incSpouse,
      incJoint,
      sahValue,
      incGross,
      incPersonalGross,
      incSpouseGross,
      incJointGross,
      baseExp,
      totalExp: baseExp,
      netCF,
      savingsRate,
      savingsExp,
      aCash,
      totalAssets,
      totalDebt,
      totalMin,
      netWorth,
      dti,
      efMonths,
      efT3,
      efT6,
      efS3,
      efS6,
      cfScore,
      protScore,
      growScore,
      effScore,
      fpi,
      incRisk,
      spendStab,
      fiNumber,
      fiNumberInflAdj,
      projRetBal,
      projRetBalLow: Math.round(projRetBalLow),
      projRetBalHigh: Math.round(projRetBalHigh),
      projRetBalReal,
      retGap,
      retStatus,
      yearsToRetire,
      retAge,
      retInc,
      retYearsInRetirement,
      retInflation,
      requiredMonthlyIncrease,
      totalMonthlyRetContrib,
      blendedRetReturn,
      retReturnLow,
      retReturnHigh,
      retRiskLevel,
      efBuildMonths3,
      efBuildMonths6,
      leakCount,
      subRatio,
      idleCash,
      cashEff,
      totalGoalsBal,
      totalBucketsBal,
      efBal: aCash,
      retLifeExp,
      currentAge,
      creditScore
    };
  }

  // src/engine/calculators/index.ts
  var calculators_exports = {};
  __export(calculators_exports, {
    MC_DRAW_RATES: () => MC_DRAW_RATES,
    MC_INFL: () => MC_INFL,
    MC_SEED: () => MC_SEED,
    MC_SIMS: () => MC_SIMS,
    MC_TARGET_SUCCESS: () => MC_TARGET_SUCCESS,
    SS_RELIABILITY: () => SS_RELIABILITY,
    calibrateRealReturn: () => calibrateRealReturn,
    drawRatesForRisk: () => drawRatesForRisk,
    fiAnnuityFactor: () => fiAnnuityFactor,
    fiTarget: () => fiTarget,
    fiTargetMC: () => fiTargetMC,
    monteCarloRetirement: () => monteCarloRetirement,
    mulberry32: () => mulberry32,
    retirementFI: () => retirementFI,
    savingsGoal: () => savingsGoal
  });

  // src/engine/calculators/savings-goal.ts
  function savingsGoal(input) {
    const goal = pf(input.goal) || 2e4;
    const months = Math.max(1, pi(input.months) || 24);
    const saved = pf(input.saved) || 0;
    const ret = (pf(input.ret) || 0) / 100;
    const sgInfl = (pf(input.sgInfl) || 3) / 100;
    const surplus = pf(input.surplus) || 0;
    const inflGoal = Math.round(goal * Math.pow(1 + sgInfl / 12, months));
    const remaining = Math.max(0, goal - saved);
    const mr = ret / 12;
    const monthly = mr > 0 ? Math.round(remaining * mr / (Math.pow(1 + mr, months) - 1)) : Math.round(remaining / months);
    const pct = goal > 0 ? Math.round(saved / goal * 100) : 0;
    const feasible = monthly <= surplus;
    const delayMonths = Math.max(1, months - 12);
    const delay12 = mr > 0 ? Math.round(remaining * mr / (Math.pow(1 + mr, delayMonths) - 1)) : Math.round(remaining / delayMonths);
    const totalContr = monthly * months + saved;
    const totalEarned = Math.round(goal - totalContr);
    return { goal, months, saved, ret, sgInfl, surplus, inflGoal, remaining, monthly, pct, feasible, delay12, totalContr, totalEarned };
  }

  // src/engine/index.ts
  var ENGINE_VERSION = "v5";
  function engineReady() {
    return true;
  }
  return __toCommonJS(index_exports);
})();
if (typeof window !== "undefined") { window.PFOSEngine = PFOSEngine; }
