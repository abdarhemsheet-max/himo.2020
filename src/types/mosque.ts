export type UserRole = 'admin' | 'documenter';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt?: Date | null;
  createdBy: string;
}

export interface MosqueRecord {
  id: string;
  officialName: string;
  commonName: string;
  locality: string;
  landmark: string;
  notes: string;
  mapsUrl: string;
  lat: number;
  lng: number;
  accuracy: number;
  photos: string[];
  photoCount: number;
  createdBy: string;
  createdByName: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  updatedBy: string;
  hasPendingWrites?: boolean;
}

export interface OsmMosqueCandidate {
  osmId: string;
  name: string;
  lat: number;
  lng: number;
}

export interface MosqueFormValues {
  officialName: string;
  commonName: string;
  locality: string;
  landmark: string;
  notes: string;
  lat: number;
  lng: number;
  accuracy: number;
  photos: string[];
}

export type ActiveTab = 'add' | 'map' | 'list' | 'users';
