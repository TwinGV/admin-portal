export interface User {
  username: string;
  displayName: string;
  email: string;
  groups: string[];
}

export interface Button {
  id: string;
  title: string;
  url: string;
  icon: string; // Font Awesome icon class or custom image path
  description?: string;
  color?: string;
  owner?: string; // username of creator
  isPrivate: boolean; // true = only owner can see, false = all users can see
  createdAt: string;
  updatedAt: string;
}

export interface ButtonsData {
  buttons: Button[];
  lastUpdated: string;
}

export interface AuthRequest {
  username: string;
  password: string;
}

export interface SessionUser extends User {
  isInAllowedGroup: boolean;
}
