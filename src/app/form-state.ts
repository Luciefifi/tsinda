// What a form's Server Action sends back to the form (with useActionState).
// Kept free of server code so client components can import the type.
export type FormState = {
  done?: string; // success message
  error?: string; // a problem that belongs to no single field
  fieldErrors?: Record<string, string>; // field name -> message
  // What the person typed, so the form can show it again after an error.
  // Passwords and PINs are never sent back.
  values?: Record<string, string | string[]>;
};

export const EMPTY_FORM: FormState = {};
