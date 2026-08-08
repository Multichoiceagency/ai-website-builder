import React from 'react';
import { motion } from 'framer-motion';
import { Heart, Star } from 'lucide-react'


const EbayLikeProductCard = () => {
  return (
    <motion.div
      className="relative w-full max-w-sm mx-auto bg-white rounded-lg shadow-md overflow-hidden group"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.02 }}
    >
      <div className="relative w-full h-48 overflow-hidden">
        <img
          src="https://via.placeholder.com/400x300/F3F4F6/1F2937?text=Product+Image"
          alt="Product"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <button className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-md text-gray-700 hover:text-red-500 transition-colors duration-200">
          <Heart size={20} />
        </button>
      </div>

      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-2 truncate">
          Amazing Product Title Goes Here
        </h3>
        <div className="flex items-center mb-2">
          <div className="flex text-yellow-400">
            <Star size={16} fill="currentColor" />
            <Star size={16} fill="currentColor" />
            <Star size={16} fill="currentColor" />
            <Star size={16} fill="currentColor" />
            <Star size={16} className="text-gray-300" />
          </div>
          <span className="ml-2 text-sm text-gray-600">(123 reviews)</span>
        </div>

        <div className="flex items-baseline mb-4">
          <span className="text-2xl font-bold text-gray-900 mr-2">$99.99</span>
          <span className="text-sm text-gray-500 line-through">$120.00</span>
        </div>

        <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors duration-200">
          Add to Cart
        </button>
      </div>
    </motion.div>
  );
};

export default EbayLikeProductCard;
