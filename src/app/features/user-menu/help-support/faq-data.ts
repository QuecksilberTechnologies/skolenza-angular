export interface FaqLink {
  label: string;
  /** App route under `/app`, e.g. `leave`. */
  path: string;
}

export interface FaqItem {
  /** Unique across all categories; doubles as the URL fragment that opens the question. */
  id: string;
  question: string;
  answer: string;
  link?: FaqLink;
}

export interface FaqCategory {
  id: string;
  label: string;
  icon: string;
  /** roleTypeIds that see this category (0=Host, 1=Admin, 2=StaffMember, 3=Manager). Omit for everyone. */
  roles?: readonly number[];
  items: readonly FaqItem[];
}

const STAFF = [1, 2, 3];

/** Static FAQ content for the Help & Support page, grouped by topic. */
export const FAQ_CATEGORIES: readonly FaqCategory[] = [
  {
    id: 'account',
    label: 'Account & sign-in',
    icon: 'pi pi-lock',
    items: [
      {
        id: 'reset-password',
        question: 'I forgot my password. How do I reset it?',
        answer:
          'On the sign-in page, choose "Forgot password" and enter your official email. We will send you a link to set a new password.',
      },
      {
        id: 'change-password',
        question: 'How do I change my password?',
        answer:
          'Open the user menu in the top right corner and choose "Update Password". You will be signed out after the change, so sign in again with the new password.',
        link: { label: 'Update password', path: 'update-password' },
      },
      {
        id: 'signed-out',
        question: 'Why was I signed out?',
        answer:
          'Sessions end after a period of inactivity or after a password change. Sign in again to continue where you left off.',
      },
    ],
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: 'pi pi-user',
    roles: STAFF,
    items: [
      {
        id: 'edit-profile',
        question: 'How do I update my personal details?',
        answer:
          'Open your profile. Each section, such as contact, bank or education details, has its own edit button.',
        link: { label: 'Open profile', path: 'profile' },
      },
      {
        id: 'locked-fields',
        question: 'Why can I not edit some profile fields?',
        answer:
          'Your administrator decides which fields staffMembers may edit. Ask your HR team to change a field you cannot edit yourself.',
      },
      {
        id: 'profile-photo',
        question: 'How do I change my profile photo?',
        answer: 'Open your profile and select your photo to upload a new one.',
        link: { label: 'Open profile', path: 'profile' },
      },
    ],
  },
  {
    id: 'leave',
    label: 'Leave',
    icon: 'pi pi-calendar',
    roles: STAFF,
    items: [
      {
        id: 'apply-leave',
        question: 'How do I apply for leave?',
        answer:
          'Open the Leave page, pick the leave type and dates, then submit. Your manager is notified to review it.',
        link: { label: 'Go to Leave', path: 'leave' },
      },
      {
        id: 'leave-balance',
        question: 'Where can I see my leave balance?',
        answer: 'The Leave page shows your remaining balance for each leave type assigned to you.',
        link: { label: 'Go to Leave', path: 'leave' },
      },
      {
        id: 'cancel-leave',
        question: 'Can I cancel a leave request?',
        answer:
          'Yes. A pending request can be cancelled from the Leave page. Ask your manager if the request has already been approved.',
        link: { label: 'Go to Leave', path: 'leave' },
      },
    ],
  },
  {
    id: 'attendance',
    label: 'Attendance & check-in',
    icon: 'pi pi-clock',
    roles: STAFF,
    items: [
      {
        id: 'check-in',
        question: 'How do I check in and check out?',
        answer:
          'Use the "Check In" button in the page header when you start work and the same button, now "Check Out", when you finish.',
      },
      {
        id: 'missed-check-in',
        question: 'I forgot to check in. What should I do?',
        answer:
          'Review your records on the Attendance page, or contact your manager to update the record.',
        link: { label: 'Go to Attendance', path: 'attendance' },
      },
      {
        id: 'location',
        question: 'Why does check-in ask for my location?',
        answer:
          'Some attendance policies only allow check-in from approved locations. Allow location access in your browser to check in.',
      },
    ],
  },
  {
    id: 'payroll',
    label: 'Payroll',
    icon: 'pi pi-wallet',
    roles: STAFF,
    items: [
      {
        id: 'payslip',
        question: 'Where can I download my payslip?',
        answer:
          'Open the Payroll page and pick the month you need. Each processed payslip can be downloaded from there.',
        link: { label: 'Go to Payroll', path: 'payroll' },
      },
      {
        id: 'bank-details',
        question: 'How do I update the bank account my salary is paid to?',
        answer:
          'Update the bank details section of your profile. Changes may need approval from HR before the next payroll run.',
        link: { label: 'Open profile', path: 'profile' },
      },
    ],
  },
  {
    id: 'permissions',
    label: 'Access & permissions',
    icon: 'pi pi-shield',
    roles: [2, 3],
    items: [
      {
        id: 'missing-menu',
        question: 'Why can I not see a menu item a colleague has?',
        answer:
          'Menu items follow the role and permissions assigned to you. Ask your administrator if you need access to another module.',
      },
      {
        id: 'access-denied',
        question: 'What does "Access denied" mean?',
        answer:
          'You opened a page your role is not allowed to use. Go back to the dashboard, or ask your administrator to grant access.',
      },
    ],
  },
  {
    id: 'administration',
    label: 'Administration',
    icon: 'pi pi-briefcase',
    roles: [1, 3],
    items: [
      {
        id: 'add-staffMember',
        question: 'How do I add a new staffMember?',
        answer:
          'Open StaffMember Management and add the staffMember there, or use bulk upload for many at once.',
        link: { label: 'Go to StaffMembers', path: 'staffMembers' },
      },
      {
        id: 'grant-access',
        question: 'How do I control what staffMembers can see and do?',
        answer:
          'Roles & Permissions sets which modules and actions each role allows. Assign roles to staffMembers to grant that access.',
        link: { label: 'Go to Roles & Permissions', path: 'roles' },
      },
      {
        id: 'set-policies',
        question: 'Where do I set up leave and attendance rules?',
        answer: 'Policies hold the leave, attendance and other rules that apply to your staffMembers.',
        link: { label: 'Go to Policies', path: 'policies' },
      },
      {
        id: 'departments',
        question: 'How do I organise staffMembers into departments?',
        answer:
          'Create departments on the Departments page, then pick one when you add or edit an staffMember.',
        link: { label: 'Go to Departments', path: 'departments' },
      },
    ],
  },
  {
    id: 'platform',
    label: 'Institutions & plans',
    icon: 'pi pi-building',
    roles: [0],
    items: [
      {
        id: 'manage-institutions',
        question: 'Where do I manage institution companies?',
        answer:
          'The Institutions page lists every company on the platform, with its details and status.',
        link: { label: 'Go to Institutions', path: 'institutions' },
      },
      {
        id: 'manage-plans',
        question: 'How do I change subscription plans?',
        answer:
          'Subscription plans, their modules and prices are managed on the Subscriptions page.',
        link: { label: 'Go to Subscriptions', path: 'subscriptions' },
      },
    ],
  },
];
