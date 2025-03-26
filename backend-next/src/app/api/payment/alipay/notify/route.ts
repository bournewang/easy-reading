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
      return NextResponse.json(
        { code: 'INVALID_SIGNATURE', message: 'Invalid signature' },
        { status: 400 }
      );
    }

    const orderId = params.get('out_trade_no');
    const tradeStatus = params.get('trade_status');
    const totalAmount = params.get('total_amount');

    console.log('Parsed notification:', { orderId, tradeStatus, totalAmount });

    if (!orderId || !tradeStatus || !totalAmount) {
      console.log('Missing required notification fields');
      return NextResponse.json(
        { code: 'INVALID_NOTIFICATION', message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Update order status in database
    if (tradeStatus === 'TRADE_SUCCESS') {
      try {
        await prisma.order.update({
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
        console.log('Order status updated to completed:', orderId);
      } catch (dbError) {
        console.error('Database update error:', dbError);
        throw dbError;
      }
    }

    // Return success response to Alipay
    return NextResponse.json({
      code: 'SUCCESS',
      message: 'OK',
    });
  } catch (error) {
    console.error('Payment notification error:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to process notification' },
      { status: 500 }
    );
  }
} 