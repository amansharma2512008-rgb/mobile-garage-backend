import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000' 
  : 'https://mobile-garage-backend.onrender.com'; // Paste your actual Render link here

// --- COMPONENTS ---

const TopBanner = () => (
  <div className="bg-gray-900 text-white text-xs sm:text-sm py-2 px-4 text-center tracking-wide">
    📍 <span className="font-bold text-yellow-400">Visit Our Store:</span>{' '}
    <a 
      href="https://maps.google.com/?q=Residency+Road,+Srinagar" 
      target="_blank" 
      rel="noopener noreferrer"
      className="hover:underline hover:text-blue-300 transition cursor-pointer"
      title="Click to open exact location in Google Maps"
    >
      Residency Road, Srinagar | Open Mon-Sat: 10 AM - 8 PM
    </a>
  </div>
);

const Navbar = ({ searchQuery, setSearchQuery, onOpenTracker }) => (
  <nav className="bg-[#2874f0] text-white sticky top-0 z-50 shadow-md">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
      <Link to="/" className="font-bold text-2xl italic tracking-tight flex items-center gap-2">
        <span className="text-yellow-400">⚡</span> Mobile Garage
      </Link>
      <div className="hidden md:block flex-1 max-w-2xl mx-12 relative">
        <input 
          type="text" value={searchQuery || ''} onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
          placeholder="Search for products, brands and more" 
          className="w-full text-gray-900 px-4 py-2 rounded-sm outline-none shadow-inner" 
        />
      </div>
      <div className="flex gap-4 items-center">
        {onOpenTracker && (
            <button onClick={onOpenTracker} className="text-white text-sm font-medium hover:underline tracking-wide">
                Track My Order
            </button>
        )}
        <Link to="/admin" className="bg-white text-[#2874f0] font-bold px-6 py-1.5 rounded-sm hover:bg-gray-100 transition shadow-sm">
          Owner Login
        </Link>
      </div>
    </div>
  </nav>
);

const SidebarFilters = ({ maxPrice, setMaxPrice, selectedBrands, setSelectedBrands }) => {
  const handleBrandChange = (brand) => {
    setSelectedBrands(selectedBrands.includes(brand) ? selectedBrands.filter(b => b !== brand) : [...selectedBrands, brand]);
  };
  return (
    <div className="hidden lg:block w-64 bg-white p-4 shadow-sm rounded-sm self-start sticky top-24">
      <h3 className="font-bold text-lg border-b pb-3 mb-3">Filters</h3>
      <div className="mb-5">
        <h4 className="font-medium mb-2 text-xs uppercase text-gray-500 tracking-wider">Max Price: ₹{maxPrice.toLocaleString('en-IN')}</h4>
        <input type="range" min="10000" max="200000" step="5000" value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} className="w-full accent-[#2874f0]" />
      </div>
      <div className="mb-5">
        <h4 className="font-medium mb-2 text-xs uppercase text-gray-500 tracking-wider">Brand</h4>
        {['Apple', 'Samsung', 'OnePlus', 'Vivo'].map(brand => (
          <label key={brand} className="flex items-center gap-3 mb-2 text-sm cursor-pointer">
            <input type="checkbox" checked={selectedBrands.includes(brand)} onChange={() => handleBrandChange(brand)} className="accent-[#2874f0] w-4 h-4" /> {brand}
          </label>
        ))}
      </div>
    </div>
  );
};

// --- MAIN PAGE (SHOP) ---

const Shop = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null); 
  const [mainImage, setMainImage] = useState('');
  
  const [showTracker, setShowTracker] = useState(false);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [trackingPhone, setTrackingPhone] = useState('');
  
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [maxPrice, setMaxPrice] = useState(200000);
  const [selectedBrands, setSelectedBrands] = useState([]);
  
  const categories = ['All', 'Smartphones', 'Tablets', 'Accessories'];

  const fetchProducts = () => {
    fetch('https://mobile-garage-backend.onrender.com/api/products')
      .then(res => res.json())
      .then(data => { setProducts(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { setProducts([]); setLoading(false); });
  };

  useEffect(() => { fetchProducts(); }, []);

  const handleBook = async (productId, productName) => {
    const customerName = window.prompt(`Enter your Name to reserve the ${productName}:`);
    if (!customerName) return;
    
    const customerPhone = window.prompt(`Hello ${customerName}! Enter your 10-digit mobile number:`);
    if (!customerPhone) return;

    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(customerPhone)) {
        alert("Booking Failed: Please enter a valid 10-digit Indian mobile number.");
        return;
    }

    try {
      const response = await fetch('https://mobile-garage-backend.onrender.com/api/book', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, productName, customerName, customerPhone })
      });
      const data = await response.json();
      if(response.ok) {
          alert("✓ " + data.message);
          setSelectedProduct(null); 
          fetchProducts(); 
      } else {
          alert("❌ " + data.error); 
      }
    } catch (error) { alert("Booking failed. Please check your connection."); }
  };

  const handleTrackOrders = async (e) => {
    e.preventDefault();
    try {
        const response = await fetch(`https://mobile-garage-backend.onrender.com/api/orders/customer/${trackingPhone}`);
        const data = await response.json();
        setCustomerOrders(data);
    } catch (error) {
        alert("Could not find orders.");
    }
  };

  const handleCancelOrder = async (orderId) => {
      if(window.confirm("Are you sure you want to cancel this order?")) {
          try {
              const response = await fetch(`https://mobile-garage-backend.onrender.com/api/orders/cancel/${orderId}`, { method: 'DELETE' });
              const data = await response.json();
              alert(data.message);
              setCustomerOrders(customerOrders.filter(o => o._id !== orderId));
              fetchProducts(); 
          } catch (error) {
              alert("Failed to cancel order.");
          }
      }
  };

  let filteredProducts = Array.isArray(products) ? products : [];
  if (activeCategory !== 'All') filteredProducts = filteredProducts.filter(p => p.category === activeCategory);
  if (searchQuery) filteredProducts = filteredProducts.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  filteredProducts = filteredProducts.filter(p => p.price <= maxPrice);
  if (selectedBrands.length > 0) filteredProducts = filteredProducts.filter(p => selectedBrands.includes(p.brand));

  return (
    <div className="min-h-screen bg-gray-100 font-sans relative">
      <TopBanner />
      <Navbar searchQuery={searchQuery} setSearchQuery={setSearchQuery} onOpenTracker={() => setShowTracker(true)} />

      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 flex gap-8 overflow-x-auto py-3">
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)} className={`text-sm font-medium whitespace-nowrap pb-1 ${ activeCategory === cat ? 'text-[#2874f0] border-b-2 border-[#2874f0]' : 'text-gray-600 hover:text-[#2874f0]' }`}>{cat}</button>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
        <SidebarFilters maxPrice={maxPrice} setMaxPrice={setMaxPrice} selectedBrands={selectedBrands} setSelectedBrands={setSelectedBrands} />

        <div className="flex-1 bg-white p-4 shadow-sm rounded-sm">
          <h2 className="font-bold text-xl border-b pb-4 mb-6">{filteredProducts.length} Results Found</h2>
          
          {loading ? (
            <div className="flex justify-center items-center h-48"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2874f0]"></div></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {filteredProducts.map((product) => {
                const thumbnail = product.images?.[0] || product.image || "https://dummyimage.com/400x400/f3f4f6/a1a1aa&text=No+Image";

                return (
                  <div 
                    key={product._id} 
                    onClick={() => {
                        setSelectedProduct(product);
                        setMainImage(thumbnail); 
                    }}
                    className="bg-white p-4 rounded-sm border hover:border-gray-200 transition-colors flex flex-col group cursor-pointer hover:-translate-y-1 hover:shadow-lg duration-200 relative"
                  >
                    {product.quantity <= 0 && (
                        <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded shadow-sm z-10">
                            Out of Stock
                        </div>
                    )}

                    <div className="h-48 w-full p-4 mb-4 flex justify-center items-center">
                      <img src={thumbnail} alt={product.name} className={`max-h-full object-contain transition-transform duration-300 ${product.quantity > 0 ? 'group-hover:scale-105' : 'opacity-50'}`} />
                    </div>
                    <div className="flex flex-col flex-1">
                      <h3 className="text-gray-900 font-medium group-hover:text-[#2874f0] line-clamp-2 text-sm">{product.name}</h3>
                      <div className="flex items-center gap-2 mt-2 mb-2">
                        <span className="bg-[#388e3c] text-white text-[11px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">{product.rating} ★</span>
                        <span className="text-gray-500 text-xs font-medium">({product.reviews})</span>
                      </div>
                      <div className="mt-auto">
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xl font-bold text-gray-900">₹{product.price.toLocaleString('en-IN')}</span>
                          <span className="text-xs text-gray-500 line-through">₹{product.originalPrice.toLocaleString('en-IN')}</span>
                          {product.discount && <span className="text-xs font-bold text-[#388e3c]">{product.discount}</span>}
                        </div>
                        <button 
                          disabled={product.quantity <= 0}
                          onClick={(e) => { e.stopPropagation(); handleBook(product._id, product.name); }} 
                          className={`w-full mt-4 text-white font-bold py-2 px-4 rounded-sm transition shadow-sm ${product.quantity > 0 ? 'bg-[#ff9f00] hover:bg-[#f39c12]' : 'bg-gray-400 cursor-not-allowed'}`}
                        >
                          {product.quantity > 0 ? 'Book for Pickup' : 'Sold Out'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* --- CUSTOMER ORDER TRACKER MODAL --- */}
      <AnimatePresence>
        {showTracker && (
          <div className="fixed inset-0 bg-black bg-opacity-60 z-[100] flex items-center justify-center p-4" onClick={() => { setShowTracker(false); setCustomerOrders([]); setTrackingPhone(''); }}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()} 
              className="bg-white rounded-md shadow-2xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto"
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Track My Orders</h2>
                    <button onClick={() => { setShowTracker(false); setCustomerOrders([]); setTrackingPhone(''); }} className="text-gray-400 hover:text-red-500 font-bold text-xl">✕</button>
                </div>

                <form onSubmit={handleTrackOrders} className="flex gap-4 mb-8">
                    <input type="text" placeholder="Enter your 10-digit phone number" required value={trackingPhone} onChange={e => setTrackingPhone(e.target.value)} className="flex-1 border p-3 rounded outline-none focus:border-[#2874f0]" />
                    <button type="submit" className="bg-[#2874f0] text-white font-bold px-6 rounded shadow-sm hover:bg-blue-600 transition">Find Orders</button>
                </form>

                {customerOrders.length > 0 ? (
                    <div className="space-y-4">
                        {customerOrders.map(order => (
                            <div key={order._id} className="border p-4 rounded bg-gray-50 flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-gray-800">{order.productName}</p>
                                    <p className="text-sm text-gray-500 mt-1">Status: <span className="text-yellow-600 font-bold">Pending Pickup in Store</span></p>
                                </div>
                                <button onClick={() => handleCancelOrder(order._id)} className="bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-700 font-bold py-2 px-4 rounded text-sm transition">
                                    Cancel Order
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    trackingPhone && customerOrders.length === 0 && (
                        <p className="text-center text-gray-500 italic">No active orders found for this number.</p>
                    )
                )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- PRODUCT DETAILS MODAL --- */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-60 z-[100] flex items-center justify-center p-4" onClick={() => setSelectedProduct(null)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()} 
              className="bg-white rounded-md shadow-2xl max-w-4xl w-full flex flex-col md:flex-row overflow-hidden max-h-[90vh]"
            >
              <div className="md:w-1/2 p-8 bg-white flex flex-col justify-center items-center border-r">
                <img src={mainImage} alt={selectedProduct.name} className="max-h-80 object-contain w-full mb-6 transition-opacity duration-300" />
                
                {selectedProduct.images && selectedProduct.images.length > 1 && (
                    <div className="flex gap-3 overflow-x-auto p-2 w-full justify-center">
                        {selectedProduct.images.map((img, idx) => (
                            <img 
                                key={idx} 
                                src={img} 
                                onClick={() => setMainImage(img)}
                                className={`w-16 h-16 object-contain p-1 border cursor-pointer rounded-sm hover:border-[#2874f0] transition-colors ${mainImage === img ? 'border-[#2874f0] border-2 shadow-sm' : 'border-gray-200'}`} 
                                alt={`${selectedProduct.name} view ${idx + 1}`}
                            />
                        ))}
                    </div>
                )}
              </div>
              
              <div className="md:w-1/2 p-8 flex flex-col overflow-y-auto">
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-2xl font-bold text-gray-800 leading-tight">{selectedProduct.name}</h2>
                  <button onClick={() => setSelectedProduct(null)} className="text-gray-400 hover:text-red-500 font-bold text-xl ml-4">✕</button>
                </div>
                
                <p className="text-[#2874f0] font-bold mb-4">{selectedProduct.brand}</p>
                
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-3xl font-bold text-gray-900">₹{selectedProduct.price.toLocaleString('en-IN')}</span>
                  <span className="text-lg text-gray-500 line-through">₹{selectedProduct.originalPrice.toLocaleString('en-IN')}</span>
                  {selectedProduct.discount && <span className="text-sm font-bold text-[#388e3c]">{selectedProduct.discount}</span>}
                </div>

                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-3 border-b pb-2">Key Features</h3>
                  <ul className="space-y-2 mb-6">
                    {selectedProduct.features && selectedProduct.features.length > 0 ? (
                      selectedProduct.features.map((feature, index) => (
                        <li key={index} className="flex items-start text-gray-700 text-sm">
                          <span className="text-gray-400 mr-2">•</span> {feature}
                        </li>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm italic">Detailed features not available for this product.</p>
                    )}
                  </ul>
                </div>

                <button 
                    disabled={selectedProduct.quantity <= 0}
                    onClick={() => handleBook(selectedProduct._id, selectedProduct.name)} 
                    className={`w-full text-white font-bold py-4 rounded-sm transition shadow-md text-lg ${selectedProduct.quantity > 0 ? 'bg-[#ff9f00] hover:bg-[#f39c12]' : 'bg-gray-400 cursor-not-allowed'}`}
                >
                  {selectedProduct.quantity > 0 ? 'Reserve for In-Store Pickup' : 'Currently Out of Stock'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- ADMIN PAGE ---

const Admin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

  const [activeTab, setActiveTab] = useState('add'); 
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  
  const [editingProductId, setEditingProductId] = useState(null); // NEW: Tracks which product is being edited

  const defaultFormState = { 
    name: '', brand: '', category: 'Smartphones', price: '', originalPrice: '', 
    rating: '4.5', reviews: '0', features: '', quantity: '1' 
  };
  
  const [formData, setFormData] = useState(defaultFormState);
  const [imageFiles, setImageFiles] = useState([]);

  useEffect(() => {
    if (isAuthenticated) {
      const loadData = async () => {
        try {
          const prodRes = await fetch('https://mobile-garage-backend.onrender.com/api/products');
          const prodData = await prodRes.json();
          setProducts(Array.isArray(prodData) ? prodData : []);
          
          const ordRes = await fetch('https://mobile-garage-backend.onrender.com/api/orders');
          const ordData = await ordRes.json();
          setOrders(Array.isArray(ordData) ? ordData : []);
        } catch (e) {
          console.error("Failed to load admin data");
        }
      };
      loadData();
    }
  }, [activeTab, isAuthenticated]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('https://mobile-garage-backend.onrender.com/api/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: passwordInput })
      });
      const data = await response.json();
      if (data.success) setIsAuthenticated(true);
      else { alert("Access Denied: " + data.error); setPasswordInput(''); }
    } catch (error) { alert("Error connecting to server."); }
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        await fetch(`https://mobile-garage-backend.onrender.com/api/products/${id}`, { method: 'DELETE' });
        setProducts(products.filter(p => p._id !== id));
      } catch (err) { alert("Failed to delete"); }
    }
  };

  const handleCompleteOrder = async (id) => {
    if (window.confirm("Is this pickup complete? This will remove the order from the list.")) {
      try {
        await fetch(`https://mobile-garage-backend.onrender.com/api/orders/${id}`, { method: 'DELETE' });
        setOrders(orders.filter(o => o._id !== id));
      } catch (err) { alert("Failed to mark complete"); }
    }
  };

  // NEW: Populate form for editing
  const handleEditClick = (product) => {
    setEditingProductId(product._id);
    setFormData({
      name: product.name,
      brand: product.brand,
      category: product.category,
      price: product.price,
      originalPrice: product.originalPrice,
      rating: product.rating || '4.5',
      reviews: product.reviews || '0',
      features: product.features ? product.features.join(', ') : '',
      quantity: product.quantity
    });
    setImageFiles([]); // Reset file input so they don't accidentally overwrite images if they don't want to
    setActiveTab('add'); // Switch to the form tab
  };

  const handleCancelEdit = () => {
    setEditingProductId(null);
    setFormData(defaultFormState);
    setImageFiles([]);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const submitData = new FormData();
    Object.keys(formData).forEach(key => submitData.append(key, formData[key]));
    
    // Only require images if we are creating a NEW product. If editing, images are optional.
    if (imageFiles && imageFiles.length > 0) {
      for (let i = 0; i < imageFiles.length; i++) {
        submitData.append('imageFiles', imageFiles[i]);
      }
    } else if (!editingProductId) {
        return alert("Please select at least one image file.");
    }

    try {
      const url = editingProductId 
        ? `https://mobile-garage-backend.onrender.com/api/products/${editingProductId}` 
        : 'https://mobile-garage-backend.onrender.com/api/products';
      
      const method = editingProductId ? 'PUT' : 'POST';

      const response = await fetch(url, { method: method, body: submitData });
      
      if (response.ok) {
        alert(editingProductId ? "Product Updated Successfully!" : "Product Added Successfully!");
        setFormData(defaultFormState);
        setImageFiles([]);
        setEditingProductId(null);
        if (document.getElementById('fileInput')) {
            document.getElementById('fileInput').value = '';
        }
      }
    } catch (error) { alert("Error connecting to server."); }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-sm shadow-md w-96 border-t-4 border-[#2874f0]">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Owner Login</h2>
            <p className="text-sm text-gray-500 mt-1">Mobile Garage Admin Portal</p>
          </div>
          <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} placeholder="Enter Admin Password" required className="w-full border p-3 rounded-sm mb-6 outline-none focus:border-[#2874f0] bg-gray-50 text-center tracking-widest" />
          <button type="submit" className="w-full bg-[#ff9f00] hover:bg-[#f39c12] text-white font-bold py-3 rounded-sm transition shadow-sm">Secure Login</button>
          <Link to="/" className="block text-center mt-6 text-[#2874f0] text-sm font-medium hover:underline">← Return to Storefront</Link>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <TopBanner />
      <div className="bg-[#2874f0] text-white p-4 shadow-md flex justify-between items-center">
         <h1 className="text-xl font-bold italic px-4 max-w-7xl mx-auto w-full"><span className="text-yellow-400">⚡</span> Admin Portal</h1>
      </div>

      <div className="max-w-5xl mx-auto mt-8 p-6 bg-white shadow-sm rounded-sm mb-12">
        <div className="flex justify-between items-center border-b pb-4 mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Inventory & Orders</h2>
          <div className="flex gap-4">
            <button onClick={() => setIsAuthenticated(false)} className="text-red-500 text-sm font-medium hover:underline">Logout</button>
            <Link to="/" className="text-[#2874f0] text-sm font-medium hover:underline">← View Shop</Link>
          </div>
        </div>

        <div className="flex gap-4 mb-6 border-b pb-2">
          <button onClick={() => setActiveTab('add')} className={`font-bold ${activeTab === 'add' ? 'text-[#2874f0]' : 'text-gray-500'}`}>
              {editingProductId ? 'Edit Product' : 'Add Product'}
          </button>
          <button onClick={() => setActiveTab('manage')} className={`font-bold ${activeTab === 'manage' ? 'text-[#2874f0]' : 'text-gray-500'}`}>Manage Inventory</button>
          <button onClick={() => setActiveTab('orders')} className={`font-bold ${activeTab === 'orders' ? 'text-[#2874f0]' : 'text-gray-500'}`}>Customer Orders</button>
        </div>

        {activeTab === 'add' && (
          <form onSubmit={handleFormSubmit} className="space-y-4 max-w-2xl">
             <div><label className="block text-sm mb-1">Product Name</label><input type="text" name="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required className="w-full border p-2 rounded-sm" /></div>
             <div className="grid grid-cols-2 gap-4">
               <div><label className="block text-sm mb-1">Brand</label><input type="text" name="brand" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} required className="w-full border p-2 rounded-sm" /></div>
               <div><label className="block text-sm mb-1">Category</label><select name="category" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full border p-2 rounded-sm"><option>Smartphones</option><option>Tablets</option><option>Accessories</option></select></div>
             </div>
             
             <div className="grid grid-cols-3 gap-4">
               <div className="col-span-1"><label className="block text-sm mb-1 font-bold text-green-600">Total Stock</label><input type="number" name="quantity" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} required className="w-full border p-2 rounded-sm outline-none focus:border-green-500 bg-green-50" /></div>
               <div className="col-span-1"><label className="block text-sm mb-1">Selling Price</label><input type="number" name="price" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} required className="w-full border p-2 rounded-sm" /></div>
               <div className="col-span-1"><label className="block text-sm mb-1">Original Price</label><input type="number" name="originalPrice" value={formData.originalPrice} onChange={e => setFormData({...formData, originalPrice: e.target.value})} required className="w-full border p-2 rounded-sm" /></div>
             </div>
             
             <div>
               <label className="block text-sm mb-1">Key Features (Separate each feature with a comma)</label>
               <textarea name="features" value={formData.features} onChange={e => setFormData({...formData, features: e.target.value})} placeholder="e.g., 5000mAh Battery, 120Hz AMOLED Display, 50MP Camera" rows="3" className="w-full border p-2 rounded-sm outline-none focus:border-[#2874f0]"></textarea>
             </div>
             
             <div>
               <label className="block text-sm mb-1">Upload Images (Hold Ctrl/Cmd to select up to 5)</label>
               {editingProductId && <p className="text-xs text-blue-600 mb-2">Note: If you do not select files, the existing images will be kept.</p>}
               <input 
                 type="file" id="fileInput" 
                 multiple accept="image/*" 
                 onChange={e => setImageFiles(e.target.files)} 
                 required={!editingProductId} // Only required if creating NEW
                 className="w-full border p-2 rounded-sm bg-gray-50" 
               />
             </div>
             
             <div className="flex gap-4 pt-4">
                 <button type="submit" className="flex-1 bg-[#ff9f00] text-white font-bold py-3 rounded-sm">
                     {editingProductId ? 'Update Product Details' : 'Save New Product'}
                 </button>
                 {editingProductId && (
                     <button type="button" onClick={handleCancelEdit} className="flex-1 bg-gray-200 text-gray-800 hover:bg-gray-300 font-bold py-3 rounded-sm transition">
                         Cancel Edit
                     </button>
                 )}
             </div>
          </form>
        )}

        {activeTab === 'manage' && (
          <div className="grid grid-cols-1 gap-4">
            {products.map(product => {
               const thumbnail = product.images?.[0] || product.image || "https://dummyimage.com/400x400/f3f4f6/a1a1aa&text=No+Image";
               
               return (
                  <div key={product._id} className="flex justify-between items-center border p-4 rounded-sm">
                    <div className="flex items-center gap-6">
                      <img src={thumbnail} className="w-16 h-16 object-contain" />
                      <div>
                        <p className="font-bold text-lg">{product.name}</p>
                        <p className="text-sm text-gray-500">₹{product.price.toLocaleString('en-IN')} | {product.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                          <p className="text-sm text-gray-500 uppercase tracking-wide">Stock Left</p>
                          <p className={`font-bold text-xl ${product.quantity > 0 ? 'text-green-600' : 'text-red-500'}`}>{product.quantity}</p>
                      </div>
                      <div className="flex flex-col gap-2">
                          <button onClick={() => handleEditClick(product)} className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-1.5 rounded-sm text-sm font-bold border border-blue-200 transition">Edit Details</button>
                          <button onClick={() => handleDeleteProduct(product._id)} className="bg-red-100 hover:bg-red-200 text-red-600 px-4 py-1.5 rounded-sm text-sm font-bold border border-red-200 transition">Delete Item</button>
                      </div>
                    </div>
                  </div>
               )
            })}
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 text-sm uppercase text-gray-600">
                  <th className="p-3 border-b">Customer Name</th>
                  <th className="p-3 border-b">Phone Number</th>
                  <th className="p-3 border-b">Product Ordered</th>
                  <th className="p-3 border-b text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? <tr><td colSpan="4" className="p-8 text-center text-gray-500 font-medium">No pending orders.</td></tr> : null}
                {orders.map(order => (
                  <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 border-b font-bold text-gray-800">{order.customerName || "N/A"}</td>
                    <td className="p-4 border-b text-[#2874f0] font-medium">{order.customerPhone}</td>
                    <td className="p-4 border-b text-sm text-gray-600 max-w-xs truncate">{order.productName}</td>
                    <td className="p-4 border-b text-center">
                       <button 
                         onClick={() => handleCompleteOrder(order._id)}
                         className="bg-green-500 hover:bg-green-600 text-white font-bold py-1.5 px-4 rounded text-sm transition shadow-sm"
                       >
                         ✔ Mark Complete
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

function App() {
  return (
    <Router><Routes><Route path="/" element={<Shop />} /><Route path="/admin" element={<Admin />} /></Routes></Router>
  );
}

export default App;