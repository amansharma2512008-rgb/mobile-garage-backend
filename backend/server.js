const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer'); 
require('dotenv').config();

// --- NEW: Cloudinary Setup for Permanent Cloud Storage ---
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'mobile-garage', // All images will be saved in this folder on Cloudinary
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    },
});
const upload = multer({ storage: storage });

// --- Twilio Setup for Owner Alerts ---
const twilio = require('twilio');
let twilioClient;
if (process.env.TWILIO_SID && process.env.TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
}

const app = express();

// Allow connections from anywhere (crucial for when your frontend is on Vercel)
app.use(cors({ origin: '*' }));
app.use(express.json());

// --- DATABASE MODELS ---
const productSchema = new mongoose.Schema({
    name: String,
    brand: String,
    category: { type: String, default: "Smartphones" },
    price: Number,
    originalPrice: Number,
    discount: String, 
    images: { type: [String], default: [] },
    rating: Number,
    reviews: String,
    features: { type: [String], default: [] },
    quantity: { type: Number, default: 1 } 
});
const Product = mongoose.model('Product', productSchema);

const orderSchema = new mongoose.Schema({
    productId: mongoose.Schema.Types.ObjectId,
    productName: String,
    customerName: String, 
    customerPhone: String,
    status: { type: String, default: "Pending Pickup" }
});
const Order = mongoose.model('Order', orderSchema);

// --- HEALTH CHECK ROUTE FOR CRON JOB ---
app.get('/api/ping', (req, res) => {
    res.status(200).json({ message: "Server is awake!" });
});

// --- API ROUTES ---

app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch products" });
    }
});

app.post('/api/book', async (req, res) => {
    try {
        const { productId, productName, customerName, customerPhone } = req.body;
        
        const product = await Product.findById(productId);
        if (product && product.quantity > 0) {
            product.quantity -= 1;
            await product.save();
        } else if (product && product.quantity <= 0) {
            return res.status(400).json({ error: "Sorry, this product is out of stock!" });
        }

        const newOrder = new Order({ productId, productName, customerName, customerPhone });
        await newOrder.save();

        if (twilioClient && process.env.OWNER_PHONE_NUMBER) {
            try {
                await twilioClient.messages.create({
                    body: `🚨 MOBILE GARAGE ALERT: ${customerName} just booked a ${productName}! Their number is ${customerPhone}. Open Admin Dashboard to view details.`,
                    from: process.env.TWILIO_PHONE_NUMBER,
                    to: process.env.OWNER_PHONE_NUMBER
                });
                console.log("SMS alert sent to owner!");
            } catch (smsError) {
                console.error("Twilio failed to send message (Order still saved):", smsError.message);
            }
        }

        res.json({ message: "Booking successful! See you in store." });
    } catch (error) {
        res.status(500).json({ error: "Booking failed" });
    }
});

app.get('/api/orders', async (req, res) => {
    try {
        const orders = await Order.find().sort({ _id: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch orders" });
    }
});

app.get('/api/orders/customer/:phone', async (req, res) => {
    try {
        const orders = await Order.find({ customerPhone: req.params.phone }).sort({ _id: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: "Failed to find your orders" });
    }
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ message: "Product deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete product" });
    }
});

app.delete('/api/orders/:id', async (req, res) => {
    try {
        await Order.findByIdAndDelete(req.params.id);
        res.json({ message: "Order marked as complete and removed." });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete order" });
    }
});

app.delete('/api/orders/cancel/:id', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ error: "Order not found" });

        const product = await Product.findById(order.productId);
        if (product) {
            product.quantity += 1;
            await product.save();
        }

        await Order.findByIdAndDelete(req.params.id);
        res.json({ message: "Order cancelled successfully. Stock has been restored." });
    } catch (error) {
        res.status(500).json({ error: "Failed to cancel order" });
    }
});

// Create new product (UPDATED for Cloudinary)
app.post('/api/products', upload.array('imageFiles', 5), async (req, res) => {
    try {
        const { name, brand, category, price, originalPrice, rating, reviews, features, quantity } = req.body;
        
        // Cloudinary automatically stores the secure URL in file.path
        const imageUrls = req.files && req.files.length > 0 
            ? req.files.map(file => file.path)
            : ["https://dummyimage.com/400x400/f3f4f6/a1a1aa&text=No+Image"];

        const featureArray = features ? features.split(',').map(f => f.trim()) : [];

        const p = Number(price);
        const op = Number(originalPrice);
        let calculatedDiscount = "";
        if (op > p) {
            const percentage = Math.round(((op - p) / op) * 100);
            calculatedDiscount = `${percentage}% off`;
        }

        const newProduct = new Product({
            name, brand, category,
            price: p,
            originalPrice: op,
            discount: calculatedDiscount, 
            images: imageUrls, // Save Cloudinary URLs
            rating: Number(rating) || 4.5,
            reviews: reviews || "0",
            features: featureArray,
            quantity: Number(quantity) || 1 
        });

        await newProduct.save();
        res.status(201).json({ message: "Product added successfully!", product: newProduct });
    } catch (error) {
        res.status(500).json({ error: "Failed to add product to the database" });
    }
});

// Update existing product (UPDATED for Cloudinary)
app.put('/api/products/:id', upload.array('imageFiles', 5), async (req, res) => {
    try {
        const { name, brand, category, price, originalPrice, rating, reviews, features, quantity } = req.body;
        
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ error: "Product not found" });

        // If new images were uploaded, replace the old ones with new Cloudinary paths
        let imageUrls = product.images;
        if (req.files && req.files.length > 0) {
            imageUrls = req.files.map(file => file.path);
        }

        const featureArray = features ? features.split(',').map(f => f.trim()) : [];

        const p = Number(price);
        const op = Number(originalPrice);
        let calculatedDiscount = "";
        if (op > p) {
            const percentage = Math.round(((op - p) / op) * 100);
            calculatedDiscount = `${percentage}% off`;
        }

        product.name = name;
        product.brand = brand;
        product.category = category;
        product.price = p;
        product.originalPrice = op;
        product.discount = calculatedDiscount;
        product.images = imageUrls;
        product.rating = Number(rating) || product.rating;
        product.reviews = reviews || product.reviews;
        product.features = featureArray;
        product.quantity = Number(quantity) || 0;

        await product.save();
        res.json({ message: "Product updated successfully!", product });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to update product" });
    }
});

app.get('/api/seed', async (req, res) => {
    await Product.deleteMany({});
    await Product.insertMany([
        {
            name: "SAMSUNG Galaxy S24 Ultra",
            brand: "Samsung",
            category: "Smartphones",
            price: 129999,
            originalPrice: 134999,
            discount: "3% off",
            images: ["https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s24-ultra-5g-sm-s928-u1.jpg"],
            rating: 4.8,
            reviews: "1,245",
            features: ["Snapdragon 8 Gen 3 Processor", "200MP Quad Camera Setup", "Built-in S-Pen"],
            quantity: 5 
        },
        {
            name: "OnePlus 12 (Flowy Emerald, 512 GB)",
            brand: "OnePlus",
            category: "Smartphones",
            price: 69999,
            originalPrice: 74999,
            discount: "6% off",
            images: ["https://fdn2.gsmarena.com/vv/bigpic/oneplus-12.jpg"], 
            rating: 4.6,
            reviews: "3,892",
            features: ["Snapdragon 8 Gen 3", "Hasselblad Camera for Mobile", "100W SUPERVOOC Charging"],
            quantity: 3 
        }
    ]);
    res.json({ message: "Test products with quantity and image arrays added!" });
});

app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === process.env.ADMIN_PASSWORD) {
        res.json({ success: true, message: "Login successful!" });
    } else {
        res.status(401).json({ success: false, error: "Incorrect password" });
    }
});

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to MongoDB!'))
    .catch((err) => console.error('Database error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
