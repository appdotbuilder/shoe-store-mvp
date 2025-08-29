import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Search, User, Menu, Heart } from 'lucide-react';
import { ProductCatalog } from '@/components/ProductCatalog';
import { ProductDetail } from '@/components/ProductDetail';
import { Cart } from '@/components/Cart';
import { Checkout } from '@/components/Checkout';
import type { CartWithItems } from '../../server/src/schema';

type AppView = 'catalog' | 'product' | 'cart' | 'checkout';

function App() {
  const [currentView, setCurrentView] = useState<AppView>('catalog');
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [cart, setCart] = useState<CartWithItems | null>(null);

  const [cartItemCount, setCartItemCount] = useState(0);

  // Demo customer ID (in real app, would be from authentication)
  const demoCustomerId = 1;

  const loadCart = useCallback(async () => {
    try {
      const cartData = await trpc.getCustomerCart.query({ customerId: demoCustomerId });
      setCart(cartData);
      const itemCount = cartData.items.reduce((sum, item) => sum + item.quantity, 0);
      setCartItemCount(itemCount);
    } catch (error) {
      console.error('Failed to load cart:', error);
    }
  }, []);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  const handleViewProduct = (productId: number) => {
    setSelectedProductId(productId);
    setCurrentView('product');
  };

  const handleAddToCart = async () => {
    await loadCart(); // Refresh cart after adding items
  };

  const handleViewCart = () => {
    setCurrentView('cart');
  };

  const handleProceedToCheckout = () => {
    setCurrentView('checkout');
  };

  const handleBackToCatalog = () => {
    setCurrentView('catalog');
    setSelectedProductId(null);
  };

  const handleOrderComplete = () => {
    setCurrentView('catalog');
    loadCart(); // Refresh cart after order
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'product':
        return (
          <ProductDetail
            productId={selectedProductId}
            customerId={demoCustomerId}
            onBack={handleBackToCatalog}
            onAddToCart={handleAddToCart}
          />
        );
      case 'cart':
        return (
          <Cart
            customerId={demoCustomerId}
            onBack={handleBackToCatalog}
            onProceedToCheckout={handleProceedToCheckout}
            onCartUpdate={loadCart}
          />
        );
      case 'checkout':
        return (
          <Checkout
            customerId={demoCustomerId}
            cart={cart}
            onBack={() => setCurrentView('cart')}
            onOrderComplete={handleOrderComplete}
          />
        );
      case 'catalog':
      default:
        return (
          <ProductCatalog
            onViewProduct={handleViewProduct}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div 
              className="flex items-center cursor-pointer"
              onClick={handleBackToCatalog}
            >
              <h1 className="text-2xl font-bold text-gray-900">👟 SoleStyle</h1>
            </div>

            {/* Search Bar */}
            <div className="hidden md:flex flex-1 max-w-lg mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search for shoes..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm">
                <Heart className="h-5 w-5" />
                <span className="hidden sm:inline ml-2">Wishlist</span>
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleViewCart}
                className="relative"
              >
                <ShoppingCart className="h-5 w-5" />
                {cartItemCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs p-0"
                  >
                    {cartItemCount}
                  </Badge>
                )}
                <span className="hidden sm:inline ml-2">Cart</span>
              </Button>

              <Button variant="ghost" size="sm">
                <User className="h-5 w-5" />
                <span className="hidden sm:inline ml-2">Account</span>
              </Button>

              <Button variant="ghost" size="sm" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Breadcrumb */}
      {currentView !== 'catalog' && (
        <div className="bg-gray-100 border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <nav className="flex items-center space-x-2 text-sm">
              <button 
                onClick={handleBackToCatalog}
                className="text-blue-600 hover:text-blue-800"
              >
                Home
              </button>
              <span className="text-gray-500">/</span>
              <span className="text-gray-700 capitalize">{currentView}</span>
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderCurrentView()}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">👟 SoleStyle</h3>
              <p className="text-gray-400">
                Your destination for premium footwear. Quality shoes for every step of your journey.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Shop</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">All Shoes</a></li>
                <li><a href="#" className="hover:text-white">Men's</a></li>
                <li><a href="#" className="hover:text-white">Women's</a></li>
                <li><a href="#" className="hover:text-white">Kids'</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Size Guide</a></li>
                <li><a href="#" className="hover:text-white">Returns</a></li>
                <li><a href="#" className="hover:text-white">Shipping</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Connect</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Newsletter</a></li>
                <li><a href="#" className="hover:text-white">Instagram</a></li>
                <li><a href="#" className="hover:text-white">Twitter</a></li>
                <li><a href="#" className="hover:text-white">Facebook</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 SoleStyle. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;