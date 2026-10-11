/** One entry of the "View Profile" sub-menu on an staffMember row. */
export interface ProfileSection {
  label: string;
  icon: string;
  route: string;
}

export const PROFILE_SECTIONS: ProfileSection[] = [
  { label: 'Overview', icon: 'pi pi-user', route: '/app/profile/basic-info' },
  { label: 'Bank', icon: 'pi pi-building-columns', route: '/app/profile/bank-info' },
  { label: 'Contact', icon: 'pi pi-address-book', route: '/app/profile/contact-info' },
  { label: 'Experience', icon: 'pi pi-briefcase', route: '/app/profile/experience-info' },
  { label: 'Insurance', icon: 'pi pi-asterisk', route: '/app/profile/insurance-info' },
  { label: 'Identity', icon: 'pi pi-id-card', route: '/app/profile/identity-info' },
  { label: 'Education', icon: 'pi pi-graduation-cap', route: '/app/profile/education-info' },
  { label: 'Dependent', icon: 'pi pi-users', route: '/app/profile/dependent-info' },
];
