
export enum UserRole {
  CUSTOMER = 'customer',
  ADMIN = 'admin'
}

export enum ProductCategory {
  POWER_SPECTACLES = 'Power Spectacles',
  SUNGLASSES = 'Sunglasses'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isLocked: boolean;
  failedLoginAttempts: number;
  gdprConsent: boolean;
}

export interface Prescription {
  id: string;
  userId: string;
  rightEye: { sph: string; cyl: string; axis: string };
  leftEye: { sph: string; cyl: string; axis: string };
  pd: string;
  fileUrl?: string;
}

export interface LensSelection {
  type: 'Single Vision' | 'Bifocal' | 'Progressive';
  material: 'Plastic' | 'Polycarbonate' | 'High Index';
  coatings: string[];
  priceAdjustment: number;
}

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  brand: string;
  price: number;
  image: string;
  stock: number;
  description: string;
}

export interface Order {
  id: string;
  userId: string;
  products: { productId: string; quantity: number }[];
  prescription?: Prescription;
  lensSelection?: LensSelection;
  totalPrice: number;
  paymentStatus: 'pending' | 'completed' | 'failed';
  orderStatus: 'processing' | 'shipped' | 'delivered';
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  userId: string;
  role: string;
  timestamp: string;
  ip: string;
}
