import { normalizeIndianPhone } from "@ssc/domain";

export function phoneUrl(phoneNumber: string): string {
  return `tel:${normalizeIndianPhone(phoneNumber)}`;
}

export function smsUrl(phoneNumber: string): string {
  return `sms:${normalizeIndianPhone(phoneNumber)}`;
}

export function whatsappUrl(phoneNumber: string): string {
  return `https://wa.me/${normalizeIndianPhone(phoneNumber).slice(1)}`;
}
