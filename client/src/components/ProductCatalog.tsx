import { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter, Grid, List, Star } from 'lucide-react';
import type { ProductWithVariants } from '../../../server/src/schema';

interface ProductCatalogProps {
  onViewProduct: (productId: number) => void;
}

// Demo data since handlers return empty arrays
const DEMO_PRODUCTS: ProductWithVariants[] = [
  {
    id: 1,
    name: "Air Max Classic",
    description: "Iconic comfort meets timeless style in this classic running shoe",
    brand: "Nike",
    category: "Athletic",
    base_price: 129.99,
    image_url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=300&fit=crop",
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    variants: [
      { id: 1, product_id: 1, size: '9', color: 'black', stock_quantity: 15, price_adjustment: 0, sku: 'AM-BLK-9', created_at: new Date(), updated_at: new Date() },
      { id: 2, product_id: 1, size: '9.5', color: 'black', stock_quantity: 10, price_adjustment: 0, sku: 'AM-BLK-9.5', created_at: new Date(), updated_at: new Date() },
      { id: 3, product_id: 1, size: '9', color: 'white', stock_quantity: 8, price_adjustment: 0, sku: 'AM-WHT-9', created_at: new Date(), updated_at: new Date() }
    ]
  },
  {
    id: 2,
    name: "Chelsea Boot Premium",
    description: "Handcrafted leather boot perfect for formal and casual occasions",
    brand: "Clarks",
    category: "Boots",
    base_price: 189.99,
    image_url: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=300&fit=crop",
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    variants: [
      { id: 4, product_id: 2, size: '8', color: 'brown', stock_quantity: 12, price_adjustment: 0, sku: 'CB-BRN-8', created_at: new Date(), updated_at: new Date() },
      { id: 5, product_id: 2, size: '9', color: 'brown', stock_quantity: 18, price_adjustment: 0, sku: 'CB-BRN-9', created_at: new Date(), updated_at: new Date() },
      { id: 6, product_id: 2, size: '8', color: 'black', stock_quantity: 7, price_adjustment: 10, sku: 'CB-BLK-8', created_at: new Date(), updated_at: new Date() }
    ]
  },
  {
    id: 3,
    name: "Canvas Low-Top",
    description: "Classic canvas sneaker with vintage-inspired design",
    brand: "Converse",
    category: "Casual",
    base_price: 65.00,
    image_url: "https://images.unsplash.com/photo-1552346989-e069318e20a5?w=400&h=300&fit=crop",
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    variants: [
      { id: 7, product_id: 3, size: '7', color: 'red', stock_quantity: 25, price_adjustment: 0, sku: 'CL-RED-7', created_at: new Date(), updated_at: new Date() },
      { id: 8, product_id: 3, size: '8', color: 'red', stock_quantity: 20, price_adjustment: 0, sku: 'CL-RED-8', created_at: new Date(), updated_at: new Date() },
      { id: 9, product_id: 3, size: '7', color: 'navy', stock_quantity: 15, price_adjustment: 0, sku: 'CL-NAV-7', created_at: new Date(), updated_at: new Date() }
    ]
  },
  {
    id: 4,
    name: "Trail Runner Pro",
    description: "Rugged outdoor shoe built for adventure and performance",
    brand: "Merrell",
    category: "Outdoor",
    base_price: 145.00,
    image_url: "https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?w=400&h=300&fit=crop",
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    variants: [
      { id: 10, product_id: 4, size: '10', color: 'gray', stock_quantity: 12, price_adjustment: 0, sku: 'TR-GRY-10', created_at: new Date(), updated_at: new Date() },
      { id: 11, product_id: 4, size: '11', color: 'gray', stock_quantity: 8, price_adjustment: 0, sku: 'TR-GRY-11', created_at: new Date(), updated_at: new Date() },
      { id: 12, product_id: 4, size: '10', color: 'green', stock_quantity: 6, price_adjustment: 5, sku: 'TR-GRN-10', created_at: new Date(), updated_at: new Date() }
    ]
  },
  {
    id: 5,
    name: "Elegant Heel",
    description: "Sophisticated high heel perfect for special occasions",
    brand: "Jimmy Choo",
    category: "Formal",
    base_price: 295.00,
    image_url: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&h=300&fit=crop",
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    variants: [
      { id: 13, product_id: 5, size: '6', color: 'black', stock_quantity: 5, price_adjustment: 0, sku: 'EH-BLK-6', created_at: new Date(), updated_at: new Date() },
      { id: 14, product_id: 5, size: '7', color: 'black', stock_quantity: 8, price_adjustment: 0, sku: 'EH-BLK-7', created_at: new Date(), updated_at: new Date() },
      { id: 15, product_id: 5, size: '6', color: 'red', stock_quantity: 3, price_adjustment: 20, sku: 'EH-RED-6', created_at: new Date(), updated_at: new Date() }
    ]
  },
  {
    id: 6,
    name: "Comfort Walker",
    description: "All-day comfort shoe with premium cushioning technology",
    brand: "Sketchers",
    category: "Comfort",
    base_price: 89.99,
    image_url: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop",
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    variants: [
      { id: 16, product_id: 6, size: '8', color: 'white', stock_quantity: 30, price_adjustment: 0, sku: 'CW-WHT-8', created_at: new Date(), updated_at: new Date() },
      { id: 17, product_id: 6, size: '9', color: 'white', stock_quantity: 25, price_adjustment: 0, sku: 'CW-WHT-9', created_at: new Date(), updated_at: new Date() },
      { id: 18, product_id: 6, size: '8', color: 'gray', stock_quantity: 22, price_adjustment: 0, sku: 'CW-GRY-8', created_at: new Date(), updated_at: new Date() }
    ]
  }
];

export function ProductCatalog({ onViewProduct }: ProductCatalogProps) {
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductWithVariants[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    // For demo purposes, use static data
    // In real implementation: const result = await trpc.getProducts.query();
    setProducts(DEMO_PRODUCTS);
    setFilteredProducts(DEMO_PRODUCTS);
  }, []);

  useEffect(() => {
    let filtered = products;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => 
        product.category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Filter by brand
    if (selectedBrand !== 'all') {
      filtered = filtered.filter(product => 
        product.brand.toLowerCase() === selectedBrand.toLowerCase()
      );
    }

    // Sort products
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.base_price - b.base_price;
        case 'price-high':
          return b.base_price - a.base_price;
        case 'brand':
          return a.brand.localeCompare(b.brand);
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });

    setFilteredProducts(filtered);
  }, [products, selectedCategory, selectedBrand, sortBy]);

  const categories = ['all', ...Array.from(new Set(products.map(p => p.category)))];
  const brands = ['all', ...Array.from(new Set(products.map(p => p.brand)))];

  const getProductStock = (product: ProductWithVariants) => {
    return product.variants.reduce((total, variant) => total + variant.stock_quantity, 0);
  };

  const getLowestPrice = (product: ProductWithVariants) => {
    if (product.variants.length === 0) return product.base_price;
    const minAdjustment = Math.min(...product.variants.map(v => v.price_adjustment));
    return product.base_price + minAdjustment;
  };

  const getAvailableSizes = (product: ProductWithVariants) => {
    return Array.from(new Set(
      product.variants.filter(v => v.stock_quantity > 0).map(v => v.size)
    )).sort();
  };



  const ProductCard = ({ product }: { product: ProductWithVariants }) => {
    const stock = getProductStock(product);
    const price = getLowestPrice(product);
    const sizes = getAvailableSizes(product);


    return (
      <Card className="group cursor-pointer hover:shadow-lg transition-shadow duration-200">
        <div className="aspect-square overflow-hidden rounded-t-lg">
          <img
            src={product.image_url || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=300&fit=crop'}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            onClick={() => onViewProduct(product.id)}
          />
        </div>
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-lg line-clamp-1">{product.name}</h3>
            <div className="flex items-center">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm text-gray-600 ml-1">4.5</span>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-2">{product.brand}</p>
          <p className="text-sm text-gray-500 line-clamp-2 mb-3">{product.description}</p>
          
          <div className="flex flex-wrap gap-1 mb-3">
            <span className="text-xs text-gray-500">Sizes:</span>
            {sizes.slice(0, 4).map(size => (
              <Badge key={size} variant="outline" className="text-xs px-1 py-0">
                {size}
              </Badge>
            ))}
            {sizes.length > 4 && (
              <Badge variant="outline" className="text-xs px-1 py-0">
                +{sizes.length - 4}
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-lg font-bold">${price.toFixed(2)}</span>
              {price < product.base_price && (
                <span className="text-sm text-gray-500 line-through ml-2">
                  ${product.base_price.toFixed(2)}
                </span>
              )}
            </div>
            <div className="text-sm text-gray-500">
              {stock > 0 ? `${stock} in stock` : 'Out of stock'}
            </div>
          </div>
        </CardContent>
        <CardFooter className="p-4 pt-0">
          <Button 
            className="w-full" 
            onClick={() => onViewProduct(product.id)}
            disabled={stock === 0}
          >
            {stock > 0 ? 'View Details' : 'Out of Stock'}
          </Button>
        </CardFooter>
      </Card>
    );
  };

  return (
    <div>
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-8 mb-8">
        <h2 className="text-3xl font-bold mb-4">Step Into Style 👟</h2>
        <p className="text-xl opacity-90 mb-4">
          Discover our premium collection of shoes for every occasion
        </p>
        <Badge variant="secondary" className="bg-white/20 text-white">
          Free shipping on orders over $100
        </Badge>
      </div>

      {/* Filters and Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6 p-4 bg-white rounded-lg shadow-sm">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-500" />
          <span className="font-medium">Filters:</span>
        </div>
        
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(category => (
              <SelectItem key={category} value={category}>
                {category === 'all' ? 'All Categories' : category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedBrand} onValueChange={setSelectedBrand}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Brand" />
          </SelectTrigger>
          <SelectContent>
            {brands.map(brand => (
              <SelectItem key={brand} value={brand}>
                {brand === 'all' ? 'All Brands' : brand}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="price-low">Price: Low to High</SelectItem>
            <SelectItem value="price-high">Price: High to Low</SelectItem>
            <SelectItem value="brand">Brand</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-2 ml-auto">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-4">
        <p className="text-gray-600">
          Showing {filteredProducts.length} of {products.length} products
        </p>
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg mb-4">No products found matching your criteria</p>
          <Button onClick={() => {
            setSelectedCategory('all');
            setSelectedBrand('all');
          }}>
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className={
          viewMode === 'grid' 
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            : "space-y-4"
        }>
          {filteredProducts.map((product: ProductWithVariants) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}