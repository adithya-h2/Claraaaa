// College Data - Sai Vidya Institute of Technology

export interface Trustee {
  name: string;
  designation: string;
}

export interface StaffMember {
  name: string;
  email: string;
  department: string;
  subjects: string[];
  designation?: string;
  detailedDescription?: string; // New detailed sentence format description
}

export interface BankAccount {
  account_holder: string;
  account_number: string;
  bank_name: string;
  account_type: string;
  branch: string;
  ifsc_code: string;
}

export interface BranchFees {
  college_fees: number;
  skill_development: number;
  vtu_fees: number;
  exam_fees: number;
  dept_activities?: number;
  dept_activities_books?: number;
  books_fee?: number;
  alumini_fee?: number;
  graduation_day_fee?: number;
  convocation_fee?: number;
  admission_order_basis?: boolean;
  total: number;
}

export interface ComedKFees {
  college_fees: number;
  skill_development: number;
  vtu_fees: number;
  exam_fees: number;
  dept_activities?: number | string;
  dept_activities_books?: number;
  books_fee?: number;
  alumini_fee?: number;
  graduation_day_fee?: number;
  convocation_fee?: number;
  total?: number;
  total_range?: string;
}

export interface YearFeeStructure {
  branches: string[];
  fees: {
    CET?: { [branch: string]: BranchFees };
    COMED_K?: { [key: string]: BranchFees | ComedKFees };
  };
}

export interface TransportFees {
  from_bangalore_city: number;
  from_yelahanka_limits: number;
  currency: string;
  frequency: string;
}

export interface HostelFees {
  lodging: number;
  mess_deposit_refundable: number;
  mess_charges_approx_per_month: number;
  mess_charges_approx_per_annum: number;
  gst: string;
  note: string;
}

export interface PenaltySlab {
  outstanding_amount: string;
  penalty: number;
  duration: string;
}

export interface PenaltyPolicy {
  effective_from: string;
  grace_period: string;
  penalty_slabs: PenaltySlab[];
  note: string;
}

export interface FeeStructure {
  institution: string;
  academic_year: string;
  circular_ref: string;
  circular_date: string;
  payment_deadlines: {
    semester_5_and_7: string;
    semester_3: string;
  };
  payment_modes: string[];
  bank_accounts: {
    college_fees_sbi: BankAccount;
    college_fees_hdfc: BankAccount;
    bus_and_girls_hostel: BankAccount;
    boys_hostel: BankAccount;
  };
  fee_structure: {
    [key: string]: YearFeeStructure;
  };
  optional_fees: {
    college_bus_transport: TransportFees;
    girls_hostel: HostelFees;
  };
  late_payment_penalty_policy: PenaltyPolicy;
  important_notes: string[];
  contact_email: string;
}

export const BOARD_OF_TRUSTEES: Trustee[] = [
  {
    name: "Prof. M. R. Holla",
    designation: "Founder Trustee & President"
  },
  {
    name: "Dr. A.M. Padma Reddy",
    designation: "Founder Trustee & Vice President"
  },
  {
    name: "Sri. Srinivas Raju",
    designation: "Founder Trustee & Secretary"
  },
  {
    name: "Prof. R C Shanmukha Swamy",
    designation: "Founder Trustee & Joint Secretary"
  },
  {
    name: "Sri. Manohar M K",
    designation: "Founder Trustee & Treasurer"
  },
  {
    name: "Dr. Y Jayasimha",
    designation: "Founder Trustee"
  },
  {
    name: "Sri. Narayan Raju",
    designation: "Founder Trustee"
  }
];

export const STAFF_MEMBERS: StaffMember[] = [
  {
    name: "Prof. Lakshmi Durga N",
    email: "lakshmidurgan@gmail.com",
    department: "Computer Science Engineering",
    subjects: ["Software Engineering & Project Management", "Data Visualization Lab", "Computer Networks Lab"],
    detailedDescription: "Prof. Lakshmi Durga N teaches Software Engineering, Project Management, and supervises Data Visualization and Computer Networks Labs, providing theoretical and practical computer science guidance to students."
  },
  {
    name: "Prof. Anitha C S",
    email: "anithacs@gmail.com",
    department: "Computer Science Engineering",
    subjects: ["Research Methodology and IPR", "Computer Networks Lab"],
    detailedDescription: "Prof. Anitha C S specializes in Research Methodology, IPR, and Computer Networks Lab supervision, providing students with essential research skills and practical networking knowledge in computing."
  },
  {
    name: "Dr. G Dhivyasri",
    email: "gdhivyasri@gmail.com",
    department: "Computer Science Engineering",
    subjects: ["Computer Networks"],
    designation: "Doctor",
    detailedDescription: "Dr. G Dhivyasri is a Computer Networks specialist with doctoral qualifications, offering deep insights into networking technologies and protocols for advanced understanding of network systems."
  },
  {
    name: "Prof. Nisha S K",
    email: "nishask@gmail.com",
    department: "Computer Science Engineering",
    subjects: ["NOSQL Databases"],
    detailedDescription: "Prof. Nisha S K teaches NOSQL Databases, preparing students for modern big data and cloud computing challenges in contemporary database management and storage solutions."
  },
  {
    name: "Prof. Amarnath B Patil",
    email: "amarnathbpatil@gmail.com",
    department: "Computer Science Engineering",
    subjects: ["Mini Project"],
    detailedDescription: "Prof. Amarnath B Patil supervises Mini Projects, guiding students through hands-on learning experiences that bridge theoretical knowledge with real-world practical applications in computer science."
  },
  {
    name: "Dr. Nagashree N",
    email: "nagashreen@gmail.com",
    department: "Computer Science Engineering",
    subjects: ["Theory of Computation", "Yoga"],
    designation: "Doctor",
    detailedDescription: "Dr. Nagashree N teaches Theory of Computation and Yoga, demonstrating holistic education combining technical computer science fundamentals with physical wellness and mental well-being."
  },
  {
    name: "Prof. Anil Kumar K V",
    email: "anilkumarkv@gmail.com",
    department: "Computer Science Engineering",
    subjects: ["Environmental Studies"],
    detailedDescription: "Prof. Anil Kumar K V is an Environmental Studies instructor helping students understand environmental responsibilities and sustainability practices beyond core technical subjects for comprehensive development."
  },
  {
    name: "Prof. Jyoti Kumari",
    email: "jyotikumari@gmail.com",
    department: "Computer Science Engineering",
    subjects: ["Computer Networks Lab", "Physical Education (PE)"],
    detailedDescription: "Prof. Jyoti Kumari manages Computer Networks Lab and Physical Education, balancing technical proficiency with physical fitness in overall student development and well-being."
  },
  {
    name: "Prof. Vidyashree R",
    email: "vidyashreer@gmail.com",
    department: "Computer Science Engineering",
    subjects: ["Data Visualization Lab"],
    detailedDescription: "Prof. Vidyashree R conducts Data Visualization Lab, teaching essential skills in data representation and interpretation through visual means for effective information communication."
  },
  {
    name: "Dr. Bhavana A",
    email: "bhavanaa@gmail.com",
    department: "Computer Science Engineering",
    subjects: ["Mini Project"],
    designation: "Doctor",
    detailedDescription: "Dr. Bhavana A supervises Mini Projects with doctoral expertise, enriching practical project work through experienced guidance and mentorship in computer science applications."
  },
  {
    name: "Prof. Bhavya T N",
    email: "bhavyatn@gmail.com",
    department: "Computer Science Engineering",
    subjects: ["National Service Scheme (NSS)"],
    detailedDescription: "Prof. Bhavya T N teaches National Service Scheme, encouraging student engagement in social service and community development activities for holistic personality development."
  }
];

export const FEE_STRUCTURE: FeeStructure = {
  "institution": "Sai Vidya Institute of Technology",
  "academic_year": "2025-26",
  "circular_ref": "SVIT/1354/2025-26",
  "circular_date": "16.07.2025",
  "payment_deadlines": {
    "semester_5_and_7": "04/09/2025",
    "semester_3": "15/10/2025"
  },
  "payment_modes": [
    "DD",
    "NEFT",
    "RTGS",
    "IMPS",
    "PHONEPE",
    "GOOGLE PAY",
    "PAYTM",
    "NET BANKING"
  ],
  "bank_accounts": {
    "college_fees_sbi": {
      "account_holder": "SAI VIDYA INSTITUTE OF TECHNOLOGY",
      "account_number": "30729952744",
      "bank_name": "STATE BANK OF INDIA",
      "account_type": "CURRENT ACCOUNT",
      "branch": "J C ROAD",
      "ifsc_code": "SBIN0020202"
    },
    "college_fees_hdfc": {
      "account_holder": "SAI VIDYA INSTITUTE OF TECHNOLOGY",
      "account_number": "50200078903756",
      "bank_name": "HDFC BANK",
      "account_type": "CURRENT ACCOUNT",
      "branch": "HONNENAHALLI",
      "ifsc_code": "HDFC0005612"
    },
    "bus_and_girls_hostel": {
      "account_holder": "SAI VIDYA INSTITUTE OF TECHNOLOGY",
      "account_number": "43108096350",
      "bank_name": "STATE BANK OF INDIA",
      "account_type": "CURRENT ACCOUNT",
      "branch": "RAJANKUNTE",
      "ifsc_code": "SBIN0040849"
    },
    "boys_hostel": {
      "account_holder": "SVIT BOYS HOSTEL",
      "account_number": "923020002611404",
      "bank_name": "AXIS BANK",
      "account_type": "CURRENT",
      "branch": "AVALAHALLI",
      "ifsc_code": "UTIB0005019"
    }
  },
  "fee_structure": {
    "second_year_2024_batch": {
      "branches": ["ECE", "CSE", "ISE", "MECH", "CV", "CSE-AML", "CSE-DS", "MBA"],
      "fees": {
        "CET": {
          "ECE": {
            "college_fees": 84596,
            "skill_development": 10000,
            "vtu_fees": 3600,
            "exam_fees": 3360,
            "dept_activities_books": 4700,
            "total": 126256
          },
          "CSE": {
            "college_fees": 84596,
            "skill_development": 10000,
            "vtu_fees": 3600,
            "exam_fees": 3360,
            "dept_activities_books": 4700,
            "total": 126256
          },
          "ISE": {
            "college_fees": 84596,
            "skill_development": 10000,
            "vtu_fees": 3600,
            "exam_fees": 3360,
            "dept_activities_books": 4700,
            "total": 126256
          },
          "MECH": {
            "college_fees": 77750,
            "skill_development": 10000,
            "vtu_fees": 3600,
            "exam_fees": 3360,
            "dept_activities_books": 4700,
            "total": 100010
          },
          "CV": {
            "college_fees": 84596,
            "skill_development": 10000,
            "vtu_fees": 3600,
            "exam_fees": 3360,
            "dept_activities_books": 4700,
            "total": 126256
          },
          "CSE_AML": {
            "college_fees": 84596,
            "skill_development": 10000,
            "vtu_fees": 3600,
            "exam_fees": 3360,
            "dept_activities_books": 4700,
            "total": 126256
          },
          "CSE_DS": {
            "college_fees": 84596,
            "skill_development": 10000,
            "vtu_fees": 3600,
            "exam_fees": 3360,
            "dept_activities_books": 3700,
            "total": 126256
          },
          "MBA": {
            "college_fees": 84596,
            "skill_development": 10000,
            "vtu_fees": 3600,
            "exam_fees": 3960,
            "dept_activities_books": 3700,
            "total": 100010
          }
        },
        "COMED_K": {
          "all_branches_except_management": {
            "college_fees": 186111,
            "skill_development": 10000,
            "vtu_fees": 3600,
            "exam_fees": 3360,
            "dept_activities_books": 4700,
            "total": 227771
          },
          "management_quota": {
            "college_fees": 100000,
            "admission_order_basis": true,
            "skill_development": 10000,
            "vtu_fees": 3600,
            "exam_fees": 3360,
            "dept_activities_books": 4700,
            "total": 141660
          }
        }
      }
    },
    "third_year_2023_batch": {
      "branches": ["ECE", "CSE", "ISE", "MECH", "CV", "CSE-AML", "CSE-DS"],
      "fees": {
        "CET": {
          "ECE": {
            "college_fees": 76905,
            "skill_development": 10000,
            "vtu_fees": 3600,
            "exam_fees": 3360,
            "dept_activities": 2000,
            "books_fee": 1000,
            "total": 118265
          },
          "CSE": {
            "college_fees": 76905,
            "skill_development": 10000,
            "vtu_fees": 3600,
            "exam_fees": 3360,
            "dept_activities": 3100,
            "books_fee": 1000,
            "total": 117565
          },
          "ISE": {
            "college_fees": 76905,
            "skill_development": 10000,
            "vtu_fees": 3600,
            "exam_fees": 3360,
            "dept_activities": 2000,
            "books_fee": 1000,
            "total": 116865
          },
          "MECH": {
            "college_fees": 76905,
            "skill_development": 10000,
            "vtu_fees": 3600,
            "exam_fees": 3360,
            "dept_activities": 4130,
            "books_fee": 1000,
            "total": 118995
          },
          "CV": {
            "college_fees": 76905,
            "skill_development": 10000,
            "vtu_fees": 3600,
            "exam_fees": 3360,
            "dept_activities": 2000,
            "books_fee": 1000,
            "total": 116865
          },
          "CSE_AML": {
            "college_fees": 76905,
            "skill_development": 10000,
            "vtu_fees": 3600,
            "exam_fees": 3360,
            "dept_activities": 2700,
            "books_fee": 1000,
            "total": 117965
          },
          "CSE_DS": {
            "college_fees": 76905,
            "skill_development": 10000,
            "vtu_fees": 3600,
            "exam_fees": 3360,
            "dept_activities": 1700,
            "books_fee": 1000,
            "total": 116565
          }
        },
        "COMED_K": {
          "all_branches": {
            "college_fees": 169792,
            "skill_development": 10000,
            "vtu_fees": 3600,
            "exam_fees": 3360,
            "dept_activities": "varies_by_branch",
            "books_fee": 1000,
            "total_range": "189960-211282"
          }
        }
      }
    },
    "fourth_year_2022_batch": {
      "branches": ["ECE", "CSE", "ISE", "MECH", "CV", "CSE-AML", "CSE-DS"],
      "fees": {
        "CET": {
          "ECE": {
            "college_fees": 71874,
            "skill_development": 10000,
            "vtu_fees": 3600,
            "exam_fees": 3360,
            "alumini_fee": 500,
            "graduation_day_fee": 2000,
            "convocation_fee": 1200,
            "dept_activities": 1500,
            "books_fee": 1000,
            "total": 115034
          },
          "CSE": {
            "college_fees": 71874,
            "skill_development": 10000,
            "vtu_fees": 3600,
            "exam_fees": 3360,
            "alumini_fee": 500,
            "graduation_day_fee": 2000,
            "convocation_fee": 1200,
            "dept_activities": 2500,
            "books_fee": 1000,
            "total": 116034
          },
          "ISE": {
            "college_fees": 71874,
            "skill_development": 10000,
            "vtu_fees": 3600,
            "exam_fees": 3360,
            "alumini_fee": 500,
            "graduation_day_fee": 2000,
            "convocation_fee": 1200,
            "dept_activities": 800,
            "books_fee": 1000,
            "total": 114334
          },
          "MECH": {
            "college_fees": 71874,
            "skill_development": 10000,
            "vtu_fees": 3600,
            "exam_fees": 3360,
            "alumini_fee": 500,
            "graduation_day_fee": 2000,
            "convocation_fee": 1200,
            "dept_activities": 3400,
            "books_fee": 1000,
            "total": 116934
          },
          "CV": {
            "college_fees": 71874,
            "skill_development": 10000,
            "vtu_fees": 3600,
            "exam_fees": 3360,
            "alumini_fee": 500,
            "graduation_day_fee": 2000,
            "convocation_fee": 1200,
            "dept_activities": 0,
            "books_fee": 1000,
            "total": 113534
          },
          "CSE_AML": {
            "college_fees": 71874,
            "skill_development": 10000,
            "vtu_fees": 3600,
            "exam_fees": 3360,
            "alumini_fee": 500,
            "graduation_day_fee": 2000,
            "convocation_fee": 1200,
            "dept_activities": 1800,
            "books_fee": 1000,
            "total": 115334
          },
          "CSE_DS": {
            "college_fees": 71874,
            "skill_development": 10000,
            "vtu_fees": 3600,
            "exam_fees": 3360,
            "alumini_fee": 500,
            "graduation_day_fee": 2000,
            "convocation_fee": 1200,
            "dept_activities": 4130,
            "books_fee": 1000,
            "total": 117664
          }
        },
        "COMED_K": {
          "all_branches": {
            "college_fees": 158123,
            "skill_development": 10000,
            "vtu_fees": 3600,
            "exam_fees": 3360,
            "alumini_fee": 500,
            "graduation_day_fee": 2000,
            "convocation_fee": 1200,
            "dept_activities": "varies_by_branch",
            "books_fee": 1000,
            "total_range": "200583-203913"
          }
        }
      }
    }
  },
  "optional_fees": {
    "college_bus_transport": {
      "from_bangalore_city": 30000,
      "from_yelahanka_limits": 20000,
      "currency": "INR",
      "frequency": "Annual"
    },
    "girls_hostel": {
      "lodging": 40000,
      "mess_deposit_refundable": 5000,
      "mess_charges_approx_per_month": 3500,
      "mess_charges_approx_per_annum": 35000,
      "gst": "5%",
      "note": "Mess charges follow dividing system"
    }
  },
  "late_payment_penalty_policy": {
    "effective_from": "Academic Year 2025-26",
    "grace_period": "1 month from first day of semester",
    "penalty_slabs": [
      {
        "outstanding_amount": "Less than Rs. 10,000",
        "penalty": 500,
        "duration": "Per month until cleared"
      },
      {
        "outstanding_amount": "Above Rs. 10,000 but less than Rs. 50,000",
        "penalty": 1000,
        "duration": "Per month until cleared"
      },
      {
        "outstanding_amount": "Above Rs. 50,000 but less than Rs. 1,00,000",
        "penalty": 1500,
        "duration": "Per month until cleared"
      },
      {
        "outstanding_amount": "Above Rs. 1,00,000",
        "penalty": 2000,
        "duration": "Per month until cleared"
      }
    ],
    "note": "Fees dues for both first and second halves of Academic Year must be cleared within prescribed timelines"
  },
  "important_notes": [
    "CET/COMED-K students fees shall be paid in single installment",
    "Hostel/College bus charges are also payable as per the schedule",
    "Cash/Cheque payment will NOT be accepted",
    "DD to be drawn in favor of 'Sai Vidya Institute of Technology'",
    "Payment can also be made through online payment link on college website",
    "After online transfer, details shall be shared immediately to accountssvit@saividya.ac.in",
    "Students availing education loan have to take fee estimate after announcement of regular result before 04.08.2025",
    "Diploma students of 2024 batch should contact office for fee structure"
  ],
  "contact_email": "accountssvit@saividya.ac.in"
};

export const COLLEGE_INFO = {
  name: "Sai Vidya Institute of Technology",
  location: "Bangalore",
  establishedYear: 2008,
  affiliation: "VTU (Visvesvaraya Technological University)",
  approval: "AICTE (All India Council for Technical Education)",
  accreditation: {
    naac: "NAAC 'A' grade",
    nba: "NBA (National Board of Accreditation)"
  },
  trust: "SRI SAI VIDYA VIKAS SHIKSHANA SAMITHI",
  trustDescription: "A trust formed by a group of academicians",
  founderDescription: "Founded by experienced academicians",
  placements: {
    rate: "95%",
    description: "SVIT achieves 95% placement rate with top recruiters including TCS, Infosys, Wipro, Tech Mahindra, Amazon, and IBM regularly hiring through comprehensive training programs."
  }
};

