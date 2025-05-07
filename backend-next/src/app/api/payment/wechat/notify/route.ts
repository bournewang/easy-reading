import { prisma } from '@/lib/prisma';
import { verifyWeChatNotification } from '@/lib/payment/wechat';

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const data = JSON.parse(body);

    // Verify the notification
    const isValid = await verifyWeChatNotification(data);
    if (!isValid) {
      console.error('Invalid notification signature');
      return new Response('fail', { status: 400 });
    }

    // Process the notification
    const { out_trade_no, trade_state } = data;
    if (trade_state === 'SUCCESS') {
      // Update order status in database
      await prisma.order.update({
        where: { id: out_trade_no },
        data: {
          status: 'success',
          paymentDetails: {
            ...data,
            updatedAt: new Date().toISOString()
          }
        }
      });
    }

    return new Response('success', { status: 200 });
  } catch (error) {
    console.error('Error processing WeChat Pay notification:', error);
    return new Response('fail', { status: 500 });
  }
} 