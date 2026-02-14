'use client';

import { useState } from 'react';
import { createAlipayOrder } from '@/lib/api/payment';

interface AlipayPaymentProps {
  amount: number; // Amount in yuan
  orderId: string;
  tier: string;
  duration: number;
  onSuccess: () => void;
  onError: (error: Error) => void;
}

export function AlipayPayment({ amount, orderId, tier, duration, onSuccess, onError }: AlipayPaymentProps) {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    try {
      setLoading(true);
      const response = await createAlipayOrder({
        amount,
        orderId,
        tier,
        duration,
      });

      if (response.paymentUrl) {
        // Create a temporary div to parse the HTML
        const div = document.createElement('div');
        div.innerHTML = response.paymentUrl;
        
        // Find the form element
        const form = div.querySelector('form');
        if (form) {
          // Create a temporary form element
          const tempForm = document.createElement('form');
          tempForm.method = form.method;
          tempForm.action = form.action;
          tempForm.target = '_blank'; // Open in new tab
          
          // Copy all input fields
          form.querySelectorAll('input').forEach(input => {
            const newInput = document.createElement('input');
            newInput.type = 'hidden';
            newInput.name = input.name;
            newInput.value = input.value;
            tempForm.appendChild(newInput);
          });
          
          // Add the form to the document and submit it
          document.body.appendChild(tempForm);
          tempForm.submit();
          document.body.removeChild(tempForm);
        }
      }
    } catch (error) {
      console.error('Payment error:', error);
      onError(error instanceof Error ? error : new Error('Payment failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePayment}
      disabled={loading}
      className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? 'Processing...' : 'Pay with Alipay'}
    </button>
  );
} 