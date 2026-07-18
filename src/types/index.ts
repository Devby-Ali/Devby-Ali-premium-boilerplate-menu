export interface MenuCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  isActive?: boolean;
  sortOrder?: number;
}

export interface MenuItem {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  price: number;
  currency: string;
  imageUrl?: string | null;
  categoryId: string;
  isFeatured?: boolean;
  isActive?: boolean;
  preparationTime?: number | null;
  tags?: string[];
}

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "staff";
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}
