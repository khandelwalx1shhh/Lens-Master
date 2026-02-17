
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  HashRouter as Router, 
  Routes, 
  Route, 
  Link, 
  useNavigate,
  useLocation
} from 'react-router-dom';
import { 
  ShoppingBag, 
  Glasses, 
  User as UserIcon, 
  LayoutDashboard, 
  LogOut, 
  Search,
  ShoppingCart,
  Menu,
  X,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Mail,
  Bell,
  CheckCircle,
  Clock,
  UserPlus,
  Key,
  Sparkles,
  Info
} from 'lucide-react';

import { User, UserRole, ProductCategory, Product, Order, Prescription, LensSelection } from './types';
import { MOCK_PRODUCTS, LENS_PRICING } from './constants';
import { analyzePrescriptionImage, getLensRecommendation } from './services/geminiService';
import { mailService } from './services/mailService';

// Simple in-memory cache for AI recommendations to prevent repeated slow API calls
const recommendationCache: Record<string, string> = {};

// --- TOAST SYSTEM ---
const Toast: React.FC<{ message: string, type: 'success' | 'info', onClose: () => void }> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 p-4 rounded-2xl shadow-2xl border animate-fade-in glass ${type === 'success' ? 'border-green-100 bg-green-50/90 text-green-800' : 'border-blue-100 bg-blue-50/90 text-blue-800'}`}>
      {type === 'success' ? <CheckCircle className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
      <div className="text-sm font-semibold">{message}</div>
      <button onClick={onClose} className="p-1 hover:bg-white/50 rounded-full"><X className="w-4 h-4" /></button>
    </div>
  );
};

// --- MOCK AUTH STATE ---
const useAuth = (addToast: (msg: string, type: 'success' | 'info') => void) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('lm_user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = async (role: UserRole, providedName?: string, providedEmail?: string) => {
    const isNewUser = !localStorage.getItem('lm_user') || !!providedName;
    const mockUser: User = {
      id: role === UserRole.ADMIN ? 'admin_1' : 'user_1',
      name: providedName || (role === UserRole.ADMIN ? 'System Admin' : 'John Doe'),
      email: providedEmail || (role === UserRole.ADMIN ? 'admin@lensmaster.com' : 'john@example.com'),
      role: role,
      isLocked: false,
      failedLoginAttempts: 0,
      gdprConsent: true
    };
    setUser(mockUser);
    localStorage.setItem('lm_user', JSON.stringify(mockUser));

    if (isNewUser) {
      // Fire and forget email to avoid blocking the login flow
      mailService.sendEmail({
        to: mockUser.email,
        type: 'WELCOME',
        data: { name: mockUser.name }
      }).then(() => {
        addToast(`Welcome email sent to ${mockUser.email}`, 'info');
      }).catch(console.error);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('lm_user');
  };

  const resetPassword = async (email: string) => {
    // Non-blocking email dispatch
    mailService.sendEmail({
      to: email,
      type: 'PASSWORD_RESET',
      data: { email }
    }).then(() => {
      addToast(`Security reset link sent to ${email}`, 'info');
    }).catch(console.error);
  };

  return { user, login, logout, resetPassword };
};

// --- COMPONENTS ---

const Navbar: React.FC<{ user: User | null; logout: () => void; cartCount: number }> = ({ user, logout, cartCount }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <nav className="sticky top-0 z-50 glass border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center gap-2 group">
            <Glasses className="w-8 h-8 text-blue-600 group-hover:rotate-12 transition-transform" />
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Lens Master
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link to="/shop" className="text-slate-600 hover:text-blue-600 font-medium">Shop</Link>
            <Link to="/shop?cat=Power%20Spectacles" className="text-slate-600 hover:text-blue-600 font-medium">Prescription</Link>
            <Link to="/shop?cat=Sunglasses" className="text-slate-600 hover:text-blue-600 font-medium">Sunglasses</Link>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/cart" className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
              <ShoppingCart className="w-6 h-6" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                  {cartCount}
                </span>
              )}
            </Link>
            {user ? (
              <div className="flex items-center gap-2">
                {user.role === UserRole.ADMIN && (
                  <Link to="/admin" className="p-2 text-slate-600 hover:bg-slate-100 rounded-full">
                    <LayoutDashboard className="w-6 h-6" />
                  </Link>
                )}
                <button onClick={logout} className="p-2 text-slate-600 hover:bg-red-50 rounded-full hover:text-red-600 transition-colors">
                  <LogOut className="w-6 h-6" />
                </button>
              </div>
            ) : (
              <Link to="/login" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                Login
              </Link>
            )}
            <button className="md:hidden" onClick={() => setIsOpen(!isOpen)}>
              {isOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

const ProductCard: React.FC<{ product: Product; onAddToCart: (p: Product) => void }> = ({ product, onAddToCart }) => (
  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow group">
    <div className="relative aspect-video overflow-hidden bg-slate-100">
      <img 
        src={product.image} 
        alt={product.name} 
        loading="lazy" 
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
      />
      <div className="absolute top-2 right-2">
        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${product.category === ProductCategory.SUNGLASSES ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
          {product.category}
        </span>
      </div>
    </div>
    <div className="p-4">
      <h3 className="font-bold text-lg text-slate-800">{product.name}</h3>
      <p className="text-sm text-slate-500 mb-4">{product.brand}</p>
      <div className="flex items-center justify-between">
        <span className="text-xl font-bold text-slate-900">${product.price.toFixed(2)}</span>
        <button 
          onClick={() => onAddToCart(product)}
          className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
        >
          View Options
        </button>
      </div>
    </div>
  </div>
);

// --- PAGES ---

const Home = () => (
  <div className="space-y-16 py-12 animate-fade-in">
    <section className="max-w-7xl mx-auto px-4 text-center space-y-8">
      <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-full text-sm font-semibold">
        <ShieldCheck className="w-4 h-4" /> Secure & GDPR Compliant
      </div>
      <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight leading-tight">
        Your Vision, <br />
        <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Perfectly Tailored.</span>
      </h1>
      <p className="text-xl text-slate-600 max-w-2xl mx-auto">
        Lens Master brings the optometrist to your doorstep with secure prescription handling and premium Italian-made frames.
      </p>
      <div className="flex flex-wrap justify-center gap-4">
        <Link to="/shop" className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all">
          Explore Collection
        </Link>
        <Link to="/login" className="bg-white border border-slate-200 text-slate-800 px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-50 transition-all">
          Create Account
        </Link>
      </div>
    </section>

    <section className="bg-slate-900 py-16 text-white">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { icon: <ShieldCheck className="w-8 h-8 text-blue-400" />, title: "Secure Checkout", desc: "PCI-DSS compliant payments via Razorpay." },
          { icon: <Glasses className="w-8 h-8 text-blue-400" />, title: "Precision Optics", desc: "Customized lenses with dynamic price updates." },
          { icon: <FileText className="w-8 h-8 text-blue-400" />, title: "Smart Prescription", desc: "AI-assisted upload and manual verification." }
        ].map((f, i) => (
          <div key={i} className="p-6 bg-slate-800/50 rounded-2xl border border-slate-700">
            {f.icon}
            <h3 className="text-xl font-bold mt-4 mb-2">{f.title}</h3>
            <p className="text-slate-400">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  </div>
);

const Shop = ({ onAddToCart }: { onAddToCart: (p: Product) => void }) => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const catFilter = searchParams.get('cat');

  const filteredProducts = useMemo(() => catFilter 
    ? MOCK_PRODUCTS.filter(p => (p.category as string) === catFilter)
    : MOCK_PRODUCTS, [catFilter]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Catalogue</h2>
          <p className="text-slate-500">Showing {filteredProducts.length} premium models</p>
        </div>
        <div className="flex gap-2 bg-white p-1 rounded-xl border border-slate-200">
          <Link to="/shop" className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${!catFilter ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>All</Link>
          <Link to="/shop?cat=Power%20Spectacles" className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${catFilter === 'Power Spectacles' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>Power</Link>
          <Link to="/shop?cat=Sunglasses" className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${catFilter === 'Sunglasses' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>Sunglasses</Link>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredProducts.map(p => (
          <ProductCard key={p.id} product={p} onAddToCart={onAddToCart} />
        ))}
      </div>
    </div>
  );
};

const ProductCustomizer = ({ product, addToCart }: { product: Product, addToCart: (p: any) => void }) => {
  const [step, setStep] = useState(1);
  const [prescription, setPrescription] = useState<Partial<Prescription>>({
    rightEye: { sph: '0.00', cyl: '0.00', axis: '0' },
    leftEye: { sph: '0.00', cyl: '0.00', axis: '0' },
    pd: '63'
  });
  const [lensSelection, setLensSelection] = useState<LensSelection>({
    type: 'Single Vision',
    material: 'Plastic',
    coatings: [],
    priceAdjustment: 0
  });
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [lensRecommendation, setLensRecommendation] = useState<string | null>(null);
  const [isRecLoading, setIsRecLoading] = useState(false);
  const navigate = useNavigate();

  const isPower = product.category === ProductCategory.POWER_SPECTACLES;

  const calculateTotal = useMemo(() => {
    let extra = 0;
    if (isPower) {
      extra += LENS_PRICING.types[lensSelection.type];
      extra += LENS_PRICING.materials[lensSelection.material];
      lensSelection.coatings.forEach(c => {
        extra += (LENS_PRICING.coatings as any)[c];
      });
    }
    return product.price + extra;
  }, [product.price, isPower, lensSelection]);

  const fetchRecommendation = useCallback(async (pData: any) => {
    const cacheKey = JSON.stringify(pData);
    if (recommendationCache[cacheKey]) {
      setLensRecommendation(recommendationCache[cacheKey]);
      return;
    }

    setIsRecLoading(true);
    try {
      const rec = await getLensRecommendation(pData);
      const cleanedRec = rec || "Based on your data, standard materials are suitable.";
      recommendationCache[cacheKey] = cleanedRec;
      setLensRecommendation(cleanedRec);
    } catch (err) {
      console.error("Recommendation Error:", err);
    } finally {
      setIsRecLoading(false);
    }
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsAiLoading(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        try {
          const data = await analyzePrescriptionImage(base64);
          setPrescription(prev => ({ ...prev, ...data }));
          // Fire recommendation fetch in background without blocking UI
          fetchRecommendation(data);
        } catch (err) {
          console.error("AI Error:", err);
          alert("Could not analyze prescription. Please enter manually.");
        } finally {
          setIsAiLoading(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNextStep = async () => {
    if (step === 1) {
      setStep(2);
      if (!lensRecommendation && !isRecLoading) {
        fetchRecommendation(prescription);
      }
    } else {
      setStep(step + 1);
    }
  };

  const handleFinish = () => {
    addToCart({
      ...product,
      finalPrice: calculateTotal,
      prescription: isPower ? prescription : null,
      lensSelection: isPower ? lensSelection : null,
      customized: true
    });
    navigate('/cart');
  };

  if (!isPower) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 animate-fade-in">
        <div className="grid md:grid-cols-2 gap-12 bg-white p-8 rounded-3xl border border-slate-200">
           <img src={product.image} className="rounded-2xl w-full object-cover bg-slate-100" />
           <div className="space-y-6">
              <h1 className="text-3xl font-bold">{product.name}</h1>
              <p className="text-slate-600">{product.description}</p>
              <div className="text-4xl font-bold text-blue-600">${product.price}</div>
              <button 
                onClick={handleFinish}
                className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-blue-600 transition-all"
              >
                Add to Cart
              </button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 space-y-8 animate-fade-in">
      <div className="flex items-center gap-4 text-slate-400 font-medium overflow-x-auto whitespace-nowrap">
        <span className={step >= 1 ? 'text-blue-600' : ''}>1. Prescription</span>
        <span>→</span>
        <span className={step >= 2 ? 'text-blue-600' : ''}>2. Lens Type</span>
        <span>→</span>
        <span className={step >= 3 ? 'text-blue-600' : ''}>3. Review</span>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
        {step === 1 && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Enter Prescription</h2>
              <label className="bg-blue-50 text-blue-600 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer hover:bg-blue-100 transition-colors">
                {isAiLoading ? 'Scanning...' : 'AI Scan Upload'}
                <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*" />
              </label>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4 p-4 bg-slate-50 rounded-2xl">
                <h3 className="font-bold flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"/> Right Eye (OD)</h3>
                <div className="grid grid-cols-3 gap-2">
                  <div><label className="text-[10px] uppercase font-bold text-slate-500">SPH</label><input className="w-full p-2 rounded-lg border" value={prescription.rightEye?.sph} onChange={e => setPrescription({...prescription, rightEye: {...prescription.rightEye!, sph: e.target.value}})} /></div>
                  <div><label className="text-[10px] uppercase font-bold text-slate-500">CYL</label><input className="w-full p-2 rounded-lg border" value={prescription.rightEye?.cyl} onChange={e => setPrescription({...prescription, rightEye: {...prescription.rightEye!, cyl: e.target.value}})} /></div>
                  <div><label className="text-[10px] uppercase font-bold text-slate-500">AXIS</label><input className="w-full p-2 rounded-lg border" value={prescription.rightEye?.axis} onChange={e => setPrescription({...prescription, rightEye: {...prescription.rightEye!, axis: e.target.value}})} /></div>
                </div>
              </div>
              <div className="space-y-4 p-4 bg-slate-50 rounded-2xl">
                <h3 className="font-bold flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-500"/> Left Eye (OS)</h3>
                <div className="grid grid-cols-3 gap-2">
                  <div><label className="text-[10px] uppercase font-bold text-slate-500">SPH</label><input className="w-full p-2 rounded-lg border" value={prescription.leftEye?.sph} onChange={e => setPrescription({...prescription, leftEye: {...prescription.leftEye!, sph: e.target.value}})} /></div>
                  <div><label className="text-[10px] uppercase font-bold text-slate-500">CYL</label><input className="w-full p-2 rounded-lg border" value={prescription.leftEye?.cyl} onChange={e => setPrescription({...prescription, leftEye: {...prescription.leftEye!, cyl: e.target.value}})} /></div>
                  <div><label className="text-[10px] uppercase font-bold text-slate-500">AXIS</label><input className="w-full p-2 rounded-lg border" value={prescription.leftEye?.axis} onChange={e => setPrescription({...prescription, leftEye: {...prescription.leftEye!, axis: e.target.value}})} /></div>
                </div>
              </div>
            </div>
            <div className="max-w-[150px]">
              <label className="text-[10px] uppercase font-bold text-slate-500">Pupillary Distance (PD)</label>
              <input className="w-full p-2 rounded-lg border" value={prescription.pd} onChange={e => setPrescription({...prescription, pd: e.target.value})} />
            </div>
            <button onClick={handleNextStep} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold">Next: Choose Lenses</button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8 animate-fade-in">
            <div>
              <h3 className="text-lg font-bold mb-4">Select Lens Type</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(LENS_PRICING.types).map(([type, price]) => (
                  <button 
                    key={type}
                    onClick={() => setLensSelection({...lensSelection, type: type as any})}
                    className={`p-4 rounded-2xl border-2 text-left transition-all ${lensSelection.type === type ? 'border-blue-600 bg-blue-50' : 'border-slate-100'}`}
                  >
                    <div className="font-bold">{type}</div>
                    <div className="text-sm text-slate-500">+${price}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Material</h3>
                {isRecLoading && (
                  <div className="flex items-center gap-2 text-xs text-blue-600 font-bold animate-pulse">
                    <Sparkles className="w-3 h-3" /> AI Optician Analyzing...
                  </div>
                )}
              </div>

              {lensRecommendation && (
                <div className="mb-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl flex gap-3 shadow-sm animate-fade-in">
                  <div className="p-2 bg-blue-600 rounded-xl text-white h-fit">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-blue-900 mb-1">AI Optician Advice</h4>
                    <p className="text-xs text-blue-700 leading-relaxed">{lensRecommendation}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(LENS_PRICING.materials).map(([mat, price]) => (
                  <button 
                    key={mat}
                    onClick={() => setLensSelection({...lensSelection, material: mat as any})}
                    className={`p-4 rounded-2xl border-2 text-left transition-all ${lensSelection.material === mat ? 'border-blue-600 bg-blue-50' : 'border-slate-100'}`}
                  >
                    <div className="font-bold">{mat}</div>
                    <div className="text-sm text-slate-500">+${price}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={() => setStep(1)} className="px-8 py-4 bg-slate-100 rounded-xl font-bold">Back</button>
              <button onClick={() => setStep(3)} className="flex-1 bg-slate-900 text-white py-4 rounded-xl font-bold">Review Final Total</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold">Summary</h2>
            <div className="bg-slate-50 p-6 rounded-2xl space-y-4">
              <div className="flex justify-between border-b pb-2"><span>Frame: {product.name}</span><span>${product.price}</span></div>
              <div className="flex justify-between border-b pb-2"><span>Lens: {lensSelection.type} ({lensSelection.material})</span><span>+${LENS_PRICING.types[lensSelection.type] + LENS_PRICING.materials[lensSelection.material]}</span></div>
              <div className="flex justify-between text-2xl font-bold text-blue-600 pt-4"><span>Total Price</span><span>${calculateTotal.toFixed(2)}</span></div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setStep(2)} className="px-8 py-4 bg-slate-100 rounded-xl font-bold">Back</button>
              <button onClick={handleFinish} className="flex-1 bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700">Add to Cart & Checkout</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const CartPage = ({ cart, onRemove }: { cart: any[], onRemove: (i: number) => void }) => {
  const subtotal = useMemo(() => cart.reduce((acc, item) => acc + (item.finalPrice || item.price), 0), [cart]);
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 animate-fade-in">
      <h1 className="text-3xl font-bold mb-8">Your Cart</h1>
      {cart.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
           <ShoppingCart className="w-16 h-16 mx-auto text-slate-300 mb-4" />
           <p className="text-slate-500">Your cart is empty.</p>
           <Link to="/shop" className="text-blue-600 font-bold mt-4 inline-block">Go Shopping</Link>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="space-y-4">
            {cart.map((item, idx) => (
              <div key={idx} className="flex items-center gap-6 bg-white p-4 rounded-2xl border border-slate-200 animate-fade-in">
                <img src={item.image} className="w-24 h-24 object-cover rounded-xl bg-slate-100" />
                <div className="flex-1">
                  <h3 className="font-bold text-lg">{item.name}</h3>
                  <p className="text-xs text-slate-500">{item.category}</p>
                  {item.lensSelection && <p className="text-xs text-blue-600">{item.lensSelection.type} | {item.lensSelection.material}</p>}
                </div>
                <div className="text-right">
                  <div className="font-bold text-xl">${(item.finalPrice || item.price).toFixed(2)}</div>
                  <button onClick={() => onRemove(idx)} className="text-red-500 text-sm hover:underline">Remove</button>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-slate-900 text-white p-8 rounded-3xl space-y-4">
            <div className="flex justify-between text-slate-400"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-slate-400"><span>Shipping</span><span>FREE</span></div>
            <div className="flex justify-between text-2xl font-bold pt-4 border-t border-slate-800"><span>Total</span><span>${subtotal.toFixed(2)}</span></div>
            <button onClick={() => navigate('/checkout')} className="w-full bg-blue-600 py-4 rounded-xl font-bold hover:bg-blue-700 transition-colors">Proceed to Secure Checkout</button>
          </div>
        </div>
      )}
    </div>
  );
};

const CheckoutPage = ({ cart, clearCart, user, addToast }: { cart: any[], clearCart: () => void, user: User | null, addToast: (m: string, t: 'success'|'info') => void }) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handlePayment = async () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const orderId = `LM-SEC-${Math.floor(10000 + Math.random() * 90000)}`;
      const total = cart.reduce((a, b) => a + (b.finalPrice || b.price), 0).toFixed(2);
      
      addToast(`Payment Success: ${orderId}`, 'success');
      
      if (user) {
        // Background email dispatch
        mailService.sendEmail({
          to: user.email,
          type: 'ORDER_CONFIRMATION',
          data: { orderId, total }
        }).then(() => {
          addToast(`Order confirmation sent to ${user.email}`, 'info');
        }).catch(console.error);
      }

      clearCart();
      navigate('/');
    }, 1500); // Reduced delay for faster "feel"
  };

  return (
    <div className="max-w-xl mx-auto py-12 px-4 text-center space-y-8 animate-fade-in">
      <div className="p-8 bg-white rounded-3xl border border-slate-200 shadow-xl space-y-6">
        <ShieldCheck className="w-16 h-16 text-green-500 mx-auto" />
        <h2 className="text-2xl font-bold">Secure Payment Gate</h2>
        <p className="text-slate-500 text-sm">You are being protected by 256-bit SSL encryption. We never store your card details.</p>
        <div className="text-left space-y-4 border-t pt-6">
          <div className="flex justify-between font-bold"><span>Payable Amount:</span><span>${cart.reduce((a, b) => a + (b.finalPrice || b.price), 0).toFixed(2)}</span></div>
          <button 
            disabled={loading}
            onClick={handlePayment} 
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Processing Encryption..." : "Pay Securely with Razorpay"}
          </button>
        </div>
      </div>
    </div>
  );
};

const Login = ({ login, resetPassword }: { login: (r: UserRole, n?: string, e?: string) => void, resetPassword: (e: string) => void }) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    setTimeout(async () => {
      await login(UserRole.CUSTOMER, mode === 'signup' ? name : undefined, email);
      setIsLoading(false);
      navigate('/');
    }, 800); // Reduced simulated latency
  };

  return (
    <div className="max-w-md mx-auto py-20 px-4 space-y-8 animate-fade-in">
      <div className="text-center">
        <h1 className="text-3xl font-bold">{mode === 'signin' ? 'Welcome Back' : 'Join Lens Master'}</h1>
        <p className="text-slate-500">{mode === 'signin' ? 'Sign in to manage your vision' : 'Secure your optical health today'}</p>
      </div>
      
      <div className="bg-white p-2 rounded-2xl border border-slate-200 flex mb-4">
        <button 
          onClick={() => setMode('signin')}
          className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${mode === 'signin' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500'}`}
        >
          Sign In
        </button>
        <button 
          onClick={() => setMode('signup')}
          className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${mode === 'signup' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500'}`}
        >
          Sign Up
        </button>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        {mode === 'signup' && (
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-slate-500">Full Name</label>
            <div className="relative">
              <UserPlus className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
              <input 
                className="w-full pl-10 p-3 border rounded-xl" 
                type="text" 
                placeholder="Jane Cooper" 
                value={name} 
                onChange={e => setName(e.target.value)} 
              />
            </div>
          </div>
        )}
        <div className="space-y-2">
           <label className="text-xs font-bold uppercase text-slate-500">Email Address</label>
           <div className="relative">
             <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
             <input 
              className="w-full pl-10 p-3 border rounded-xl" 
              type="email" 
              placeholder="jane@example.com" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
            />
           </div>
        </div>
        <div className="space-y-2">
           <label className="text-xs font-bold uppercase text-slate-500">Password</label>
           <div className="relative">
             <Key className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
             <input 
              className="w-full pl-10 p-3 border rounded-xl" 
              type="password" 
              placeholder="••••••••" 
            />
           </div>
        </div>
        {mode === 'signin' && (
          <div className="flex justify-end">
            <button onClick={() => email && resetPassword(email)} className="text-xs text-blue-600 hover:underline">Forgot Password?</button>
          </div>
        )}
        <button 
          onClick={handleSubmit} 
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all disabled:opacity-50"
        >
          {isLoading ? <Clock className="w-5 h-5 animate-spin" /> : (mode === 'signin' ? 'Sign In' : 'Create Secure Account')}
        </button>
        
        {mode === 'signin' && (
          <>
            <div className="relative py-4"><div className="absolute inset-0 flex items-center"><span className="w-full border-t"></span></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-400">Admin Access</span></div></div>
            <button onClick={() => { login(UserRole.ADMIN); navigate('/admin'); }} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold">Login as Admin</button>
          </>
        )}
      </div>
      
      <p className="text-center text-xs text-slate-400 px-8">
        By continuing, you consent to our GDPR policy and 256-bit encryption of your optical data.
      </p>
    </div>
  );
};

const AdminDashboard = ({ addToast }: { addToast: (m: string, t: 'success'|'info') => void }) => {
  const handleUpdateStatus = async (orderId: string, status: string) => {
    addToast(`Order ${orderId} updated to ${status}`, 'success');
    
    // Background email dispatch
    mailService.sendEmail({
      to: 'john@example.com',
      type: 'STATUS_UPDATE',
      data: { orderId, status }
    }).then(() => {
      addToast(`Status notification sent to customer`, 'info');
    }).catch(console.error);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
       <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold">Admin Console</h1>
            <p className="text-slate-500">Security Audit & Management</p>
          </div>
          <div className="bg-green-50 text-green-600 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2">
             <ShieldCheck className="w-4 h-4" /> System Secure
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Total Orders', val: '142', sub: '+12% increase' },
            { label: 'Pending Prescriptions', val: '8', sub: 'Action Required' },
            { label: 'Revenue (MTD)', val: '$14.2k', sub: 'On track' },
            { label: 'Security Incidents', val: '0', sub: 'All systems normal' }
          ].map((s, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200">
               <div className="text-slate-500 text-sm font-medium">{s.label}</div>
               <div className="text-2xl font-bold mt-1">{s.val}</div>
               <div className="text-xs text-blue-600 mt-2 font-semibold">{s.sub}</div>
            </div>
          ))}
       </div>

       <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
             <h3 className="font-bold">Recent Orders</h3>
             <button className="text-blue-600 text-sm font-bold">View Audit Log</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                  <th className="px-6 py-4">Order ID</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { id: 'ORD-991', user: 'Mike Ross', status: 'Processing', price: '$249.00' },
                  { id: 'ORD-990', user: 'Harvey Specter', status: 'Delivered', price: '$512.00' },
                  { id: 'ORD-989', user: 'Louis Litt', status: 'Processing', price: '$189.00' }
                ].map((o, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold">{o.id}</td>
                    <td className="px-6 py-4 text-slate-600">{o.user}</td>
                    <td className="px-6 py-4">
                      <select 
                        className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase border-none outline-none cursor-pointer"
                        defaultValue={o.status}
                        onChange={(e) => handleUpdateStatus(o.id, e.target.value)}
                      >
                        <option>Processing</option>
                        <option>Shipped</option>
                        <option>Delivered</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 font-bold">{o.price}</td>
                    <td className="px-6 py-4"><button className="text-slate-400 hover:text-blue-600">Details</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
       </div>
    </div>
  );
};

// --- MAIN APP ---

export default function App() {
  const [toasts, setToasts] = useState<{ id: number, message: string, type: 'success' | 'info' }[]>([]);
  
  const addToast = useCallback((message: string, type: 'success' | 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const { user, login, logout, resetPassword } = useAuth(addToast);
  const [cart, setCart] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const addToCart = useCallback((item: any) => {
    setCart(prev => [...prev, item]);
  }, []);

  const removeFromCart = useCallback((idx: number) => {
    setCart(prev => prev.filter((_, i) => i !== idx));
  }, []);

  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <Navbar user={user} logout={logout} cartCount={cart.length} />
        
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop onAddToCart={setSelectedProduct} />} />
            <Route path="/customize" element={selectedProduct ? <ProductCustomizer product={selectedProduct} addToCart={addToCart} /> : <Home />} />
            <Route path="/cart" element={<CartPage cart={cart} onRemove={removeFromCart} />} />
            <Route path="/checkout" element={<CheckoutPage cart={cart} clearCart={() => setCart([])} user={user} addToast={addToast} />} />
            <Route path="/login" element={<Login login={login} resetPassword={resetPassword} />} />
            {user?.role === UserRole.ADMIN && <Route path="/admin" element={<AdminDashboard addToast={addToast} />} />}
          </Routes>
        </main>

        {toasts.map(t => (
          <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
        ))}

        {selectedProduct && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 animate-fade-in">
             <div className="bg-white p-8 rounded-3xl max-w-lg w-full space-y-6 shadow-2xl">
                <h3 className="text-2xl font-bold">Configure {selectedProduct.name}</h3>
                <p className="text-slate-500">This model {selectedProduct.category === ProductCategory.POWER_SPECTACLES ? 'requires prescription details.' : 'is a standard sunglass model.'}</p>
                <div className="flex gap-4">
                   <button onClick={() => setSelectedProduct(null)} className="flex-1 py-3 border rounded-xl font-bold hover:bg-slate-50 transition-colors">Cancel</button>
                   <Link 
                     to="/customize" 
                     className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold text-center hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
                    >
                      Continue
                    </Link>
                </div>
             </div>
          </div>
        )}

        <footer className="bg-white border-t border-slate-200 py-12">
          <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Glasses className="w-6 h-6 text-blue-600" />
                <span className="text-lg font-bold">Lens Master</span>
              </div>
              <p className="text-sm text-slate-500">The world's first security-first optical marketplace. GDPR & PCI-DSS compliant.</p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Shop</h4>
              <ul className="text-sm text-slate-500 space-y-2">
                <li><Link to="/shop?cat=Power%20Spectacles">Prescription Glasses</Link></li>
                <li><Link to="/shop?cat=Sunglasses">Sunglasses</Link></li>
                <li><Link to="/shop">New Arrivals</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Company</h4>
              <ul className="text-sm text-slate-500 space-y-2">
                <li>Privacy Policy</li>
                <li>Shipping & Returns</li>
                <li>Terms of Service</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Secure Network</h4>
              <div className="flex flex-wrap gap-2">
                <div className="px-3 py-1 border rounded text-[10px] font-bold uppercase tracking-wider">PCI-DSS</div>
                <div className="px-3 py-1 border rounded text-[10px] font-bold uppercase tracking-wider">SSL-256</div>
                <div className="px-3 py-1 border rounded text-[10px] font-bold uppercase tracking-wider">Razorpay</div>
              </div>
            </div>
          </div>
          <div className="max-w-7xl mx-auto px-4 mt-12 pt-8 border-t border-slate-100 text-center text-xs text-slate-400">
             © 2024 Lens Master Optical Platform. All rights reserved.
          </div>
        </footer>
      </div>
    </Router>
  );
}
