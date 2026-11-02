export type Role = 'client' | 'doctor' | 'admin' | 'frontdesk';

export type AuthUser = {
  sub: string;
  role: Role;
  email: string;
  phone: string;
  name: string;
  approvalStatus: string;
};

export type Session = {
  accessToken: string;
  idToken: string;
  refreshToken?: string;
  expiresIn: number;
};

export const roleLabel: Record<Role, string> = {
  client: 'Pet Care',
  doctor: 'VetWise Vet',
  admin: 'VetWise Admin',
  frontdesk: 'Front Desk',
};
