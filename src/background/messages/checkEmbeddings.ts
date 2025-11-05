import type { PlasmoMessaging } from "@plasmohq/messaging"
import { checkEmbeddingsExist } from "~utils/mememoStore"

export type RequestBody = {
  videoId: string
}

export type ResponseBody = {
  exists: boolean
}

const handler: PlasmoMessaging.MessageHandler<RequestBody, ResponseBody> = async (req, res) => {
  const { videoId } = req.body
  const exists = await checkEmbeddingsExist(videoId)
  
  res.send({ exists })
}

export default handler

