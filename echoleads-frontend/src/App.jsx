import React, { useState } from 'react';
import { useForm } from 'react-hook-form';

function App() {
  const { 
    register, 
    handleSubmit, 
    reset, 
    formState: { errors, isSubmitting } 
  } = useForm();
  
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState(''); // 'success' or 'error'

  const onSubmit = async (data) => {
    setStatusMessage('Sending details to EchoLeads server...');
    setStatusType('');

    try {
      const response = await fetch('http://localhost:5000/api/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setStatusMessage('Success! Check your Email and WhatsApp.');
        setStatusType('success');
        reset(); 
      } else {
        setStatusMessage('Failed to send details. Please try again.');
        setStatusType('error');
      }
    } catch (error) {
      setStatusMessage('Server is offline or unreachable.');
      setStatusType('error');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        
        <div className="mb-6 text-center">
          <h2 className="text-3xl font-bold text-gray-800">EchoLeads</h2>
          <p className="text-sm text-gray-500 mt-2">Fill out your details to trigger the real-time AI pipeline.</p>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          
          {/* Name Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input 
              type="text" 
              placeholder="e.g. Rahul Sharma" 
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none transition-colors ${errors.name ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-emerald-200 focus:border-emerald-500'}`}
              {...register('name', { required: 'Name is required' })}
            />
            {errors.name && <span className="text-red-500 text-xs mt-1 block">{errors.name.message}</span>}
          </div>

          {/* Email Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input 
              type="email" 
              placeholder="rahul@example.com" 
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none transition-colors ${errors.email ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-emerald-200 focus:border-emerald-500'}`}
              {...register('email', { 
                required: 'Email is required',
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Please enter a valid email'
                }
              })}
            />
            {errors.email && <span className="text-red-500 text-xs mt-1 block">{errors.email.message}</span>}
          </div>

          {/* Phone Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Number</label>
            <input 
              type="tel" 
              placeholder="+919876543210" 
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none transition-colors ${errors.phone ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-emerald-200 focus:border-emerald-500'}`}
              {...register('phone', { 
                required: 'WhatsApp number is required',
                minLength: { value: 10, message: 'Number must be at least 10 digits' }
              })}
            />
            {errors.phone && <span className="text-red-500 text-xs mt-1 block">{errors.phone.message}</span>}
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={isSubmitting}
            className={`w-full py-3 px-4 text-white font-semibold rounded-lg shadow-md transition-all duration-200 
              ${isSubmitting 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-lg focus:ring-4 focus:ring-emerald-300'
              }`}
          >
            {isSubmitting ? 'Processing...' : 'Submit to EchoLeads'}
          </button>
        </form>

        {/* Status Message Display */}
        {statusMessage && (
          <div className={`mt-6 p-4 rounded-lg text-sm text-center font-medium
            ${statusType === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : ''}
            ${statusType === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : ''}
            ${statusType === '' ? 'bg-blue-50 text-blue-700 border border-blue-200' : ''}
          `}>
            {statusMessage}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

