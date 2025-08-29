import { useState, useEffect } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag, Truck } from 'lucide-react';
import type { CartWithItems } from '../../../server/src/schema';

interface CartProps {
  customerId: number;
  onBack: () => void;
  onProceedToCheckout: () => void;
  onCartUpdate: () => void;
}

// Demo cart data since API returns empty cart
const DEMO_CART: CartWithItems = {
  id: 1,
  customer_id: 1,
  created_at: new Date(),
  updated_at: new Date(),
  items: [
    {
      id: 1,
      quantity: 2,
      product_variant: {
        id: 1,
        size: '9',
        color: 'black',
        price_adjustment: 0,
        product: {
          name: "Air Max Classic",
          brand: "Nike",
          base_price: 129.99,
          image_url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=300&fit=crop"
        }
      }
    },
    {
      id: 2,
      quantity: 1,
      product_variant: {
        id: 5,
        size: '8',
        color: 'brown',
        price_adjustment: 0,
        product: {
          name: "Chelsea Boot Premium",
          brand: "Clarks",
          base_price: 189.99,
          image_url: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=300&fit=crop"
        }
      }
    },
    {
      id: 3,
      quantity: 1,
      product_variant: {
        id: 7,
        size: '7',
        color: 'red',
        price_adjustment: 0,
        product: {
          name: "Canvas Low-Top",
          brand: "Converse",
          base_price: 65.00,
          image_url: "https://images.unsplash.com/photo-1552346989-e069318e20a5?w=400&h=300&fit=crop"
        }
      }
    }
  ]
};

export function Cart({ customerId, onBack, onProceedToCheckout, onCartUpdate }: CartProps) {
  const [cart, setCart] = useState<CartWithItems | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingItems, setUpdatingItems] = useState<Set<number>>(new Set());

  useEffect(() => {
    const loadCart = async () => {
      try {
        setIsLoading(true);
        // For demo purposes, use static data
        // In real implementation: const cartData = await trpc.getCustomerCart.query({ customerId });
        setCart(DEMO_CART);
      } catch (error) {
        console.error('Failed to load cart:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCart();
  }, [customerId]);

  const updateQuantity = async (itemId: number, newQuantity: number) => {
    if (newQuantity < 1) return;

    setUpdatingItems(prev => new Set([...prev, itemId]));
    try {
      await trpc.updateCartItemQuantity.mutate({
        id: itemId,
        quantity: newQuantity
      });
      
      // Update local state
      if (cart) {
        const updatedCart = {
          ...cart,
          items: cart.items.map(item => 
            item.id === itemId ? { ...item, quantity: newQuantity } : item
          )
        };
        setCart(updatedCart);
        onCartUpdate();
      }
    } catch (error) {
      console.error('Failed to update quantity:', error);
    } finally {
      setUpdatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const removeItem = async (itemId: number) => {
    setUpdatingItems(prev => new Set([...prev, itemId]));
    try {
      await trpc.removeFromCart.mutate({ cartItemId: itemId });
      
      // Update local state
      if (cart) {
        const updatedCart = {
          ...cart,
          items: cart.items.filter(item => item.id !== itemId)
        };
        setCart(updatedCart);
        onCartUpdate();
      }
    } catch (error) {
      console.error('Failed to remove item:', error);
    } finally {
      setUpdatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const calculateItemTotal = (item: CartWithItems['items'][0]) => {
    return (item.product_variant.product.base_price + item.product_variant.price_adjustment) * item.quantity;
  };

  const calculateSubtotal = () => {
    if (!cart) return 0;
    return cart.items.reduce((total, item) => total + calculateItemTotal(item), 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * 0.08; // 8% tax
  };

  const calculateShipping = () => {
    const subtotal = calculateSubtotal();
    return subtotal > 100 ? 0 : 9.99; // Free shipping over $100
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax() + calculateShipping();
  };

  const getColorDisplayName = (color: string) => {
    return color.charAt(0).toUpperCase() + color.slice(1);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your cart...</p>
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="text-center py-12">
        <ShoppingBag className="h-24 w-24 text-gray-400 mx-auto mb-6" />
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Your cart is empty</h2>
        <p className="text-gray-600 mb-8">
          Looks like you haven't added any shoes to your cart yet.
        </p>
        <Button onClick={onBack} size="lg">
          Continue Shopping
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* Back Button and Header */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Continue Shopping
        </Button>
        <h1 className="text-2xl font-bold">Shopping Cart ({cart.items.length} items)</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cart.items.map((item) => {
            const isUpdating = updatingItems.has(item.id);
            const itemPrice = item.product_variant.product.base_price + item.product_variant.price_adjustment;
            const itemTotal = calculateItemTotal(item);

            return (
              <Card key={item.id} className={isUpdating ? 'opacity-50' : ''}>
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    {/* Product Image */}
                    <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={item.product_variant.product.image_url || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&h=200&fit=crop'}
                        alt={item.product_variant.product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Product Details */}
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold text-lg">{item.product_variant.product.name}</h3>
                          <p className="text-gray-600">{item.product_variant.product.brand}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                          disabled={isUpdating}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>

                      <div className="flex gap-4 mb-4">
                        <Badge variant="outline">Size: {item.product_variant.size}</Badge>
                        <Badge variant="outline">Color: {getColorDisplayName(item.product_variant.color)}</Badge>
                      </div>

                      <div className="flex items-center justify-between">
                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1 || isUpdating}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center font-medium">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            disabled={isUpdating}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>

                        {/* Price */}
                        <div className="text-right">
                          <div className="font-semibold">${itemTotal.toFixed(2)}</div>
                          <div className="text-sm text-gray-500">${itemPrice.toFixed(2)} each</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${calculateSubtotal().toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between">
                <span>Tax</span>
                <span>${calculateTax().toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>
                  {calculateShipping() === 0 ? (
                    <span className="text-green-600">Free</span>
                  ) : (
                    `$${calculateShipping().toFixed(2)}`
                  )}
                </span>
              </div>

              {calculateShipping() === 0 && (
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700 text-sm">
                    <Truck className="h-4 w-4" />
                    <span>You've qualified for free shipping! 🎉</span>
                  </div>
                </div>
              )}
              
              {calculateShipping() > 0 && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-blue-700 text-sm">
                    Add ${(100 - calculateSubtotal()).toFixed(2)} more for free shipping
                  </div>
                </div>
              )}

              <hr />
              
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>${calculateTotal().toFixed(2)}</span>
              </div>
              
              <Button 
                className="w-full" 
                size="lg"
                onClick={onProceedToCheckout}
              >
                Proceed to Checkout
              </Button>

              <div className="text-center">
                <Button variant="outline" className="w-full" onClick={onBack}>
                  Continue Shopping
                </Button>
              </div>

              {/* Security & Features */}
              <div className="border-t pt-4 space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <span>🔒</span>
                  <span>Secure checkout</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>📦</span>
                  <span>Free returns within 30 days</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>🛡️</span>
                  <span>1-year warranty included</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}