export type DemoOccasion = {
  id: string;
  kind: "Birthday" | "Anniversary";
  name: string;
  initials: string;
  phone: string;
  detail: string;
  note: string;
};

export const todayOccasions: DemoOccasion[] = [
  { id: "ravi-birthday", kind: "Birthday", name: "Ravi Shah", initials: "RS", phone: "+919876543210", detail: "Customer birthday · Turns 52", note: "Prefers a call before noon" },
  { id: "kavya-birthday", kind: "Birthday", name: "Kavya Menon", initials: "KM", phone: "+919812345678", detail: "Daughter of Suresh Menon · Turns 19", note: "Studying architecture in Pune" },
  { id: "anil-anniversary", kind: "Anniversary", name: "Anil & Sunita Kapoor", initials: "AK", phone: "+919900112233", detail: "28th wedding anniversary", note: "Last contacted 3 weeks ago" }
];

export const customers = [
  { id: "ravi-shah", initials: "RS", name: "Ravi Shah", phone: "+91 98765 43210", city: "Mumbai", language: "Gujarati" },
  { id: "ayesha-khan", initials: "AK", name: "Ayesha Khan", phone: "+91 98123 45678", city: "Hyderabad", language: "Hindi" },
  { id: "meera-nair", initials: "MN", name: "Meera Nair", phone: "+91 99001 12233", city: "Bengaluru", language: "Malayalam" },
  { id: "suresh-menon", initials: "SM", name: "Suresh Menon", phone: "+91 98870 11223", city: "Pune", language: "English" }
];
