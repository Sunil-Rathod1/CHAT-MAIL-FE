export interface User {
  id?: string;
  _id?: string;
  email: string;
  name: string;
  avatar: string;
  bio: string;
  status: 'online' | 'offline' | 'busy' | 'in-call';
  lastSeen?: Date;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  name: string;
}
