import type { PlasmoMessaging } from "@plasmohq/messaging";





export type RequestBody = {}

export type ResponseBody = {
  success: boolean
  tabId?: number
}

const handler: PlasmoMessaging.MessageHandler<RequestBody, ResponseBody> = async (req, res) => {
  try {
    const tabId = req.sender?.tab?.id

    chrome.sidePanel.open({ tabId: tabId })
    res.send({ success: true, tabId })

    
  } catch (error) {
    console.error("Failed to open side panel:", error)
    res.send({ success: false })
  }
}

export default handler