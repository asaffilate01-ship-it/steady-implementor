const value = (input: string | undefined, fallback: string) => input?.trim() || fallback;

export const legalConfig = {
  companyName: value(import.meta.env.VITE_LEGAL_COMPANY_NAME, "ParkPunkt operating company"),
  street: value(import.meta.env.VITE_LEGAL_STREET, "Registered address required"),
  city: value(import.meta.env.VITE_LEGAL_CITY, "Postal code and city required"),
  country: value(import.meta.env.VITE_LEGAL_COUNTRY, "Germany"),
  managingDirectors: value(
    import.meta.env.VITE_LEGAL_MANAGING_DIRECTORS,
    "Managing director details required",
  ),
  registerCourt: value(import.meta.env.VITE_LEGAL_REGISTER_COURT, "Register court required"),
  registerNumber: value(import.meta.env.VITE_LEGAL_REGISTER_NUMBER, "Registration number required"),
  vatId: value(import.meta.env.VITE_LEGAL_VAT_ID, "VAT ID required if applicable"),
  contactEmail: value(import.meta.env.VITE_LEGAL_CONTACT_EMAIL, "Contact email required"),
  privacyEmail: value(import.meta.env.VITE_LEGAL_PRIVACY_EMAIL, "Privacy contact required"),
  complaintsEmail: value(
    import.meta.env.VITE_LEGAL_COMPLAINTS_EMAIL,
    "Complaints contact required",
  ),
  dpo: value(import.meta.env.VITE_LEGAL_DPO, "DPO/contact details required if applicable"),
  adrStatement: value(
    import.meta.env.VITE_LEGAL_ADR_STATEMENT,
    "Consumer dispute-resolution statement required",
  ),
};

export const legalConfigComplete = Boolean(
  import.meta.env.VITE_LEGAL_COMPANY_NAME &&
  import.meta.env.VITE_LEGAL_STREET &&
  import.meta.env.VITE_LEGAL_CITY &&
  import.meta.env.VITE_LEGAL_CONTACT_EMAIL &&
  import.meta.env.VITE_LEGAL_PRIVACY_EMAIL,
);
