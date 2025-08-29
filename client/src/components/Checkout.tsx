import { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, CreditCard, MapPin, CheckCircle } from 'lucide-react';
import type { CartWithItems, CreateAddressInput, CreateOrderInput } from '../../../server/src/schema';

interface CheckoutProps {
  customerId: number;
  cart: CartWithItems | null;
  onBack: () => void;
  onOrderComplete: () => void;
}

interface AddressForm {
  street_address: string;
  apartment: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

interface PaymentForm {
  card_number: string;
  expiry_month: string;
  expiry_year: string;
  cvv: string;
  cardholder_name: string;
}

export function Checkout({ customerId, cart, onBack, onOrderComplete }: CheckoutProps) {
  const [currentStep, setCurrentStep] = useState<'shipping' | 'payment' | 'review' | 'complete'>('shipping');
  const [isProcessing, setIsProcessing] = useState(false);

  // Form states
  const [shippingAddress, setShippingAddress] = useState<AddressForm>({
    street_address: '',
    apartment: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'United States'
  });

  const [billingAddress, setBillingAddress] = useState<AddressForm>({
    street_address: '',
    apartment: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'United States'
  });

  const [payment, setPayment] = useState<PaymentForm>({
    card_number: '',
    expiry_month: '',
    expiry_year: '',
    cvv: '',
    cardholder_name: ''
  });

  const [sameAsShipping, setSameAsShipping] = useState(true);

  // Calculate totals (reused from Cart component)
  const calculateSubtotal = () => {
    if (!cart) return 0;
    return cart.items.reduce((total, item) => {
      const itemPrice = item.product_variant.product.base_price + item.product_variant.price_adjustment;
      return total + (itemPrice * item.quantity);
    }, 0);
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

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentStep('payment');
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentStep('review');
  };

  const handleOrderSubmit = async () => {
    if (!cart) return;
    
    setIsProcessing(true);
    try {
      // Create addresses first
      // Create address inputs for API calls
      const shippingAddressData: CreateAddressInput = {
        customer_id: customerId,
        type: 'shipping',
        ...shippingAddress,
        apartment: shippingAddress.apartment || null,
        is_default: false
      };

      const billingAddressData: CreateAddressInput = {
        customer_id: customerId,
        type: 'billing',
        ...(sameAsShipping ? shippingAddress : billingAddress),
        apartment: (sameAsShipping ? shippingAddress.apartment : billingAddress.apartment) || null,
        is_default: false
      };

      // In real app, would create addresses via API and get actual IDs
      await trpc.createAddress.mutate(shippingAddressData);
      if (!sameAsShipping) {
        await trpc.createAddress.mutate(billingAddressData);
      }

      // Static address IDs for demonstration (in real app, these would return actual address IDs)
      const shippingAddressId = 1;
      const billingAddressId = sameAsShipping ? 1 : 2;

      // Create order
      const orderInput: CreateOrderInput = {
        customer_id: customerId,
        billing_address_id: billingAddressId,
        shipping_address_id: shippingAddressId,
        items: cart.items.map(item => ({
          product_variant_id: item.product_variant.id,
          quantity: item.quantity
        }))
      };

      await trpc.createOrder.mutate(orderInput);
      setCurrentStep('complete');
    } catch (error) {
      console.error('Failed to create order:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'shipping':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Shipping Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleShippingSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="street">Street Address *</Label>
                      <Input
                        id="street"
                        value={shippingAddress.street_address}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setShippingAddress(prev => ({ ...prev, street_address: e.target.value }))
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="apartment">Apartment/Suite</Label>
                      <Input
                        id="apartment"
                        value={shippingAddress.apartment}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setShippingAddress(prev => ({ ...prev, apartment: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        value={shippingAddress.city}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setShippingAddress(prev => ({ ...prev, city: e.target.value }))
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State *</Label>
                      <Select 
                        value={shippingAddress.state || ''} 
                        onValueChange={(value: string) =>
                          setShippingAddress(prev => ({ ...prev, state: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AL">Alabama</SelectItem>
                          <SelectItem value="CA">California</SelectItem>
                          <SelectItem value="FL">Florida</SelectItem>
                          <SelectItem value="NY">New York</SelectItem>
                          <SelectItem value="TX">Texas</SelectItem>
                          {/* Add more states as needed */}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="postal">Postal Code *</Label>
                      <Input
                        id="postal"
                        value={shippingAddress.postal_code}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setShippingAddress(prev => ({ ...prev, postal_code: e.target.value }))
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="country">Country *</Label>
                      <Select 
                        value={shippingAddress.country || 'United States'} 
                        onValueChange={(value: string) =>
                          setShippingAddress(prev => ({ ...prev, country: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="United States">United States</SelectItem>
                          <SelectItem value="Canada">Canada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button type="submit" className="w-full">
                    Continue to Payment
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        );

      case 'payment':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePaymentSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="cardholder">Cardholder Name *</Label>
                    <Input
                      id="cardholder"
                      value={payment.cardholder_name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setPayment(prev => ({ ...prev, cardholder_name: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="cardnumber">Card Number *</Label>
                    <Input
                      id="cardnumber"
                      placeholder="1234 5678 9012 3456"
                      value={payment.card_number}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setPayment(prev => ({ ...prev, card_number: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="month">Month *</Label>
                      <Select 
                        value={payment.expiry_month || ''} 
                        onValueChange={(value: string) =>
                          setPayment(prev => ({ ...prev, expiry_month: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="MM" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => (
                            <SelectItem key={i + 1} value={(i + 1).toString().padStart(2, '0')}>
                              {(i + 1).toString().padStart(2, '0')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="year">Year *</Label>
                      <Select 
                        value={payment.expiry_year || ''} 
                        onValueChange={(value: string) =>
                          setPayment(prev => ({ ...prev, expiry_year: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="YYYY" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 10 }, (_, i) => {
                            const year = new Date().getFullYear() + i;
                            return (
                              <SelectItem key={year} value={year.toString()}>
                                {year}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="cvv">CVV *</Label>
                      <Input
                        id="cvv"
                        placeholder="123"
                        value={payment.cvv}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setPayment(prev => ({ ...prev, cvv: e.target.value }))
                        }
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full">
                    Continue to Review
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Billing Address */}
            <Card>
              <CardHeader>
                <CardTitle>Billing Address</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2 mb-4">
                  <Checkbox 
                    id="same-as-shipping" 
                    checked={sameAsShipping}
                    onCheckedChange={(checked: boolean) => setSameAsShipping(checked)}
                  />
                  <Label htmlFor="same-as-shipping">Same as shipping address</Label>
                </div>
                {!sameAsShipping && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        placeholder="Street Address"
                        value={billingAddress.street_address}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setBillingAddress(prev => ({ ...prev, street_address: e.target.value }))
                        }
                      />
                      <Input
                        placeholder="Apartment/Suite"
                        value={billingAddress.apartment}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setBillingAddress(prev => ({ ...prev, apartment: e.target.value }))
                        }
                      />
                      <Input
                        placeholder="City"
                        value={billingAddress.city}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setBillingAddress(prev => ({ ...prev, city: e.target.value }))
                        }
                      />
                      <Input
                        placeholder="Postal Code"
                        value={billingAddress.postal_code}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setBillingAddress(prev => ({ ...prev, postal_code: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case 'review':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Order Review</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Order Items */}
                <div>
                  <h3 className="font-semibold mb-4">Items ({cart?.items.length || 0})</h3>
                  <div className="space-y-3">
                    {cart?.items.map((item) => (
                      <div key={item.id} className="flex justify-between items-center py-2 border-b">
                        <div className="flex gap-3">
                          <img
                            src={item.product_variant.product.image_url || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=60&h=60&fit=crop'}
                            alt={item.product_variant.product.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                          <div>
                            <p className="font-medium">{item.product_variant.product.name}</p>
                            <p className="text-sm text-gray-500">
                              Size: {item.product_variant.size} | Color: {item.product_variant.color} | Qty: {item.quantity}
                            </p>
                          </div>
                        </div>
                        <p className="font-medium">
                          ${((item.product_variant.product.base_price + item.product_variant.price_adjustment) * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Shipping Address */}
                <div>
                  <h3 className="font-semibold mb-2">Shipping Address</h3>
                  <div className="text-sm text-gray-600">
                    <p>{shippingAddress.street_address}</p>
                    {shippingAddress.apartment && <p>{shippingAddress.apartment}</p>}
                    <p>{shippingAddress.city}, {shippingAddress.state} {shippingAddress.postal_code}</p>
                    <p>{shippingAddress.country}</p>
                  </div>
                </div>

                {/* Payment Method */}
                <div>
                  <h3 className="font-semibold mb-2">Payment Method</h3>
                  <p className="text-sm text-gray-600">
                    **** **** **** {payment.card_number.slice(-4)} ({payment.cardholder_name})
                  </p>
                </div>

                {/* Order Total */}
                <div className="border-t pt-4 space-y-2">
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
                    <span>{calculateShipping() === 0 ? 'Free' : `$${calculateShipping().toFixed(2)}`}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total</span>
                    <span>${calculateTotal().toFixed(2)}</span>
                  </div>
                </div>

                <Button 
                  onClick={handleOrderSubmit} 
                  className="w-full" 
                  size="lg"
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Processing Order...' : 'Place Order'}
                </Button>
              </CardContent>
            </Card>
          </div>
        );

      case 'complete':
        return (
          <div className="text-center py-12">
            <CheckCircle className="h-24 w-24 text-green-500 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Order Complete! 🎉</h2>
            <p className="text-gray-600 mb-8">
              Thank you for your purchase! Your order has been confirmed and will be processed shortly.
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8 max-w-md mx-auto">
              <p className="text-green-800 font-semibold">Order #12345</p>
              <p className="text-green-700">Total: ${calculateTotal().toFixed(2)}</p>
              <p className="text-green-700 text-sm mt-2">
                You'll receive a confirmation email shortly with tracking information.
              </p>
            </div>
            <Button onClick={onOrderComplete} size="lg">
              Continue Shopping
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div>
      {/* Back Button and Progress */}
      {currentStep !== 'complete' && (
        <>
          <div className="flex items-center justify-between mb-6">
            <Button 
              variant="ghost" 
              onClick={currentStep === 'shipping' ? onBack : () => {
                if (currentStep === 'payment') setCurrentStep('shipping');
                if (currentStep === 'review') setCurrentStep('payment');
              }}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {currentStep === 'shipping' ? 'Back to Cart' : 'Back'}
            </Button>
            <h1 className="text-2xl font-bold">Checkout</h1>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep === 'shipping' ? 'bg-blue-600 text-white' : 'bg-green-500 text-white'
              }`}>
                1
              </div>
              <span className="ml-2 text-sm font-medium">Shipping</span>
            </div>
            <div className="mx-4 w-12 h-0.5 bg-gray-300"></div>
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep === 'payment' ? 'bg-blue-600 text-white' : 
                currentStep === 'review' ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-500'
              }`}>
                2
              </div>
              <span className="ml-2 text-sm font-medium">Payment</span>
            </div>
            <div className="mx-4 w-12 h-0.5 bg-gray-300"></div>
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep === 'review' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-500'
              }`}>
                3
              </div>
              <span className="ml-2 text-sm font-medium">Review</span>
            </div>
          </div>
        </>
      )}

      <div className="max-w-2xl mx-auto">
        {renderStep()}
      </div>
    </div>
  );
}