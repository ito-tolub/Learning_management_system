import { Webhook } from "svix";
import User from "../models/User.js";

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
  