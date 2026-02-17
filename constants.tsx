
import React from 'react';
import { 
  Glasses, 
  ShieldCheck, 
  ShoppingBag, 
  User, 
  LayoutDashboard, 
  LogOut,
  Search,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { ProductCategory, Product } from './types';

export const LENS_PRICING = {
  types: {
    'Single Vision': 50,
    'Bifocal': 120,
    'Progressive': 250
  },
  materials: {
    'Plastic': 0,
    'Polycarbonate': 40,
    'High Index': 100
  },
  coatings: {
    'Anti-glare': 30,
    'Blue Light': 45,
    'UV Protection': 20,
    'Scratch Resistant': 25
  }
};

// Properly type MOCK_PRODUCTS using Product interface and ProductCategory enum to resolve type errors in components consuming this data
export const MOCK_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Aviator Classic',
    brand: 'Ray-Ban',
    category: ProductCategory.SUNGLASSES,
    price: 159.00,
    image: 'https://picsum.photos/seed/aviator/400/300',
    stock: 25,
    description: 'Iconic teardrop shape that started it all.'
  },
  {
    id: '2',
    name: 'Wayfarer Smart',
    brand: 'Ray-Ban',
    category: ProductCategory.POWER_SPECTACLES,
    price: 189.00,
    image: 'https://picsum.photos/seed/wayfarer/400/300',
    stock: 12,
    description: 'A modern twist on a legendary design, optimized for vision correction.'
  },
  {
    id: '3',
    name: 'Tech Titan',
    brand: 'Oakley',
    category: ProductCategory.POWER_SPECTACLES,
    price: 210.00,
    image: 'https://picsum.photos/seed/oakley/400/300',
    stock: 8,
    description: 'High-performance frames for the digital lifestyle.'
  },
  {
    id: '4',
    name: 'Ocean Drift',
    brand: 'Maui Jim',
    category: ProductCategory.SUNGLASSES,
    price: 299.00,
    image: 'https://picsum.photos/seed/mauijim/400/300',
    stock: 5,
    description: 'Polarized lenses for the ultimate beach experience.'
  }
];
