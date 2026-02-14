'use client';

import { useState, useEffect } from 'react';
import { createOrder, queryOrderStatus } from '../../lib/api/payment';
import Image from 'next/image';

interface WeChatPayQRProps {
  tier: string;
  duration: number;
  onPaymentSuccess: () => void;
  onPaymentFailure: (error: Error) => void;
}

export default function WeChatPayQR({
  tier,
  duration,
  onPaymentSuccess,
  onPaymentFailure,
}: WeChatPayQRProps) {
  const [orderId, setOrderId] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('initial');
  const [error, setError] = useState<string | null>(null);

  // Create order when component mounts
  useEffect(() => {
    const initializePayment = async () => {
      try {
        setStatus('loading');
        
        const response = await createOrder({
          tier,
          duration,
        });
        
        setOrderId(response.orderId);
        
        // Generate QR code URL from the code_url
        if (response.codeUrl) {
          setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(response.codeUrl)}`);
        }
        
        setStatus('ready');
        
        // Start polling for payment status
        pollPaymentStatus(response.orderId);
      } catch (error) {
        console.error('Failed to initialize payment:', error);
        setStatus('error');
        setError(error instanceof Error ? error.message : 'Payment initialization failed');
        onPaymentFailure(error instanceof Error ? error : new Error('Payment initialization failed'));
      }
    };

    initializePayment();
  }, [tier, duration]);

  // Poll for payment status
  const pollPaymentStatus = async (orderIdToCheck: string) => {
    try {
      console.log('=== Polling payment status ===');
      const checkStatus = async () => {
        const statusResponse = await queryOrderStatus(orderIdToCheck);
        console.log('Status response: ', statusResponse);
        if (statusResponse.status === 'success') {
          console.log('Payment successful');
          setStatus('success');
          // onPaymentSuccess();
          return true;
        } else if (statusResponse.status === 'failed' || statusResponse.status === 'expired') {
          console.log('Payment failed or expired');
          setStatus('failed');
          setError(`Payment ${statusResponse.status}`);
          // onPaymentFailure(new Error(`Payment ${statusResponse.status}`));
          return true;
        }
        
        return false;
      };
      
      // Check immediately once
      const completed = await checkStatus();
      if (completed) return;
      
      // Set up polling interval
      const intervalId = setInterval(async () => {
        try {
          const completed = await checkStatus();
          if (completed) {
            clearInterval(intervalId);
          }
        } catch (error) {
          console.error('Error checking payment status:', error);
          // Don't stop polling on error
        }
      }, 3000); // Check every 3 seconds
      
      // Clean up interval on unmount
      return () => clearInterval(intervalId);
    } catch (error) {
      console.error('Failed to poll payment status:', error);
      setStatus('error');
      setError(error instanceof Error ? error.message : 'Failed to check payment status');
    }
  };

  // Render based on status
  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-lg">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-600">Initializing payment...</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-lg">
        <div className="text-red-500 mb-4">❌</div>
        <p className="text-red-600 font-semibold">Payment Error</p>
        <p className="text-gray-600 mt-2">{error || 'An unknown error occurred'}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-lg">
      <div className="text-green-500 text-2xl mb-4">WeChat Pay</div>
      {qrCodeUrl && (
        <div className="border-2 border-green-100 p-2 rounded-lg mb-4">
          <Image
            src={qrCodeUrl}
            alt="WeChat Pay QR Code"
            width={200}
            height={200}
            className="mx-auto"
          />
        </div>
      )}
      <p className="text-gray-600 text-center">
        Open WeChat app and scan the QR code to complete payment
      </p>
      {status === 'success' && (
        <div className="mt-4 text-green-500 font-semibold">
          Payment successful!
        </div>
      )}
      {status === 'failed' && (
        <div className="mt-4 text-red-500 font-semibold">
          Payment failed: {error}
        </div>
      )}
    </div>
  );
} 