import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyWeChatNotification } from '@/lib/payment/wechat';
import { parseString } from 'xml2js';

interface WeChatPayXMLResult {
  xml: {
    out_trade_no: string;
    result_code: string;
    total_fee: string;
    transaction_id?: string;
    openid?: string;
    trade_type?: string;
    bank_type?: string;
    settlement_total_fee?: string;
    fee_type?: string;
    cash_fee?: string;
    cash_fee_type?: string;
    coupon_fee?: string;
    coupon_count?: string;
    coupon_type?: string;
    coupon_id?: string;
    coupon_fee_one?: string;
    attach?: string;
    time_end?: string;
    trade_state_desc?: string;
    return_code?: string;
    return_msg?: string;
    err_code?: string;
    err_code_des?: string;
    appid?: string;
    mch_id?: string;
    nonce_str?: string;
    sign?: string;
    sign_type?: string;
  };
}

export async function POST(request: Request) {
  console.log('=== WeChat Pay Notification Received ===');
  console.log('Request URL:', request.url);
  console.log('Request method:', request.method);
  console.log('Request headers:', Object.fromEntries(request.headers.entries()));

  try {
    const body = await request.text();
    console.log('Raw notification body:', body);

    // Parse XML notification
    const result = await new Promise<WeChatPayXMLResult>((resolve, reject) => {
      parseString(body, { explicitArray: false }, (err, result) => {
        if (err) {
          console.error('XML parsing error:', err);
          reject(err);
        } else {
          console.log('Parsed XML result:', result);
          resolve(result as WeChatPayXMLResult);
        }
      });
    });

    // Verify the notification signature
    const isValid = await new Promise<boolean>((resolve) => {
      verifyWeChatNotification((msg) => {
        console.log('Verification callback received:', msg);
        resolve(true);
      })(body, request, NextResponse);
    });

    if (!isValid) {
      console.log('Invalid notification signature');
      return NextResponse.json(
        { code: 'INVALID_SIGNATURE', message: 'Invalid signature' },
        { status: 400 }
      );
    }

    const notification = result.xml;
    const orderId = notification.out_trade_no;
    const tradeStatus = notification.result_code;
    const totalFee = notification.total_fee;

    console.log('Parsed notification:', { orderId, tradeStatus, totalFee });

    if (!orderId || !tradeStatus || !totalFee) {
      console.log('Missing required notification fields');
      return NextResponse.json(
        { code: 'INVALID_NOTIFICATION', message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Update order status in database
    if (tradeStatus === 'SUCCESS') {
      try {
        await prisma.order.update({
          where: { id: orderId },
          data: {
            status: 'completed',
            paymentDetails: {
              transactionId: notification.transaction_id,
              openid: notification.openid,
              tradeType: notification.trade_type,
              bankType: notification.bank_type,
              totalFee: parseInt(totalFee),
              settlementTotalFee: notification.settlement_total_fee,
              feeType: notification.fee_type,
              cashFee: notification.cash_fee,
              cashFeeType: notification.cash_fee_type,
              couponFee: notification.coupon_fee,
              couponCount: notification.coupon_count,
              couponTypes: notification.coupon_type,
              couponIds: notification.coupon_id,
              couponFeeOne: notification.coupon_fee_one,
              attach: notification.attach,
              timeEnd: notification.time_end,
              tradeStateDesc: notification.trade_state_desc,
              returnCode: notification.return_code,
              returnMsg: notification.return_msg,
              resultCode: notification.result_code,
              errCode: notification.err_code,
              errCodeDes: notification.err_code_des,
              appid: notification.appid,
              mchId: notification.mch_id,
              nonceStr: notification.nonce_str,
              sign: notification.sign,
              signType: notification.sign_type,
            }
          }
        });
        console.log('Order status updated to completed:', orderId);
      } catch (dbError) {
        console.error('Database update error:', dbError);
        throw dbError;
      }
    }

    // Return success response to WeChat Pay
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