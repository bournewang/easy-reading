'use client';

import { useRef, useState } from 'react';
import { createAlipayOrder, queryOrderStatus } from '@/lib/api/payment';
import { useLocaleContext } from '@easy-reading/shared/contexts/LocaleContext';

interface AlipayPaymentProps {
  tier: string;
  duration: number;
  returnUrl: string;
  cancelUrl: string;
  promoCode?: string;
  onError: (error: Error) => void;
  onSuccess?: (orderNo: string) => void;
}

type DialogState = 'idle' | 'confirm' | 'verifying';

export function AlipayPayment({
  tier,
  duration,
  returnUrl,
  cancelUrl,
  promoCode,
  onError,
  onSuccess,
}: AlipayPaymentProps) {
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState<DialogState>('idle');
  const { t } = useLocaleContext();
  const checkout = (key: string) => t(`website.checkoutPage.${key}`);

  // Keep refs so the confirm dialog can reopen the tab or poll without re-creating the order
  const paymentUrlRef = useRef<string | null>(null);
  const orderNoRef = useRef<string | null>(null);
  const paymentTabRef = useRef<Window | null>(null);

  const openPaymentTab = (url: string) => {
    if (paymentTabRef.current && !paymentTabRef.current.closed) {
      paymentTabRef.current.focus();
      return;
    }
    const tab = window.open(url, '_blank');
    paymentTabRef.current = tab;
  };

  const handlePayment = async () => {
    // If we already have a payment URL (user clicked again), just reopen the tab
    if (paymentUrlRef.current) {
      openPaymentTab(paymentUrlRef.current);
      setDialog('confirm');
      return;
    }

    const paymentTab = typeof window !== 'undefined' ? window.open('about:blank', '_blank') : null;
    paymentTabRef.current = paymentTab;

    if (paymentTab) {
      try {
        paymentTab.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${checkout('redirectingToAlipay')}</title>
              <meta charset="utf-8" />
            </head>
            <body style="font-family: sans-serif; padding: 24px; color: #1f2937;">
              <p>${checkout('redirectingToAlipay')}</p>
            </body>
          </html>
        `);
        paymentTab.document.close();
      } catch {
        // Ignore document access issues
      }
    }

    try {
      setLoading(true);
      const response = await createAlipayOrder({
        tier,
        duration,
        billingMode: 'prepaid',
        returnUrl,
        cancelUrl,
        promoCode,
      });

      if (response.paymentUrl) {
        paymentUrlRef.current = response.paymentUrl;
        orderNoRef.current = response.orderNo;

        if (paymentTab && !paymentTab.closed) {
          paymentTab.location.replace(response.paymentUrl);
          paymentTab.focus();
        } else {
          window.open(response.paymentUrl, '_blank');
        }

        setDialog('confirm');
        return;
      }

      throw new Error('No Alipay payment URL returned.');
    } catch (error) {
      if (paymentTab && !paymentTab.closed) {
        paymentTab.close();
      }
      console.error('Payment error:', error);
      onError(error instanceof Error ? error : new Error('Payment failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPaid = async () => {
    if (!orderNoRef.current) return;
    setDialog('verifying');
    try {
      const order = await queryOrderStatus(orderNoRef.current);
      if (order.status === 'success') {
        onSuccess?.(order.orderNo);
        // Fall back to returnUrl redirect if no onSuccess handler navigates away
        window.location.assign(
          `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}orderNo=${order.orderNo}&status=success`,
        );
      } else {
        // Payment not confirmed yet — go back to confirm dialog
        setDialog('confirm');
        onError(new Error('Payment not confirmed. Please try again or contact support.'));
      }
    } catch {
      setDialog('confirm');
      onError(new Error('Failed to verify payment status.'));
    }
  };

  const handleReopen = () => {
    if (paymentUrlRef.current) {
      openPaymentTab(paymentUrlRef.current);
    }
    setDialog('confirm');
  };

  if (dialog === 'confirm' || dialog === 'verifying') {
    return (
      <>
        <button
          disabled
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold opacity-50 cursor-not-allowed"
        >
          {checkout('proceedPayment')}
        </button>

        {/* Modal overlay */}
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-7 shadow-2xl text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
              <svg className="h-6 w-6 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-900">{checkout('alipayConfirmTitle')}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">{checkout('alipayConfirmBody')}</p>

            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={handleConfirmPaid}
                disabled={dialog === 'verifying'}
                className="w-full rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
              >
                {dialog === 'verifying' ? checkout('alipayVerifying') : checkout('alipayConfirmYes')}
              </button>
              <button
                type="button"
                onClick={handleReopen}
                disabled={dialog === 'verifying'}
                className="w-full rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition-colors hover:bg-slate-50 disabled:opacity-60"
              >
                {checkout('alipayConfirmNo')}
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <button
      onClick={handlePayment}
      disabled={loading}
      className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? checkout('redirectingToAlipay') : checkout('proceedPayment')}
    </button>
  );
}

