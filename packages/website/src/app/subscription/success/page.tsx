'use client';

import { useEffect, useState, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
// import { API_URLS } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/utils/api';
import { useLocaleContext } from '@easy-reading/shared/contexts/LocaleContext';

// Client component that uses useSearchParams
function SubscriptionSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { checkAuth } = useAuth();
  const { t } = useLocaleContext();
  const checkout = (key: string) => t(`website.checkoutPage.${key}`);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState(checkout('verifyingPayment'));
  const [isVerifying, setIsVerifying] = useState(false);

  const verifyPayment = useCallback(async () => {
    if (isVerifying) return;
    
    try {
      setIsVerifying(true);
      // Get all query parameters
      const params = Object.fromEntries(searchParams.entries());
      const orderId = params.orderId || params.out_trade_no;
      const returnedStatus = params.status;
      
      if (!orderId) {
        throw new Error('No order ID found in URL parameters');
      }

      if (returnedStatus === 'cancelled') {
        setStatus('error');
        setMessage(checkout('paymentCancelled'));
        return;
      }
      
      // Call backend to verify payment
      const response = await api.get(`/payment/query-order?orderId=${orderId}`);

      if (response.status !== 200) {
        throw new Error('Payment verification failed');
      }

      const data = response.data;
      
      if (data.status === 'success') {
        setStatus('success');
        setMessage(checkout('paymentSuccessBody'));
        
        // Update auth context to get new subscription status
        await checkAuth();
        
        // Redirect to user dashboard after 3 seconds
        setTimeout(() => {
          router.push('/user');
        }, 3000);
      } else {
        setStatus('error');
        setMessage(`Payment verification failed: ${data.status}. Please contact support.`);
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      setStatus('error');
      setMessage(checkout('paymentVerifyError'));
    } finally {
      setIsVerifying(false);
    }
  }, [router, searchParams, checkAuth, isVerifying, checkout]);

  useEffect(() => {
    verifyPayment();
  }, [verifyPayment]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          {status === 'loading' && (
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          )}
          
          {status === 'success' && (
            <div className="text-green-500">
              <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          
          {status === 'error' && (
            <div className="text-red-500">
              <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}

          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            {status === 'loading' && checkout('verifyingPayment')}
            {status === 'success' && checkout('paymentSuccessful')}
            {status === 'error' && checkout('paymentFailed')}
          </h2>
          
          <p className="mt-2 text-sm text-gray-600">
            {message}
          </p>

          {status === 'success' && (
            <p className="mt-4 text-sm text-gray-500">
              {checkout('redirectingDashboard')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Main page component with Suspense boundary
export default function SubscriptionSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    }>
      <SubscriptionSuccessContent />
    </Suspense>
  );
} 
