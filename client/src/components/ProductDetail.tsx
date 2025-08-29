import { useState, useEffect } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Heart, Share, Star, Truck, Shield, RotateCcw } from 'lucide-react';
import type { ProductWithVariants, ProductVariant, CreateCartItemInput } from '../../../server/src/schema';

interface ProductDetailProps {
  productId: number | null;
  customerId: number;
  onBack: () => void;
  onAddToCart: () => void;
}

// Static data for the product detail demonstration
const DEMO_PRODUCT: ProductWithVariants = {
  id: 1,
  name: "Air Max Classic",
  description: "Experience the perfect blend of comfort and style with the Air Max Classic. Featuring advanced cushioning technology and breathable materials, these shoes are designed for all-day comfort whether you're hitting the gym, running errands, or simply enjoying a casual day out. The iconic design has been updated with modern materials while maintaining the classic silhouette that made it a legend.",
  brand: "Nike",
  category: "Athletic",
  base_price: 129.99,
  image_url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=600&fit=crop",
  is_active: true,
  created_at: new Date(),
  updated_at: new Date(),
  variants: [
    { id: 1, product_id: 1, size: '7', color: 'black', stock_quantity: 15, price_adjustment: 0, sku: 'AM-BLK-7', created_at: new Date(), updated_at: new Date() },
    { id: 2, product_id: 1, size: '7.5', color: 'black', stock_quantity: 12, price_adjustment: 0, sku: 'AM-BLK-7.5', created_at: new Date(), updated_at: new Date() },
    { id: 3, product_id: 1, size: '8', color: 'black', stock_quantity: 18, price_adjustment: 0, sku: 'AM-BLK-8', created_at: new Date(), updated_at: new Date() },
    { id: 4, product_id: 1, size: '8.5', color: 'black', stock_quantity: 10, price_adjustment: 0, sku: 'AM-BLK-8.5', created_at: new Date(), updated_at: new Date() },
    { id: 5, product_id: 1, size: '9', color: 'black', stock_quantity: 8, price_adjustment: 0, sku: 'AM-BLK-9', created_at: new Date(), updated_at: new Date() },
    { id: 6, product_id: 1, size: '9.5', color: 'black', stock_quantity: 6, price_adjustment: 0, sku: 'AM-BLK-9.5', created_at: new Date(), updated_at: new Date() },
    { id: 7, product_id: 1, size: '7', color: 'white', stock_quantity: 20, price_adjustment: 0, sku: 'AM-WHT-7', created_at: new Date(), updated_at: new Date() },
    { id: 8, product_id: 1, size: '7.5', color: 'white', stock_quantity: 14, price_adjustment: 0, sku: 'AM-WHT-7.5', created_at: new Date(), updated_at: new Date() },
    { id: 9, product_id: 1, size: '8', color: 'white', stock_quantity: 22, price_adjustment: 0, sku: 'AM-WHT-8', created_at: new Date(), updated_at: new Date() },
    { id: 10, product_id: 1, size: '8.5', color: 'white', stock_quantity: 16, price_adjustment: 0, sku: 'AM-WHT-8.5', created_at: new Date(), updated_at: new Date() },
    { id: 11, product_id: 1, size: '9', color: 'white', stock_quantity: 12, price_adjustment: 0, sku: 'AM-WHT-9', created_at: new Date(), updated_at: new Date() },
    { id: 12, product_id: 1, size: '9.5', color: 'white', stock_quantity: 8, price_adjustment: 0, sku: 'AM-WHT-9.5', created_at: new Date(), updated_at: new Date() },
    { id: 13, product_id: 1, size: '8', color: 'navy', stock_quantity: 5, price_adjustment: 10, sku: 'AM-NAV-8', created_at: new Date(), updated_at: new Date() },
    { id: 14, product_id: 1, size: '8.5', color: 'navy', stock_quantity: 7, price_adjustment: 10, sku: 'AM-NAV-8.5', created_at: new Date(), updated_at: new Date() },
    { id: 15, product_id: 1, size: '9', color: 'navy', stock_quantity: 4, price_adjustment: 10, sku: 'AM-NAV-9', created_at: new Date(), updated_at: new Date() }
  ]
};

export function ProductDetail({ productId, onBack, onAddToCart }: ProductDetailProps) {
  const [product, setProduct] = useState<ProductWithVariants | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

  useEffect(() => {
    // For demo purposes, use static data
    // In real implementation: const result = await trpc.getProductById.query({ id: productId });
    if (productId) {
      setProduct(DEMO_PRODUCT);
    }
  }, [productId]);

  useEffect(() => {
    if (product && selectedSize && selectedColor) {
      const variant = product.variants.find(v => 
        v.size === selectedSize && v.color === selectedColor
      );
      setSelectedVariant(variant || null);
    } else {
      setSelectedVariant(null);
    }
  }, [product, selectedSize, selectedColor]);

  if (!product) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading product details...</p>
        </div>
      </div>
    );
  }

  const availableSizes = Array.from(new Set(
    product.variants.filter(v => v.stock_quantity > 0).map(v => v.size)
  )).sort();

  const availableColorsForSize = selectedSize 
    ? Array.from(new Set(
        product.variants.filter(v => v.size === selectedSize && v.stock_quantity > 0).map(v => v.color)
      ))
    : Array.from(new Set(
        product.variants.filter(v => v.stock_quantity > 0).map(v => v.color)
      ));

  const getColorDisplayName = (color: string) => {
    return color.charAt(0).toUpperCase() + color.slice(1);
  };

  const getColorBadgeClass = (color: string) => {
    const colorMap: { [key: string]: string } = {
      black: 'bg-black',
      white: 'bg-white border-2 border-gray-300',
      navy: 'bg-blue-900',
      red: 'bg-red-500',
      blue: 'bg-blue-500',
      brown: 'bg-amber-800',
      gray: 'bg-gray-500',
      green: 'bg-green-500'
    };
    return colorMap[color] || 'bg-gray-400';
  };

  const getCurrentPrice = () => {
    if (selectedVariant) {
      return product.base_price + selectedVariant.price_adjustment;
    }
    return product.base_price;
  };

  const handleAddToCart = async () => {
    if (!selectedVariant) return;

    setIsAddingToCart(true);
    try {
      const cartItemInput: CreateCartItemInput = {
        cart_id: 1, // Static cart ID - in real app would get from customer's cart
        product_variant_id: selectedVariant.id,
        quantity
      };
      
      await trpc.addToCart.mutate(cartItemInput);
      setAddedToCart(true);
      onAddToCart();
      
      // Reset the success message after 2 seconds
      setTimeout(() => setAddedToCart(false), 2000);
    } catch (error) {
      console.error('Failed to add to cart:', error);
    } finally {
      setIsAddingToCart(false);
    }
  };

  return (
    <div>
      {/* Back Button */}
      <Button variant="ghost" onClick={onBack} className="mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Catalog
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Product Images */}
        <div>
          <div className="aspect-square mb-4 bg-gray-100 rounded-lg overflow-hidden">
            <img
              src={product.image_url || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=600&fit=crop'}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
          {/* Thumbnail Gallery */}
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((index) => (
              <div key={index} className="aspect-square bg-gray-100 rounded border-2 border-transparent hover:border-blue-500 cursor-pointer overflow-hidden">
                <img
                  src={product.image_url || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&h=200&fit=crop'}
                  alt={`${product.name} view ${index}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Product Information */}
        <div>
          <div className="mb-4">
            <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
            <p className="text-xl text-gray-600 mb-2">{product.brand}</p>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <span className="text-gray-600">(4.8/5 - 324 reviews)</span>
            </div>
            <div className="flex items-baseline gap-2 mb-6">
              <span className="text-3xl font-bold">${getCurrentPrice().toFixed(2)}</span>
              {selectedVariant && selectedVariant.price_adjustment > 0 && (
                <span className="text-lg text-gray-500 line-through">${product.base_price.toFixed(2)}</span>
              )}
              <Badge variant="secondary" className="ml-2">{product.category}</Badge>
            </div>
          </div>

          {/* Size Selection */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3">Size</h3>
            <div className="grid grid-cols-6 gap-2">
              {availableSizes.map((size) => (
                <Button
                  key={size}
                  variant={selectedSize === size ? "default" : "outline"}
                  className="aspect-square p-0"
                  onClick={() => {
                    setSelectedSize(size);
                    setSelectedColor(''); // Reset color when size changes
                  }}
                >
                  {size}
                </Button>
              ))}
            </div>
            {selectedSize && (
              <p className="text-sm text-gray-600 mt-2">Selected: US Size {selectedSize}</p>
            )}
          </div>

          {/* Color Selection */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3">Color</h3>
            <div className="flex flex-wrap gap-3">
              {availableColorsForSize.map((color) => (
                <button
                  key={color}
                  className={`
                    relative w-12 h-12 rounded-full border-2 transition-all
                    ${selectedColor === color ? 'ring-2 ring-blue-500 ring-offset-2' : 'hover:scale-105'}
                    ${getColorBadgeClass(color)}
                  `}
                  onClick={() => setSelectedColor(color)}
                  title={getColorDisplayName(color)}
                />
              ))}
            </div>
            {selectedColor && (
              <p className="text-sm text-gray-600 mt-2">Selected: {getColorDisplayName(selectedColor)}</p>
            )}
          </div>

          {/* Stock Information */}
          {selectedVariant && (
            <div className="mb-6 p-3 bg-green-50 rounded-lg">
              <p className="text-green-700">
                ✓ In stock: {selectedVariant.stock_quantity} available
              </p>
            </div>
          )}

          {/* Quantity and Add to Cart */}
          <div className="mb-6">
            <div className="flex gap-4 items-center mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Quantity</label>
                <Select 
                  value={quantity.toString()} 
                  onValueChange={(value: string) => setQuantity(parseInt(value))}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map(num => (
                      <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                className="flex-1"
                size="lg"
                onClick={handleAddToCart}
                disabled={!selectedVariant || isAddingToCart || addedToCart}
              >
                {addedToCart ? '✓ Added to Cart!' : isAddingToCart ? 'Adding...' : 'Add to Cart'}
              </Button>
              <Button variant="outline" size="lg">
                <Heart className="h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg">
                <Share className="h-5 w-5" />
              </Button>
            </div>

            {!selectedSize && (
              <p className="text-red-600 text-sm mt-2">Please select a size</p>
            )}
            {selectedSize && !selectedColor && (
              <p className="text-red-600 text-sm mt-2">Please select a color</p>
            )}
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="flex items-center gap-2 text-sm">
              <Truck className="h-5 w-5 text-green-600" />
              <span>Free Shipping</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <RotateCcw className="h-5 w-5 text-blue-600" />
              <span>30-Day Returns</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Shield className="h-5 w-5 text-purple-600" />
              <span>1-Year Warranty</span>
            </div>
          </div>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Product Details</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed mb-4">
                {product.description}
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">Brand:</span>
                  <span>{product.brand}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Category:</span>
                  <span>{product.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">SKU:</span>
                  <span>{selectedVariant?.sku || 'Select variant to see SKU'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}