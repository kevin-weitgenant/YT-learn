import type { PlasmoMessaging } from "@plasmohq/messaging";
import { Storage } from "@plasmohq/storage";

const sessionStorage = new Storage({ area: "session" })

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  if (req.sender.tab?.id) {
    await sessionStorage.set(req.sender.tab.id.toString(), req.body.videoId)
    res.send({ success: true })
  }
}

export default handler