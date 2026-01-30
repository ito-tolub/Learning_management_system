import { Webhook } from "svix";
import User from "../models/User.js";
import { request, response } from "express";
import Stripe from "stripe";
import { Purchase } from "../models/Purchase.js";
import Course from "../models/Course.js";

//API controller Function
export const clerkWebhooks = async (req, res) => {
  try {
    const whook = new Webhook(process.env.CLERK_WEBHOOK_SECRET);

    const evt = whook.verify(JSON.stringify(req.body), {
      "svix-id": req.headers["svix-id"],
      "svix-timestamp": req.headers["svix-timestamp"],
      "svix-signature": req.headers["svix-signature"],
    });

    const { data, type } = evt;

    switch (type) {
      case "user.created": {
        await User.create({
          clerkId: data.id,
          email: data.email_addresses[0].email_address,
          name: `${data.first_name || ""} ${data.last_name || ""}`,
          imageUrl: data.image_url,
        });
        break;
      }

      case "user.updated": {
        await User.findOneAndUpdate(
          { clerkId: data.id },
          {
            email: data.email_addresses[0].email_address,
            name: `${data.first_name || ""} ${data.last_name || ""}`,
            imageUrl: data.image_url,
          },
          { new: true }
        );
        break;
      }

      case "user.deleted": {
        await User.findOneAndDelete({ clerkId: data.id });
        break;
      }

      default:
        break;
    }

    res.json({ success: true });

  } catch (error) {
    console.error("Webhook error:", error.message);
    res.status(400).json({ success: false });
  }
};

const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY)

export const stripeWebhooks = async (request, response) => {
  const sig = request.headers['stripe-signature'];

  let event;

  try {
    event = Stripe.webhooks.constructEvent(request.body, sig, process.env.STRIPE_WEBHOOKS_SECRET);
  }
  catch (err) {
    response.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object;
    
      const session = await stripeInstance.checkout.sessions.list({
        payment_intent: paymentIntent.id
      });
    
      const { purchaseId } = session.data[0].metadata;
    
      const purchaseData = await Purchase.findById(purchaseId);
      if (!purchaseData) break;
    
      const userData = await User.findById(purchaseData.userId);
      const courseData = await Course.findById(purchaseData.courseId);
    
      if (!userData || !courseData) break;
    
      courseData.enrolledStudents.push(userData._id);
      await courseData.save();
    
      userData.enrolledCourses.push(courseData._id);
      await userData.save();
    
      purchaseData.status = 'completed';
      await purchaseData.save();
    
      break;
    }

    case 'payment_method.attached': {
      const paymentIntent = event.data.object;
      const paymentIntentId = paymentIntent.id;

      const session = await stripeInstance.checkout.sessions.list({
        payment_intent: paymentIntentId
      })

      const { purchaseId } = session.data[0].metadata;
      const purchaseData = await Purchase.findById(purchaseId)
      purchaseData.status = 'failed'
      await purchaseData.save()
      break;
    }
    // ... handle other event types
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a response to acknowledge receipt of the event
  response.json({ received: true });

}
