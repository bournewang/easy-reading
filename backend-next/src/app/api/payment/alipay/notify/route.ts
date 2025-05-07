import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAlipayCallback } from '@/lib/payment/alipay';

export async function POST(request: Request) {
  try {
    console.log('=== Alipay Payment Notification ===');
    const body = await request.text();
    console.log('Notification body:', body);

    // Parse the notification data
    const params = new URLSearchParams(body);
    const paramsObj: Record<string, string> = {};
    params.forEach((value, key) => {
      paramsObj[key] = value;
      console.log(`${key}: ${value}`);
    });

    // Verify the notification signature
    const isValid = await verifyAlipayCallback(paramsObj);
    console.log('Signature verification result:', isValid);
    
    if (!isValid) {
      console.log('Invalid notification signature');
      return new Response('fail', { status: 400 });
    }

    const orderId = params.get('out_trade_no');
    const tradeStatus = params.get('trade_status');
    const totalAmount = params.get('total_amount');

    console.log('Parsed notification:', { orderId, tradeStatus, totalAmount });

    if (!orderId || !tradeStatus || !totalAmount) {
      console.log('Missing required notification fields');
      return new Response('fail', { status: 400 });
    }

    // Update order status in database
    if (tradeStatus === 'TRADE_SUCCESS') {
      try {
        console.log('=== Processing successful payment ===');
        console.log('Looking up order:', orderId);
        
        // Get the order with user information
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          include: { user: true }
        });

        if (!order) {
          console.log('Order not found:', orderId);
          return new Response('fail', { status: 404 });
        }

        console.log('Found order:', {
          orderId: order.id,
          userId: order.userId,
          tier: order.tier,
          duration: order.duration,
          currentUserSubscription: order.user?.subscriptionTier,
          currentUserExpires: order.user?.subscriptionExpires
        });

        // Calculate subscription expiration date
        const subscriptionExpires = new Date();
        subscriptionExpires.setMonth(subscriptionExpires.getMonth() + order.duration);
        console.log('Calculated new expiration date:', subscriptionExpires);

        console.log('Starting database transaction...');
        // Update order status and user subscription
        await prisma.$transaction(async (tx) => {
          console.log('Updating order status...');
          // Update order status
          const updatedOrder = await tx.order.update({
            where: { id: orderId },
            data: {
              status: 'completed',
              paymentDetails: {
                tradeNo: params.get('trade_no'),
                buyerId: params.get('buyer_id'),
                buyerLogonId: params.get('buyer_logon_id'),
                sellerId: params.get('seller_id'),
                sellerEmail: params.get('seller_email'),
                totalAmount: parseFloat(totalAmount),
                receiptAmount: params.get('receipt_amount'),
                invoiceAmount: params.get('invoice_amount'),
                buyerPayAmount: params.get('buyer_pay_amount'),
                pointAmount: params.get('point_amount'),
                refundFee: params.get('refund_fee'),
                subject: params.get('subject'),
                body: params.get('body'),
                gmtCreate: params.get('gmt_create'),
                gmtPayment: params.get('gmt_payment'),
                gmtRefund: params.get('gmt_refund'),
                gmtClose: params.get('gmt_close'),
                fundBillList: params.get('fund_bill_list'),
                charset: params.get('charset'),
                notifyType: params.get('notify_type'),
                notifyId: params.get('notify_id'),
                notifyTime: params.get('notify_time'),
                version: params.get('version'),
                signType: params.get('sign_type'),
                sign: params.get('sign'),
                authAppId: params.get('auth_app_id'),
                voucherDetailList: params.get('voucher_detail_list'),
              }
            }
          });
          console.log('Order status updated successfully');

          console.log('Updating user subscription...');
          // Update user subscription
          const updatedUser = await tx.user.update({
            where: { id: order.userId },
            data: {
              subscriptionTier: order.tier,
              subscriptionExpires
            }
          });
          console.log('User subscription updated successfully:', {
            userId: updatedUser.id,
            newTier: updatedUser.subscriptionTier,
            newExpires: updatedUser.subscriptionExpires
          });
        });

        console.log('Transaction completed successfully');
      } catch (dbError) {
        console.error('Database update error:', dbError);
        if (dbError instanceof Error) {
          console.error('Error details:', {
            message: dbError.message,
            stack: dbError.stack,
            name: dbError.name
          });
        }
        throw dbError;
      }
    }

    // Return success response to Alipay (must be plain text "success")
    return new Response('success', {
      headers: {
        'Content-Type': 'text/plain'
      }
    });
  } catch (error) {
    console.error('Payment notification error:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return new Response('fail', { status: 500 });
  }
} 